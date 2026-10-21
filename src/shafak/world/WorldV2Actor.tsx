import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CharacterAnimationState } from "./character-animation";
import type { WorldMotion } from "./movement";
import { getKnightActorRootYaw, KNIGHT_CONFIG } from "./knight-config";
import { createUprightTorsoClip } from "./model-animation";
import type { LoadedWorldAsset } from "./world-v2-assets";
import { cloneWorldCharacter, disposeWorldCharacter } from "./world-v2-assets";
import { getWorldV2Heading, WORLD_V2_CONFIG } from "./world-v2-config";

type Props = {
  asset: LoadedWorldAsset;
  motionRef: MutableRefObject<WorldMotion>;
  debugRef?: MutableRefObject<{ yaw: number; clipName: string; clipWeight: number } | null>;
  isPlayer: boolean;
  distance?: number;
  x?: number;
  tint?: string;
  animationState?: CharacterAnimationState;
  localToParent?: boolean;
};

function resolveClip(animations: THREE.AnimationClip[], state: CharacterAnimationState) {
  const aliases = KNIGHT_CONFIG.animationClips[state] as readonly string[];
  const normalizedNames = aliases.map((name) => name.toLowerCase());
  return animations.find((clip) => normalizedNames.includes(clip.name.toLowerCase()))
    ?? animations.find((clip) => clip.name.toLowerCase().includes(state.toLowerCase()))
    ?? animations.find((clip) => clip.name.toLowerCase().includes("idle"))
    ?? animations[0];
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
  }, [asset, isPlayer, tint]);
  const animations = useMemo(() => isPlayer
    ? asset.animations.map((clip) => {
      const baseName = clip.name.toLowerCase().split("|").at(-1);
      return baseName === "run" || baseName === "walk"
        ? createUprightTorsoClip(clip)
        : clip;
    })
    : asset.animations, [asset, isPlayer]);
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const actionsRef = useRef(new Map<string, THREE.AnimationAction>());
  const activeClipNameRef = useRef("");
  const playerPosition = useMemo(() => new THREE.Vector3(), []);
  const playerFacingAngle = useRef(Math.PI);

  useEffect(() => () => {
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    actionsRef.current.clear();
    disposeWorldCharacter(model);
  }, [mixer, model]);

  useFrame((_frame, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const motion = motionRef.current;
    playerPosition.set(motion.depth * 5.2, 0, -(motion.distance - motion.cameraX));

    if (isPlayer) {
      root.position.set(playerPosition.x, motion.jumpHeight, playerPosition.z);
      const targetHeading = getWorldV2Heading(
        motion.velocityX,
        motion.velocityY,
        playerFacingAngle.current,
      );
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
    root.userData.worldCharacterYaw = root.rotation.y;
    root.userData.worldAnimationClips = [...actionsRef.current.values()]
      .filter((action) => action.isScheduled() && action.getEffectiveWeight() > 0.001)
      .map((action) => ({
        name: action.getClip().name,
        weight: action.getEffectiveWeight(),
      }));
    if (isPlayer && debugRef) {
      debugRef.current = {
        yaw: root.rotation.y,
        clipName: activeActionRef.current?.getClip().name ?? "—",
        clipWeight: activeActionRef.current?.getEffectiveWeight() ?? 0,
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
