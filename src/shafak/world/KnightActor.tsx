import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { MutableRefObject } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { CharacterAnimationState } from "./character-animation";
import { KNIGHT_CONFIG } from "./knight-config";
import {
  ensureKnightGeometryUVs,
  KNIGHT_SURFACE_MAPS,
  KNIGHT_SURFACE_NORMAL_SCALE,
} from "./knight-surface-detail";
import {
  getOpponentAnimationPlayback,
  createPlayerLocomotionClip,
  isRootTranslationTrack,
  resolveMappedGlbClipName,
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
  shouldRenderProceduralPlayerModel,
  shouldRenderPlayerModel,
} from "./player-model";
import { getKnightActorLocalPosition } from "./knight-actor-transform";
import { posePlayerRig, rigPlayerModel } from "./player-skeletal-rig";
import {
  createDuelWeapon,
  disposeDuelWeapon,
  normalizeDuelWeaponWorldSize,
} from "./duel-weapon";
import {
  fitCharacterModel,
  getCharacterBounds,
  getCharacterScreenCoverage,
  inspectCharacterSceneGraph,
  loadCharacter,
  prepareCharacterSkinnedMeshes,
  cloneCharacterResources,
  disposeCharacterResources,
  validateCharacterModel,
} from "./character-model";
import {
  applyOpponentBasePalette,
  attachOpponentCostume,
  shouldAttachOpponentCostume,
  type AttachedOpponentCostume,
} from "./opponent-costume";
import { findCharacterPoseBones, poseCharacterWithoutClip } from "./character-pose";
import { capWorldTextures } from "./texture-budget.ts";
import { getWorldGlowTexture } from "./world-glow.ts";
import { WORLD_MODEL_SIZE_TARGETS } from "./world-model-sizing.ts";
import ProceduralHero from "./ProceduralHero";

export type KnightActorProps = {
  motionRef: MutableRefObject<WorldMotion>;
  state: CharacterAnimationState;
  motionReduced: boolean;
  animationTimeScale?: number;
  animationPaused?: boolean;
  facingAngle?: number;
  debugUpright?: boolean;
  talking?: boolean;
  footSlipRef?: MutableRefObject<number>;
  castShadow?: boolean;
  appearance?: EquipmentVisual;
  modelConfig?: OpponentModelConfig;
  modelAnimationState?: ModelAnimationState;
  playerCharacter?: boolean;
  useInGamePlayerModel?: boolean;
  positionedByParent?: boolean;
  targetHeight?: number;
  characterLabel?: string;
};

const warnedModelPaths = new Set<string>();
const loggedCharacterFraming = new Set<string>();
const loggedPlayerSceneGraphs = new Set<string>();
const loggedOpponentMaterialNames = new Set<string>();

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
      float alpha = (1.0 - smoothstep(0.24, 0.86, radius)) * 0.56;
      gl_FragColor = vec4(0.018, 0.014, 0.012, alpha);
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
  model: THREE.Object3D,
  resources: ReturnType<typeof cloneCharacterResources>,
  modelPath: string,
  modelConfig?: OpponentModelConfig,
  castShadow = true,
  playerCharacter = false,
  appearance?: EquipmentVisual,
  targetHeight: number = WORLD_MODEL_SIZE_TARGETS.player.targetHeight,
  targetMaxDimension: number = WORLD_MODEL_SIZE_TARGETS.player.maxDimension,
  preserveOriginalPlayerMaterials = false,
) {
  if (modelConfig?.modelRotation) model.rotation.set(...modelConfig.modelRotation);
  fitCharacterModel(
    model,
    targetHeight,
    modelPath,
    targetMaxDimension / (modelConfig?.scale ?? 1),
  );
  const validation = validateCharacterModel(model, targetHeight);
  if (!validation.valid) {
    console.warn("[shafak-model] Character rig validation failed.", {
      model: modelPath,
      issues: validation.issues,
    });
  }
  prepareCharacterSkinnedMeshes(model);
  inspectModelBudget(model, modelPath);
  model.traverse((object) => {
    if (object instanceof THREE.Mesh) object.castShadow = castShadow;
  });
  const ownedMaterials = resources.materials;
  let alreadyRigged = false;
  model.traverse((object) => {
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) alreadyRigged = true;
  });
  const playerRig = playerCharacter && !alreadyRigged ? rigPlayerModel(model) : null;
  const ownedGeometries = resources.geometries;
  if (playerRig) ownedGeometries.push(playerRig.ownedGeometry);
  const paletteAppearance = modelConfig?.appearance ?? (playerCharacter ? appearance : undefined);
  const materialNameAliases = modelConfig?.materialNameAliases
    ?? (playerCharacter ? PLAYER_CHARACTER_MATERIAL_ALIASES : undefined);
  const materialPalette = modelConfig?.materialPalette;
  const isOpponentModel = Boolean(modelConfig && !playerCharacter);
  const tintColor = modelConfig?.tintColor ? new THREE.Color(modelConfig.tintColor) : null;

  if (isOpponentModel && !loggedOpponentMaterialNames.has(modelPath)) {
    const names = new Set<string>();
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => names.add(material.name || "(unnamed)"));
    });
    loggedOpponentMaterialNames.add(modelPath);
    console.info("[shafak-model] Rival material names", { model: modelPath, materials: [...names] });
  }

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const originalMaterials = Array.isArray(object.material) ? object.material : [object.material];
    let changed = false;
    const materials = originalMaterials.map((original) => {
      if (playerCharacter && preserveOriginalPlayerMaterials) return original;
      if (modelConfig?.isDemirTac) return original;
      const materialName = normalizeMaterialName(original.name);
      const meshName = normalizeMaterialName(object.name);
      const preserveOriginal = modelConfig?.preserveOriginalMaterialAliases?.some((alias) => {
        const normalizedAlias = normalizeMaterialName(alias);
        return materialName.includes(normalizedAlias) || meshName.includes(normalizedAlias);
      }) ?? false;
      if (preserveOriginal) return original;
      const aliases = materialNameAliases;
      const matches = (values: readonly string[] | undefined) =>
        values?.some((alias) => {
          const normalizedAlias = normalizeMaterialName(alias);
          return materialName.includes(normalizedAlias) || meshName.includes(normalizedAlias);
        }) ?? false;
      const isCape = matches(aliases?.cape);
      const isAccent = matches(aliases?.accent);
      const isArmorLight = matches(aliases?.armorLight);
      const isArmorDark = matches(aliases?.armorDark);
      const isSkin = matches(aliases?.skin);
      const isHair = matches(aliases?.hair);
      const isClothing = matches(aliases?.clothing);
      const isPants = matches(aliases?.pants);
      const isBoots = matches(aliases?.boots);
      const isArmor = matches(aliases?.armor);
      const hasSurfaceDetail = isArmor || isArmorLight || isArmorDark || isAccent;
      const color = !paletteAppearance
        ? undefined
        : isCape
        ? paletteAppearance.cape
        : isAccent
          ? paletteAppearance.trim
          : isArmorLight
            ? paletteAppearance.armorLight
            : isSkin
              ? materialPalette?.skin
              : isHair
                ? materialPalette?.hair
                : isClothing
                  ? materialPalette?.clothing
                  : isPants
                    ? materialPalette?.pants
                    : isBoots
                      ? materialPalette?.boots
                      : isArmorDark
                        ? paletteAppearance.armorDark
                        : isArmor
                          ? paletteAppearance.armor
                          : isOpponentModel
                            ? materialPalette?.default
                            : undefined;
      const needsPhysicalTuning = isOpponentModel
        || (original instanceof THREE.MeshStandardMaterial
          && (original.metalness > 0.2 || original.roughness < 0.62));
      if (!isOpponentModel && !color && !hasSurfaceDetail && !tintColor && !needsPhysicalTuning) return original;
      const originalColor = (original as THREE.Material & { color?: THREE.Color }).color;
      if (color && !originalColor?.isColor && !isOpponentModel) return original;

      const customized = original.clone();
      const materialColor = (customized as THREE.Material & { color?: THREE.Color }).color;
      if (color && !materialColor?.isColor && !isOpponentModel) {
        customized.dispose();
        return original;
      }
      if (color && materialColor?.isColor) materialColor.set(color);
      else if (tintColor && materialColor?.isColor) {
        materialColor.lerp(tintColor, modelConfig?.tintStrength ?? 0.68);
      }
      if (isOpponentModel && customized instanceof THREE.MeshStandardMaterial) {
        const isDemirTac = modelConfig?.isDemirTac === true;
        customized.metalness = Math.min(customized.metalness, isDemirTac ? 0.68 : 0.3);
        customized.roughness = Math.max(customized.roughness, isDemirTac ? 0.5 : 0.76);
      } else if (customized instanceof THREE.MeshStandardMaterial) {
        customized.metalness = Math.min(customized.metalness, 0.2);
        customized.roughness = Math.max(customized.roughness, 0.62);
      }
      if (!isOpponentModel && hasSurfaceDetail) {
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

  if (modelConfig) applyOpponentBasePalette(model, modelConfig);

  return {
    model,
    ownedMaterials,
    ownedGeometries,
    ownedTextures: resources.textures,
    ownedResources: resources,
    playerRig,
  };
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

function CharacterCapsule({
  height,
  color,
  castShadow = true,
}: {
  height: number;
  color?: string;
  castShadow?: boolean;
}) {
  const radius = Math.min(0.24, height * 0.15);
  const cylindricalHeight = Math.max(0.08, height - radius * 2);
  return (
    <mesh
      position={[0, height / 2, 0]}
      castShadow={castShadow}
      receiveShadow
    >
      <capsuleGeometry args={[radius, cylindricalHeight, 4, 10]} />
      <meshStandardMaterial
        color={color ?? "#3b342e"}
        metalness={0.12}
        roughness={0.82}
      />
    </mesh>
  );
}

function OptionalGlbKnight({
  motionRef,
  state,
  modelAnimationState,
  motionReduced,
  animationTimeScale = 1,
  animationPaused = false,
  facingAngle,
  debugUpright = false,
  footSlipRef,
  appearance,
  modelConfig,
  castShadow = true,
  playerCharacter = false,
  useInGamePlayerModel = false,
  positionedByParent = false,
  targetHeight: targetHeightOverride,
  characterLabel,
}: KnightActorProps) {
  const { camera: activeCamera, size } = useThree();
  const modelPath = modelConfig?.modelPath ?? PLAYER_CHARACTER_MODEL_PATH;
  const gltf = useLoader(GLTFLoader, modelPath, loadCharacter) as GLTF;
  const actorGlowTexture = useMemo(() => getWorldGlowTexture(), []);
  const rootRef = useRef<THREE.Group>(null);
  const warnedTiltRef = useRef(false);
  const rootBoneName = modelConfig?.rootBoneName
    ?? PLAYER_CHARACTER_ROOT_BONE;
  const animationClipMap = modelConfig?.animationClips
    ?? PLAYER_CHARACTER_ANIMATION_CLIPS;
  const targetHeight = targetHeightOverride
    ?? modelConfig?.targetHeight
    ?? WORLD_MODEL_SIZE_TARGETS.player.targetHeight;
  const targetMaxDimension = modelConfig?.maxDimension ?? WORLD_MODEL_SIZE_TARGETS.player.maxDimension;
  const { model, playerRig, ownedResources } = useMemo(
    () => {
      capWorldTextures(gltf.scene);
      const model = cloneSkinned(gltf.scene);
      const resources = cloneCharacterResources(model);
      return prepareModel(
        model,
        resources,
        modelPath,
        modelConfig,
        castShadow,
        playerCharacter,
        appearance,
        targetHeight,
        targetMaxDimension,
        useInGamePlayerModel,
      );
    },
    [
      gltf.scene,
      modelPath,
      modelConfig,
      castShadow,
      playerCharacter,
      appearance,
      targetHeight,
      targetMaxDimension,
      useInGamePlayerModel,
    ],
  );
  const equippedHand = playerCharacter || modelConfig
    ? playerRig?.bones.Rig_RightHand
      ?? [
        "Rig_RightHand",
        "mixamorigRightHand",
        "FistR",
        "Fist.R",
        "RightHand",
        "RightHandBone",
        "DEF-hand.R",
        "DEF-handR",
      ].map((name) => model.getObjectByName(name)).find(Boolean)
    : undefined;
  const weaponAppearance = getFallbackAppearance(appearance, modelConfig);
  useEffect(() => {
    if (!equippedHand) return undefined;
    const weapon = createDuelWeapon(weaponAppearance);
    equippedHand.add(weapon);
    const style = weaponAppearance?.weaponStyle ?? "sword";
    const targetWorldDimension = style === "daggers"
      ? 0.42
      : style === "spear" || style === "staff"
        ? 1.15
        : style === "axe" || style === "mace" || style === "bow"
          ? 0.8
          : 1;
    normalizeDuelWeaponWorldSize(weapon, targetWorldDimension);
    return () => {
      equippedHand.remove(weapon);
      disposeDuelWeapon(weapon);
    };
  }, [
    equippedHand,
    weaponAppearance?.auraColor,
    weaponAppearance?.trim,
    weaponAppearance?.weaponColor,
    weaponAppearance?.weaponStyle,
  ]);
  const opponentCostumeRef = useRef<AttachedOpponentCostume | null>(null);
  useEffect(() => {
    if (!modelConfig || playerCharacter || !shouldAttachOpponentCostume(modelConfig)) return undefined;
    const costume = attachOpponentCostume(model, modelConfig, appearance ?? modelConfig.appearance);
    opponentCostumeRef.current = costume;
    return () => {
      if (opponentCostumeRef.current === costume) opponentCostumeRef.current = null;
      costume.dispose();
    };
  }, [appearance, model, modelConfig, modelPath, playerCharacter, targetHeight, targetMaxDimension]);
  useEffect(() => {
    if (!playerCharacter) return undefined;
    const diagnosticKey = `${modelPath}:${targetHeight}`;
    if (loggedPlayerSceneGraphs.has(diagnosticKey)) return undefined;
    const frameId = requestAnimationFrame(() => {
      const playerRoot = rootRef.current;
      if (!playerRoot) return;
      playerRoot.updateMatrixWorld(true);
      const rows = inspectCharacterSceneGraph(playerRoot, model, modelPath);
      const meshRows = rows.filter((row) => row.isMesh);
      const oversizedMeshes = meshRows.filter((row) =>
        Math.max(row.worldSizeM.x, row.worldSizeM.y, row.worldSizeM.z) > 3);
      loggedPlayerSceneGraphs.add(diagnosticKey);
      console.info("[shafak-model] Player group Object3D/Mesh diagnostics", rows);
      console.info("[shafak-model] DEV PARÇA (>3 m)", oversizedMeshes.length ? oversizedMeshes : "none");
      console.info("[shafak-model] Player group mesh count", {
        total: meshRows.length,
        skinned: meshRows.filter((row) => row.type === "SkinnedMesh").length,
        modelPath,
      });
    });
    return () => cancelAnimationFrame(frameId);
  }, [model, modelPath, playerCharacter, targetHeight]);
  const poseBones = useMemo(() => findCharacterPoseBones(model), [model]);
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const animationClips = useMemo(() => {
    if (!rootBoneName && !playerCharacter) return gltf.animations;
    return gltf.animations.map((clip) => {
      const inPlaceClip = clip.clone();
      if (rootBoneName) {
        inPlaceClip.tracks = inPlaceClip.tracks.filter(
          (track) => !isRootTranslationTrack(track.name, rootBoneName),
        );
      }
      return playerCharacter
        ? createPlayerLocomotionClip(inPlaceClip)
        : inPlaceClip;
    });
  }, [gltf.animations, playerCharacter, rootBoneName]);
  const actions = useMemo(() => {
    const entries = animationClips.map((clip) => [clip.name, mixer.clipAction(clip)] as const);
    return new Map(entries);
  }, [animationClips, mixer]);
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  const clipState = modelAnimationState ?? state;
  const selectedClip = playerCharacter
    ? resolveMappedGlbClipName(clipState, animationClips.map((clip) => clip.name), animationClipMap)
    : resolveGlbClipName(clipState, animationClips.map((clip) => clip.name), animationClipMap);
  const selectedAction = selectedClip ? actions.get(selectedClip) ?? null : null;
  const staticPlayerModel = shouldRenderPlayerModel(playerCharacter, animationClips.length);
  const proceduralPoseEnabled = playerCharacter ? staticPlayerModel : !selectedAction;
  const modelFacing = modelConfig?.modelFacing
    ?? (playerCharacter ? PLAYER_CHARACTER_MODEL_FACING : KNIGHT_CONFIG.modelFacing);
  const staticPoseRef = useRef<THREE.Group>(null);
  const previousStaticState = useRef(state);
  const staticActionElapsed = useRef(0);
  const previousFallbackState = useRef(state);
  const fallbackActionElapsed = useRef(0);
  const framingDiagnosticElapsed = useRef(0);

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
      root.position.set(...getKnightActorLocalPosition(
        motion.depth,
        motion.jumpHeight,
        positionedByParent,
      ));
      root.scale.set(1, 1, 1);
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
    if (animationPaused) {
      if (footSlipRef) footSlipRef.current = 0;
      return;
    }
    opponentCostumeRef.current?.update(frame.clock.elapsedTime);
    if (previousFallbackState.current !== state) {
      previousFallbackState.current = state;
      fallbackActionElapsed.current = 0;
    } else {
      fallbackActionElapsed.current += dt * animationTimeScale;
    }
    if (proceduralPoseEnabled && staticPoseRef.current) {
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
    if (
      poseBones
      && (!selectedAction || playerCharacter && (state === "block" || state === "jump" || motion.crouching))
    ) {
      poseCharacterWithoutClip(
        poseBones,
        state,
        Math.hypot(motion.velocityX, motion.velocityY),
        motion.stepPhase,
        THREE.MathUtils.clamp(fallbackActionElapsed.current / 0.42, 0, 1),
        motion.crouching,
        motionReduced,
        frame.clock.elapsedTime,
        Boolean(selectedAction),
      );
    }
    if (footSlipRef) footSlipRef.current = 0;

    const motionMode = Math.hypot(motion.velocityX, motion.velocityY) > 0.25 ? "run" : "idle";
    const diagnosticKey = `${modelPath}:${targetHeight}:${motionMode}`;
    if (root && !loggedCharacterFraming.has(diagnosticKey)) {
      framingDiagnosticElapsed.current += dt;
      if (framingDiagnosticElapsed.current >= 1) {
        root.updateMatrixWorld(true);
        activeCamera.updateMatrixWorld(true);
        const bounds = getCharacterBounds(model);
        const characterOrigin = root.getWorldPosition(new THREE.Vector3());
        const cameraPosition = activeCamera.getWorldPosition(new THREE.Vector3());
        const cameraRelative = cameraPosition.clone().sub(characterOrigin)
          .applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()).invert());
        const coverage = getCharacterScreenCoverage(model, activeCamera, size.width, size.height);
        loggedCharacterFraming.add(diagnosticKey);
        console.info("[shafak-model] Character camera framing", {
          model: modelPath,
          motionMode,
          characterHeight: Number((bounds.max.y - bounds.min.y).toFixed(3)),
          cameraDistance: Number(cameraPosition.distanceTo(characterOrigin).toFixed(3)),
          cameraBehind: Number(Math.abs(cameraRelative.z).toFixed(3)),
          screenHeightPercent: Number((coverage.height * 100).toFixed(1)),
          screenAreaPercent: Number((coverage.area * 100).toFixed(1)),
          cameraInsideModelBounds: bounds.containsPoint(cameraPosition),
        });
      }
    }
  });

  useEffect(() => () => {
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    disposeCharacterResources(ownedResources);
  }, [mixer, model, ownedResources]);

  return (
    <group ref={rootRef} name={playerCharacter ? "player-actor-root" : "character-actor-root"}>
      {playerCharacter && facingAngle === undefined && actorGlowTexture && (
        <sprite position={[0, 1.15, 0.18]} scale={[2.5, 2.5, 1]}>
          <spriteMaterial
            map={actorGlowTexture}
            color="#ddb371"
            transparent
            opacity={0.24}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      )}
      <mesh
        name="player-contact-shadow"
        geometry={GLB_CONTACT_SHADOW_GEOMETRY}
        material={GLB_CONTACT_SHADOW_MATERIAL}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.018, 0]}
        scale={[0.78, 0.52, 1]}
        dispose={null}
      />
      <group scale={modelConfig?.scale ?? 1}>
        <group ref={proceduralPoseEnabled ? staticPoseRef : undefined}>
          <group rotation={[0, modelFacing, 0]}>
            <primitive object={model} dispose={null} />
          </group>
        </group>
        {modelConfig?.isBoss && (
          <group position={[0, targetHeight * 0.9, 0]} rotation={[0, modelFacing, 0]}>
          {actorGlowTexture && (
            <sprite position={[0, 0, 0.2]} scale={[2.1, 2.1, 1]}>
              <spriteMaterial
                map={actorGlowTexture}
                color="#ff2638"
                transparent
                opacity={0.24}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </sprite>
          )}
          {[-0.075, 0.075].map((x) => (
            <mesh key={x} position={[x, 0, 0.1]}>
              <sphereGeometry args={[0.034, 8, 6]} />
              <meshBasicMaterial color="#ff2638" toneMapped={false} />
            </mesh>
          ))}
          </group>
        )}
      </group>
    </group>
  );
}

function ProceduralPlayerKnight({
  motionRef,
  state,
  motionReduced,
  animationTimeScale = 1,
  animationPaused = false,
  facingAngle,
  footSlipRef,
  appearance,
  modelConfig,
  castShadow = true,
  positionedByParent = false,
  targetHeight: targetHeightOverride,
}: KnightActorProps) {
  const rootRef = useRef<THREE.Group>(null);
  const warnedTiltRef = useRef(false);
  const actorGlowTexture = useMemo(() => getWorldGlowTexture(), []);
  const targetHeight = targetHeightOverride
    ?? modelConfig?.targetHeight
    ?? WORLD_MODEL_SIZE_TARGETS.player.targetHeight;
  const weaponAppearance = getFallbackAppearance(appearance, modelConfig);

  useFrame((_frame, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const motion = motionRef.current;
    const dt = Math.min(Math.max(delta, 0), 0.05);
    root.position.set(...getKnightActorLocalPosition(
      motion.depth,
      motion.jumpHeight,
      positionedByParent,
    ));
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
      const targetYaw = facingAngle - PLAYER_CHARACTER_MODEL_FACING;
      const turn = Math.atan2(
        Math.sin(targetYaw - root.rotation.y),
        Math.cos(targetYaw - root.rotation.y),
      );
      root.rotation.y += turn * (1 - Math.exp(-dt * 10));
    }
    root.rotation.set(...getUprightDuelRotation(root.rotation.y));

    const tilted = Math.abs(root.rotation.x) > 0.05 || Math.abs(root.rotation.z) > 0.05;
    if (tilted && !warnedTiltRef.current) {
      console.warn("[shafak-player] Procedural actor root tilt exceeded 0.05 radians.", {
        x: root.rotation.x,
        z: root.rotation.z,
        state,
      });
    }
    warnedTiltRef.current = tilted;
    if (!animationPaused && footSlipRef) footSlipRef.current = 0;
  });

  return (
    <group ref={rootRef} name="player-actor-root">
      {facingAngle === undefined && actorGlowTexture && (
        <sprite position={[0, 1.15, 0.18]} scale={[2.5, 2.5, 1]}>
          <spriteMaterial
            map={actorGlowTexture}
            color="#ddb371"
            transparent
            opacity={0.24}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      )}
      <mesh
        name="player-contact-shadow"
        geometry={GLB_CONTACT_SHADOW_GEOMETRY}
        material={GLB_CONTACT_SHADOW_MATERIAL}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.018, 0]}
        scale={[0.78, 0.52, 1]}
        dispose={null}
      />
      <group scale={modelConfig?.scale ?? 1}>
        <group rotation={[0, PLAYER_CHARACTER_MODEL_FACING, 0]}>
          <ProceduralHero
            motionRef={motionRef}
            state={state}
            motionReduced={motionReduced}
            animationTimeScale={animationTimeScale}
            animationPaused={animationPaused}
            appearance={weaponAppearance}
            showWeapon
            targetHeight={targetHeight}
          />
        </group>
      </group>
    </group>
  );
}

type BoundaryProps = { children: ReactNode; fallback: ReactNode };
type BoundaryState = { failed: boolean };

function ModelLoadingFallback({ props }: { props: KnightActorProps }) {
  const { progress } = useProgress();
  const { modelConfig, appearance, castShadow = true } = props;
  const targetHeight = props.targetHeight
    ?? modelConfig?.targetHeight
    ?? WORLD_MODEL_SIZE_TARGETS.player.targetHeight;
  return (
    <>
      <group scale={modelConfig?.scale ?? 1}>
        <CharacterCapsule
          height={targetHeight}
          color={getFallbackAppearance(appearance, modelConfig)?.armorDark}
          castShadow={castShadow}
        />
      </group>
      {modelConfig && (
        <Html position={[0, targetHeight + 0.3, 0]} center distanceFactor={9} zIndexRange={[30, 0]}>
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
    appearance,
    castShadow = true,
    playerCharacter = false,
    useInGamePlayerModel = false,
    targetHeight: targetHeightOverride,
  } = props;
  if (shouldRenderProceduralPlayerModel(playerCharacter, useInGamePlayerModel)) {
    return <ProceduralPlayerKnight {...props} />;
  }
  const targetHeight = targetHeightOverride
    ?? modelConfig?.targetHeight
    ?? WORLD_MODEL_SIZE_TARGETS.player.targetHeight;
  const proceduralFallback = (
    <group scale={modelConfig?.scale ?? 1}>
      <CharacterCapsule
        height={targetHeight}
        color={getFallbackAppearance(appearance, modelConfig)?.armorDark}
        castShadow={castShadow}
      />
    </group>
  );

  return (
    <ModelErrorBoundary fallback={proceduralFallback}>
      <Suspense fallback={<ModelLoadingFallback props={props} />}>
        <OptionalGlbKnight {...props} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
