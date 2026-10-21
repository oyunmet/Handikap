import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import type { WorldMotion } from "./movement";
import type { WorldObstacle, WorldPickup, WorldRival } from "./world-content";
import type { WeatherMode } from "./world-biomes";
import { getNpcStoryDialogue } from "./story-dialogue";
import { calculateNpcDialoguePosition } from "./world-dialogue-layout";
import { RIVAL_DIALOGUE_RANGE_METERS, type WorldInteractableRegistry } from "./world-interactables";
import { WORLD_V2_CONFIG } from "./world-v2-config";
import { WORLD_V2_CAMERA_COLLISION_LAYER } from "./world-v2-geometry";
import type { LoadedWorldAsset } from "./world-v2-assets";
import WorldV2Actor from "./WorldV2Actor";
import { WorldV2Label } from "./WorldV2Labels";

type MotionRef = MutableRefObject<WorldMotion>;
type Registry = WorldInteractableRegistry<WorldObstacle | WorldRival>;

const PICKUP_COLORS: Record<WorldPickup["kind"], string> = {
  "gold-small": "#ffd76d",
  "gold-large": "#ffe8a2",
  "treasure-cache": "#f1ca70",
  "diamond-small": "#83f3eb",
  "iron-shard": "#d1d8df",
  "ember-crystal": "#ff9a56",
  "seal-fragment": "#d9a9ff",
};

const NPC_TINTS: Record<string, string> = {
  "Mor Hançer": "#8055c8",
  "Kızıl Pelerin": "#b64740",
  "Kül Gezgini": "#969492",
};

function calculateNpcDialogueElementPosition(
  object: THREE.Object3D,
  camera: THREE.Camera,
  size: { width: number; height: number },
): number[] {
  const projected = new THREE.Vector3().setFromMatrixPosition(object.matrixWorld).project(camera);
  const projectedX = projected.x * (size.width / 2) + size.width / 2;
  const projectedY = -projected.y * (size.height / 2) + size.height / 2;
  return calculateNpcDialoguePosition(projectedX, projectedY, size);
}

function relativeZ(distance: number, cameraX: number) {
  return -(distance - cameraX);
}

function WorldV2Pickup({
  pickup,
  motionRef,
  visible,
}: {
  pickup: WorldPickup;
  motionRef: MotionRef;
  visible: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const color = PICKUP_COLORS[pickup.kind];
  useFrame((frame) => {
    const root = rootRef.current;
    const spin = spinRef.current;
    if (!root || !spin) return;
    const motion = motionRef.current;
    const gap = pickup.distance - motion.distance;
    root.visible = visible && gap >= -4 && gap <= 72;
    root.position.set(pickup.x, 0.28 + Math.sin(frame.clock.elapsedTime * 2 + pickup.distance) * 0.035, relativeZ(pickup.distance, motion.cameraX));
    spin.rotation.y = frame.clock.elapsedTime * 1.1;
  });
  return (
    <group ref={rootRef} name={`world-v2-pickup:${pickup.id}`}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.38, 18]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <group ref={spinRef}>
        {pickup.kind === "gold-small" || pickup.kind === "gold-large" || pickup.kind === "treasure-cache" ? (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[pickup.kind === "gold-small" ? 0.2 : 0.27, pickup.kind === "gold-small" ? 0.2 : 0.27, 0.07, 12]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} metalness={0.72} roughness={0.26} flatShading />
          </mesh>
        ) : (
          <mesh>
            <octahedronGeometry args={[0.24, 0]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} metalness={0.4} roughness={0.24} flatShading />
          </mesh>
        )}
      </group>
    </group>
  );
}

function WorldV2Obstacle({
  obstacle,
  motionRef,
  broken,
  interactableRegistry,
  onFallingRockDespawn,
}: {
  obstacle: WorldObstacle;
  motionRef: MotionRef;
  broken: boolean;
  interactableRegistry: Registry;
  onFallingRockDespawn: (obstacleId: string) => void;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const rockRef = useRef<THREE.Group>(null);
  const warningRef = useRef<THREE.Group>(null);
  const fallStartedAtRef = useRef<number | null>(null);
  const fallingRockRemovedRef = useRef(false);
  const [fallingRockRemoved, setFallingRockRemoved] = useState(false);
  const falling = obstacle.kind === "falling-rock-trap";
  const interactableKind = obstacle.kind === "treasure-chest"
    ? "chest"
    : ["barrel", "vase", "barricade"].includes(obstacle.kind) ? "breakable" : null;

  useEffect(() => {
    if (!interactableKind || !rootRef.current) return undefined;
    return interactableRegistry.register({
      id: obstacle.id,
      kind: interactableKind,
      x: obstacle.x,
      distance: obstacle.distance,
      radius: interactableKind === "chest" ? 3.2 : 4.2,
      lateralRadius: obstacle.width / 2 + 1.3,
      state: broken ? (interactableKind === "chest" ? "opened" : "destroyed") : "active",
      mesh: rootRef.current,
      source: obstacle,
    });
  }, [broken, interactableKind, interactableRegistry, obstacle]);

  useFrame((frame) => {
    const root = rootRef.current;
    if (!root) return;
    const motion = motionRef.current;
    const gap = obstacle.distance - motion.distance;
    root.position.set(obstacle.x, 0, relativeZ(obstacle.distance, motion.cameraX));
    root.visible = !fallingRockRemoved
      && Math.abs(gap) <= 72
      && (gap >= -1.5 || (broken && obstacle.health > 0));

    if (!falling) return;
    if (gap <= 5 && gap >= -1.5 && fallStartedAtRef.current === null) {
      fallStartedAtRef.current = frame.clock.elapsedTime;
    }
    const elapsed = fallStartedAtRef.current === null
      ? 0
      : Math.max(0, frame.clock.elapsedTime - fallStartedAtRef.current);
    if (warningRef.current) {
      warningRef.current.visible = fallStartedAtRef.current !== null && elapsed < 1.45;
    }
    if (rockRef.current) {
      const dropProgress = THREE.MathUtils.clamp((elapsed - 1) / 0.38, 0, 1);
      rockRef.current.visible = fallStartedAtRef.current !== null && elapsed >= 1 && elapsed < 1.8;
      rockRef.current.position.y = 5.2 - dropProgress * 4.55;
      rockRef.current.rotation.x = dropProgress * 0.7;
      rockRef.current.rotation.z = -dropProgress * 0.24;
    }
    if (elapsed >= 1.8 && fallStartedAtRef.current !== null && !fallingRockRemovedRef.current) {
      fallingRockRemovedRef.current = true;
      setFallingRockRemoved(true);
      onFallingRockDespawn(obstacle.id);
    }
  });

  const rockScaleX = Math.min(WORLD_V2_CONFIG.rock.targetMaxDim / 2, Math.max(0.25, obstacle.width / 2));
  const rockMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#726c63", roughness: 0.98, flatShading: true }),
    [],
  );
  useEffect(() => () => rockMaterial.dispose(), [rockMaterial]);
  const markCollision = (object: THREE.Object3D | null) => {
    object?.layers.enable(WORLD_V2_CAMERA_COLLISION_LAYER);
  };

  return (
    <group ref={rootRef} name={`world-v2-obstacle:${obstacle.id}`}>
      {obstacle.kind === "spike-trap" && (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[WORLD_V2_CONFIG.spikeTrap.width, WORLD_V2_CONFIG.spikeTrap.height, 0.08]} />
            <meshStandardMaterial color="#342c28" roughness={0.94} />
          </mesh>
          {Array.from({ length: 9 }, (_, index) => {
            const x = -1.3 + index * 0.325;
            return (
              <mesh key={index} ref={markCollision} position={[x, 0.25, 0]} rotation={[0, 0, (index % 2 ? -1 : 1) * 0.12]}>
                <coneGeometry args={[0.095, 0.42, 5]} />
                <meshStandardMaterial color={index % 2 ? "#8c7560" : "#67584b"} roughness={0.9} flatShading />
              </mesh>
            );
          })}
          <WorldV2Label position={[0, 0.72, 0]} maxDistance={30}>DİKENLİ TUZAK · ZIPLA</WorldV2Label>
        </group>
      )}

      {obstacle.kind === "low-bar" && (
        <group>
          {[-1, 1].map((side) => (
            <mesh key={side} ref={markCollision} position={[side * 1.42, WORLD_V2_CONFIG.lowBeam.openingHeight / 2, 0]}>
              <boxGeometry args={[0.16, WORLD_V2_CONFIG.lowBeam.openingHeight, 0.18]} />
              <meshStandardMaterial color="#614633" roughness={0.92} flatShading />
            </mesh>
          ))}
          <mesh ref={markCollision} position={[0, WORLD_V2_CONFIG.lowBeam.openingHeight + WORLD_V2_CONFIG.lowBeam.beamHeight / 2, 0]}>
            <boxGeometry args={[WORLD_V2_CONFIG.lowBeam.width, WORLD_V2_CONFIG.lowBeam.beamHeight, 0.22]} />
            <meshStandardMaterial color="#3e302a" roughness={0.92} flatShading />
          </mesh>
          {[-0.62, 0, 0.62].map((x) => (
            <mesh key={x} position={[x, 1.49, 0.13]}>
              <boxGeometry args={[0.12, 0.1, 0.025]} />
              <meshStandardMaterial color="#efb654" emissive="#9b592f" emissiveIntensity={0.25} />
            </mesh>
          ))}
          <WorldV2Label position={[0, 1.9, 0]} maxDistance={30}>ALÇAK KİRİŞ · EĞİL</WorldV2Label>
        </group>
      )}

      {(obstacle.kind === "rock" || falling) && (
        <group>
          {falling && (
            <group ref={warningRef} visible={false}>
              <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.68, 0.86, 24]} />
                <meshBasicMaterial color="#ed674c" transparent opacity={0.66} depthWrite={false} />
              </mesh>
              <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.62, 20]} />
                <meshBasicMaterial color="#191614" transparent opacity={0.32} depthWrite={false} />
              </mesh>
              <WorldV2Label
                position={[0, 1.15, 0]}
                maxDistance={34}
                className="world-v2-label world-v2-label--danger"
              >
                DÜŞEN KAYA · YANA KAÇ
              </WorldV2Label>
            </group>
          )}
          <group ref={rockRef} visible={!falling} position={[0, 0.65, 0]}>
            <mesh ref={markCollision} scale={[rockScaleX, 0.65, 1]}>
              <icosahedronGeometry args={[1, 0]} />
              <primitive object={rockMaterial} attach="material" />
            </mesh>
          </group>
          {!falling && <WorldV2Label position={[0, 1.45, 0]} maxDistance={34}>KAYA · ETRAFINDAN DOLAŞ</WorldV2Label>}
        </group>
      )}

      {obstacle.kind === "barrel" && (
        <mesh ref={markCollision} position={[0, 0.46, 0]}>
          <cylinderGeometry args={[0.36, 0.36, 0.92, 9]} />
          <meshStandardMaterial color={broken ? "#584132" : "#774c30"} roughness={0.94} flatShading />
        </mesh>
      )}
      {obstacle.kind === "vase" && (
        <mesh ref={markCollision} position={[0, 0.44, 0]}>
          <dodecahedronGeometry args={[0.43, 0]} />
          <meshStandardMaterial color={broken ? "#76564a" : "#a66e55"} roughness={0.88} flatShading />
        </mesh>
      )}
      {obstacle.kind === "barricade" && (
        <group>
          <mesh ref={markCollision} position={[0, 0.48, 0]}>
            <boxGeometry args={[Math.min(2.3, obstacle.width), 0.9, 0.24]} />
            <meshStandardMaterial color={broken ? "#5a493b" : "#795536"} roughness={0.94} flatShading />
          </mesh>
          {[-0.7, 0, 0.7].map((x) => <mesh key={x} position={[x, 0.48, 0.14]}><boxGeometry args={[0.08, 0.8, 0.025]} /><meshStandardMaterial color="#bf955c" roughness={0.85} /></mesh>)}
        </group>
      )}
      {obstacle.kind === "treasure-chest" && (
        <group>
          <mesh ref={markCollision} position={[0, 0.32, 0]}>
            <boxGeometry args={[0.92, 0.62, 0.62]} />
            <meshStandardMaterial color={broken ? "#8b633a" : "#704629"} roughness={0.86} flatShading />
          </mesh>
          <mesh position={[0, 0.67, 0]}>
            <boxGeometry args={[0.96, 0.16, 0.68]} />
            <meshStandardMaterial color="#b48949" metalness={0.4} roughness={0.54} />
          </mesh>
        </group>
      )}
      {obstacle.kind !== "spike-trap" && obstacle.kind !== "low-bar" && obstacle.kind !== "rock" && !falling && (
        <WorldV2Label position={[0, 1.25, 0]} maxDistance={34}>
          {obstacle.kind === "barrel" ? "VARİL · KIR" : obstacle.kind === "vase" ? "VAZO · KIR" : obstacle.kind === "barricade" ? "BARİKAT · SALDIR" : "SANDIK"}
        </WorldV2Label>
      )}
    </group>
  );
}

function WorldV2Npc({
  rival,
  index,
  asset,
  motionRef,
  dialoguePortal,
  focused,
  talking,
  canChallenge,
  dailyAccessAllowed,
  challengeLabel,
  onChallenge,
  interactableRegistry,
}: {
  rival: WorldRival;
  index: number;
  asset: LoadedWorldAsset;
  motionRef: MotionRef;
  dialoguePortal: MutableRefObject<HTMLDivElement>;
  focused: boolean;
  talking: boolean;
  canChallenge: boolean;
  dailyAccessAllowed: boolean;
  challengeLabel: string;
  onChallenge: (rival: WorldRival) => void;
  interactableRegistry: Registry;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const anchorRef = useRef<THREE.Group>(null);
  const x = Math.sign(rival.x) * WORLD_V2_CONFIG.npcRoadOffset
    || (index % 2 === 0 ? -WORLD_V2_CONFIG.npcRoadOffset : WORLD_V2_CONFIG.npcRoadOffset);
  const dialogue = getNpcStoryDialogue(rival.name, rival.chapterId);
  const speaker = dialogue?.speaker ?? rival.name;
  const line = dialogue?.lines[0] ?? rival.taunt;

  useEffect(() => {
    if (!rootRef.current) return undefined;
    return interactableRegistry.register({
      id: rival.id,
      kind: "rival",
      x: rival.x,
      distance: rival.distance,
      radius: RIVAL_DIALOGUE_RANGE_METERS + 0.8,
      lateralRadius: 3.4,
      state: "active",
      mesh: rootRef.current,
      source: rival,
    });
  }, [interactableRegistry, rival]);

  useFrame(() => {
    const root = rootRef.current;
    if (!root) return;
    const gap = rival.distance - motionRef.current.distance;
    root.position.set(x, 0, relativeZ(rival.distance, motionRef.current.cameraX));
    root.visible = gap >= -12 && gap <= 72;
  });

  return (
    <group
      ref={rootRef}
      name={`world-v2-npc:${rival.name}:${rival.id}`}
      userData={{
        worldModelCategory: "npc",
        worldCharacterRoot: true,
        worldBossActor: Boolean(rival.isBoss),
      }}
    >
      <WorldV2Actor
        asset={asset}
        motionRef={motionRef}
        isPlayer={false}
        distance={rival.distance}
        x={x}
        tint={NPC_TINTS[rival.name] ?? rival.armorTint}
        localToParent
      />
      <group ref={anchorRef}>
        <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={focused || talking ? [0.83, 0.96, 28] : [0.65, 0.74, 24]} />
          <meshBasicMaterial color={focused || talking ? "#ef704f" : NPC_TINTS[rival.name] ?? rival.armorTint} transparent opacity={focused || talking ? 0.7 : 0.32} depthWrite={false} />
        </mesh>
        <WorldV2Label
          position={[0, 2.1, 0]}
          maxDistance={54}
          className={`world-rival-tag${focused ? " is-focused" : ""}${rival.isBoss ? " is-boss" : ""}`}
        >
          <b>{rival.name}</b><span>{rival.title}</span>
        </WorldV2Label>
        {talking && Math.abs(rival.distance - motionRef.current.distance) <= RIVAL_DIALOGUE_RANGE_METERS && (
          <Html
            portal={dialoguePortal}
            position={[0, 2.35, 0]}
            center
            zIndexRange={[90, 0]}
            calculatePosition={calculateNpcDialogueElementPosition}
            style={{ pointerEvents: "auto" }}
          >
            <div className="world-npc-dialogue" role="group" aria-label={`${speaker} ile karşılaşma`}>
              <span>{speaker} konuşuyor</span>
              <p>“{line}”</p>
              {canChallenge && dailyAccessAllowed ? (
                <button className="world-npc-dialogue__fight" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => {
                  event.stopPropagation();
                  onChallenge(rival);
                }}>
                  <span aria-hidden="true">⚔</span> {challengeLabel}
                </button>
              ) : (
                <span className="world-npc-dialogue__status" role="status">
                  {dailyAccessAllowed ? "Düello için biraz daha yaklaş" : "Günlük düello hakkı doldu"}
                </span>
              )}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

export function WorldV2Entities({
  motionRef,
  asset,
  dialoguePortal,
  rivals,
  pickups,
  obstacles,
  collectedPickupIds,
  brokenObstacleIds,
  focusedRivalId,
  talkingRivalId,
  canChallenge,
  dailyAccessAllowed,
  challengeLabel,
  onChallenge,
  onFallingRockDespawn,
  interactableRegistry,
  weather,
  noNpc,
}: {
  motionRef: MotionRef;
  asset: LoadedWorldAsset | null;
  dialoguePortal: MutableRefObject<HTMLDivElement>;
  rivals: WorldRival[];
  pickups: WorldPickup[];
  obstacles: WorldObstacle[];
  collectedPickupIds: ReadonlySet<string>;
  brokenObstacleIds: ReadonlySet<string>;
  focusedRivalId: string | null;
  talkingRivalId: string | null;
  canChallenge: boolean;
  dailyAccessAllowed: boolean;
  challengeLabel: string;
  onChallenge: (rival: WorldRival) => void;
  onFallingRockDespawn: (obstacleId: string) => void;
  interactableRegistry: Registry;
  weather: WeatherMode;
  noNpc: boolean;
}) {
  const maxVisibleDistance = Math.min(72, weather === "fog" ? 48 : weather === "storm" ? 62 : 72);
  const unlockedPickupIds = useMemo(() => {
    const ids = new Set<string>();
    for (const obstacle of obstacles) {
      if (obstacle.dropPickupId && brokenObstacleIds.has(obstacle.id)) ids.add(obstacle.dropPickupId);
    }
    return ids;
  }, [brokenObstacleIds, obstacles]);

  return (
    <>
      {pickups.map((pickup) => {
        const unlocked = !pickup.sourceObstacleId || unlockedPickupIds.has(pickup.id);
        if (!unlocked || collectedPickupIds.has(pickup.id)) return null;
        return <WorldV2Pickup key={pickup.id} pickup={pickup} motionRef={motionRef} visible />;
      })}
      {obstacles.filter((obstacle) => !brokenObstacleIds.has(obstacle.id)).map((obstacle) => (
        <WorldV2Obstacle
          key={obstacle.id}
          obstacle={obstacle}
          motionRef={motionRef}
          broken={brokenObstacleIds.has(obstacle.id)}
          interactableRegistry={interactableRegistry}
          onFallingRockDespawn={onFallingRockDespawn}
        />
      ))}
      {!noNpc && asset && rivals.map((rival, index) => {
        const gap = rival.distance - motionRef.current.distance;
        if (gap < -12 || gap > maxVisibleDistance) return null;
        return (
          <WorldV2Npc
            key={rival.id}
            rival={rival}
            index={index}
            asset={asset}
            motionRef={motionRef}
            dialoguePortal={dialoguePortal}
            focused={rival.id === focusedRivalId}
            talking={rival.id === talkingRivalId}
            canChallenge={canChallenge && rival.id === talkingRivalId}
            dailyAccessAllowed={dailyAccessAllowed}
            challengeLabel={challengeLabel}
            onChallenge={onChallenge}
            interactableRegistry={interactableRegistry}
          />
        );
      })}
    </>
  );
}
