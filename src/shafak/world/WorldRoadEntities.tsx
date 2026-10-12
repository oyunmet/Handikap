import { Html, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { MutableRefObject } from "react";
import KnightActor from "./KnightActor";
import { createWorldMotion, type WorldMotion } from "./movement";
import {
  getWorldContentAround,
  PICKUP_MAGNET_RADIUS_METERS,
  type WorldObstacle,
  type WorldPickup,
  type WorldRival,
} from "./world-content";
import { getWorldBotProfileByName } from "./world-bot-profiles";

type MotionRef = MutableRefObject<WorldMotion>;

const PICKUP_STYLE = {
  "gold-small": { color: "#ffd76d", glow: "#f1a936", size: 0.16 },
  "gold-large": { color: "#ffe8a2", glow: "#f0aa36", size: 0.25 },
  "diamond-small": { color: "#83f3eb", glow: "#30cbd3", size: 0.2 },
  "iron-shard": { color: "#d1d8df", glow: "#7d9ba4", size: 0.19 },
  "ember-crystal": { color: "#69e7de", glow: "#35c5d1", size: 0.21 },
  "seal-fragment": { color: "#d9a9ff", glow: "#9f62e4", size: 0.23 },
} as const;

function Collectible({
  pickup,
  motionRef,
  unlocked,
  reducedMotion,
}: {
  pickup: WorldPickup;
  motionRef: MotionRef;
  unlocked: boolean;
  reducedMotion: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const style = PICKUP_STYLE[pickup.kind];
  const geometry = pickup.kind === "gold-small" ? "coin" : pickup.kind === "gold-large" ? "large-coin" : "crystal";

  useFrame((frame) => {
    const root = rootRef.current;
    const spin = spinRef.current;
    if (!root || !spin) return;
    const motion = motionRef.current;
    const relativeDistance = pickup.distance - motion.distance;
    const playerX = motion.depth * 5.2;
    const playerZ = -(motion.distance - motion.cameraX);
    const itemZ = -(pickup.distance - motion.cameraX);
    const pickupDistance = Math.hypot(pickup.x - playerX, relativeDistance);
    const pull = THREE.MathUtils.clamp((PICKUP_MAGNET_RADIUS_METERS - pickupDistance) / (PICKUP_MAGNET_RADIUS_METERS - 1.1), 0, 0.88);
    root.position.x = THREE.MathUtils.lerp(pickup.x, playerX, pull);
    root.position.z = THREE.MathUtils.lerp(itemZ, playerZ, pull);
    root.position.y = 0.48 + (reducedMotion ? 0 : Math.sin(frame.clock.elapsedTime * 2.1 + pickup.distance) * 0.11);
    root.visible = unlocked && Math.abs(relativeDistance) <= 112;
    if (!reducedMotion) {
      spin.rotation.y = frame.clock.elapsedTime * (pickup.kind === "seal-fragment" ? 0.82 : 1.25);
      spin.rotation.z = Math.sin(frame.clock.elapsedTime * 1.4 + pickup.x) * 0.12;
    }
    const near = pickupDistance <= PICKUP_MAGNET_RADIUS_METERS;
    root.scale.setScalar(near ? 1.12 : 1);
  });

  if (!unlocked) return null;
  return (
    <group ref={rootRef} position={[pickup.x, 0.48, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.34, 0]}>
        <ringGeometry args={[0.18, 0.33, 20]} />
        <meshBasicMaterial color={style.glow} transparent opacity={0.34} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <group ref={spinRef}>
        {geometry === "coin" ? (
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={style.size}>
            <cylinderGeometry args={[0.7, 0.7, 0.16, 12]} />
            <meshStandardMaterial color={style.color} emissive={style.glow} emissiveIntensity={0.58} metalness={0.84} roughness={0.24} />
          </mesh>
        ) : geometry === "large-coin" ? (
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={style.size * 1.28}>
            <cylinderGeometry args={[0.74, 0.74, 0.2, 12]} />
            <meshStandardMaterial color={style.color} emissive={style.glow} emissiveIntensity={0.78} metalness={0.86} roughness={0.2} />
          </mesh>
        ) : (
          <mesh scale={style.size}>
            <octahedronGeometry args={[0.9, 0]} />
            <meshStandardMaterial color={style.color} emissive={style.glow} emissiveIntensity={0.95} metalness={0.5} roughness={0.24} flatShading />
          </mesh>
        )}
        <Sparkles count={pickup.kind === "seal-fragment" || pickup.kind === "diamond-small" ? 5 : 3} scale={0.85} size={2.3} speed={reducedMotion ? 0 : 0.3} color={style.color} />
      </group>
    </group>
  );
}

function Obstacle({ obstacle, motionRef, broken }: { obstacle: WorldObstacle; motionRef: MotionRef; broken: boolean }) {
  const rootRef = useRef<THREE.Group>(null);
  const warningRef = useRef<THREE.Mesh>(null);
  useFrame((frame) => {
    if (!rootRef.current) return;
    rootRef.current.position.z = -(obstacle.distance - motionRef.current.cameraX);
    rootRef.current.visible = !broken && Math.abs(obstacle.distance - motionRef.current.distance) <= 112;
    if (warningRef.current) {
      const pulse = 0.42 + (Math.sin(frame.clock.elapsedTime * 4.4) + 1) * 0.11;
      const nearby = Math.abs(obstacle.distance - motionRef.current.distance) < 10;
      warningRef.current.scale.setScalar(nearby ? 1 + pulse * 0.14 : 1);
    }
  });

  return (
    <group ref={rootRef} position={[obstacle.x, 0, 0]}>
      {obstacle.kind === "rock" ? (
        <mesh position={[0, 0.72, 0]} rotation={[0.1, 0.7, 0.2]}>
          <dodecahedronGeometry args={[0.92, 0]} />
          <meshStandardMaterial color="#625b5a" roughness={0.94} flatShading />
        </mesh>
      ) : obstacle.kind === "spike-trap" ? (
        <group>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[obstacle.width, 0.08, 1.8]} />
            <meshStandardMaterial color="#553438" roughness={0.82} />
          </mesh>
          {[-1.25, 0, 1.25].map((x) => (
            <mesh key={x} position={[x, 0.55, 0]} rotation={[0, 0, 0.12]}>
              <coneGeometry args={[0.24, 0.95, 5]} />
              <meshStandardMaterial color="#c7c0b2" metalness={0.58} roughness={0.32} />
            </mesh>
          ))}
          <mesh ref={warningRef} position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.3, 2.45, 32]} />
            <meshBasicMaterial color="#ff795b" transparent opacity={0.46} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      ) : (
        <group>
          <mesh position={[0, 0.62, 0]}>
            <boxGeometry args={[obstacle.width, 1.12, 0.48]} />
            <meshStandardMaterial color="#745340" roughness={0.86} />
          </mesh>
          {[-0.8, 0, 0.8].map((x) => (
            <mesh key={x} position={[x, 0.62, 0.27]}>
              <boxGeometry args={[0.08, 0.72, 0.035]} />
              <meshStandardMaterial color="#bc8a53" roughness={0.75} />
            </mesh>
          ))}
          <mesh position={[0, 1.25, 0]} rotation={[0, 0, -0.06]}>
            <boxGeometry args={[2.75, 0.13, 0.56]} />
            <meshStandardMaterial color="#3b2927" roughness={0.9} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function BotSignature({ rival }: { rival: WorldRival }) {
  const tint = rival.armorTint;
  return (
    <group>
      {rival.archetype === "gate-warden" && (
        <>
          <mesh position={[0, 1.52, 0.18]} scale={[0.68, 0.34, 0.18]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={tint} metalness={0.7} roughness={0.34} flatShading />
          </mesh>
          <mesh position={[0, 2.02, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.12, 0.42, 5]} />
            <meshStandardMaterial color="#e7bd73" metalness={0.64} roughness={0.3} />
          </mesh>
        </>
      )}
      {rival.archetype === "iron-oath" && (
        <>
          <mesh position={[-0.58, 1.03, 0.05]} rotation={[0, 0, -0.08]}>
            <boxGeometry args={[0.42, 0.64, 0.16]} />
            <meshStandardMaterial color="#3f5966" metalness={0.62} roughness={0.38} />
          </mesh>
          <mesh position={[-0.58, 1.03, -0.045]} rotation={[0, 0, -0.08]}>
            <octahedronGeometry args={[0.19, 0]} />
            <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.12} metalness={0.48} roughness={0.36} />
          </mesh>
        </>
      )}
      {rival.archetype === "ash-archer" && (
        <>
          <mesh position={[0.18, 1.18, 0.28]} rotation={[0.12, 0, -0.06]}>
            <cylinderGeometry args={[0.14, 0.2, 0.62, 7]} />
            <meshStandardMaterial color="#55382f" roughness={0.82} />
          </mesh>
          {[-0.08, 0.08].map((offset) => (
            <mesh key={offset} position={[0.18 + offset, 1.62, 0.27]} rotation={[0, 0, offset * 1.8]}>
              <cylinderGeometry args={[0.018, 0.018, 0.44, 4]} />
              <meshStandardMaterial color="#d5c8a7" roughness={0.62} />
            </mesh>
          ))}
        </>
      )}
      {rival.archetype === "shadow-knight" && (
        <>
          <mesh position={[0, 1.86, 0.035]} scale={[0.29, 0.34, 0.26]}>
            <coneGeometry args={[1, 1, 5]} />
            <meshStandardMaterial color="#2a2239" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0, 1.3, 0.225]} rotation={[0, 0, Math.PI / 4]} scale={[0.57, 0.1, 0.09]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#9d85e7" emissive="#634aa5" emissiveIntensity={0.35} roughness={0.42} />
          </mesh>
        </>
      )}
    </group>
  );
}

const EMPTY_BROKEN = new Set<string>();

function BotActor({
  rival,
  motionRef,
  reducedMotion,
  focused,
}: {
  rival: WorldRival;
  motionRef: MotionRef;
  reducedMotion: boolean;
  focused: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const poseRef = useRef(createWorldMotion());
  const tint = useMemo(() => new THREE.Color(rival.armorTint), [rival.armorTint]);
  const profile = getWorldBotProfileByName(rival.name);
  const tintAppliedRef = useRef(false);
  const [noticed, setNoticed] = useState(false);
  const [walking, setWalking] = useState(false);

  useFrame((frame) => {
    const root = rootRef.current;
    if (!root) return;
    const motion = motionRef.current;
    const playerDistance = motion.distance;
    const gap = rival.distance - playerDistance;
    const detected = gap > -0.5 && gap <= 18;
    const approaching = gap > 2.7 && gap <= 8;
    const patrol = detected ? 0 : Math.sin(frame.clock.elapsedTime * 0.7 + rival.level) * 0.26;
    const challengeStep = approaching && !reducedMotion
      ? Math.sin(frame.clock.elapsedTime * 4.8) * 0.12
      : 0;
    root.position.set(patrol, 0, -(rival.distance - motion.cameraX) + challengeStep);
    root.scale.setScalar(rival.size);
    root.visible = gap >= -12 && gap <= 105;
    if (detected) {
      const dx = motion.depth * 5.2 - rival.x;
      const dz = gap;
      root.rotation.y = Math.atan2(dx, -dz) + Math.PI;
    } else {
      root.rotation.y = Math.sin(frame.clock.elapsedTime * 0.34 + rival.level) * 0.08;
    }
    if (detected !== noticed) setNoticed(detected);
    if (approaching !== walking) setWalking(approaching);

    if (!tintAppliedRef.current) {
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        const tinted = materials.map((material) => {
          if (!(material instanceof THREE.MeshStandardMaterial)) return material;
          const clone = material.clone();
          clone.color.lerp(tint, 0.29);
          if (clone.emissive) clone.emissive.lerp(tint, 0.12);
          return clone;
        });
        if (tinted.some((material, index) => material !== materials[index])) {
          object.material = Array.isArray(object.material) ? tinted : tinted[0];
        }
      });
      tintAppliedRef.current = true;
    }
  });

  const botMotion = poseRef.current;
  botMotion.depth = 0;
  botMotion.velocityY = walking ? 1.4 : 0;

  return (
    <group ref={rootRef}>
      <group position={[rival.x, 0, 0]}>
        <KnightActor
          motionRef={poseRef}
          state={walking ? "walk" : "idle"}
          motionReduced={reducedMotion}
          castShadow={focused}
          appearance={profile?.appearance}
        />
      </group>
      <BotSignature rival={rival} />
      <mesh position={[rival.x - 0.38, 1.52, 0.02]} rotation={[0, 0, rival.weapon === "axe" ? -0.16 : 0.08]}>
        <dodecahedronGeometry args={[rival.weapon === "mace" ? 0.34 : 0.27, 0]} />
        <meshStandardMaterial color={rival.armorTint} roughness={0.38} metalness={0.62} flatShading />
      </mesh>
      <mesh position={[rival.x, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={focused ? [1.45, 1.62, 32] : [1.05, 1.18, 24]} />
        <meshBasicMaterial
          color={noticed || focused ? "#ff704f" : rival.armorTint}
          transparent
          opacity={noticed || focused ? 0.6 : 0.24}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Html position={[rival.x, 2.85 * rival.size, 0]} center distanceFactor={13} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <span className={`world-rival-tag${focused ? " is-focused" : ""}${walking ? " is-challenging" : ""}`} data-weapon={rival.weapon}>
          <b>{rival.name}</b><span>{walking ? "MEYDAN OKU" : rival.title}</span>
        </span>
      </Html>
    </group>
  );
}

export default function WorldRoadEntities({
  motionRef,
  rivals,
  collectedPickupIds,
  brokenObstacleIds = EMPTY_BROKEN,
  focusedRivalId,
  reducedMotion,
}: {
  motionRef: MotionRef;
  rivals: WorldRival[];
  collectedPickupIds: ReadonlySet<string>;
  brokenObstacleIds?: ReadonlySet<string>;
  focusedRivalId: string | null;
  reducedMotion: boolean;
}) {
  const initialChapter = Math.max(0, Math.floor(motionRef.current.distance / 144));
  const [chapter, setChapter] = useState(initialChapter);
  useFrame(() => {
    const next = Math.max(0, Math.floor(motionRef.current.distance / 144));
    if (next !== chapter) setChapter(next);
  });
  const chapters = useMemo(() => getWorldContentAround(chapter, 0), [chapter]);
  const unlockedPickupIds = useMemo(() => {
    const unlocked = new Set<string>();
    for (const content of chapters) {
      for (const obstacle of content.obstacles) {
        if (obstacle.dropPickupId && brokenObstacleIds.has(obstacle.id)) unlocked.add(obstacle.dropPickupId);
      }
    }
    return unlocked;
  }, [brokenObstacleIds, chapters]);
  const visiblePickups = useMemo(
    () => chapters.flatMap((content) => content.pickups)
      .filter((pickup) => !pickup.sourceObstacleId || unlockedPickupIds.has(pickup.id)),
    [chapters, unlockedPickupIds],
  );
  const visibleObstacles = useMemo(() => chapters.flatMap((content) => content.obstacles), [chapters]);
  const activeRivals = rivals.filter((rival) => {
    const gap = rival.distance - motionRef.current.distance;
    return gap >= -12 && gap <= 105;
  });

  return (
    <>
      {visiblePickups.map((pickup) => !collectedPickupIds.has(pickup.id) && (
        <Collectible
          key={pickup.id}
          pickup={pickup}
          motionRef={motionRef}
          unlocked
          reducedMotion={reducedMotion}
        />
      ))}
      {visibleObstacles.map((obstacle) => (
        <Obstacle
          key={obstacle.id}
          obstacle={obstacle}
          motionRef={motionRef}
          broken={brokenObstacleIds.has(obstacle.id)}
        />
      ))}
      {activeRivals.map((rival) => (
        <BotActor
          key={rival.id}
          rival={rival}
          motionRef={motionRef}
          reducedMotion={reducedMotion}
          focused={rival.id === focusedRivalId}
        />
      ))}
    </>
  );
}
