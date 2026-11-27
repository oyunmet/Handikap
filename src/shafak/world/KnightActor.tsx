import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CharacterAnimationState } from "./character-animation";
import type { OpponentModelConfig } from "./opponent-model-config";
import type { EquipmentVisual } from "../game/store-types";
import { getUprightDuelRotation } from "../game/duel-camera";
import {
  getFantasyKnightHeadAccessory,
  getFantasyKnightOutfitVariant,
} from "./fantasy-knight-model";
import SharedCharacterModel from "./SharedCharacterModel";
import { getKnightActorLocalPosition } from "./knight-actor-transform";
import { getWorldGlowTexture } from "./world-glow";
import { WORLD_MODEL_SIZE_TARGETS } from "./world-model-sizing";
import type { WorldMotion } from "./movement";
import { PLAYER_CHARACTER_MODEL_FACING, PLAYER_CHARACTER_MODEL_PATH } from "./player-model";

export type KnightActorProps = {
  motionRef: MutableRefObject<WorldMotion>;
  state?: CharacterAnimationState;
  animationTimeScale?: number;
  animationPaused?: boolean | (() => boolean);
  characterLabel?: string;
  modelConfig?: OpponentModelConfig | null;
  appearance?: EquipmentVisual;
  targetHeight?: number;
  targetHeightOverride?: number;
  facingAngle?: number;
  playerCharacter?: boolean;
  positionedByParent?: boolean;
  debugUpright?: boolean;
  castShadow?: boolean;
  rootRef?: MutableRefObject<THREE.Group | null>;
  debugRef?: MutableRefObject<THREE.Group | null>;
};

export default function KnightActor({
  motionRef,
  state,
  animationTimeScale,
  animationPaused,
  characterLabel,
  modelConfig,
  appearance,
  targetHeight: requestedTargetHeight,
  targetHeightOverride,
  facingAngle,
  playerCharacter = false,
  positionedByParent = false,
  castShadow = true,
  rootRef: externalRootRef,
  debugRef,
}: KnightActorProps) {
  const rootRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const actorGlowTexture = useMemo(() => getWorldGlowTexture(), []);

  const actorAppearance = useMemo(() => {
    const seed = characterLabel ?? modelConfig?.modelPath ?? PLAYER_CHARACTER_MODEL_PATH;
    const outfit = playerCharacter ? {} : getFantasyKnightOutfitVariant(seed);
    const configured = appearance ?? modelConfig?.appearance;
    const withOutfit = { ...outfit, ...(configured ?? {}) };
    const withTint = modelConfig?.tintColor
      ? {
        ...withOutfit,
        armor: modelConfig.tintColor,
        armorLight: modelConfig.tintColor,
        dyeColor: modelConfig.tintColor,
      }
      : withOutfit;
    return modelConfig?.weapon
      ? { ...withTint, weaponStyle: modelConfig.weapon }
      : withTint;
  }, [appearance, characterLabel, modelConfig, playerCharacter]);

  const headAccessory = useMemo(
    () => playerCharacter
      ? null
      : getFantasyKnightHeadAccessory(
        `${characterLabel ?? modelConfig?.modelPath ?? PLAYER_CHARACTER_MODEL_PATH}:${modelConfig?.isDemirTac ? "boss" : ""}`,
      ),
    [characterLabel, modelConfig, playerCharacter],
  );
  const targetHeight = targetHeightOverride
    ?? requestedTargetHeight
    ?? modelConfig?.targetHeight
    ?? WORLD_MODEL_SIZE_TARGETS.player.targetHeight;

  useEffect(() => {
    if (externalRootRef) externalRootRef.current = rootRef.current;
    if (debugRef) debugRef.current = rootRef.current;
    return () => {
      if (externalRootRef) externalRootRef.current = null;
      if (debugRef) debugRef.current = null;
    };
  }, [debugRef, externalRootRef]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root) return;

    const motion = motionRef.current;
    root.position.set(
      ...getKnightActorLocalPosition(motion.depth, motion.jumpHeight, positionedByParent),
    );

    const dt = Math.min(Math.max(delta, 0), 0.05);
    const targetYaw = facingAngle === undefined
      ? motion.velocityY < -0.25
        ? Math.PI + Math.atan2(motion.velocityX, Math.abs(motion.velocityY))
        : Math.atan2(-motion.velocityX, Math.max(0.01, Math.abs(motion.velocityY)))
      : facingAngle - PLAYER_CHARACTER_MODEL_FACING;
    const turn = Math.atan2(
      Math.sin(targetYaw - root.rotation.y),
      Math.cos(targetYaw - root.rotation.y),
    );
    root.rotation.y += turn * (1 - Math.exp(-dt * (facingAngle === undefined ? 12 : 10)));
    root.rotation.set(...getUprightDuelRotation(root.rotation.y));

  });

  return (
    <group
      ref={rootRef}
      name={playerCharacter ? "fantasy-knight-player" : `fantasy-knight:${characterLabel ?? "rival"}`}
      userData={{ worldCharacterRoot: true, worldModelSource: PLAYER_CHARACTER_MODEL_PATH }}
    >
      {facingAngle === undefined && actorGlowTexture && (
        <sprite position={[0, 1.15, 0.18]} scale={[2.5, 2.5, 1]}>
          <spriteMaterial
            map={actorGlowTexture}
            color="#d0a65a"
            transparent
            opacity={playerCharacter ? 0.12 : 0.07}
            depthWrite={false}
          />
        </sprite>
      )}
      <mesh
        position={[0, 0.025, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.56, 0.3, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial
          color="#08090b"
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>
      <group
        scale={modelConfig?.scale ?? 1}
        rotation={[0, PLAYER_CHARACTER_MODEL_FACING, 0]}
      >
        <SharedCharacterModel
          appearance={actorAppearance}
          headAccessory={headAccessory}
          rootRef={modelRef}
          showWeapon
          targetHeight={targetHeight}
          castShadow={castShadow}
          state={state}
          motionRef={motionRef}
          animationTimeScale={animationTimeScale}
          animationPaused={animationPaused}
        />
      </group>
    </group>
  );
}
