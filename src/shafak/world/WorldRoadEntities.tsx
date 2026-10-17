import { Html, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { MutableRefObject } from "react";
import KnightActor from "./KnightActor";
import { createWorldMotion, type WorldMotion } from "./movement";
import {
  RIVAL_DIALOGUE_RANGE_METERS,
  type WorldInteractableRegistry,
} from "./world-interactables";
import { getNpcStoryDialogue } from "./story-dialogue";
import { calculateNpcDialoguePosition } from "./world-dialogue-layout";
import type { WorldObstacle, WorldPickup, WorldRival } from "./world-content";
import { getWorldBotProfileByArchetype } from "./world-bot-profiles";
import { getAnimatedRivalModelConfig } from "./opponent-model-config";
import type { WeatherMode } from "./world-biomes";
import { raycastWorldGround, WorldAssetFallback, WorldAssetModel } from "./WorldModel";

type MotionRef = MutableRefObject<WorldMotion>;

const PICKUP_STYLE = {
  "gold-small": { color: "#ffd76d", glow: "#f1a936", size: 0.32 },
  "gold-large": { color: "#ffe8a2", glow: "#f0aa36", size: 0.42 },
  "treasure-cache": { color: "#f1ca70", glow: "#e39532", size: 0.46 },
  "diamond-small": { color: "#83f3eb", glow: "#30cbd3", size: 0.4 },
  "iron-shard": { color: "#d1d8df", glow: "#7d9ba4", size: 0.27 },
  "ember-crystal": { color: "#ff9a56", glow: "#de542d", size: 0.29 },
  "seal-fragment": { color: "#d9a9ff", glow: "#9f62e4", size: 0.3 },
} as const;

const COIN_STACK_OFFSETS: readonly [number, number, number][] = [
  [-0.13, -0.1, 0],
  [0.13, -0.1, 0],
  [0, -0.1, -0.13],
  [0, -0.1, 0.13],
  [0, -0.1, 0],
  [-0.035, -0.025, 0],
  [0.04, 0.035, 0.025],
];

function pickupLabel(pickup: WorldPickup) {
  if (pickup.kind === "gold-small" || pickup.kind === "gold-large" || pickup.kind === "treasure-cache") {
    return `ALTIN +${pickup.amount}`;
  }
  if (pickup.kind === "diamond-small") return `ELMAS +${pickup.amount}`;
  if (pickup.kind === "iron-shard") return `DEMİR +${pickup.amount}`;
  if (pickup.kind === "ember-crystal") return `KOR +${pickup.amount}`;
  return `MÜHÜR +${pickup.amount}`;
}

function calculateNpcDialogueElementPosition(
  object: THREE.Object3D,
  camera: THREE.Camera,
  size: { width: number; height: number },
): number[] {
  const projected = new THREE.Vector3()
    .setFromMatrixPosition(object.matrixWorld)
    .project(camera);
  const projectedX = projected.x * (size.width / 2) + size.width / 2;
  const projectedY = -projected.y * (size.height / 2) + size.height / 2;
  return calculateNpcDialoguePosition(projectedX, projectedY, size);
}

function Collectible({
  pickup,
  motionRef,
  unlocked,
  reducedMotion,
  maxVisibleDistance,
}: {
  pickup: WorldPickup;
  motionRef: MotionRef;
  unlocked: boolean;
  reducedMotion: boolean;
  maxVisibleDistance: number;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const style = PICKUP_STYLE[pickup.kind];
  const geometry = pickup.kind === "gold-small"
    ? "coin"
    : pickup.kind === "gold-large"
      ? "large-coin"
      : pickup.kind === "treasure-cache" ? "large-coin" : "crystal";

  useFrame((frame) => {
    const root = rootRef.current;
    const spin = spinRef.current;
    if (!root || !spin) return;
    const motion = motionRef.current;
    const relativeDistance = pickup.distance - motion.distance;
    const itemZ = -(pickup.distance - motion.cameraX);
    root.position.x = pickup.x;
    root.position.z = itemZ;
    root.position.y = 0.16 + (reducedMotion ? 0 : Math.sin(frame.clock.elapsedTime * 2.1 + pickup.distance) * 0.025);
    root.visible = unlocked && Math.abs(relativeDistance) <= maxVisibleDistance;
    if (!reducedMotion) {
      spin.rotation.y = frame.clock.elapsedTime * (pickup.kind === "seal-fragment" ? 0.82 : 1.25);
      spin.rotation.z = Math.sin(frame.clock.elapsedTime * 1.4 + pickup.x) * 0.12;
    }
  });

  if (!unlocked) return null;
  return (
    <group ref={rootRef} position={[pickup.x, 0.16, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]}>
        <ringGeometry args={[style.size * 0.72, style.size * 1.02, 20]} />
        <meshBasicMaterial color={style.glow} transparent opacity={0.34} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <group ref={spinRef}>
        {geometry === "coin" ? (
          <group rotation={[Math.PI / 2, 0, 0]}>
            <mesh scale={style.size}>
              <cylinderGeometry args={[0.78, 0.78, 0.2, 16]} />
              <meshStandardMaterial color={style.color} emissive={style.glow} emissiveIntensity={0.72} metalness={0.86} roughness={0.22} />
            </mesh>
            <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={style.size * 0.58}>
              <torusGeometry args={[0.64, 0.055, 5, 14]} />
              <meshStandardMaterial color="#fff0bb" emissive="#d98d22" emissiveIntensity={0.32} metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        ) : geometry === "large-coin" ? (
          <group>
            {COIN_STACK_OFFSETS.map(([x, y, z], index) => (
              <mesh
                key={index}
                position={[x, y, z]}
                rotation={[0, index * 0.31, (index % 3 - 1) * 0.035]}
              >
                <cylinderGeometry args={[style.size * 0.43, style.size * 0.43, style.size * 0.14, 10]} />
                <meshStandardMaterial
                  color={index % 2 ? style.color : "#d89a3c"}
                  emissive={style.glow}
                  emissiveIntensity={0.36}
                  metalness={0.78}
                  roughness={0.28}
                  flatShading
                />
              </mesh>
            ))}
          </group>
        ) : (
          <mesh scale={style.size}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={style.color} emissive={style.glow} emissiveIntensity={1.2} metalness={0.56} roughness={0.2} flatShading />
          </mesh>
        )}
        <Sparkles count={pickup.kind === "seal-fragment" || pickup.kind === "diamond-small" ? 5 : 3} scale={0.85} size={2.3} speed={reducedMotion ? 0 : 0.3} color={style.color} />
      </group>
      {(
        pickup.kind === "gold-small" ||
        pickup.kind === "gold-large" ||
        pickup.kind === "diamond-small" ||
        pickup.kind === "treasure-cache"
      ) && (
        <Html position={[0, 1.45, 0]} center distanceFactor={11} zIndexRange={[14, 0]} style={{ pointerEvents: "none" }}>
          <span className={`world-pickup-tag is-${pickup.kind}`}>{pickupLabel(pickup)}</span>
        </Html>
      )}
    </group>
  );
}

function Obstacle({
  obstacle,
  motionRef,
  broken,
  maxVisibleDistance,
  interactableRegistry,
}: {
  obstacle: WorldObstacle;
  motionRef: MotionRef;
  broken: boolean;
  maxVisibleDistance: number;
  interactableRegistry: WorldInteractableRegistry<WorldObstacle | WorldRival>;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const warningRef = useRef<THREE.Mesh>(null);
  const fallingRockRef = useRef<THREE.Group>(null);
  const fallStartedAtRef = useRef<number | null>(null);
  const chestLidRef = useRef<THREE.Group>(null);
  const groundY = useMemo(() => raycastWorldGround(obstacle.x, -150), [obstacle.x]);
  useEffect(() => {
    const isChest = obstacle.kind === "treasure-chest";
    const isBreakable = obstacle.kind === "barrel"
      || obstacle.kind === "vase"
      || obstacle.kind === "barricade";
    if (!isChest && !isBreakable) return undefined;
    const mesh = rootRef.current;
    if (!mesh) return undefined;
    return interactableRegistry.register({
      id: obstacle.id,
      kind: isChest ? "chest" : "breakable",
      x: obstacle.x,
      distance: obstacle.distance,
      radius: isChest ? 3.2 : 4.2,
      lateralRadius: obstacle.width / 2 + 1.3,
      state: broken
        ? isChest ? "opened" : "destroyed"
        : "active",
      mesh,
      source: obstacle,
    });
  }, [broken, interactableRegistry, obstacle]);

  const obstacleLabel = obstacle.kind === "spike-trap"
    ? "TUZAK · ZIPLA"
    : obstacle.kind === "falling-rock-trap"
      ? "DÜŞEN KAYA · ZIPLA"
    : obstacle.kind === "low-bar"
      ? "ALÇAK ENGEL · EĞİL"
        : obstacle.kind === "barrel"
          ? broken ? "VARİL KIRILDI · ALTIN" : "VARİL · KIR"
          : obstacle.kind === "vase"
            ? broken ? "VAZO KIRILDI · ALTIN" : "VAZO · KIR"
      : obstacle.kind === "barricade"
        ? broken ? "BARİKAT KIRILDI" : "BARİKAT · SALDIR"
        : obstacle.kind === "treasure-chest"
          ? broken ? "SANDIK AÇILDI · ALTIN" : "SANDIK · ZIPLA VE KIR"
          : "KAYA · ETRAFINDAN DOLAŞ";
  useFrame((frame) => {
    if (!rootRef.current) return;
    const gap = obstacle.distance - motionRef.current.distance;
    rootRef.current.position.y = groundY;
    rootRef.current.position.z = -(obstacle.distance - motionRef.current.cameraX);
    // Keep roadside gameplay objects in front of the player. A passed obstacle
    // must leave the camera corridor instead of enclosing the trailing camera.
    rootRef.current.visible = Math.abs(gap) <= maxVisibleDistance
      && (gap >= -1.5 || (broken && obstacle.health > 0));
    if (fallingRockRef.current) {
      if (gap <= 7.2 && fallStartedAtRef.current === null) {
        fallStartedAtRef.current = frame.clock.elapsedTime;
      }
      const elapsed = fallStartedAtRef.current === null
        ? 0
        : Math.max(0, frame.clock.elapsedTime - fallStartedAtRef.current);
      const progress = THREE.MathUtils.clamp(elapsed / 0.48, 0, 1);
      const eased = 1 - (1 - progress) ** 3;
      fallingRockRef.current.position.y = 5.2 - eased * 4.25;
      fallingRockRef.current.rotation.x = 0.16 + eased * 0.82;
      fallingRockRef.current.rotation.z = -0.1 - eased * 0.36;
    }
    if (chestLidRef.current) {
      const target = broken ? -1.18 : 0;
      chestLidRef.current.rotation.x = THREE.MathUtils.damp(chestLidRef.current.rotation.x, target, 8, 0.05);
    }
    if (warningRef.current) {
      const pulse = 0.42 + (Math.sin(frame.clock.elapsedTime * 4.4) + 1) * 0.11;
      const nearby = Math.abs(obstacle.distance - motionRef.current.distance) < 10;
      warningRef.current.scale.setScalar(nearby ? 1 + pulse * 0.14 : 1);
    }
  });

  return (
    <group ref={rootRef} position={[obstacle.x, groundY, 0]}>
      <Html position={[0, 2.12, 0]} center distanceFactor={16} zIndexRange={[12, 0]} style={{ pointerEvents: "none" }}>
        <span className={`world-obstacle-tag is-${obstacle.kind}`}>{obstacleLabel}</span>
      </Html>
      {!["falling-rock-trap", "spike-trap", "treasure-chest"].includes(obstacle.kind) && (
        <mesh position={[0, 0.028, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[obstacle.width * 0.55, obstacle.width * 0.63, 28]} />
          <meshBasicMaterial color={obstacle.kind === "rock" ? "#ffc077" : "#ff9569"} transparent opacity={0.43} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {obstacle.kind === "rock" ? (
        <Suspense fallback={<WorldAssetFallback src="/assets/rock-wall.glb" height={1.95} />}>
          <WorldAssetModel src="/assets/rock-wall.glb" height={1.95} />
        </Suspense>
      ) : obstacle.kind === "falling-rock-trap" ? (
        <group>
          <group ref={fallingRockRef} position={[0, 5.2, 0]}>
            <Suspense fallback={<WorldAssetFallback src="/assets/rock-wall.glb" height={2.16} />}>
              <WorldAssetModel src="/assets/rock-wall.glb" height={2.16} />
            </Suspense>
          </group>
          <mesh ref={warningRef} position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.75, 1.94, 28]} />
            <meshBasicMaterial color="#ff795b" transparent opacity={0.52} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <Sparkles count={6} position={[0, 1.05, 0]} scale={[2.8, 0.5, 1.3]} size={2.4} speed={0.22} color="#d8bc9b" />
        </group>
      ) : obstacle.kind === "treasure-chest" ? (
        <group>
          <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.28, 1.39, 28]} />
            <meshBasicMaterial color="#f2ca76" transparent opacity={0.43} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {broken ? (
            <group ref={chestLidRef}>
              <mesh position={[0, 0.38, 0]} scale={[1.72, 0.64, 1.02]}>
                <icosahedronGeometry args={[0.52, 2]} />
                <meshStandardMaterial color="#714326" roughness={0.78} metalness={0.12} />
              </mesh>
              <mesh position={[0, 0.61, 0.42]} scale={[0.85, 0.26, 0.13]}>
                <sphereGeometry args={[0.34, 16, 10]} />
                <meshStandardMaterial color="#d6a14f" metalness={0.72} roughness={0.34} />
              </mesh>
            </group>
          ) : (
            <Suspense fallback={<WorldAssetFallback src="/assets/treasure-chest.glb" height={1.24} />}>
              <WorldAssetModel src="/assets/treasure-chest.glb" height={1.24} />
            </Suspense>
          )}
          {broken && (
            <>
              <mesh position={[0, 0.84, 0]}>
                <icosahedronGeometry args={[0.3, 1]} />
                <meshStandardMaterial color="#ffe792" emissive="#ffac34" emissiveIntensity={2.1} metalness={0.55} roughness={0.18} />
              </mesh>
              <pointLight position={[0, 1.1, 0]} color="#ffb84d" intensity={8} distance={4} />
              <Sparkles count={14} position={[0, 1.1, 0]} scale={1.7} size={3.2} speed={0.42} color="#ffdf83" />
            </>
          )}
        </group>
      ) : obstacle.kind === "spike-trap" ? (
        <group>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[obstacle.width, 0.08, 1.8]} />
            <meshStandardMaterial color="#553438" roughness={0.82} />
          </mesh>
          {[-1.25, 0, 1.25].map((x) => (
            <mesh key={x} position={[x, 0.55, 0]} rotation={[0, 0, 0.12]}>
              <cylinderGeometry args={[0.025, 0.18, 0.95, 18, 8]} />
              <meshStandardMaterial color="#c7c0b2" metalness={0.58} roughness={0.34} />
            </mesh>
          ))}
          <mesh ref={warningRef} position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.3, 2.45, 32]} />
            <meshBasicMaterial color="#ff795b" transparent opacity={0.46} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      ) : obstacle.kind === "barrel" ? (
        broken ? (
          <group>
            {[-0.34, 0.02, 0.31].map((x, index) => (
              <mesh key={x} position={[x, 0.18 + (index % 2) * 0.08, 0.04]} rotation={[0.12, 0, (index - 1) * 0.48]}>
                <boxGeometry args={[0.3, 0.12, 0.55]} />
                <meshStandardMaterial color={index % 2 ? "#8b5933" : "#69432f"} roughness={0.9} />
              </mesh>
            ))}
            <Sparkles count={5} position={[0, 0.5, 0]} scale={1.1} size={2.4} speed={0.2} color="#f5c56d" />
          </group>
        ) : (
          <Suspense fallback={<WorldAssetFallback src="/assets/wooden-barrel.glb" height={1.12} />}>
            <WorldAssetModel src="/assets/wooden-barrel.glb" height={1.12} />
          </Suspense>
        )
      ) : obstacle.kind === "vase" ? (
        broken ? (
          <group>
            {[-0.28, 0.08, 0.31].map((x, index) => (
              <mesh key={x} position={[x, 0.12 + (index % 2) * 0.1, 0.05]} rotation={[0.12, 0, (index - 1) * 0.56]} scale={[1.25, 0.48, 0.8]}>
                <icosahedronGeometry args={[0.19, 1]} />
                <meshStandardMaterial color={index % 2 ? "#bd8362" : "#8b594b"} roughness={0.86} />
              </mesh>
            ))}
            <Sparkles count={5} position={[0, 0.45, 0]} scale={0.9} size={2.2} speed={0.2} color="#f5c56d" />
          </group>
        ) : (
          <Suspense fallback={<WorldAssetFallback src="/assets/ceramic-vase.glb" height={1.04} />}>
            <WorldAssetModel src="/assets/ceramic-vase.glb" height={1.04} />
          </Suspense>
        )
      ) : obstacle.kind === "low-bar" ? (
        <group>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * (obstacle.width / 2 - 0.12), 0.81, 0]}>
              <cylinderGeometry args={[0.1, 0.16, 1.62, 18, 3]} />
              <meshStandardMaterial color="#745340" roughness={0.86} />
            </mesh>
          ))}
          <mesh position={[0, 1.62, 0]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.14, Math.max(0.2, obstacle.width - 0.38), 6, 16]} />
            <meshStandardMaterial color="#342927" roughness={0.85} />
          </mesh>
          {[-0.58, 0, 0.58].map((x) => (
            <mesh key={x} position={[x, 1.62, 0.25]}>
              <boxGeometry args={[0.12, 0.19, 0.025]} />
              <meshStandardMaterial color="#f1b75e" emissive="#9c572f" emissiveIntensity={0.24} />
            </mesh>
          ))}
        </group>
      ) : obstacle.kind === "barricade" ? (
        broken ? (
          <group>
            {[-0.7, 0.04, 0.72].map((x, index) => (
              <mesh key={x} position={[x, 0.18, 0.06]} rotation={[0.08, 0, (index - 1) * 0.32]} scale={[0.68, 1, 1]}>
                <capsuleGeometry args={[0.14, 0.72, 5, 12]} />
                <meshStandardMaterial color={index % 2 ? "#8b6545" : "#6f4a36"} roughness={0.91} />
              </mesh>
            ))}
            <Sparkles count={6} position={[0, 0.55, 0]} scale={[2.1, 0.8, 0.7]} size={2.1} speed={0.18} color="#dda66a" />
          </group>
        ) : (
          <group>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * (obstacle.width / 2 - 0.22), 0.56, 0.14]} rotation={[0, 0, side * -0.12]}>
                <cylinderGeometry args={[0.085, 0.13, 1.12, 16, 3]} />
                <meshStandardMaterial color="#684a37" roughness={0.91} />
              </mesh>
            ))}
            {[0.35, 0.72, 1.08].map((y, index) => (
              <mesh key={y} position={[0, y, index === 1 ? 0.04 : -0.08]} rotation={[0, 0, index === 1 ? 0.025 : -0.02]}>
                <capsuleGeometry args={[0.15, Math.max(0.2, obstacle.width - 0.46), 6, 18]} />
                <meshStandardMaterial color={index === 1 ? "#745340" : "#825b3c"} roughness={0.9} />
              </mesh>
            ))}
          </group>
        )
      ) : (
        <group>
          <mesh position={[0, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.17, Math.max(0.2, obstacle.width - 0.42), 6, 16]} />
            <meshStandardMaterial color="#745340" roughness={0.86} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * (obstacle.width / 2 - 0.22), 0.55, 0.12]}>
              <cylinderGeometry args={[0.085, 0.13, 1.1, 16, 3]} />
              <meshStandardMaterial color="#684a37" roughness={0.91} />
            </mesh>
          ))}
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
      {rival.archetype === "storm-lancer" && (
        <>
          <mesh position={[0.5, 1.05, 0.2]} rotation={[0, 0, -0.12]}>
            <cylinderGeometry args={[0.035, 0.045, 1.45, 6]} />
            <meshStandardMaterial color="#b7dfe0" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0.5, 1.84, 0.2]} rotation={[0, 0, -0.12]}>
            <coneGeometry args={[0.11, 0.32, 5]} />
            <meshStandardMaterial color="#73dce0" emissive="#318d9c" emissiveIntensity={0.4} />
          </mesh>
        </>
      )}
      {rival.archetype === "rift-berserker" && (
        <>
          {[-0.22, 0.22].map((side) => (
            <mesh key={side} position={[side, 1.95, 0.03]} rotation={[0, 0, side * 1.9]}>
              <coneGeometry args={[0.11, 0.4, 5]} />
              <meshStandardMaterial color="#d86a48" emissive="#87372f" emissiveIntensity={0.3} />
            </mesh>
          ))}
          <mesh position={[0, 1.38, 0.235]} scale={[0.3, 0.24, 0.08]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#b64a3e" metalness={0.52} roughness={0.4} />
          </mesh>
        </>
      )}
      {rival.archetype === "ember-alchemist" && (
        <>
          <mesh position={[0.35, 1.2, -0.2]} rotation={[0.12, 0, -0.08]}>
            <cylinderGeometry args={[0.14, 0.11, 0.48, 7]} />
            <meshStandardMaterial color="#81452d" emissive="#ed6334" emissiveIntensity={0.28} roughness={0.46} />
          </mesh>
          <mesh position={[0.35, 1.46, -0.2]}>
            <sphereGeometry args={[0.11, 8, 6]} />
            <meshBasicMaterial color="#ffb557" />
          </mesh>
        </>
      )}
      {rival.archetype === "venom-assassin" && (
        <>
          {[-0.36, 0.36].map((side) => (
            <mesh key={side} position={[side, 1.16, 0.25]} rotation={[0, 0, side * 0.26]}>
              <boxGeometry args={[0.065, 0.52, 0.055]} />
              <meshStandardMaterial color="#a7e077" emissive="#5b9a55" emissiveIntensity={0.45} metalness={0.7} />
            </mesh>
          ))}
          <mesh position={[0, 1.74, 0.22]}>
            <sphereGeometry args={[0.095, 8, 6]} />
            <meshBasicMaterial color="#b6ed79" />
          </mesh>
        </>
      )}
      {rival.archetype === "frost-hunter" && (
        <>
          <mesh position={[0, 1.91, 0.02]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.22, 0.42, 5]} />
            <meshStandardMaterial color="#9ed4e1" emissive="#4b8fa5" emissiveIntensity={0.32} />
          </mesh>
          <mesh position={[0.2, 1.18, -0.2]} rotation={[0.2, 0, -0.18]}>
            <torusGeometry args={[0.36, 0.025, 6, 12, Math.PI]} />
            <meshStandardMaterial color="#d8f3f5" emissive="#74b8c8" emissiveIntensity={0.24} />
          </mesh>
        </>
      )}
      {rival.archetype === "chapter-boss" && (
        <>
          <mesh position={[0, 2.08, 0.04]}>
            <coneGeometry args={[0.32, 0.52, 6]} />
            <meshStandardMaterial color="#f0bd69" emissive="#9c4a39" emissiveIntensity={0.42} metalness={0.65} />
          </mesh>
          <mesh position={[0, 1.4, 0.24]} scale={[0.42, 0.32, 0.08]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#d44e4d" emissive="#f15a4f" emissiveIntensity={0.8} metalness={0.45} />
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
  dialoguePortal,
  reducedMotion,
  focused,
  talking,
  canChallenge,
  dailyAccessAllowed,
  challengeLabel,
  onChallenge,
  interactableRegistry,
}: {
  rival: WorldRival;
  motionRef: MotionRef;
  dialoguePortal: MutableRefObject<HTMLDivElement>;
  reducedMotion: boolean;
  focused: boolean;
  talking: boolean;
  canChallenge: boolean;
  dailyAccessAllowed: boolean;
  challengeLabel: string;
  onChallenge: (rival: WorldRival) => void;
  interactableRegistry: WorldInteractableRegistry<WorldObstacle | WorldRival>;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const actorPivotRef = useRef<THREE.Group>(null);
  const poseRef = useRef(createWorldMotion());
  const tint = useMemo(() => new THREE.Color(rival.armorTint), [rival.armorTint]);
  const profile = getWorldBotProfileByArchetype(rival.archetype);
  const modelConfig = useMemo(
    () => getAnimatedRivalModelConfig(rival.name, profile),
    [profile, rival.name],
  );
  const dialogue = getNpcStoryDialogue(rival.name, rival.chapterId);
  const dialogueSpeaker = dialogue?.speaker ?? rival.name;
  const dialogueLine = dialogue?.lines[0] ?? rival.taunt;
  const tintAppliedRef = useRef(false);
  useEffect(() => {
    const mesh = rootRef.current;
    if (!mesh) return undefined;
    return interactableRegistry.register({
      id: rival.id,
      kind: "rival",
      x: rival.x,
      distance: rival.distance,
      radius: RIVAL_DIALOGUE_RANGE_METERS + 0.8,
      lateralRadius: 3.4,
      state: "active",
      mesh,
      source: rival,
    });
  }, [interactableRegistry, rival]);

  useFrame((_state, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const motion = motionRef.current;
    const gap = rival.distance - motion.distance;
    const speaking = talking && Math.abs(gap) <= RIVAL_DIALOGUE_RANGE_METERS;
    const actorZ = -(rival.distance - motion.cameraX);
    const playerX = motion.depth * 5.2;
    const playerZ = -(motion.distance - motion.cameraX);
    root.position.set(0, 0, actorZ);
    root.scale.setScalar(rival.size);
    root.visible = gap >= -12 && gap <= 105;
    root.rotation.y = 0;
    if (actorPivotRef.current) {
      const targetYaw = focused || talking
        ? Math.atan2(rival.x - playerX, actorZ - playerZ)
        : 0;
      actorPivotRef.current.rotation.y = THREE.MathUtils.damp(
        actorPivotRef.current.rotation.y,
        targetYaw,
        7,
        Math.min(delta, 0.05),
      );
    }

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
  botMotion.velocityX = 0;
  botMotion.velocityY = 0;

  return (
    <group ref={rootRef}>
      <group ref={actorPivotRef} position={[rival.x, 0, 0]}>
        <KnightActor
          motionRef={poseRef}
          state="idle"
          talking={talking && Math.abs(rival.distance - motionRef.current.distance) <= 12}
          motionReduced={reducedMotion}
          animationTimeScale={1}
          castShadow={focused || talking}
          appearance={profile?.appearance}
          modelConfig={modelConfig}
        />
      </group>
      {talking && Math.abs(rival.distance - motionRef.current.distance) <= RIVAL_DIALOGUE_RANGE_METERS && (
        <Html
          portal={dialoguePortal}
          position={[rival.x, 2.95, 0]}
          center
          zIndexRange={[90, 0]}
          calculatePosition={calculateNpcDialogueElementPosition}
          style={{ pointerEvents: "auto" }}
        >
          <div className="world-npc-dialogue" role="group" aria-label={`${dialogueSpeaker} ile karşılaşma`}>
            <span>{dialogueSpeaker} konuşuyor</span>
            <p>“{dialogueLine}”</p>
            {canChallenge && dailyAccessAllowed ? (
              <button
                className="world-npc-dialogue__fight"
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onChallenge(rival);
                }}
              >
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
      <BotSignature rival={rival} />
      <mesh position={[rival.x, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={focused || talking ? [1.45, 1.62, 32] : [1.05, 1.18, 24]} />
        <meshBasicMaterial
          color={focused || talking ? "#ff704f" : rival.armorTint}
          transparent
          opacity={focused || talking ? 0.6 : 0.24}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Html position={[rival.x, 2.85 * rival.size, 0]} center distanceFactor={13} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <span className={`world-rival-tag${focused ? " is-focused" : ""}${rival.isBoss ? " is-boss" : ""}`} data-weapon={rival.weapon}>
          <b>{rival.name}</b><span>{rival.title}</span>
        </span>
      </Html>
    </group>
  );
}

export default function WorldRoadEntities({
  motionRef,
  dialoguePortal,
  rivals,
  pickups,
  obstacles,
  collectedPickupIds,
  brokenObstacleIds = EMPTY_BROKEN,
  focusedRivalId,
  talkingRivalId,
  canChallenge,
  dailyAccessAllowed,
  challengeLabel,
  onChallenge,
  reducedMotion,
  weather,
  interactableRegistry,
}: {
  motionRef: MotionRef;
  dialoguePortal: MutableRefObject<HTMLDivElement>;
  rivals: WorldRival[];
  pickups: WorldPickup[];
  obstacles: WorldObstacle[];
  collectedPickupIds: ReadonlySet<string>;
  brokenObstacleIds?: ReadonlySet<string>;
  focusedRivalId: string | null;
  talkingRivalId: string | null;
  canChallenge: boolean;
  dailyAccessAllowed: boolean;
  challengeLabel: string;
  onChallenge: (rival: WorldRival) => void;
  reducedMotion: boolean;
  weather: WeatherMode;
  interactableRegistry: WorldInteractableRegistry<WorldObstacle | WorldRival>;
}) {
  const maxVisibleDistance = weather === "fog" ? 48 : weather === "storm" ? 80 : 112;
  const unlockedPickupIds = useMemo(() => {
    const unlocked = new Set<string>();
    for (const obstacle of obstacles) {
      if (obstacle.dropPickupId && brokenObstacleIds.has(obstacle.id)) {
        unlocked.add(obstacle.dropPickupId);
      }
    }
    return unlocked;
  }, [brokenObstacleIds, obstacles]);
  const visiblePickups = useMemo(
    () => pickups.filter((pickup) => !pickup.sourceObstacleId || unlockedPickupIds.has(pickup.id)),
    [pickups, unlockedPickupIds],
  );
  const visibleObstacles = obstacles;
  const activeRivals = rivals.filter((rival) => {
    const gap = rival.distance - motionRef.current.distance;
    return gap >= -12 && gap <= maxVisibleDistance;
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
          maxVisibleDistance={maxVisibleDistance}
        />
      ))}
      {visibleObstacles.map((obstacle) => (
        <Obstacle
          key={obstacle.id}
          obstacle={obstacle}
          motionRef={motionRef}
          broken={brokenObstacleIds.has(obstacle.id)}
          maxVisibleDistance={maxVisibleDistance}
          interactableRegistry={interactableRegistry}
        />
      ))}
      {activeRivals.map((rival) => (
        <BotActor
          key={rival.id}
          rival={rival}
          motionRef={motionRef}
          dialoguePortal={dialoguePortal}
          reducedMotion={reducedMotion}
          focused={rival.id === focusedRivalId}
          talking={rival.id === talkingRivalId}
          canChallenge={canChallenge && rival.id === talkingRivalId}
          dailyAccessAllowed={dailyAccessAllowed}
          challengeLabel={challengeLabel}
          onChallenge={onChallenge}
          interactableRegistry={interactableRegistry}
        />
      ))}
    </>
  );
}
