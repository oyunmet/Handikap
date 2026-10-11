import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MutableRefObject } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Html, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import type { CharacterAnimationState } from "./character-animation";
import { KNIGHT_CONFIG } from "./knight-config";
import { NORMALIZED_FIGHTER_HEIGHT } from "./render-safety";
import Knight3D from "./Knight3D";
import {
  getOpponentAnimationPlayback,
  isRootTranslationTrack,
  resolveGlbClipName,
  type ModelAnimationState,
} from "./model-animation";
import type { OpponentModelConfig } from "./opponent-model-config";
import type { WorldMotion } from "./movement";
import type { EquipmentVisual } from "../game/store-types";

type KnightActorProps = {
  motionRef: MutableRefObject<WorldMotion>;
  state: CharacterAnimationState;
  motionReduced: boolean;
  animationTimeScale?: number;
  facingAngle?: number;
  footSlipRef?: MutableRefObject<number>;
  castShadow?: boolean;
  appearance?: EquipmentVisual;
  modelConfig?: OpponentModelConfig;
  modelAnimationState?: ModelAnimationState;
};

const warnedModelPaths = new Set<string>();
const reportedModelPaths = new Set<string>();
const modelLoadStartedAt = new Map<string, number>();
const resizedTextures = new WeakSet<THREE.Texture>();
const MAX_MODEL_TEXTURE_SIZE = 1_024;
const MODEL_LOAD_TIMEOUT_MS = 8_000;

const GLB_CONTACT_SHADOW_GEOMETRY = new THREE.CircleGeometry(1, 28);
const GLB_CONTACT_SHADOW_MATERIAL = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    void main() {
      float radius = length((vUv - 0.5) * 2.0);
      float alpha = (1.0 - smoothstep(0.18, 1.0, radius)) * 0.42;
      gl_FragColor = vec4(0.018, 0.014, 0.024, alpha);
    }
  `,
});

function normalizeMaterialName(name: string) {
  return name.toLocaleLowerCase().replace(/[^a-z0-9ğüşöçıİ]/gi, "");
}

function inspectModelBudget(model: THREE.Object3D, modelPath: string) {
  let triangles = 0;
  let largestTextureDimension = 0;
  let meshCount = 0;
  let materialCount = 0;
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    meshCount += 1;
    const geometry = object.geometry;
    const availableCount = geometry.index?.count ?? geometry.getAttribute("position")?.count ?? 0;
    const requestedCount = geometry.drawRange.count === Infinity
      ? availableCount
      : Math.min(availableCount, geometry.drawRange.count);
    const meshTriangles = Math.floor(requestedCount / 3);
    triangles += meshTriangles * (object instanceof THREE.InstancedMesh ? object.count : 1);

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      materialCount += 1;
      for (const value of Object.values(material)) {
        if (!(value instanceof THREE.Texture)) continue;
        const image = value.image ?? value.source?.data;
        const images = Array.isArray(image) ? image : [image];
        for (const textureImage of images) {
          const width = Number(textureImage?.width ?? textureImage?.videoWidth ?? textureImage?.naturalWidth ?? 0);
          const height = Number(textureImage?.height ?? textureImage?.videoHeight ?? textureImage?.naturalHeight ?? 0);
          largestTextureDimension = Math.max(largestTextureDimension, width, height);
        }
      }
    }
  });

  if (warnedModelPaths.has(modelPath)) {
    return { triangles, largestTextureDimension, meshCount, materialCount };
  }
  warnedModelPaths.add(modelPath);
  if (triangles > 50_000) {
    console.warn(`[shafak-model] ${modelPath} has ${triangles.toLocaleString("tr-TR")} triangles (recommended: under 50,000).`);
  }
  if (largestTextureDimension > MAX_MODEL_TEXTURE_SIZE) {
    console.warn(`[shafak-model] ${modelPath} has a ${largestTextureDimension}px texture; it will be reduced to ${MAX_MODEL_TEXTURE_SIZE}px.`);
  }
  if (!meshCount) console.warn(`[shafak-model] ${modelPath} contains no meshes; using the procedural fighter.`);
  if (!meshCount) throw new Error(`The GLB model at ${modelPath} has no visible meshes.`);
  return { triangles, largestTextureDimension, meshCount, materialCount };
}

function resizeTextureIfNeeded(texture: THREE.Texture) {
  if (resizedTextures.has(texture)) return;
  resizedTextures.add(texture);
  const image = texture.image as (CanvasImageSource & {
    width?: number;
    height?: number;
    naturalWidth?: number;
    naturalHeight?: number;
    videoWidth?: number;
    videoHeight?: number;
  }) | undefined;
  const width = Number(image?.width ?? image?.videoWidth ?? image?.naturalWidth ?? 0);
  const height = Number(image?.height ?? image?.videoHeight ?? image?.naturalHeight ?? 0);
  const largest = Math.max(width, height);
  if (!image || !Number.isFinite(largest) || largest <= MAX_MODEL_TEXTURE_SIZE || width < 1 || height < 1) return;

  try {
    const scale = MAX_MODEL_TEXTURE_SIZE / largest;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    texture.image = canvas;
    texture.needsUpdate = true;
  } catch (error) {
    console.warn(`[shafak-model] Could not downscale a texture for ${texture.name || "unnamed material"}.`, error);
  }
}

function normalizeModelBounds(model: THREE.Object3D, modelPath: string) {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  if (
    !Number.isFinite(size.y)
    || size.y <= 0.001
    || !Number.isFinite(center.x)
    || !Number.isFinite(center.y)
    || !Number.isFinite(center.z)
  ) {
    throw new Error(`The GLB model at ${modelPath} has invalid bounds.`);
  }

  const scale = NORMALIZED_FIGHTER_HEIGHT / size.y;
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);
  const normalizedBounds = new THREE.Box3().setFromObject(model);
  const normalizedCenter = normalizedBounds.getCenter(new THREE.Vector3());
  model.position.x -= normalizedCenter.x;
  model.position.y -= normalizedBounds.min.y;
  model.position.z -= normalizedCenter.z;
  model.updateMatrixWorld(true);
  return scale;
}

function prepareModel(
  source: THREE.Object3D,
  modelPath: string,
  modelConfig?: OpponentModelConfig,
  castShadow = true,
) {
  const model = cloneSkinned(source);
  const budget = inspectModelBudget(model, modelPath);
  const normalizationScale = normalizeModelBounds(model, modelPath);
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = castShadow;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) resizeTextureIfNeeded(value);
      }
      const safeMaterial = material as THREE.Material & {
        emissiveIntensity?: number;
        roughness?: number;
        metalness?: number;
        transparent?: boolean;
        opacity?: number;
        alphaMap?: THREE.Texture | null;
      };
      if (typeof safeMaterial.emissiveIntensity === "number" && !Number.isFinite(safeMaterial.emissiveIntensity)) {
        safeMaterial.emissiveIntensity = 0;
      } else if (typeof safeMaterial.emissiveIntensity === "number") {
        safeMaterial.emissiveIntensity = THREE.MathUtils.clamp(safeMaterial.emissiveIntensity, 0, 1.5);
      }
      if (typeof safeMaterial.roughness === "number" && !Number.isFinite(safeMaterial.roughness)) safeMaterial.roughness = 0.8;
      if (typeof safeMaterial.metalness === "number" && !Number.isFinite(safeMaterial.metalness)) safeMaterial.metalness = 0;
      if (
        safeMaterial.transparent
        && (safeMaterial.opacity ?? 1) >= 0.999
        && !safeMaterial.alphaMap
      ) safeMaterial.transparent = false;
    }
  });
  if (!reportedModelPaths.has(modelPath)) {
    reportedModelPaths.add(modelPath);
    const startedAt = modelLoadStartedAt.get(modelPath);
    const loadMs = startedAt === undefined ? null : Math.max(0, performance.now() - startedAt);
    const normalizedBounds = new THREE.Box3().setFromObject(model);
    const normalizedSize = normalizedBounds.getSize(new THREE.Vector3());
    console.info("[shafak-model] Loaded and normalized.", {
      modelPath,
      loadMs,
      meshCount: budget.meshCount,
      materialCount: budget.materialCount,
      triangles: budget.triangles,
      largestSourceTexturePx: budget.largestTextureDimension,
      normalizedHeight: Number(normalizedSize.y.toFixed(3)),
      normalizationScale,
    });
  }
  const ownedMaterials: THREE.Material[] = [];
  if (!modelConfig) return { model, ownedMaterials };

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const originalMaterials = Array.isArray(object.material) ? object.material : [object.material];
    let changed = false;
    const materials = originalMaterials.map((original) => {
      const materialName = normalizeMaterialName(original.name);
      const isCape = modelConfig.materialNameAliases.cape.some((alias) =>
        materialName.includes(normalizeMaterialName(alias)));
      const isAccent = modelConfig.materialNameAliases.accent.some((alias) =>
        materialName.includes(normalizeMaterialName(alias)));
      const color = isCape
        ? modelConfig.appearance.cape
        : isAccent
          ? modelConfig.appearance.trim
          : undefined;
      if (!color) return original;
      const originalColor = (original as THREE.Material & { color?: THREE.Color }).color;
      if (!originalColor?.isColor) return original;

      const customized = original.clone();
      const materialColor = (customized as THREE.Material & { color?: THREE.Color }).color;
      if (!materialColor?.isColor) {
        customized.dispose();
        return original;
      }
      materialColor.set(color);
      ownedMaterials.push(customized);
      changed = true;
      return customized;
    });
    if (changed) object.material = Array.isArray(object.material) ? materials : materials[0];
  });

  return { model, ownedMaterials };
}

function OptionalGlbKnight({
  motionRef,
  state,
  modelAnimationState,
  motionReduced,
  animationTimeScale = 1,
  facingAngle,
  footSlipRef,
  appearance,
  modelConfig,
  castShadow = true,
}: KnightActorProps) {
  const modelPath = modelConfig?.modelPath ?? KNIGHT_CONFIG.modelPath;
  if (!modelLoadStartedAt.has(modelPath)) modelLoadStartedAt.set(modelPath, performance.now());
  const gltf = useLoader(GLTFLoader, modelPath, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  }) as GLTF;
  const rootRef = useRef<THREE.Group>(null);
  const { model, ownedMaterials } = useMemo(
    () => prepareModel(gltf.scene, modelPath, modelConfig, castShadow),
    [gltf.scene, modelPath, modelConfig, castShadow],
  );
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const animationClips = useMemo(() => {
    const rootBoneName = modelConfig?.rootBoneName;
    if (!rootBoneName) return gltf.animations;
    return gltf.animations.map((clip) => {
      const inPlaceClip = clip.clone();
      inPlaceClip.tracks = inPlaceClip.tracks.filter(
        (track) => !isRootTranslationTrack(track.name, rootBoneName),
      );
      return inPlaceClip;
    });
  }, [gltf.animations, modelConfig?.rootBoneName]);
  const actions = useMemo(() => {
    const entries = animationClips.map((clip) => [clip.name, mixer.clipAction(clip)] as const);
    return new Map(entries);
  }, [animationClips, mixer]);
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  const clipState = modelAnimationState ?? state;
  const selectedClip = resolveGlbClipName(
    clipState,
    animationClips.map((clip) => clip.name),
    modelConfig?.animationClips,
  );
  const selectedAction = selectedClip ? actions.get(selectedClip) ?? null : null;

  useEffect(() => {
    const previous = currentAction.current;
    if (!selectedAction) {
      previous?.fadeOut(0.2);
      currentAction.current = null;
      return;
    }
    selectedAction.reset();
    selectedAction.enabled = true;
    const opponentPlayback = modelConfig ? getOpponentAnimationPlayback(clipState) : null;
    selectedAction.clampWhenFinished = opponentPlayback
      ? opponentPlayback === "holdLastFrame"
      : ["attack", "dodge", "hit", "die", "death", "victory"].includes(clipState);
    const playOnce = opponentPlayback
      ? opponentPlayback !== "loop"
      : selectedAction.clampWhenFinished;
    selectedAction.setLoop(
      playOnce ? THREE.LoopOnce : THREE.LoopRepeat,
      playOnce ? 1 : Infinity,
    );
    if (previous && previous !== selectedAction) {
      selectedAction.crossFadeFrom(previous, 0.18, true).play();
    } else {
      selectedAction.fadeIn(0.18).play();
    }
    currentAction.current = selectedAction;
  }, [clipState, modelConfig, selectedAction]);

  useEffect(() => {
    if (
      !modelConfig
      || !selectedAction
      || getOpponentAnimationPlayback(clipState) !== "returnToIdle"
    ) return undefined;
    const idleClip = resolveGlbClipName(
      "idle",
      animationClips.map((clip) => clip.name),
      modelConfig.animationClips,
    );
    const idleAction = idleClip ? actions.get(idleClip) ?? null : null;
    if (!idleAction || idleAction === selectedAction) return undefined;

    const handleFinished = (event: { action: THREE.AnimationAction }) => {
      if (event.action !== selectedAction || currentAction.current !== selectedAction) return;
      idleAction.reset();
      idleAction.enabled = true;
      idleAction.clampWhenFinished = false;
      idleAction.setLoop(THREE.LoopRepeat, Infinity);
      idleAction.crossFadeFrom(selectedAction, 0.18, true).play();
      currentAction.current = idleAction;
    };
    mixer.addEventListener("finished", handleFinished);
    return () => mixer.removeEventListener("finished", handleFinished);
  }, [actions, animationClips, clipState, mixer, modelConfig, selectedAction]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    const motion = motionRef.current;
    if (root) {
      root.position.x = motion.depth * 5.2;
      root.rotation.y = facingAngle ?? Math.atan2(-motion.velocityX, Math.max(0.01, Math.abs(motion.velocityY)));
      if (facingAngle === undefined && motion.velocityY < -0.25) root.rotation.y = Math.PI + Math.atan2(motion.velocityX, Math.abs(motion.velocityY));
    }
    if (selectedAction) {
      const speed = Math.hypot(motion.velocityX, motion.velocityY);
      selectedAction.timeScale = clipState === "run" || state === "run"
        ? THREE.MathUtils.clamp(speed / 6, 0.8, 1.35)
        : state === "walk"
          ? THREE.MathUtils.clamp(speed / 2.2, 0.72, 1.2)
          : 1;
    }
    const safeDelta = Number.isFinite(delta) ? THREE.MathUtils.clamp(delta, 0, 0.05) : 0;
    mixer.update(safeDelta * (motionReduced ? 0.35 : 1) * animationTimeScale);
    if (footSlipRef) footSlipRef.current = 0;
  });

  useEffect(() => () => {
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    for (const material of ownedMaterials) material.dispose();
  }, [mixer, model, ownedMaterials]);

  return (
    <group ref={rootRef}>
      <mesh
        geometry={GLB_CONTACT_SHADOW_GEOMETRY}
        material={GLB_CONTACT_SHADOW_MATERIAL}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.018, 0]}
        scale={[0.78, 0.52, 1]}
        dispose={null}
      />
      {selectedAction ? (
        <primitive
          object={model}
          rotation={[0, modelConfig?.modelFacing ?? KNIGHT_CONFIG.modelFacing, 0]}
          scale={modelConfig?.scale ?? KNIGHT_CONFIG.modelScale}
          dispose={null}
        />
      ) : (
        <group scale={modelConfig?.scale ?? KNIGHT_CONFIG.modelScale}>
          <Knight3D
            motionRef={motionRef}
            state={state}
            motionReduced={motionReduced}
            animationTimeScale={animationTimeScale}
            facingAngle={facingAngle}
            footSlipRef={footSlipRef}
            castShadow={castShadow}
            appearance={appearance ?? modelConfig?.appearance}
          />
        </group>
      )}
    </group>
  );
}

type BoundaryProps = { children: ReactNode; fallback: ReactNode };
type BoundaryState = { failed: boolean };

function ModelLoadingFallback({ props }: { props: KnightActorProps }) {
  const { progress } = useProgress();
  const [timedOut, setTimedOut] = useState(false);
  const { modelConfig, modelAnimationState: _modelAnimationState, ...knightProps } = props;
  const appearance = knightProps.appearance ?? modelConfig?.appearance;
  useEffect(() => {
    if (!modelConfig?.modelPath) return undefined;
    const timer = window.setTimeout(() => {
      setTimedOut(true);
      console.error(`[shafak-model] ${modelConfig.modelPath} exceeded the ${MODEL_LOAD_TIMEOUT_MS}ms load limit; keeping the procedural fighter visible.`);
    }, MODEL_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [modelConfig?.modelPath]);
  return (
    <>
      <group scale={modelConfig?.scale ?? 1}>
        <Knight3D {...knightProps} appearance={appearance} />
      </group>
      {modelConfig && (
        <Html position={[0, 2.65, 0]} center distanceFactor={9} zIndexRange={[30, 0]}>
          <div className="duel-model-loading" role="status" aria-live="polite">
            <span>{timedOut ? "Yedek savaşçı kullanılıyor" : "Rakip yükleniyor"}</span>
            <span className="duel-model-loading__track" aria-hidden="true">
              <i style={{ width: `${Math.max(5, Math.min(100, progress))}%` }} />
            </span>
          </div>
        </Html>
      )}
    </>
  );
}

class ModelErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("[shafak-model] GLB load/render failed; switched to the procedural fighter.", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function KnightActor(props: KnightActorProps) {
  const { modelConfig, modelAnimationState: _modelAnimationState, ...knightProps } = props;
  const proceduralFallback = (
    <group scale={modelConfig?.scale ?? 1}>
      <Knight3D {...knightProps} appearance={knightProps.appearance ?? modelConfig?.appearance} />
    </group>
  );

  // The hero and regular rivals intentionally use the sword-equipped procedural
  // rig. Only opponents with an explicit GLB config should start a model request.
  if (!modelConfig?.modelPath) return proceduralFallback;
  return (
    <ModelErrorBoundary fallback={proceduralFallback}>
      <Suspense fallback={<ModelLoadingFallback props={props} />}>
        <OptionalGlbKnight {...props} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
