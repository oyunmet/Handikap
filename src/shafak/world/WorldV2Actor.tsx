import { useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldMotion } from "./movement";
import type { LoadedWorldAsset } from "./world-v2-assets";
import {
  getWorldV2NpcHeading,
  getWorldV2YawDelta,
  WORLD_V2_CONFIG,
} from "./world-v2-config";
import type { OpponentModelConfig } from "./opponent-model-config";
import type { CityNpcAccessory } from "./opponent-costume";
import type { EquipmentVisual } from "../game/store-types";
import {
  getFantasyKnightHeadAccessory,
  getFantasyKnightOutfitVariant,
  type FantasyKnightHeadAccessory,
} from "./fantasy-knight-model";
import SharedCharacterModel from "./SharedCharacterModel";

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
  rootMotionSourceTracks: string[];
  rootMotionTracks: string[];
};

type Props = {
  asset: LoadedWorldAsset;
  motionRef: MutableRefObject<WorldMotion>;
  groundHeightRef?: MutableRefObject<number>;
  debugRef?: MutableRefObject<WorldV2ActorDebugSnapshot | null>;
  isPlayer: boolean;
  distance?: number;
  x?: number;
  tint?: string;
  localToParent?: boolean;
  showWeapon?: boolean;
  modelConfig?: OpponentModelConfig;
  cityAccessory?: CityNpcAccessory;
  equipmentVisual?: EquipmentVisual;
};

export default function WorldV2Actor({
  asset,
  motionRef,
  groundHeightRef,
  debugRef,
  isPlayer,
  distance = 0,
  x = 0,
  tint,
  localToParent = false,
  showWeapon = true,
  modelConfig,
  cityAccessory,
  equipmentVisual,
}: Props) {
  const rootRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const shadowMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const impactRingRef = useRef<THREE.Mesh>(null);
  const impactRingMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const previousMovementStateRef = useRef<WorldMotion["movementState"] | null>(null);
  const impactRingSecondsRef = useRef(0);

  const variantSeed = JSON.stringify({
    model: modelConfig?.modelPath ?? asset.url,
    tint: tint ?? null,
    appearance: modelConfig?.appearance ?? null,
    costume: modelConfig?.costume ?? null,
    weapon: modelConfig?.weapon ?? null,
  });
  const appearance = useMemo(() => {
    const base = isPlayer
      ? equipmentVisual ?? {}
      : {
        ...getFantasyKnightOutfitVariant(variantSeed),
        ...(modelConfig?.appearance ?? {}),
      };
    return {
      ...base,
      ...(tint ? { armor: tint, armorLight: tint, dyeColor: tint } : {}),
      weaponStyle: isPlayer
        ? equipmentVisual?.weaponStyle
        : modelConfig?.weapon ?? modelConfig?.appearance.weaponStyle,
    };
  }, [equipmentVisual, isPlayer, modelConfig, tint, variantSeed]);

  const headAccessory: FantasyKnightHeadAccessory = cityAccessory === "hat"
    || cityAccessory === "glasses"
    ? cityAccessory
    : isPlayer
      ? null
      : getFantasyKnightHeadAccessory(
        variantSeed,
      );

  const actorScale = isPlayer ? 1 : modelConfig?.scale ?? 1;
  const targetHeight = modelConfig?.targetHeight ?? 1.7;
  const playerPosition = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
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
    }
    previousMovementStateRef.current = movementState;
    impactRingSecondsRef.current = Math.max(
      0,
      impactRingSecondsRef.current - Math.min(delta, 0.05),
    );
    const impactRingProgress = 1 - impactRingSecondsRef.current / 0.28;
    if (impactRingRef.current && impactRingMaterialRef.current) {
      impactRingRef.current.visible = impactRingSecondsRef.current > 0;
      impactRingRef.current.scale.setScalar(1 + impactRingProgress * 1.8);
      impactRingMaterialRef.current.opacity = Math.max(
        0,
        impactRingSecondsRef.current / 0.28,
      ) * 0.56;
    }

    playerPosition.set(motion.depth * 5.2, 0, -(motion.distance - motion.cameraX));
    const targetHeading = motion.cameraHeading;
    if (isPlayer) {
      root.position.set(
        playerPosition.x,
        motion.jumpHeight + (groundHeightRef?.current ?? 0),
        playerPosition.z,
      );
      root.scale.setScalar(actorScale);
      root.rotation.y += getWorldV2YawDelta(targetHeading, root.rotation.y)
        * (1 - Math.exp(-14 * Math.min(delta, 0.05)));
    } else {
      const actorZ = -(distance - motion.cameraX);
      root.position.set(localToParent ? 0 : x, 0, localToParent ? 0 : actorZ);
      root.scale.setScalar(actorScale);
      const targetNpcHeading = getWorldV2NpcHeading(
        x,
        actorZ,
        playerPosition.x,
        playerPosition.z,
      );
      root.rotation.y += getWorldV2YawDelta(targetNpcHeading, root.rotation.y)
        * (1 - Math.exp(-12 * Math.min(delta, 0.05)));
    }
    root.userData.worldCharacterYaw = root.rotation.y;

    if (shadowRef.current && shadowMaterialRef.current && isPlayer) {
      const jumpHeight = Math.max(0, motion.jumpHeight);
      shadowRef.current.scale.set(0.54 + jumpHeight * 0.14, 0.78 + jumpHeight * 0.14, 1);
      shadowMaterialRef.current.opacity = Math.max(0.08, 0.42 - jumpHeight * 0.22);
    }

    if (isPlayer && debugRef) {
      const visibleHeading = root.rotation.y + WORLD_V2_CONFIG.modelFacing;
      debugRef.current = {
        yaw: root.rotation.y,
        targetHeading,
        visibleHeading: Math.atan2(Math.sin(visibleHeading), Math.cos(visibleHeading)),
        clipName: "static",
        clipWeight: 0,
        rootRotation: null,
        hipsRotation: null,
        torsoRotation: null,
        bodyLean: 0,
        rootMotionSourceTracks: [],
        rootMotionTracks: [],
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
        <SharedCharacterModel
          appearance={appearance}
          headAccessory={headAccessory}
          showWeapon={showWeapon}
          targetHeight={targetHeight}
          castShadow
          motionRef={isPlayer ? motionRef : undefined}
          state={isPlayer ? undefined : "idle"}
          source={{ scene: asset.scene, animations: asset.animations }}
        />
        {cityAccessory === "cane" && (
          <group position={[0.34, 0.53, 0.1]} rotation={[0, 0, -0.08]}>
            <mesh>
              <cylinderGeometry args={[0.025, 0.025, 0.92, 6]} />
              <meshStandardMaterial color="#593b2a" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.48, 0]}>
              <torusGeometry args={[0.07, 0.018, 6, 10, Math.PI]} />
              <meshStandardMaterial color="#593b2a" roughness={0.8} />
            </mesh>
          </group>
        )}
        {cityAccessory === "wheelchair" && (
          <group position={[0, 0.02, -0.04]}>
            <mesh position={[0, 0.46, -0.16]}>
              <boxGeometry args={[0.56, 0.1, 0.52]} />
              <meshStandardMaterial color="#4c463e" metalness={0.28} roughness={0.65} />
            </mesh>
            <mesh position={[0, 0.76, -0.34]}>
              <boxGeometry args={[0.54, 0.57, 0.08]} />
              <meshStandardMaterial color="#4c463e" metalness={0.28} roughness={0.65} />
            </mesh>
            {[-0.39, 0.39].map((wheelX) => (
              <mesh
                key={wheelX}
                position={[wheelX, 0.39, -0.1]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <torusGeometry args={[0.39, 0.025, 6, 16]} />
                <meshStandardMaterial color="#554f47" metalness={0.36} roughness={0.58} />
              </mesh>
            ))}
          </group>
        )}
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
