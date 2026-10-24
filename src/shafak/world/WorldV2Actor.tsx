import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CharacterAnimationState } from "./character-animation";
import type { WorldMotion } from "./movement";
import { getKnightActorRootYaw, KNIGHT_CONFIG } from "./knight-config";
import { createPlayerLocomotionClip, isRootTranslationTrack } from "./model-animation";
import type { LoadedWorldAsset } from "./world-v2-assets";
import { cloneWorldCharacter, disposeWorldCharacter } from "./world-v2-assets";
import { getWorldV2Heading, WORLD_V2_CONFIG } from "./world-v2-config";
import type { OpponentModelConfig } from "./opponent-model-config";
import {
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
  const model = useMemo(() => {
    const clone = cloneWorldCharacter(asset, tint);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = false;
    });
    return clone;
  }, [asset, tint]);
  const animations = useMemo(() => asset.url === KNIGHT_CONFIG.modelPath
    ? asset.animations.map(createPlayerLocomotionClip)
    : asset.animations, [asset]);
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const actionsRef = useRef(new Map<string, THREE.AnimationAction>());
  const activeClipNameRef = useRef("");
  const debugRefreshElapsed = useRef(0);
  const opponentCostumeRef = useRef<AttachedOpponentCostume | null>(null);
  const playerPosition = useMemo(() => new THREE.Vector3(), []);
  const playerFacingAngle = useRef(Math.PI);

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
    playerPosition.set(motion.depth * 5.2, 0, -(motion.distance - motion.cameraX));
    const targetHeading = getWorldV2Heading(
      motion.velocityX,
      motion.velocityY,
      playerFacingAngle.current,
    );

    if (isPlayer) {
      root.position.set(playerPosition.x, motion.jumpHeight, playerPosition.z);
      if (Math.hypot(motion.velocityX, motion.velocityY) >= 0.12) {
        playerFacingAngle.current = targetHeading;
      }
      const yawDelta = THREE.MathUtils.euclideanModulo(
        getKnightActorRootYaw(targetHeading) - root.rotation.y + Math.PI,
        Math.PI * 2,
      ) - Math.PI;
      root.rotation.y += yawDelta * (1 - Math.exp(-9 * Math.min(delta, 0.05)));
    } else {
      const actorZ = -(distance - motion.cameraX);
      root.position.set(localToParent ? 0 : x, 0, localToParent ? 0 : actorZ);
      const directionX = playerPosition.x - x;
      const directionZ = playerPosition.z - actorZ;
      root.rotation.y = getKnightActorRootYaw(Math.atan2(directionX, directionZ));
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
    mixer.update(Math.min(delta, 0.05));
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
        bodyLean = Math.atan2(bodyAxis.dot(characterRight), bodyAxis.y);
      }
      const visibleHeading = root.rotation.y + WORLD_V2_CONFIG.modelFacing + model.rotation.y;
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
      </group>
      <mesh
        name={isPlayer ? "player-contact-shadow" : "npc-contact-shadow"}
        position={[0, 0.025, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.54, 0.78, 1]}
      >
        <circleGeometry args={[1, 20]} />
        <meshBasicMaterial color="#171512" transparent opacity={isPlayer ? 0.42 : 0.34} depthWrite={false} />
      </mesh>
    </group>
  );
}
