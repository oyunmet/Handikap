import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { clone as cloneSkinnedModel } from "three/addons/utils/SkeletonUtils.js";
import type { CharacterAnimationState } from "./character-animation";
import {
  captureCharacterPoseBaseline,
  findCharacterPoseBones,
  poseCharacterWithoutClip,
  restoreCharacterPoseBaseline,
} from "./character-pose";
import type { WorldMotion } from "./movement";
import { KNIGHT_CONFIG } from "./knight-config";
import { isRootTranslationTrack, prepareWorldActorClips } from "./model-animation";
import type { LoadedWorldAsset } from "./world-v2-assets";
import { cloneWorldCharacter, disposeWorldCharacter } from "./world-v2-assets";
import { getWorldV2Heading, getWorldV2YawDelta, WORLD_V2_CONFIG } from "./world-v2-config";
import type { OpponentModelConfig } from "./opponent-model-config";
import {
  applyOpponentBasePalette,
  attachOpponentCostume,
  shouldAttachOpponentCostume,
  type AttachedOpponentCostume,
} from "./opponent-costume";
import {
  createDuelWeapon,
  disposeDuelWeapon,
  normalizeDuelWeaponWorldSize,
} from "./duel-weapon";

export type WorldV2ActorDebugSnapshot = {
  yaw: number;
  targetHeading: number;
  visibleHeading: number;
  clipName: string;
  clipWeight: number;
  rootRotation: [number, number, number] | null;
  hipsRotation: [number, number, number] | null;
  torsoRotation: [number, number, number] | null;
  bodyLean: number;
  rootMotionTracks: string[];
};

type Props = {
  asset: LoadedWorldAsset;
  motionRef: MutableRefObject<WorldMotion>;
  debugRef?: MutableRefObject<WorldV2ActorDebugSnapshot | null>;
  isPlayer: boolean;
  distance?: number;
  x?: number;
  tint?: string;
  animationState?: CharacterAnimationState;
  localToParent?: boolean;
  modelConfig?: OpponentModelConfig;
};

type JumpEcho = {
  object: THREE.Object3D;
  bonePairs: [THREE.Bone, THREE.Bone][];
  materials: THREE.Material[];
};

function resolveClip(animations: THREE.AnimationClip[], state: CharacterAnimationState) {
  const aliases = KNIGHT_CONFIG.animationClips[state] as readonly string[];
  const normalizedNames = aliases.map((name) => name.toLowerCase());
  return animations.find((clip) => normalizedNames.includes(clip.name.toLowerCase()))
    ?? animations.find((clip) => clip.name.toLowerCase().includes(state.toLowerCase()))
    ?? animations.find((clip) => clip.name.toLowerCase().includes("idle"))
    ?? animations[0];
}

function readLocalRotation(object: THREE.Object3D | undefined): [number, number, number] | null {
  if (!object) return null;
  return [object.rotation.x, object.rotation.y, object.rotation.z];
}

export default function WorldV2Actor({
  asset,
  motionRef,
  debugRef,
  isPlayer,
  distance = 0,
  x = 0,
  tint,
  animationState = "idle",
  localToParent = false,
  modelConfig,
}: Props) {
  const rootRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const shadowMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const impactRingRef = useRef<THREE.Mesh>(null);
  const impactRingMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const previousMovementStateRef = useRef<WorldMotion["movementState"] | null>(null);
  const impactRingSecondsRef = useRef(0);
  const jumpEchoSecondsRef = useRef(0);
  const model = useMemo(() => {
    const clone = cloneWorldCharacter(asset, tint);
    if (modelConfig) applyOpponentBasePalette(clone, modelConfig);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = false;
    });
    return clone;
  }, [asset, modelConfig, tint]);
  const jumpEcho = useMemo<JumpEcho | null>(() => {
    if (!isPlayer) return null;
    const object = cloneSkinnedModel(model);
    object.visible = false;
    object.position.z = 0.32;
    const sourceBones: THREE.Bone[] = [];
    const echoBones: THREE.Bone[] = [];
    const materials: THREE.Material[] = [];
    model.traverse((node) => {
      if (node instanceof THREE.Bone) sourceBones.push(node);
    });
    object.traverse((node) => {
      if (node instanceof THREE.Bone) echoBones.push(node);
      if (!(node instanceof THREE.Mesh)) return;
      const cloneMaterial = (material: THREE.Material) => {
        const clone = material.clone();
        clone.transparent = true;
        clone.opacity = 0.28;
        clone.depthWrite = false;
        if ("color" in clone && clone.color instanceof THREE.Color) clone.color.set("#a7d9f1");
        if ("emissive" in clone && clone.emissive instanceof THREE.Color) clone.emissive.set("#426d91");
        materials.push(clone);
        return clone;
      };
      node.material = Array.isArray(node.material)
        ? node.material.map(cloneMaterial)
        : cloneMaterial(node.material);
    });
    const bonePairs: JumpEcho["bonePairs"] = [];
    const pairCount = Math.min(sourceBones.length, echoBones.length);
    for (let index = 0; index < pairCount; index += 1) {
      const source = sourceBones[index];
      const echo = echoBones[index];
      if (source && echo) bonePairs.push([source, echo]);
    }
    return { object, bonePairs, materials };
  }, [isPlayer, model]);
  const animations = useMemo(
    () => prepareWorldActorClips(asset.url, asset.animations),
    [asset],
  );
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const poseBones = useMemo(() => findCharacterPoseBones(model), [model]);
  const poseBaseline = useMemo(() => captureCharacterPoseBaseline(poseBones), [poseBones]);
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const actionsRef = useRef(new Map<string, THREE.AnimationAction>());
  const activeClipNameRef = useRef("");
  const debugRefreshElapsed = useRef(0);
  const opponentCostumeRef = useRef<AttachedOpponentCostume | null>(null);
  const playerPosition = useMemo(() => new THREE.Vector3(), []);
  const playerFacingAngle = useRef(0);

  useEffect(() => {
    activeActionRef.current = null;
    activeClipNameRef.current = "";
    actionsRef.current.clear();
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      activeActionRef.current = null;
      activeClipNameRef.current = "";
      actionsRef.current.clear();
      disposeWorldCharacter(model);
    };
  }, [mixer, model]);

  useEffect(() => () => {
    jumpEcho?.object.traverse((node) => {
      if (node instanceof THREE.SkinnedMesh) node.skeleton.dispose();
    });
    jumpEcho?.materials.forEach((material) => material.dispose());
  }, [jumpEcho]);

  useEffect(() => {
    if (isPlayer || !modelConfig || !shouldAttachOpponentCostume(modelConfig)) return undefined;
    const costume = attachOpponentCostume(model, modelConfig, modelConfig.appearance);
    opponentCostumeRef.current = costume;
    return () => {
      if (opponentCostumeRef.current === costume) opponentCostumeRef.current = null;
      costume.dispose();
    };
  }, [isPlayer, model, modelConfig]);

  useEffect(() => {
    if (isPlayer || !modelConfig?.isDemirTac) return undefined;
    const hand = model.getObjectByName("FistR") ?? model.getObjectByName("Fist1R");
    if (!hand) {
      console.warn("[shafak-world] Demir Taç's animated rig has no right-hand weapon mount.");
      return undefined;
    }
    const weapon = createDuelWeapon(modelConfig.appearance);
    hand.add(weapon);
    normalizeDuelWeaponWorldSize(weapon, 1);
    return () => {
      hand.remove(weapon);
      disposeDuelWeapon(weapon);
    };
  }, [isPlayer, model, modelConfig]);

  useFrame((frame, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const motion = motionRef.current;
    const movementState = motion.movementState;
    const previousMovementState = previousMovementStateRef.current;
    if (
      isPlayer
      && previousMovementState !== movementState
      && (movementState === "HAVADA_YUKARI" || movementState === "İNİŞ")
    ) {
      impactRingSecondsRef.current = 0.28;
      if (movementState === "HAVADA_YUKARI") jumpEchoSecondsRef.current = 0.16;
    }
    previousMovementStateRef.current = movementState;
    impactRingSecondsRef.current = Math.max(0, impactRingSecondsRef.current - Math.min(delta, 0.05));
    jumpEchoSecondsRef.current = Math.max(0, jumpEchoSecondsRef.current - Math.min(delta, 0.05));
    const impactRingProgress = 1 - impactRingSecondsRef.current / 0.28;
    if (impactRingRef.current && impactRingMaterialRef.current) {
      impactRingRef.current.visible = impactRingSecondsRef.current > 0;
      impactRingRef.current.scale.setScalar(1 + impactRingProgress * 1.8);
      impactRingMaterialRef.current.opacity = Math.max(0, impactRingSecondsRef.current / 0.28) * 0.56;
    }
    if (jumpEcho) {
      const echoOpacity = Math.max(0, jumpEchoSecondsRef.current / 0.16) * 0.28;
      jumpEcho.object.visible = jumpEchoSecondsRef.current > 0;
      if (jumpEcho.object.visible) {
        for (const [source, echo] of jumpEcho.bonePairs) {
          echo.position.copy(source.position);
          echo.quaternion.copy(source.quaternion);
          echo.scale.copy(source.scale);
        }
        for (const material of jumpEcho.materials) material.opacity = echoOpacity;
      }
    }
    const jumpHeight = isPlayer ? Math.max(0, motion.jumpHeight) : 0;
    if (shadowRef.current && shadowMaterialRef.current && isPlayer) {
      shadowRef.current.scale.set(0.54 + jumpHeight * 0.14, 0.78 + jumpHeight * 0.14, 1);
      shadowMaterialRef.current.opacity = Math.max(0.08, 0.42 - jumpHeight * 0.22);
    }
    playerPosition.set(motion.depth * 5.2, 0, -(motion.distance - motion.cameraX));
    const targetHeading = getWorldV2Heading(
      motion.velocityX,
      motion.velocityY,
      playerFacingAngle.current,
    );

    if (isPlayer) {
      root.position.set(playerPosition.x, motion.jumpHeight, playerPosition.z);
      const standingScaleY = typeof root.userData.worldStandingScaleY === "number"
        ? root.userData.worldStandingScaleY as number
        : root.scale.y;
      const standingScaleX = typeof root.userData.worldStandingScaleX === "number"
        ? root.userData.worldStandingScaleX as number
        : root.scale.x;
      const standingScaleZ = typeof root.userData.worldStandingScaleZ === "number"
        ? root.userData.worldStandingScaleZ as number
        : root.scale.z;
      root.userData.worldStandingScaleY = standingScaleY;
      root.userData.worldStandingScaleX = standingScaleX;
      root.userData.worldStandingScaleZ = standingScaleZ;
      const jumpScaleY = movementState === "ZIPLAMA_HAZIRLIK"
        ? 0.94
        : movementState === "HAVADA_YUKARI"
          ? 1.06
          : movementState === "İNİŞ"
            ? 0.92
            : 1;
      const jumpScaleXZ = jumpScaleY > 1
        ? 1 - (jumpScaleY - 1) * 0.45
        : 1 + (1 - jumpScaleY) * 0.45;
      const deltaSeconds = Math.min(delta, 0.05);
      root.scale.y = THREE.MathUtils.damp(
        root.scale.y,
        standingScaleY * (motion.crouching ? 0.72 : 1) * jumpScaleY,
        18,
        deltaSeconds,
      );
      root.scale.x = THREE.MathUtils.damp(root.scale.x, standingScaleX * jumpScaleXZ, 18, deltaSeconds);
      root.scale.z = THREE.MathUtils.damp(root.scale.z, standingScaleZ * jumpScaleXZ, 18, deltaSeconds);
      if (Math.hypot(motion.velocityX, motion.velocityY) >= 0.12) {
        playerFacingAngle.current = targetHeading;
      }
      // The model-axis group below applies the single native +Z to -Z correction.
      const yawDelta = getWorldV2YawDelta(targetHeading, root.rotation.y);
      root.rotation.y += yawDelta * (1 - Math.exp(-9 * Math.min(delta, 0.05)));
    } else {
      const actorZ = -(distance - motion.cameraX);
      root.position.set(localToParent ? 0 : x, 0, localToParent ? 0 : actorZ);
      const directionX = playerPosition.x - x;
      const directionZ = playerPosition.z - actorZ;
      root.rotation.y = Math.atan2(directionX, directionZ);
    }

    const state = isPlayer ? animationState : "idle";
    const clip = resolveClip(animations, state);
    if (clip && clip.name !== activeClipNameRef.current) {
      const nextAction = mixer.clipAction(clip);
      nextAction.reset().fadeIn(0.16).play();
      actionsRef.current.set(clip.name, nextAction);
      activeActionRef.current?.fadeOut(0.16);
      activeActionRef.current = nextAction;
      activeClipNameRef.current = clip.name;
    }
    if (activeActionRef.current) {
      const speed = Math.hypot(motion.velocityX, motion.velocityY);
      activeActionRef.current.timeScale = state === "run"
        ? THREE.MathUtils.clamp(speed / 6, 0.78, 1.38)
        : state === "walk"
          ? THREE.MathUtils.clamp(speed / 3.4, 0.72, 1.2)
          : 1;
    }
    if (isPlayer) restoreCharacterPoseBaseline(poseBones, poseBaseline);
    mixer.update(Math.min(delta, 0.05));
    if (isPlayer) {
      poseCharacterWithoutClip(
        poseBones,
        state,
        Math.hypot(motion.velocityX, motion.velocityY),
        motion.stepPhase,
        0,
        motion.crouching,
        false,
        frame.clock.elapsedTime,
        Boolean(activeActionRef.current),
        false,
        {
          movementState,
          jumpHeight: motion.jumpHeight,
          jumpVelocity: motion.jumpVelocity,
        },
      );
    }
    opponentCostumeRef.current?.update(frame.clock.elapsedTime);
    root.userData.worldCharacterYaw = root.rotation.y;
    root.userData.worldAnimationClips = isPlayer
      ? [{ name: animationState, weight: 1 }]
      : [...actionsRef.current.values()]
        .filter((action) => action.isScheduled() && action.getEffectiveWeight() > 0.001)
        .map((action) => ({
          name: action.getClip().name,
          weight: action.getEffectiveWeight(),
        }));
    if (isPlayer && debugRef) {
      debugRefreshElapsed.current += Math.min(delta, 0.1);
      if (debugRefreshElapsed.current < 0.2) return;
      debugRefreshElapsed.current %= 0.2;
      const debugModel = model;
      debugModel.updateWorldMatrix(true, true);
      const rootBone = debugModel.getObjectByName("Root");
      const hipsBone = debugModel.getObjectByName("Hips");
      const torsoBone = debugModel.getObjectByName("Torso");
      const headBone = debugModel.getObjectByName("Head");
      let bodyLean = 0;
      if (hipsBone && headBone) {
        const hipsWorld = hipsBone.getWorldPosition(new THREE.Vector3());
        const bodyAxis = headBone.getWorldPosition(new THREE.Vector3()).sub(hipsWorld);
        const facing = root.getWorldQuaternion(new THREE.Quaternion()).multiply(
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            WORLD_V2_CONFIG.modelFacing,
          ),
        );
        const characterRight = new THREE.Vector3(1, 0, 0).applyQuaternion(facing);
        const characterForward = new THREE.Vector3(0, 0, -1).applyQuaternion(facing);
        bodyLean = Math.atan2(
          Math.hypot(bodyAxis.dot(characterRight), bodyAxis.dot(characterForward)),
          bodyAxis.y,
        );
      }
      const visibleHeading = root.rotation.y
        + WORLD_V2_CONFIG.modelFacing
        + Math.PI
        + model.rotation.y;
      debugRef.current = {
        yaw: root.rotation.y,
        targetHeading,
        visibleHeading: Math.atan2(Math.sin(visibleHeading), Math.cos(visibleHeading)),
        clipName: activeActionRef.current?.getClip().name ?? "—",
        clipWeight: activeActionRef.current?.getEffectiveWeight() ?? 0,
        rootRotation: readLocalRotation(rootBone),
        hipsRotation: readLocalRotation(hipsBone),
        torsoRotation: readLocalRotation(torsoBone),
        bodyLean,
        rootMotionTracks: (clip?.tracks ?? [])
          .filter((track) =>
            isRootTranslationTrack(track.name, "Root")
            || isRootTranslationTrack(track.name, "Hips"),
          )
          .map((track) => track.name),
      };
    }
  });

  return (
    <group
      ref={rootRef}
      name={isPlayer ? "world-v2-player" : "world-v2-npc"}
      userData={{ worldCharacterRoot: isPlayer, worldPlayerActor: isPlayer }}
    >
      <group rotation={[0, WORLD_V2_CONFIG.modelFacing, 0]} name="world-v2-model-axis-correction">
        <primitive object={model} dispose={null} />
        {jumpEcho && <primitive object={jumpEcho.object} dispose={null} />}
      </group>
      <mesh
        ref={shadowRef}
        name={isPlayer ? "player-contact-shadow" : "npc-contact-shadow"}
        position={[0, 0.025, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.54, 0.78, 1]}
      >
        <circleGeometry args={[1, 20]} />
        <meshBasicMaterial
          ref={shadowMaterialRef}
          color="#171512"
          transparent
          opacity={isPlayer ? 0.42 : 0.34}
          depthWrite={false}
        />
      </mesh>
      {isPlayer && (
        <mesh
          ref={impactRingRef}
          name="player-jump-landing-ring"
          position={[0, 0.035, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
          renderOrder={2}
        >
          <ringGeometry args={[0.2, 0.34, 20]} />
          <meshBasicMaterial
            ref={impactRingMaterialRef}
            color="#e4bc73"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
