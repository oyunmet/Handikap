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
import Knight3D from "./Knight3D";
import { resolveGlbClipName, type ModelAnimationState } from "./model-animation";
import type { OpponentModelConfig } from "./opponent-model-config";
import type { WorldMotion } from "./movement";
import type { EquipmentVisual } from "../game/store-types";

type KnightActorProps = {
  motionRef: MutableRefObject<WorldMotion>;
  state: CharacterAnimationState;
  motionReduced: boolean;
  facingAngle?: number;
  footSlipRef?: MutableRefObject<number>;
  appearance?: EquipmentVisual;
  modelConfig?: OpponentModelConfig;
  modelAnimationState?: ModelAnimationState;
};

const warnedModelPaths = new Set<string>();

function normalizeMaterialName(name: string) {
  return name.toLocaleLowerCase().replace(/[^a-z0-9ğüşöçıİ]/gi, "");
}

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
  }
  if (largestTextureDimension > 2_048) {
    console.warn(`[shafak-model] ${modelPath} has a ${largestTextureDimension}px texture (recommended: 2,048px or smaller).`);
  }
}

function prepareModel(
  source: THREE.Object3D,
  modelPath: string,
  modelConfig?: OpponentModelConfig,
) {
  const model = cloneSkinned(source);
  inspectModelBudget(model, modelPath);
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
  facingAngle,
  footSlipRef,
  modelConfig,
}: KnightActorProps) {
  const modelPath = modelConfig?.modelPath ?? KNIGHT_CONFIG.modelPath;
  const gltf = useLoader(GLTFLoader, modelPath, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  }) as GLTF;
  const rootRef = useRef<THREE.Group>(null);
  const { model, ownedMaterials } = useMemo(
    () => prepareModel(gltf.scene, modelPath, modelConfig),
    [gltf.scene, modelPath, modelConfig],
  );
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const actions = useMemo(() => {
    const entries = gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)] as const);
    return new Map(entries);
  }, [gltf.animations, mixer]);
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  const clipState = modelAnimationState ?? state;
  const selectedClip = resolveGlbClipName(
    clipState,
    gltf.animations.map((clip) => clip.name),
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
    selectedAction.clampWhenFinished = ["attack", "dodge", "hit", "die", "death", "victory"].includes(clipState);
    selectedAction.setLoop(
      selectedAction.clampWhenFinished ? THREE.LoopOnce : THREE.LoopRepeat,
      selectedAction.clampWhenFinished ? 1 : Infinity,
    );
    if (previous && previous !== selectedAction) {
      selectedAction.crossFadeFrom(previous, 0.2, true).play();
    } else {
      selectedAction.fadeIn(0.2).play();
    }
    currentAction.current = selectedAction;
  }, [clipState, selectedAction]);

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
    mixer.update(Math.min(delta, 0.05) * (motionReduced ? 0.35 : 1));
    if (footSlipRef) footSlipRef.current = 0;
  });

  useEffect(() => () => {
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    for (const material of ownedMaterials) material.dispose();
  }, [mixer, model, ownedMaterials]);

  return (
    <group ref={rootRef}>
      <primitive
        object={model}
        rotation={[0, modelConfig?.modelFacing ?? KNIGHT_CONFIG.modelFacing, 0]}
        scale={modelConfig?.scale ?? KNIGHT_CONFIG.modelScale}
        dispose={null}
      />
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

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function KnightActor(props: KnightActorProps) {
  const [modelAvailable, setModelAvailable] = useState(false);
  const modelPath = props.modelConfig?.modelPath ?? KNIGHT_CONFIG.modelPath;
  const { modelConfig, modelAnimationState: _modelAnimationState, ...knightProps } = props;
  const proceduralFallback = (
    <group scale={modelConfig?.scale ?? 1}>
      <Knight3D {...knightProps} appearance={knightProps.appearance ?? modelConfig?.appearance} />
    </group>
  );

  useEffect(() => {
    const controller = new AbortController();
    setModelAvailable(false);
    void fetch(modelPath, { method: "HEAD", signal: controller.signal })
      .then((response) => {
        const contentType = response.headers.get("content-type") ?? "";
        setModelAvailable(response.ok && !contentType.includes("text/html"));
      })
      .catch(() => setModelAvailable(false));
    return () => controller.abort();
  }, [modelPath]);

  if (!modelAvailable) return proceduralFallback;
  return (
    <ModelErrorBoundary fallback={proceduralFallback}>
      <Suspense fallback={<ModelLoadingFallback props={props} />}>
        <OptionalGlbKnight {...props} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
