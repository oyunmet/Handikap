import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { ErrorInfo, MutableRefObject } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Html, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import type { CharacterAnimationState } from "./character-animation";
import { KNIGHT_CONFIG } from "./knight-config";
import Knight3D from "./Knight3D";
import {
  getOpponentAnimationPlayback,
  isRootTranslationTrack,
  resolveGlbClipName,
  type ModelAnimationState,
} from "./model-animation";
import { dampCharacterYaw, getCharacterRootYawForModel } from "./character-facing";
import { getOpponentPartColor, type OpponentModelConfig } from "./opponent-model-config";
import type { WorldMotion } from "./movement";
import type { EquipmentVisual } from "../game/store-types";
import { emitWorldDiagnostic } from "./world-diagnostics";

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

function inspectModelBudget(model: THREE.Object3D, modelPath: string) {
  if (warnedModelPaths.has(modelPath)) return;
  warnedModelPaths.add(modelPath);

  let triangles = 0;
  let largestTextureDimension = 0;
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry;
    const availableCount = geometry.index?.count ?? geometry.getAttribute("position")?.count ?? 0;
    const requestedCount = geometry.drawRange.count === Infinity
      ? availableCount
      : Math.min(availableCount, geometry.drawRange.count);
    const meshTriangles = Math.floor(requestedCount / 3);
    triangles += meshTriangles * (object instanceof THREE.InstancedMesh ? object.count : 1);

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
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

  if (triangles > 50_000) {
    console.warn(`[shafak-model] ${modelPath} has ${triangles.toLocaleString("tr-TR")} triangles (recommended: under 50,000).`);
    emitWorldDiagnostic("model-budget", `${modelPath}: ${triangles} üçgen (önerilen üst sınır 50.000).`);
  }
  if (largestTextureDimension > 2_048) {
    console.warn(`[shafak-model] ${modelPath} has a ${largestTextureDimension}px texture (recommended: 2,048px or smaller).`);
    emitWorldDiagnostic("model-budget", `${modelPath}: ${largestTextureDimension}px doku boyutu.`);
  }
}

function downscaleTexture(
  texture: THREE.Texture,
  modelPath: string,
  cache: Map<THREE.Texture, THREE.Texture | null>,
) {
  if (cache.has(texture)) return cache.get(texture) ?? null;
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
  const largestSide = Math.max(width, height);
  if (largestSide <= 2_048 || !width || !height || typeof document === "undefined") {
    cache.set(texture, null);
    return null;
  }

  const scale = 2_048 / largestSide;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context || !image) {
    emitWorldDiagnostic("model-budget", `${modelPath}: ${width}×${height}px doku küçültülemedi; özgün doku korunuyor.`);
    cache.set(texture, null);
    return null;
  }
  try {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emitWorldDiagnostic("model-budget", `${modelPath}: doku küçültme başarısız: ${message}`);
    cache.set(texture, null);
    return null;
  }
  const resized = texture.clone();
  resized.image = canvas;
  resized.mipmaps = [];
  resized.needsUpdate = true;
  cache.set(texture, resized);
  emitWorldDiagnostic("model-budget", `${modelPath}: ${width}×${height}px doku ${canvas.width}×${canvas.height}px olarak küçültüldü.`);
  return resized;
}

function prepareModel(
  source: THREE.Object3D,
  modelPath: string,
  modelConfig?: OpponentModelConfig,
  castShadow = true,
) {
  const model = cloneSkinned(source);
  inspectModelBudget(model, modelPath);
  const bounds = new THREE.Box3().setFromObject(model);
  const dimensions = bounds.getSize(new THREE.Vector3());
  const modelHeight = dimensions.y;
  if (!Number.isFinite(modelHeight) || modelHeight <= 0 || modelHeight > 100) {
    emitWorldDiagnostic("model-budget", `${modelPath}: geçersiz model sınırı (${dimensions.toArray().join(", ")}); güvenli ölçek uygulandı.`);
    model.scale.setScalar(0.01);
  } else if (modelHeight > 3.4) {
    const normalizationScale = 3.4 / modelHeight;
    model.scale.multiplyScalar(normalizationScale);
    model.position.y -= bounds.min.y * normalizationScale;
    emitWorldDiagnostic("model-budget", `${modelPath}: model yüksekliği ${modelHeight.toFixed(2)} m'den 3,4 m sınırına normalize edildi.`);
  }
  model.traverse((object) => {
    if (object instanceof THREE.Mesh) object.castShadow = castShadow;
  });
  const ownedMaterials: THREE.Material[] = [];
  const ownedTextures: THREE.Texture[] = [];
  const textureCache = new Map<THREE.Texture, THREE.Texture | null>();

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    let hasResizedTexture = false;
    const resizedMaterials = materials.map((original) => {
      const customized = original.clone();
      ownedMaterials.push(customized);
      for (const [key, value] of Object.entries(original)) {
        if (!(value instanceof THREE.Texture)) continue;
        const resized = downscaleTexture(value, modelPath, textureCache);
        if (!resized) continue;
        (customized as THREE.Material & Record<string, unknown>)[key] = resized;
        if (!ownedTextures.includes(resized)) ownedTextures.push(resized);
        hasResizedTexture = true;
      }
      return customized;
    });
    object.material = Array.isArray(object.material) ? resizedMaterials : resizedMaterials[0];
    if (hasResizedTexture) {
      emitWorldDiagnostic("model-budget", `${modelPath}: klonlanan materyaller için doku bütçesi uygulandı.`);
    }
  });

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const originalMaterials = Array.isArray(object.material) ? object.material : [object.material];
    let changed = false;
    const materials = originalMaterials.map((original) => {
      const color = modelConfig
        ? getOpponentPartColor(object.name, original.name, modelConfig)
        : undefined;
      if (!color) return original;
      const materialColor = (original as THREE.Material & { color?: THREE.Color }).color;
      if (!materialColor?.isColor) return original;
      materialColor.set(color);
      changed = true;
      return original;
    });
    if (changed) object.material = Array.isArray(object.material) ? materials : materials[0];
  });

  return { model, ownedMaterials, ownedTextures };
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
  const gltf = useLoader(GLTFLoader, modelPath, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  }) as GLTF;
  const rootRef = useRef<THREE.Group>(null);
  const { model, ownedMaterials, ownedTextures } = useMemo(
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
      const targetYaw = facingAngle === undefined
        ? motion.velocityY < -0.25
          ? Math.PI + Math.atan2(motion.velocityX, Math.abs(motion.velocityY))
          : Math.atan2(-motion.velocityX, Math.max(0.01, Math.abs(motion.velocityY)))
        : getCharacterRootYawForModel(
          facingAngle,
          modelConfig?.modelFacing ?? KNIGHT_CONFIG.modelFacing,
        );
      root.rotation.y = dampCharacterYaw(root.rotation.y, targetYaw, 7, Math.min(delta, 1 / 30));
    }
    if (selectedAction) {
      const speed = Math.hypot(motion.velocityX, motion.velocityY);
      selectedAction.timeScale = clipState === "run" || state === "run"
        ? THREE.MathUtils.clamp(speed / 6, 0.8, 1.35)
        : state === "walk"
          ? THREE.MathUtils.clamp(speed / 2.2, 0.72, 1.2)
          : 1;
    }
    mixer.update(Math.min(delta, 0.05) * (motionReduced ? 0.35 : 1) * animationTimeScale);
    if (footSlipRef) footSlipRef.current = 0;
  });

  useEffect(() => () => {
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    for (const material of ownedMaterials) material.dispose();
    for (const texture of ownedTextures) texture.dispose();
  }, [mixer, model, ownedMaterials, ownedTextures]);

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
  const { modelConfig, modelAnimationState: _modelAnimationState, ...knightProps } = props;
  const appearance = knightProps.appearance ?? modelConfig?.appearance;
  return (
    <>
      <group scale={modelConfig?.scale ?? 1}>
        <Knight3D {...knightProps} appearance={appearance} />
      </group>
      {modelConfig && (
        <Html position={[0, 2.65, 0]} center distanceFactor={9} zIndexRange={[30, 0]}>
          <div className="duel-model-loading" role="status" aria-live="polite">
            <span>Rakip yükleniyor</span>
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

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error("[shafak-model] Opponent GLB failed; using the primitive fallback.", error);
    emitWorldDiagnostic("model-error", error.stack ?? error.message);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function KnightActor(props: KnightActorProps) {
  const { modelConfig, modelAnimationState: _modelAnimationState, ...knightProps } = props;
  const proceduralFallback = (
    <group scale={modelConfig?.scale ?? 1}>
      {modelConfig?.modelPath
        ? <PrimitiveKnightFallback />
        : <Knight3D {...knightProps} appearance={knightProps.appearance ?? modelConfig?.appearance} />}
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

function PrimitiveKnightFallback() {
  return (
    <group>
      <mesh position={[0, 1.03, 0]} castShadow>
        <capsuleGeometry args={[0.34, 0.76, 4, 8]} />
        <meshStandardMaterial color="#4f5560" metalness={0.42} roughness={0.68} />
      </mesh>
      <mesh position={[0, 1.82, 0]} castShadow>
        <sphereGeometry args={[0.26, 10, 8]} />
        <meshStandardMaterial color="#747984" metalness={0.5} roughness={0.58} />
      </mesh>
      <mesh position={[0, 1.92, 0.03]} castShadow>
        <boxGeometry args={[0.42, 0.11, 0.42]} />
        <meshStandardMaterial color="#34333a" metalness={0.52} roughness={0.62} />
      </mesh>
      <mesh position={[0, 1.79, 0.245]}>
        <boxGeometry args={[0.3, 0.045, 0.025]} />
        <meshBasicMaterial color="#ffb372" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.67, -0.25]} rotation={[-0.12, 0, 0]} castShadow>
        <boxGeometry args={[0.72, 0.9, 0.08]} />
        <meshStandardMaterial color="#542b37" roughness={0.88} side={THREE.DoubleSide} />
      </mesh>
      <group position={[0.43, 1.04, 0.12]} rotation={[0.04, 0, -0.42]}>
        <mesh position={[0, 0.36, 0]} castShadow>
          <boxGeometry args={[0.095, 0.75, 0.06]} />
          <meshStandardMaterial color="#d7dce0" metalness={0.83} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.04, 0]}>
          <boxGeometry args={[0.34, 0.075, 0.08]} />
          <meshStandardMaterial color="#c99a5a" metalness={0.72} roughness={0.38} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.055, 0.07, 0.27, 6]} />
          <meshStandardMaterial color="#38252a" roughness={0.82} />
        </mesh>
      </group>
    </group>
  );
}
