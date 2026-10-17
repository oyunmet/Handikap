import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
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
import {
  ensureKnightGeometryUVs,
  KNIGHT_SURFACE_MAPS,
  KNIGHT_SURFACE_NORMAL_SCALE,
} from "./knight-surface-detail";
import {
  getOpponentAnimationPlayback,
  isRootTranslationTrack,
  resolveGlbClipName,
  type ModelAnimationState,
} from "./model-animation";
import type { OpponentModelConfig } from "./opponent-model-config";
import type { WorldMotion } from "./movement";
import type { EquipmentVisual } from "../game/store-types";
import { getUprightDuelRotation } from "../game/duel-camera";
import {
  PLAYER_CHARACTER_MODEL_FACING,
  PLAYER_CHARACTER_ANIMATION_CLIPS,
  PLAYER_CHARACTER_MATERIAL_ALIASES,
  PLAYER_CHARACTER_MODEL_PATH,
  PLAYER_CHARACTER_ROOT_BONE,
  PLAYER_CHARACTER_MODEL_SCALE,
  shouldRenderPlayerModel,
} from "./player-model";
import { posePlayerRig, rigPlayerModel } from "./player-skeletal-rig";
import { createDuelWeapon, disposeDuelWeapon } from "./duel-weapon";
import { configureWorldGLTFLoader } from "./WorldModel";

type KnightActorProps = {
  motionRef: MutableRefObject<WorldMotion>;
  state: CharacterAnimationState;
  motionReduced: boolean;
  animationTimeScale?: number;
  facingAngle?: number;
  debugUpright?: boolean;
  talking?: boolean;
  footSlipRef?: MutableRefObject<number>;
  castShadow?: boolean;
  appearance?: EquipmentVisual;
  modelConfig?: OpponentModelConfig;
  modelAnimationState?: ModelAnimationState;
  playerCharacter?: boolean;
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
  castShadow = true,
  playerCharacter = false,
  appearance?: EquipmentVisual,
) {
  const model = cloneSkinned(source);
  inspectModelBudget(model, modelPath);
  model.traverse((object) => {
    if (object instanceof THREE.Mesh) object.castShadow = castShadow;
  });
  const ownedMaterials: THREE.Material[] = [];
  let alreadyRigged = false;
  model.traverse((object) => {
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) alreadyRigged = true;
  });
  const playerRig = playerCharacter && !alreadyRigged ? rigPlayerModel(model) : null;
  const ownedGeometries = playerRig ? [playerRig.ownedGeometry] : [];
  const paletteAppearance = modelConfig?.appearance ?? (playerCharacter ? appearance : undefined);
  const materialNameAliases = modelConfig?.materialNameAliases
    ?? (playerCharacter ? PLAYER_CHARACTER_MATERIAL_ALIASES : undefined);
  if (!materialNameAliases) {
    return { model, ownedMaterials, ownedGeometries, playerRig };
  }

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const originalMaterials = Array.isArray(object.material) ? object.material : [object.material];
    let changed = false;
    const materials = originalMaterials.map((original) => {
      const materialName = normalizeMaterialName(original.name);
      const isCape = materialNameAliases.cape.some((alias) =>
        materialName.includes(normalizeMaterialName(alias)));
      const isAccent = materialNameAliases.accent.some((alias) =>
        materialName.includes(normalizeMaterialName(alias)));
      const isArmorLight = materialNameAliases.armorLight.some((alias) =>
        materialName.includes(normalizeMaterialName(alias)));
      const isArmorDark = materialNameAliases.armorDark.some((alias) =>
        materialName.includes(normalizeMaterialName(alias)));
      const isArmor = materialNameAliases.armor.some((alias) =>
        materialName.includes(normalizeMaterialName(alias)));
      const hasSurfaceDetail = isArmor || isArmorLight || isArmorDark || isAccent;
      const color = !paletteAppearance
        ? undefined
        : isCape
        ? paletteAppearance.cape
        : isAccent
          ? paletteAppearance.trim
          : isArmorLight
            ? paletteAppearance.armorLight
            : isArmorDark
              ? paletteAppearance.armorDark
              : isArmor
                ? paletteAppearance.armor
          : undefined;
      if (!color && !hasSurfaceDetail) return original;
      const originalColor = (original as THREE.Material & { color?: THREE.Color }).color;
      if (!(original instanceof THREE.MeshStandardMaterial)) return original;
      if (color && !originalColor?.isColor) return original;

      const customized = original.clone();
      const materialColor = (customized as THREE.Material & { color?: THREE.Color }).color;
      if (color && !materialColor?.isColor) {
        customized.dispose();
        return original;
      }
      if (color && materialColor?.isColor) materialColor.set(color);
      if (hasSurfaceDetail) {
        ensureKnightGeometryUVs(object.geometry);
        customized.map ??= KNIGHT_SURFACE_MAPS.color;
        customized.normalMap ??= KNIGHT_SURFACE_MAPS.normal;
        customized.roughnessMap ??= KNIGHT_SURFACE_MAPS.roughness;
        customized.normalScale.set(KNIGHT_SURFACE_NORMAL_SCALE, KNIGHT_SURFACE_NORMAL_SCALE);
        customized.needsUpdate = true;
      }
      ownedMaterials.push(customized);
      changed = true;
      return customized;
    });
    if (changed) object.material = Array.isArray(object.material) ? materials : materials[0];
  });

  return { model, ownedMaterials, ownedGeometries, playerRig };
}

const animatePlayerRig: typeof posePlayerRig = posePlayerRig;

function getFallbackAppearance(
  appearance: EquipmentVisual | undefined,
  modelConfig: OpponentModelConfig | undefined,
) {
  const base = appearance ?? modelConfig?.appearance;
  return base && modelConfig?.weapon
    ? { ...base, weaponStyle: modelConfig.weapon }
    : base;
}

function OptionalGlbKnight({
  motionRef,
  state,
  modelAnimationState,
  motionReduced,
  animationTimeScale = 1,
  facingAngle,
  debugUpright = false,
  talking = false,
  footSlipRef,
  appearance,
  modelConfig,
  castShadow = true,
  playerCharacter = false,
}: KnightActorProps) {
  const modelPath = modelConfig?.modelPath
    ?? (playerCharacter ? PLAYER_CHARACTER_MODEL_PATH : KNIGHT_CONFIG.modelPath);
  const gltf = useLoader(GLTFLoader, modelPath, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
    configureWorldGLTFLoader(loader);
  }) as GLTF;
  const rootRef = useRef<THREE.Group>(null);
  const warnedTiltRef = useRef(false);
  const rootBoneName = modelConfig?.rootBoneName
    ?? (playerCharacter ? PLAYER_CHARACTER_ROOT_BONE : undefined);
  const animationClipMap = modelConfig?.animationClips
    ?? (playerCharacter ? PLAYER_CHARACTER_ANIMATION_CLIPS : undefined);
  const { model, ownedMaterials, ownedGeometries, playerRig } = useMemo(
    () => prepareModel(gltf.scene, modelPath, modelConfig, castShadow, playerCharacter, appearance),
    [gltf.scene, modelPath, modelConfig, castShadow, playerCharacter, appearance],
  );
  const equippedHand = playerCharacter
    ? playerRig?.bones.Rig_RightHand
      ?? model.getObjectByName("Rig_RightHand")
      ?? model.getObjectByName("mixamorigRightHand")
      ?? model.getObjectByName("RightHand")
    : undefined;
  useEffect(() => {
    if (!equippedHand) return undefined;
    const weapon = createDuelWeapon(appearance);
    equippedHand.add(weapon);
    return () => {
      equippedHand.remove(weapon);
      disposeDuelWeapon(weapon);
    };
  }, [
    appearance?.auraColor,
    appearance?.trim,
    appearance?.weaponColor,
    appearance?.weaponStyle,
    equippedHand,
  ]);
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const animationClips = useMemo(() => {
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
    animationClipMap,
  );
  const selectedAction = selectedClip ? actions.get(selectedClip) ?? null : null;
  const staticPlayerModel = shouldRenderPlayerModel(playerCharacter, animationClips.length);
  const modelFacing = modelConfig?.modelFacing
    ?? (playerCharacter ? PLAYER_CHARACTER_MODEL_FACING : KNIGHT_CONFIG.modelFacing);
  const modelScale = modelConfig?.scale
    ?? (playerCharacter ? PLAYER_CHARACTER_MODEL_SCALE : KNIGHT_CONFIG.modelScale);
  const staticPoseRef = useRef<THREE.Group>(null);
  const previousStaticState = useRef(state);
  const staticActionElapsed = useRef(0);

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
      selectedAction.crossFadeFrom(previous, 0.2, true).play();
    } else {
      selectedAction.fadeIn(0.2).play();
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
      idleAction.crossFadeFrom(selectedAction, 0.2, true).play();
      currentAction.current = idleAction;
    };
    mixer.addEventListener("finished", handleFinished);
    return () => mixer.removeEventListener("finished", handleFinished);
  }, [actions, animationClips, clipState, mixer, modelConfig, selectedAction]);

  useFrame((frame, delta) => {
    const root = rootRef.current;
    const motion = motionRef.current;
    const dt = Math.min(delta, 0.05);
    if (root) {
      root.position.x = motion.depth * 5.2;
      root.position.y = motion.jumpHeight;
      if (facingAngle === undefined) {
        root.scale.y = THREE.MathUtils.damp(root.scale.y, motion.crouching ? 0.72 : 1, 12, Math.min(delta, 0.05));
      } else {
        root.scale.set(1, 1, 1);
      }
      if (facingAngle === undefined) {
        const targetYaw = motion.velocityY < -0.25
          ? Math.PI + Math.atan2(motion.velocityX, Math.abs(motion.velocityY))
          : Math.atan2(-motion.velocityX, Math.max(0.01, Math.abs(motion.velocityY)));
        const turn = Math.atan2(
          Math.sin(targetYaw - root.rotation.y),
          Math.cos(targetYaw - root.rotation.y),
        );
        root.rotation.y += turn * (1 - Math.exp(-dt * 12));
      } else {
        const targetYaw = facingAngle - modelFacing;
        const turn = Math.atan2(
          Math.sin(targetYaw - root.rotation.y),
          Math.cos(targetYaw - root.rotation.y),
        );
        root.rotation.y += turn * (1 - Math.exp(-Math.max(0, Math.min(delta, 0.05)) * 10));
      }
      root.rotation.set(...getUprightDuelRotation(root.rotation.y));

      if (debugUpright && facingAngle !== undefined) {
        const tilted = Math.abs(root.rotation.x) > 0.05 || Math.abs(root.rotation.z) > 0.05;
        if (tilted && !warnedTiltRef.current) {
          console.warn("[shafak-duel] GLB character root tilt exceeded 0.05 radians.", {
            x: root.rotation.x,
            z: root.rotation.z,
            state,
          });
        }
        warnedTiltRef.current = tilted;
      }
    }
    if (staticPlayerModel && staticPoseRef.current) {
      const pose = staticPoseRef.current;
      const time = frame.clock.elapsedTime;
      const speed = Math.hypot(motion.velocityX, motion.velocityY);
      const moveWeight = THREE.MathUtils.clamp(speed / 3.8, 0, 1);
      const reducedMotionScale = motionReduced ? 0.32 : 1;
      if (previousStaticState.current !== state) {
        previousStaticState.current = state;
        staticActionElapsed.current = 0;
      } else {
        staticActionElapsed.current += dt * animationTimeScale;
      }
      const phase = motion.stepPhase;
      const actionProgress = THREE.MathUtils.clamp(staticActionElapsed.current / 0.42, 0, 1);
      const actionAccent = Math.sin(actionProgress * Math.PI);
      let actionLean = 0;
      let actionRoll = 0;
      if (state === "attack" || state === "heavyAttack" || state === "plunge") {
        actionLean = -actionAccent * (state === "plunge" ? 0.18 : 0.1);
        actionRoll = Math.sin(actionProgress * Math.PI * 2) * 0.055;
      } else if (state === "hit") {
        actionLean = actionAccent * 0.095;
        actionRoll = actionAccent * 0.1;
      } else if (state === "dodge" || state === "backflip") {
        actionRoll = Math.sin(actionProgress * Math.PI) * 0.16;
      } else if (state === "die") {
        actionLean = actionProgress * 0.14;
      } else if (state === "block") {
        actionLean = -0.035;
      }

      const breathing = Math.sin(time * 1.35) * 0.012;
      const stepPulse = Math.sin(phase * 2);
      const stepBob = Math.abs(stepPulse) * 0.052 * moveWeight;
      const stepStretch = stepPulse * 0.018 * moveWeight * reducedMotionScale;
      const targetTiltX = actionLean
        - THREE.MathUtils.clamp(motion.velocityY / 7, -1, 1) * 0.035 * moveWeight;
      const targetTiltZ = actionRoll
        + THREE.MathUtils.clamp(motion.velocityX / 7, -1, 1) * 0.045 * moveWeight
        + Math.sin(phase) * 0.025 * moveWeight;
      pose.position.x = Math.sin(phase) * 0.028 * moveWeight * reducedMotionScale;
      pose.position.y = (breathing + stepBob) * reducedMotionScale;
      pose.rotation.x = targetTiltX * reducedMotionScale;
      pose.rotation.y = Math.sin(time * 0.8) * 0.018 * reducedMotionScale
        + Math.sin(phase) * 0.025 * moveWeight * reducedMotionScale;
      pose.rotation.z = targetTiltZ * reducedMotionScale;
      pose.scale.set(1 - stepStretch * 0.35, 1 + stepStretch, 1 - stepStretch * 0.35);
    }
    if (playerRig && staticPlayerModel) {
      animatePlayerRig(
        playerRig,
        Math.hypot(motion.velocityX, motion.velocityY),
        motion.stepPhase,
        state,
        THREE.MathUtils.clamp(staticActionElapsed.current / 0.42, 0, 1),
        motionReduced,
        frame.clock.elapsedTime,
      );
    }
    if (selectedAction) {
      const speed = Math.hypot(motion.velocityX, motion.velocityY);
      selectedAction.timeScale = clipState === "run" || state === "run"
        ? THREE.MathUtils.clamp(speed / 6, 0.8, 1.35)
        : state === "walk"
          ? THREE.MathUtils.clamp(speed / 2.2, 0.72, 1.2)
          : 1;
    }
    mixer.update(dt * (motionReduced ? 0.35 : 1) * animationTimeScale);
    if (footSlipRef) footSlipRef.current = 0;
  });

  useEffect(() => () => {
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    for (const material of ownedMaterials) material.dispose();
    for (const geometry of ownedGeometries) geometry.dispose();
  }, [mixer, model, ownedGeometries, ownedMaterials]);

  return (
    <group ref={rootRef}>
      {playerCharacter && facingAngle === undefined && (
        <pointLight
          position={[0, 1.15, 0.18]}
          color="#ddb371"
          intensity={1.5}
          distance={3.8}
          decay={2}
        />
      )}
      <mesh
        geometry={GLB_CONTACT_SHADOW_GEOMETRY}
        material={GLB_CONTACT_SHADOW_MATERIAL}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.018, 0]}
        scale={[0.78, 0.52, 1]}
        dispose={null}
      />
      {selectedAction || staticPlayerModel ? (
        staticPlayerModel ? (
          <group ref={staticPoseRef}>
            <primitive
              object={model}
              rotation={[0, modelFacing, 0]}
              scale={modelScale}
              dispose={null}
            />
          </group>
        ) : (
          <primitive
            object={model}
            rotation={[0, modelFacing, 0]}
            scale={modelScale}
            dispose={null}
          />
        )
      ) : (
        <group scale={modelScale}>
          <Knight3D
            motionRef={motionRef}
            state={state}
            motionReduced={motionReduced}
            animationTimeScale={animationTimeScale}
            facingAngle={facingAngle}
            talking={talking}
            footSlipRef={footSlipRef}
            castShadow={castShadow}
            appearance={getFallbackAppearance(appearance, modelConfig)}
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
  const {
    modelConfig,
    modelAnimationState: _modelAnimationState,
    playerCharacter: _playerCharacter,
    ...knightProps
  } = props;
  const appearance = getFallbackAppearance(knightProps.appearance, modelConfig);
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
  const {
    modelConfig,
    modelAnimationState: _modelAnimationState,
    playerCharacter: _playerCharacter,
    ...knightProps
  } = props;
  const proceduralFallback = (
    <group scale={modelConfig?.scale ?? 1}>
      <Knight3D
        {...knightProps}
        appearance={getFallbackAppearance(knightProps.appearance, modelConfig)}
      />
    </group>
  );

  // Ambient rivals keep the procedural rig; only configured opponents and the
  // explicitly marked player load a GLB model.
  if (!modelConfig?.modelPath && !props.playerCharacter) return proceduralFallback;
  return (
    <ModelErrorBoundary fallback={proceduralFallback}>
      <Suspense fallback={<ModelLoadingFallback props={props} />}>
        <OptionalGlbKnight {...props} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
