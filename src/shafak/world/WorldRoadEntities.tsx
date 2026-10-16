import { Html, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  getWorldContentAround,
  PICKUP_MAGNET_RADIUS_METERS,
  type WorldObstacle,
  type WorldPickup,
  type WorldRival,
} from "./world-content";
import { getWorldBotProfileByArchetype } from "./world-bot-profiles";
import type { WeatherMode } from "./world-biomes";

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
    const playerX = motion.depth * 5.2;
    const playerZ = -(motion.distance - motion.cameraX);
    const itemZ = -(pickup.distance - motion.cameraX);
    const pickupDistance = Math.hypot(pickup.x - playerX, relativeDistance);
    const pull = THREE.MathUtils.clamp((PICKUP_MAGNET_RADIUS_METERS - pickupDistance) / (PICKUP_MAGNET_RADIUS_METERS - 1.1), 0, 0.88);
    root.position.x = THREE.MathUtils.lerp(pickup.x, playerX, pull);
    root.position.z = THREE.MathUtils.lerp(itemZ, playerZ, pull);
    root.position.y = 0.48 + (reducedMotion ? 0 : Math.sin(frame.clock.elapsedTime * 2.1 + pickup.distance) * 0.11);
    root.visible = unlocked && Math.abs(relativeDistance) <= maxVisibleDistance;
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
        <ringGeometry args={[style.size * 0.78, style.size * 1.3, 24]} />
        <meshBasicMaterial color={style.glow} transparent opacity={0.62} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.66, 0]}>
        <cylinderGeometry args={[0.035, style.size * 0.48, 1.32, 8, 1, true]} />
        <meshBasicMaterial color={style.glow} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
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
          <group rotation={[Math.PI / 2, 0, 0]}>
            <mesh scale={style.size * 1.18}>
              <cylinderGeometry args={[0.82, 0.82, 0.22, 16]} />
              <meshStandardMaterial color={style.color} emissive={style.glow} emissiveIntensity={0.9} metalness={0.86} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={style.size * 0.68}>
              <torusGeometry args={[0.64, 0.055, 5, 14]} />
              <meshStandardMaterial color="#fff1bd" emissive="#e19d36" emissiveIntensity={0.42} metalness={0.9} roughness={0.18} />
            </mesh>
          </group>
        ) : (
          <mesh scale={style.size}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={style.color} emissive={style.glow} emissiveIntensity={1.2} metalness={0.56} roughness={0.2} flatShading />
          </mesh>
        )}
        <Sparkles count={pickup.kind === "seal-fragment" || pickup.kind === "diamond-small" ? 5 : 3} scale={0.85} size={2.3} speed={reducedMotion ? 0 : 0.3} color={style.color} />
      </group>
      {pickup.kind === "treasure-cache" && (
        <Html position={[0, 1.45, 0]} center distanceFactor={12} zIndexRange={[14, 0]} style={{ pointerEvents: "none" }}>
          <span className="world-pickup-tag">ALTIN · {pickup.amount}</span>
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
    <group ref={rootRef} position={[obstacle.x, 0, 0]}>
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
        <mesh position={[0, 0.72, 0]} rotation={[0.1, 0.7, 0.2]}>
          <dodecahedronGeometry args={[0.92, 0]} />
          <meshStandardMaterial color="#84776e" emissive="#4b3022" emissiveIntensity={0.24} roughness={0.9} flatShading />
        </mesh>
      ) : obstacle.kind === "falling-rock-trap" ? (
        <group>
          <group ref={fallingRockRef} position={[0, 5.2, 0]}>
            <mesh castShadow>
              <dodecahedronGeometry args={[1.02, 0]} />
              <meshStandardMaterial color="#5d5655" roughness={0.96} flatShading />
            </mesh>
            <mesh position={[0.31, 0.16, -0.58]} rotation={[0.4, 0.3, 0.7]} scale={[0.45, 0.13, 0.08]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#393536" roughness={1} flatShading />
            </mesh>
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
          <mesh position={[0, 0.38, 0]}>
            <boxGeometry args={[1.78, 0.72, 1.08]} />
            <meshStandardMaterial color="#714326" roughness={0.65} metalness={0.22} />
          </mesh>
          <mesh position={[0, 0.4, 0.55]}>
            <boxGeometry args={[1.82, 0.12, 0.08]} />
            <meshStandardMaterial color="#eab95d" emissive="#bf7925" emissiveIntensity={0.42} metalness={0.76} roughness={0.25} />
          </mesh>
          {[-0.69, 0, 0.69].map((x) => (
            <mesh key={x} position={[x, 0.39, 0.56]}>
              <boxGeometry args={[0.09, 0.74, 0.08]} />
              <meshStandardMaterial color="#f3cf76" emissive="#d39735" emissiveIntensity={0.3} metalness={0.8} roughness={0.23} />
            </mesh>
          ))}
          <group ref={chestLidRef} position={[0, 0.72, -0.49]}>
            <mesh position={[0, 0.04, 0.49]}>
              <boxGeometry args={[1.86, 0.2, 1.08]} />
              <meshStandardMaterial color="#92592b" roughness={0.53} metalness={0.24} />
            </mesh>
            <mesh position={[0, -0.01, 0.98]}>
              <boxGeometry args={[0.25, 0.2, 0.09]} />
              <meshStandardMaterial color="#ffe58a" emissive="#ffc44f" emissiveIntensity={0.7} metalness={0.88} roughness={0.18} />
            </mesh>
          </group>
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
              <coneGeometry args={[0.24, 0.95, 5]} />
              <meshStandardMaterial color="#c7c0b2" metalness={0.58} roughness={0.32} />
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
          <group>
            <mesh position={[0, 0.52, 0]}>
              <cylinderGeometry args={[0.43, 0.43, 0.98, 10]} />
              <meshStandardMaterial color="#78492d" roughness={0.84} flatShading />
            </mesh>
            {[0.22, 0.8].map((y) => (
              <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.43, 0.055, 5, 10]} />
                <meshStandardMaterial color="#a6a7a2" metalness={0.62} roughness={0.36} />
              </mesh>
            ))}
            {[-0.18, 0.18].map((x) => (
              <mesh key={x} position={[x, 0.52, 0.22]}>
                <boxGeometry args={[0.07, 0.78, 0.035]} />
                <meshStandardMaterial color="#a67849" roughness={0.75} />
              </mesh>
            ))}
          </group>
        )
      ) : obstacle.kind === "vase" ? (
        broken ? (
          <group>
            {[-0.28, 0.08, 0.31].map((x, index) => (
              <mesh key={x} position={[x, 0.12 + (index % 2) * 0.1, 0.05]} rotation={[0.12, 0, (index - 1) * 0.56]}>
                <coneGeometry args={[0.19, 0.23, 4]} />
                <meshStandardMaterial color={index % 2 ? "#bd8362" : "#8b594b"} roughness={0.78} flatShading />
              </mesh>
            ))}
            <Sparkles count={5} position={[0, 0.45, 0]} scale={0.9} size={2.2} speed={0.2} color="#f5c56d" />
          </group>
        ) : (
          <group>
            <mesh position={[0, 0.45, 0]}>
              <cylinderGeometry args={[0.25, 0.4, 0.78, 9]} />
              <meshStandardMaterial color="#a96b58" roughness={0.78} flatShading />
            </mesh>
            <mesh position={[0, 0.86, 0]}>
              <cylinderGeometry args={[0.16, 0.22, 0.18, 9]} />
              <meshStandardMaterial color="#805246" roughness={0.82} flatShading />
            </mesh>
            <mesh position={[0, 0.96, 0]}>
              <torusGeometry args={[0.17, 0.045, 5, 9]} />
              <meshStandardMaterial color="#c58b69" roughness={0.65} />
            </mesh>
            <mesh position={[0, 0.46, 0.39]}>
              <torusGeometry args={[0.23, 0.035, 5, 9]} />
              <meshStandardMaterial color="#e0af79" roughness={0.62} />
            </mesh>
          </group>
        )
      ) : obstacle.kind === "low-bar" ? (
        <group>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * (obstacle.width / 2 - 0.12), 0.81, 0]}>
              <boxGeometry args={[0.2, 1.62, 0.48]} />
              <meshStandardMaterial color="#745340" roughness={0.86} />
            </mesh>
          ))}
          <mesh position={[0, 1.62, 0]}>
            <boxGeometry args={[obstacle.width, 0.2, 0.48]} />
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
              <mesh key={x} position={[x, 0.18, 0.06]} rotation={[0.08, 0, (index - 1) * 0.32]}>
                <boxGeometry args={[0.9, 0.13, 0.38]} />
                <meshStandardMaterial color={index % 2 ? "#8b6545" : "#6f4a36"} roughness={0.91} />
              </mesh>
            ))}
            <Sparkles count={6} position={[0, 0.55, 0]} scale={[2.1, 0.8, 0.7]} size={2.1} speed={0.18} color="#dda66a" />
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
        )
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
          motionReduced
          animationTimeScale={0}
          castShadow={focused || talking}
          appearance={profile?.appearance}
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
      <mesh position={[rival.x - 0.38, 1.52, 0.02]} rotation={[0, 0, rival.weapon === "axe" ? -0.16 : 0.08]}>
        <dodecahedronGeometry args={[rival.weapon === "mace" ? 0.34 : 0.27, 0]} />
        <meshStandardMaterial color={rival.armorTint} roughness={0.38} metalness={0.62} flatShading />
      </mesh>
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
  const initialChapter = Math.max(0, Math.floor(motionRef.current.distance / 144));
  const [chapter, setChapter] = useState(initialChapter);
  useFrame(() => {
    const next = Math.max(0, Math.floor(motionRef.current.distance / 144));
    if (next !== chapter) setChapter(next);
  });
  const chapters = useMemo(() => getWorldContentAround(chapter, 0), [chapter]);
  const maxVisibleDistance = weather === "fog" ? 48 : weather === "storm" ? 80 : 112;
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
