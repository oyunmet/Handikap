import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { MutableRefObject } from "react";
import type { EquipmentVisual } from "../game/store-types";
import {
  WORLD_GATE_INTERVAL_METERS,
  type WorldMotion,
} from "./movement";
import {
  getWorldContentAround,
  PICKUP_MAGNET_RADIUS_METERS,
  type WorldObstacle,
  type WorldPickup,
  type WorldRival,
} from "./world-content";
import { getWorldBotProfileByName } from "./world-bot-profiles";
import type { World3DProps } from "./World3D";
import type { TraversalState } from "./traversal";
import { dampCharacterYaw, getCharacterRootYawForModel } from "./character-facing";

type MotionRef = MutableRefObject<WorldMotion>;
type TraversalRef = MutableRefObject<TraversalState>;
type ClampSize = { width: number; height: number };
const LABEL_PROJECTION = new THREE.Vector3();

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));
const WARRIOR_MODEL_FORWARD_OFFSET = 0;

function clampRivalLabel(object: THREE.Object3D, camera: THREE.Camera, size: ClampSize): [number, number] {
  const projected = object.getWorldPosition(LABEL_PROJECTION).project(camera);
  const margin = Math.min(72, Math.max(32, size.width * 0.08));
  return [
    clamp((projected.x * 0.5 + 0.5) * size.width, margin, Math.max(margin, size.width - margin)),
    clamp((-projected.y * 0.5 + 0.5) * size.height, 28, Math.max(28, size.height - 28)),
  ];
}

function V2Warrior({
  tint,
  motionRef,
  mode,
  player = false,
  weapon,
  appearance,
}: {
  tint: string;
  motionRef: MotionRef;
  mode: "idle" | "walk" | "run" | "challenge" | "attack" | "victory" | "defeat";
  player?: boolean;
  weapon?: string;
  appearance?: EquipmentVisual;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const chestRef = useRef<THREE.Mesh>(null);
  const visorRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => new THREE.Color(tint), [tint]);
  const weaponColor = player
    ? appearance?.auraColor ?? "#bcecff"
    : weapon === "axe" ? "#d4ac73" : weapon === "mace" ? "#b3a1d4" : "#c3dce7";

  useFrame((frame, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const motion = motionRef.current;
    const safePhase = Number.isFinite(motion.stepPhase) ? motion.stepPhase : frame.clock.elapsedTime;
    const safeSpeed = Math.hypot(
      Number.isFinite(motion.velocityX) ? motion.velocityX : 0,
      Number.isFinite(motion.velocityY) ? motion.velocityY : 0,
    );
    const runBlend = THREE.MathUtils.smoothstep(safeSpeed, 3.3, 6.8);
    const walkBlend = THREE.MathUtils.smoothstep(safeSpeed, 0.15, 3.5);
    const phase = safePhase * (1 + runBlend * 1.7);
    const swing = Math.sin(phase) * (walkBlend * 0.42 + runBlend * 0.22);
    const breath = Math.sin(frame.clock.elapsedTime * 1.7) * 0.018;

    if (mode === "attack") {
      root.rotation.z = THREE.MathUtils.damp(root.rotation.z, -0.12, 10, delta);
      if (rightArmRef.current) rightArmRef.current.rotation.x = -1.28 + Math.sin(frame.clock.elapsedTime * 13) * 0.12;
    } else if (mode === "challenge") {
      root.rotation.z = Math.sin(frame.clock.elapsedTime * 4.2) * 0.04;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.54 + Math.sin(frame.clock.elapsedTime * 3) * 0.18;
    } else {
      root.rotation.z = THREE.MathUtils.damp(
        root.rotation.z,
        clamp(motion.velocityX * -0.055, -0.15, 0.15),
        8,
        delta,
      );
      if (rightArmRef.current) rightArmRef.current.rotation.x = -swing * 0.78;
    }
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    if (leftArmRef.current && mode !== "attack") leftArmRef.current.rotation.x = -swing * 0.76;
    if (chestRef.current) chestRef.current.position.y = 1.08 + breath;
    if (visorRef.current) {
      const material = visorRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.42 + Math.sin(frame.clock.elapsedTime * 2.4) * 0.12;
    }
  });

  return (
    <group ref={rootRef} scale={player ? 1 : 0.96}>
      <mesh ref={chestRef} position={[0, 1.08, 0]} castShadow>
        <capsuleGeometry args={[0.39, 0.64, 5, 8]} />
        <meshStandardMaterial color={color} metalness={0.48} roughness={0.54} flatShading />
      </mesh>
      <mesh position={[0, 1.55, 0.02]} castShadow>
        <dodecahedronGeometry args={[0.29, 0]} />
        <meshStandardMaterial color="#b8a98c" metalness={0.66} roughness={0.37} flatShading />
      </mesh>
      <mesh ref={visorRef} position={[0, 1.57, 0.267]}>
        <boxGeometry args={[0.34, 0.075, 0.025]} />
        <meshStandardMaterial color={weaponColor} emissive={weaponColor} emissiveIntensity={0.42} toneMapped={false} />
      </mesh>
      <mesh position={[-0.24, 1.19, 0.02]} rotation={[0, 0, -0.16]}>
        <boxGeometry args={[0.23, 0.4, 0.38]} />
        <meshStandardMaterial color={color} metalness={0.58} roughness={0.42} />
      </mesh>
      <mesh position={[0.24, 1.19, 0.02]} rotation={[0, 0, 0.16]}>
        <boxGeometry args={[0.23, 0.4, 0.38]} />
        <meshStandardMaterial color={color} metalness={0.58} roughness={0.42} />
      </mesh>
      <group ref={leftArmRef} position={[-0.48, 1.26, 0]}>
        <mesh position={[0, -0.2, 0]} rotation={[0, 0, -0.08]} castShadow>
          <capsuleGeometry args={[0.105, 0.38, 3, 6]} />
          <meshStandardMaterial color="#746b61" metalness={0.42} roughness={0.62} />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[0.48, 1.26, 0]}>
        <mesh position={[0, -0.2, 0]} rotation={[0, 0, 0.08]} castShadow>
          <capsuleGeometry args={[0.105, 0.38, 3, 6]} />
          <meshStandardMaterial color="#746b61" metalness={0.42} roughness={0.62} />
        </mesh>
        <mesh position={[0.04, -0.38, 0.16]} rotation={[0.12, 0, -0.1]}>
          {weapon === "axe" ? <coneGeometry args={[0.22, 0.42, 5]} /> : <boxGeometry args={[0.075, 0.94, 0.08]} />}
          <meshStandardMaterial color={weaponColor} emissive={weaponColor} emissiveIntensity={0.1} metalness={0.72} roughness={0.33} />
        </mesh>
      </group>
      <group ref={leftLegRef} position={[-0.2, 0.65, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <capsuleGeometry args={[0.15, 0.43, 3, 7]} />
          <meshStandardMaterial color="#48444c" metalness={0.36} roughness={0.68} />
        </mesh>
        <mesh position={[0, -0.58, 0.09]}>
          <boxGeometry args={[0.3, 0.14, 0.45]} />
          <meshStandardMaterial color="#383640" metalness={0.3} roughness={0.72} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.2, 0.65, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <capsuleGeometry args={[0.15, 0.43, 3, 7]} />
          <meshStandardMaterial color="#48444c" metalness={0.36} roughness={0.68} />
        </mesh>
        <mesh position={[0, -0.58, 0.09]}>
          <boxGeometry args={[0.3, 0.14, 0.45]} />
          <meshStandardMaterial color="#383640" metalness={0.3} roughness={0.72} />
        </mesh>
      </group>
      <mesh position={[0, 0.18, -0.19]} rotation={[0.09, 0, Math.PI]}>
        <coneGeometry args={[0.5, 1.15, 5]} />
        <meshStandardMaterial color={player ? "#302e3b" : color} roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function V2Player({
  motionRef,
  traversalRef,
  animationState,
  motionReduced,
  equipmentVisual,
  level,
  relicCount,
  lightRadius,
}: {
  motionRef: MotionRef;
  traversalRef?: TraversalRef;
  animationState: World3DProps["animationState"];
  motionReduced: boolean;
  equipmentVisual: EquipmentVisual;
  level: number;
  relicCount: number;
  lightRadius: number;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const dustRef = useRef<THREE.Mesh>(null);
  useFrame((frame) => {
    const motion = motionRef.current;
    if (!rootRef.current) return;
    const x = Number.isFinite(motion.depth) ? motion.depth * 5.2 : 0;
    const relativeDistance = motion.distance - motion.cameraX;
    const z = Number.isFinite(relativeDistance) ? -relativeDistance : 0;
    const speed = Math.hypot(
      Number.isFinite(motion.velocityX) ? motion.velocityX : 0,
      Number.isFinite(motion.velocityY) ? motion.velocityY : 0,
    );
    rootRef.current.position.set(x, traversalRef?.current.jumpHeight ?? 0, z);
    rootRef.current.rotation.y = motion.facing < 0 ? Math.PI : 0;
    if (dustRef.current) {
      const running = !motionReduced && speed > 3.3;
      dustRef.current.visible = running;
      dustRef.current.scale.setScalar(running ? 0.9 + Math.sin(frame.clock.elapsedTime * 9) * 0.1 : 0.8);
      const material = dustRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = running ? 0.26 : 0;
    }
  });
  const state = animationState === "hit"
    ? "attack"
    : animationState === "run"
      ? "run"
      : animationState === "walk"
        ? "walk"
          : animationState === "die"
            ? "defeat"
            : "idle";
  return (
    <group ref={rootRef} name="world-v2-player">
      <V2Warrior tint={equipmentVisual.auraColor ?? "#79786f"} motionRef={motionRef} mode={state} player appearance={equipmentVisual} />
      <mesh ref={dustRef} position={[0, 0.06, 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.68, 18]} />
        <meshBasicMaterial color="#b7c7c0" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.055, 0.04]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.44, 22]} />
        <meshBasicMaterial color="#080b14" transparent opacity={0.38} depthWrite={false} />
      </mesh>
    </group>
  );
}

function V2Pickup({
  pickup,
  motionRef,
}: {
  pickup: WorldPickup;
  motionRef: MotionRef;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const color = pickup.kind.includes("diamond") ? "#76efe5"
    : pickup.kind.includes("seal") ? "#d8a4ff"
      : pickup.kind.includes("iron") ? "#d4dce3"
        : pickup.kind.includes("gold") ? "#ffd273"
          : "#8cf2e2";
  useFrame((frame) => {
    const root = rootRef.current;
    if (!root) return;
    const motion = motionRef.current;
    const gap = pickup.distance - motion.distance;
    const playerX = motion.depth * 5.2;
    const playerZ = -(motion.distance - motion.cameraX);
    const baseZ = -(pickup.distance - motion.cameraX);
    const distance = Math.hypot(pickup.x - playerX, gap);
    const magnet = THREE.MathUtils.clamp((PICKUP_MAGNET_RADIUS_METERS - distance) / (PICKUP_MAGNET_RADIUS_METERS - 1.1), 0, 0.88);
    root.position.set(
      THREE.MathUtils.lerp(pickup.x, playerX, magnet),
      0.58 + Math.sin(frame.clock.elapsedTime * 2.4 + pickup.distance) * 0.1,
      THREE.MathUtils.lerp(baseZ, playerZ, magnet),
    );
    root.visible = Math.abs(gap) <= 110;
    root.scale.setScalar(distance <= PICKUP_MAGNET_RADIUS_METERS ? 1.12 : 1);
    if (spinRef.current) spinRef.current.rotation.y = frame.clock.elapsedTime * 1.3;
  });
  return (
    <group ref={rootRef} position={[pickup.x, 0.58, 0]} name={`world-v2-pickup-${pickup.kind}`}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, 0]}>
        <ringGeometry args={[0.2, 0.34, 20]} />
        <meshBasicMaterial color={color} transparent opacity={0.54} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <group ref={spinRef}>
        {pickup.kind.includes("gold") ? (
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={pickup.kind === "gold-large" ? 0.34 : 0.24}>
            <cylinderGeometry args={[0.78, 0.78, 0.15, 16]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} metalness={0.84} roughness={0.22} />
          </mesh>
        ) : (
          <mesh scale={0.25}>
            <octahedronGeometry args={[0.9, 0]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} metalness={0.48} roughness={0.22} flatShading />
          </mesh>
        )}
      </group>
    </group>
  );
}

function V2Obstacle({
  obstacle,
  motionRef,
  broken,
}: {
  obstacle: WorldObstacle;
  motionRef: MotionRef;
  broken: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const piecesRef = useRef<Array<THREE.Mesh | null>>([]);
  const breakStartedAtRef = useRef<number | null>(null);
  useFrame((frame) => {
    const root = rootRef.current;
    if (!root) return;
    const gap = obstacle.distance - motionRef.current.distance;
    root.position.z = -(obstacle.distance - motionRef.current.cameraX);
    root.visible = Math.abs(gap) <= 108 && (!broken || breakStartedAtRef.current !== null);
    if (broken && breakStartedAtRef.current === null) breakStartedAtRef.current = frame.clock.elapsedTime;
    if (!broken) breakStartedAtRef.current = null;
    const progress = breakStartedAtRef.current === null
      ? 0
      : THREE.MathUtils.clamp((frame.clock.elapsedTime - breakStartedAtRef.current) / 0.82, 0, 1);
    for (let index = 0; index < piecesRef.current.length; index += 1) {
      const piece = piecesRef.current[index];
      if (!piece) continue;
      piece.visible = broken ? progress < 1 : index === 0;
      if (broken) {
        const direction = index % 2 ? 1 : -1;
        piece.position.y = 0.46 + progress * (0.72 + index * 0.08);
        piece.position.x = direction * progress * (0.45 + index * 0.12);
        piece.rotation.set(progress * (index + 1), progress * direction, progress * 1.5);
        const material = piece.material as THREE.MeshStandardMaterial;
        material.opacity = 1 - progress;
      }
    }
  });

  const barricade = obstacle.kind === "barricade";
  return (
    <group ref={rootRef} position={[obstacle.x, 0, 0]} name={`world-v2-obstacle-${obstacle.kind}`}>
      {obstacle.kind === "rock" ? (
        <mesh ref={(mesh) => { piecesRef.current[0] = mesh; }} position={[0, 0.62, 0]} rotation={[0.12, 0.6, 0.2]} castShadow>
          <dodecahedronGeometry args={[0.82, 0]} />
          <meshStandardMaterial color="#71665c" roughness={0.9} flatShading />
        </mesh>
      ) : barricade ? (
        <>
          <mesh ref={(mesh) => { piecesRef.current[0] = mesh; }} position={[0, 0.56, 0]} castShadow>
            <boxGeometry args={[obstacle.width, 1.02, 0.48]} />
            <meshStandardMaterial color="#7f5339" roughness={0.82} />
          </mesh>
          {[-0.68, 0, 0.68].map((x, index) => (
            <mesh key={x} ref={(mesh) => { piecesRef.current[index + 1] = mesh; }} position={[x, 0.52, 0.05]}>
              <boxGeometry args={[0.11, 0.88, 0.54]} />
              <meshStandardMaterial color={index === 1 ? "#d2a36d" : "#a07753"} transparent />
            </mesh>
          ))}
        </>
      ) : (
        <group>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[obstacle.width, 0.1, 1.75]} />
            <meshStandardMaterial color="#49353b" roughness={0.8} />
          </mesh>
          {[-1.15, 0, 1.15].map((x) => (
            <mesh key={x} position={[x, 0.5, 0]}>
              <coneGeometry args={[0.22, 0.9, 5]} />
              <meshStandardMaterial color="#c8c3b7" metalness={0.62} roughness={0.33} />
            </mesh>
          ))}
        </group>
      )}
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.15, 1.27, 24]} />
        <meshBasicMaterial color={barricade ? "#ffb05f" : "#ff765b"} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function V2Rival({
  rival,
  motionRef,
  focused,
  reducedMotion,
  labelTargetRef,
}: {
  rival: WorldRival;
  motionRef: MotionRef;
  focused: boolean;
  reducedMotion: boolean;
  labelTargetRef: MutableRefObject<string | null>;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const tagRef = useRef<THREE.Group>(null);
  const profile = getWorldBotProfileByName(rival.name);
  useFrame((frame) => {
    const root = rootRef.current;
    if (!root) return;
    const motion = motionRef.current;
    const gap = rival.distance - motion.distance;
    const challenging = gap > 2.7 && gap <= 8;
    const detected = gap > -0.5 && gap <= 18;
    const patrol = detected ? 0 : Math.sin(frame.clock.elapsedTime * 0.7 + rival.level) * 0.26;
    const step = challenging && !reducedMotion ? Math.sin(frame.clock.elapsedTime * 4.8) * 0.12 : 0;
    root.position.set(patrol, 0, -(rival.distance - motion.cameraX) + step);
    root.scale.setScalar(Number.isFinite(rival.size) ? clamp(rival.size, 0.55, 1.8) : 1);
    root.visible = Math.abs(gap) <= 105;
    root.rotation.y = detected
      ? Math.atan2(motion.depth * 5.2 - rival.x, -gap) + Math.PI
      : Math.sin(frame.clock.elapsedTime * 0.34 + rival.level) * 0.08;
    if (tagRef.current) {
      tagRef.current.position.y = 2.86;
      tagRef.current.visible = labelTargetRef.current === rival.id;
    }
  });
  return (
    <group ref={rootRef} position={[rival.x, 0, 0]} name={`world-v2-rival-${rival.id}`}>
      <group position={[rival.x, 0, 0]}>
        <V2Warrior
          tint={rival.armorTint}
          motionRef={motionRef}
          mode="challenge"
          weapon={rival.weapon}
          appearance={profile?.appearance}
        />
      </group>
      <mesh position={[rival.x - 0.38, 1.44, 0.08]} rotation={[0, 0, rival.weapon === "axe" ? -0.18 : 0.12]}>
        <dodecahedronGeometry args={[rival.weapon === "mace" ? 0.32 : 0.25, 0]} />
        <meshStandardMaterial color={rival.armorTint} metalness={0.62} roughness={0.35} flatShading />
      </mesh>
      <mesh position={[rival.x, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={focused ? [1.48, 1.66, 32] : [1.08, 1.19, 24]} />
        <meshBasicMaterial
          color={focused ? "#ff7956" : rival.armorTint}
          transparent
          opacity={focused ? 0.62 : 0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <group ref={tagRef} position={[rival.x, 2.86, 0]}>
        <Html
          center
          calculatePosition={clampRivalLabel}
          distanceFactor={13}
          zIndexRange={[30, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className={`world-v2-rival-label${focused ? " is-focused" : ""}`} data-weapon={rival.weapon}>
            <b>{rival.name}</b>
            <span>{rival.title}</span>
          </span>
        </Html>
      </group>
    </group>
  );
}

function V2Gate({ motionRef }: { motionRef: MotionRef }) {
  const rootRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((frame) => {
    const motion = motionRef.current;
    const gateNumber = Math.max(1, Math.ceil((motion.distance + 16) / WORLD_GATE_INTERVAL_METERS));
    const gateDistance = gateNumber * WORLD_GATE_INTERVAL_METERS;
    if (rootRef.current) {
      rootRef.current.position.z = -(gateDistance - motion.cameraX);
      rootRef.current.visible = gateDistance - motion.distance < 118;
    }
    if (ringRef.current) ringRef.current.rotation.y = Math.sin(frame.clock.elapsedTime * 0.42) * 0.025;
  });
  return (
    <group ref={rootRef} name="world-v2-gate">
      <mesh position={[-4.6, 2.45, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.32, 4.9, 8]} />
        <meshStandardMaterial color="#87745c" metalness={0.43} roughness={0.61} />
      </mesh>
      <mesh position={[4.6, 2.45, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.32, 4.9, 8]} />
        <meshStandardMaterial color="#87745c" metalness={0.43} roughness={0.61} />
      </mesh>
      <mesh position={[0, 4.75, 0]}>
        <boxGeometry args={[9.4, 0.42, 0.4]} />
        <meshStandardMaterial color="#9c805b" metalness={0.38} roughness={0.58} />
      </mesh>
      <mesh ref={ringRef} position={[0, 2.5, 0.22]}>
        <torusGeometry args={[1.62, 0.075, 10, 56]} />
        <meshStandardMaterial color="#e4c48b" emissive="#b46d3d" emissiveIntensity={0.42} />
      </mesh>
      <Html position={[0, 5.3, 0]} center distanceFactor={20} zIndexRange={[12, 0]} style={{ pointerEvents: "none" }}>
        <span className="world-v2-gate-label">YENİ UFUK</span>
      </Html>
    </group>
  );
}

type RoadInstance = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

function makeRoadInstances(count: number, seed: number, kind: "rubble" | "cliff" | "ruin"): RoadInstance[] {
  let value = seed >>> 0;
  const random = () => {
    value = (Math.imul(value, 1_664_525) + 1_013_904_223) >>> 0;
    return value / 0xffff_ffff;
  };
  return Array.from({ length: count }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    if (kind === "cliff") {
      return {
        position: [side * (7.6 + random() * 2.2), 1.24, 104 - index * (count > 16 ? 8.8 : 12.6)] as [number, number, number],
        rotation: [0.035, random() * Math.PI, side * 0.055] as [number, number, number],
        scale: [1.8 + random() * 0.7, 2.8 + random() * 1.2, 1.7 + random() * 0.8] as [number, number, number],
      };
    }
    if (kind === "ruin") {
      const height = 1.2 + random() * 1.5;
      const toppled = random() > 0.78;
      return {
        position: [
          side * (5.15 + random() * 2.4),
          toppled ? 0.28 : height * 0.5,
          96 - index * (190 / Math.max(1, count - 1)),
        ] as [number, number, number],
        rotation: [toppled ? 0 : (random() - 0.5) * 0.12, random() * Math.PI, toppled ? (side * 0.9) : (random() - 0.5) * 0.12] as [number, number, number],
        scale: toppled
          ? [1.4 + random() * 0.7, 0.38 + random() * 0.12, 0.48 + random() * 0.18] as [number, number, number]
          : [0.5 + random() * 0.22, height, 0.5 + random() * 0.18] as [number, number, number],
      };
    }
    return {
      position: [((index * 37) % 8) - 4, 0.06, 98 - index * 11] as [number, number, number],
      rotation: [0, (index % 3) * 0.42, (random() - 0.5) * 0.18] as [number, number, number],
      scale: [0.42 + random() * 0.3, 0.075 + random() * 0.04, 0.28 + random() * 0.2] as [number, number, number],
    };
  });
}

function applyRoadInstances(mesh: THREE.InstancedMesh | null, transforms: RoadInstance[]) {
  if (!mesh) return;
  const object = new THREE.Object3D();
  transforms.forEach((transform, index) => {
    object.position.set(...transform.position);
    object.rotation.set(...transform.rotation);
    object.scale.set(...transform.scale);
    object.updateMatrix();
    mesh.setMatrixAt(index, object.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

function createRoadSurfaceGeometry() {
  const columns = 10;
  const rows = 100;
  const width = 8.6;
  const length = 220;
  const positions = new Float32Array((columns + 1) * (rows + 1) * 3);
  const colors = new Float32Array((columns + 1) * (rows + 1) * 3);
  const indices: number[] = [];
  const base = new THREE.Color("#493e40");
  const warmWear = new THREE.Color("#715747");
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const index = row * (columns + 1) + column;
      const offset = index * 3;
      const x = (column / columns - 0.5) * width;
      const z = (row / rows - 0.5) * length;
      positions[offset] = x;
      positions[offset + 1] = 0;
      positions[offset + 2] = z;
      const broadWear = Math.max(0, 1 - Math.abs(x) / (width * 0.54));
      const noise = ((row * 17 + column * 31 + row * column * 7) % 23) / 100;
      const color = base.clone().lerp(warmWear, broadWear * 0.2).multiplyScalar(0.88 + noise);
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
      if (row < rows && column < columns) {
        const nextRow = index + columns + 1;
        indices.push(index, nextRow, index + 1, index + 1, nextRow, nextRow + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function V2Road({ motionRef, quality }: { motionRef: MotionRef; quality: World3DProps["quality"] }) {
  const rootRef = useRef<THREE.Group>(null);
  const stoneCount = quality === "high" ? 18 : quality === "balanced" ? 12 : 7;
  const cliffCount = quality === "high" ? 24 : quality === "balanced" ? 16 : 10;
  const ruinCount = quality === "high" ? 18 : quality === "balanced" ? 12 : 7;
  const rubbleRef = useRef<THREE.InstancedMesh>(null);
  const cliffRef = useRef<THREE.InstancedMesh>(null);
  const ruinRef = useRef<THREE.InstancedMesh>(null);
  const roadGeometry = useMemo(() => createRoadSurfaceGeometry(), []);
  const rubbleGeometry = useMemo(() => new THREE.DodecahedronGeometry(0.7, 0), []);
  const cliffGeometry = useMemo(() => new THREE.ConeGeometry(1, 1, 6), []);
  const ruinGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const roadMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#ded0bb",
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
    flatShading: true,
  }), []);
  const rubbleMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#82705d",
    roughness: 0.98,
    flatShading: true,
  }), []);
  const cliffMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#544b49",
    roughness: 1,
    flatShading: true,
  }), []);
  const ruinMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#71605a",
    roughness: 0.97,
    metalness: 0,
    flatShading: true,
  }), []);
  const rubbleInstances = useMemo(() => makeRoadInstances(stoneCount, 183, "rubble"), [stoneCount]);
  const cliffInstances = useMemo(() => makeRoadInstances(cliffCount, 91, "cliff"), [cliffCount]);
  const ruinInstances = useMemo(() => makeRoadInstances(ruinCount, 247, "ruin"), [ruinCount]);
  useEffect(() => {
    applyRoadInstances(rubbleRef.current, rubbleInstances);
    applyRoadInstances(cliffRef.current, cliffInstances);
    applyRoadInstances(ruinRef.current, ruinInstances);
  }, [cliffInstances, rubbleInstances, ruinInstances]);
  useFrame(() => {
    const motion = motionRef.current;
    if (!rootRef.current) return;
    const playerX = Number.isFinite(motion.depth) ? motion.depth * 5.2 : 0;
    const relativeDistance = motion.distance - motion.cameraX;
    const playerZ = Number.isFinite(relativeDistance) ? -relativeDistance : 0;
    const distance = Number.isFinite(motion.distance) ? motion.distance : 0;
    rootRef.current.position.set(playerX, 0, playerZ - 76 + (distance % 12));
  });
  return (
    <group ref={rootRef} name="world-v2-road">
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[13.2, 0.2, 220]} />
        <meshStandardMaterial color="#302d32" roughness={0.99} />
      </mesh>
      <mesh geometry={roadGeometry} material={roadMaterial} position={[0, -0.012, 0]} receiveShadow={false} />
      <instancedMesh ref={rubbleRef} args={[rubbleGeometry, rubbleMaterial, stoneCount]} frustumCulled={false} />
      <instancedMesh ref={cliffRef} args={[cliffGeometry, cliffMaterial, cliffCount]} frustumCulled={false} castShadow={quality === "high"} receiveShadow={false} />
      <instancedMesh ref={ruinRef} args={[ruinGeometry, ruinMaterial, ruinCount]} frustumCulled={false} castShadow={quality === "high"} receiveShadow={false} />
      <mesh position={[0, 0.008, 0]}>
        <boxGeometry args={[8.52, 0.025, 220]} />
        <meshStandardMaterial color="#493e40" roughness={0.97} transparent opacity={0.25} />
      </mesh>
      {[-4.38, 4.38].map((x) => (
        <mesh key={x} position={[x, 0.014, 0]}>
          <boxGeometry args={[0.045, 0.018, 220]} />
          <meshBasicMaterial color="#c09366" transparent opacity={0.46} />
        </mesh>
      ))}
      {[-2.4, 2.4].map((x) => (
        <mesh key={x} position={[x, 0.014, 0]}>
          <boxGeometry args={[0.026, 0.018, 220]} />
          <meshBasicMaterial color="#d5b58a" transparent opacity={0.095} />
        </mesh>
      ))}
    </group>
  );
}

export function WorldV2Travel({
  motionRef,
  traversalRef,
  animationState,
  motionReduced,
  quality,
  rivals,
  collectedPickupIds,
  brokenObstacleIds,
  focusedRival,
  equipmentVisual,
  level,
  relicCount,
  lightRadius,
  renderRoad = true,
}: Pick<World3DProps,
  | "motionRef"
  | "traversalRef"
  | "animationState"
  | "motionReduced"
  | "quality"
  | "rivals"
  | "collectedPickupIds"
  | "brokenObstacleIds"
  | "focusedRival"
  | "equipmentVisual"
  | "level"
  | "relicCount"
  | "lightRadius"
> & { renderRoad?: boolean }) {
  const labelTargetRef = useRef<string | null>(null);
  const [chapter, setChapter] = useState(() => (
    Math.max(0, Math.floor(motionRef.current.distance / WORLD_GATE_INTERVAL_METERS))
  ));
  useFrame(() => {
    const motion = motionRef.current;
    const next = Math.max(0, Math.floor(motion.distance / WORLD_GATE_INTERVAL_METERS));
    if (next !== chapter) setChapter(next);
    if (focusedRival) {
      labelTargetRef.current = focusedRival.id;
      return;
    }
    let nearestId: string | null = null;
    let nearestGap = 42;
    for (const rival of rivals) {
      const gap = Math.abs(rival.distance - motion.distance);
      if (gap < nearestGap) {
        nearestGap = gap;
        nearestId = rival.id;
      }
    }
    labelTargetRef.current = nearestId;
  });
  const chapters = useMemo(() => getWorldContentAround(chapter, 1), [chapter]);
  const unlockedPickups = useMemo(() => {
    const ids = new Set<string>();
    for (const content of chapters) {
      for (const obstacle of content.obstacles) {
        if (obstacle.dropPickupId && brokenObstacleIds.has(obstacle.id)) ids.add(obstacle.dropPickupId);
      }
    }
    return ids;
  }, [brokenObstacleIds, chapters]);
  const pickups = useMemo(
    () => chapters.flatMap((content) => content.pickups)
      .filter((pickup) => !pickup.sourceObstacleId || unlockedPickups.has(pickup.id)),
    [chapters, unlockedPickups],
  );
  const obstacles = useMemo(() => chapters.flatMap((content) => content.obstacles), [chapters]);

  return (
    <>
      {renderRoad && <V2Road motionRef={motionRef} quality={quality} />}
      {renderRoad && <V2Gate motionRef={motionRef} />}
      {obstacles.map((obstacle) => (
        <V2Obstacle
          key={obstacle.id}
          obstacle={obstacle}
          motionRef={motionRef}
          broken={brokenObstacleIds.has(obstacle.id)}
        />
      ))}
      {pickups.map((pickup) => !collectedPickupIds.has(pickup.id) && (
        <V2Pickup key={pickup.id} pickup={pickup} motionRef={motionRef} />
      ))}
      {rivals.map((rival) => (
        <V2Rival
          key={rival.id}
          rival={rival}
          motionRef={motionRef}
          focused={focusedRival?.id === rival.id}
          reducedMotion={motionReduced}
          labelTargetRef={labelTargetRef}
        />
      ))}
      <V2Player
        motionRef={motionRef}
        traversalRef={traversalRef}
        animationState={animationState}
        motionReduced={motionReduced}
        equipmentVisual={equipmentVisual}
        level={level}
        relicCount={relicCount}
        lightRadius={lightRadius}
      />
    </>
  );
}

export function WorldV2DuelActor({
  side,
  motionRef,
  combatStateRef,
  combatRender,
  opponentName,
  equipmentVisual,
  motionReduced,
  finisherSlowMotion,
}: Pick<World3DProps,
  | "motionRef"
  | "combatStateRef"
  | "combatRender"
  | "opponentName"
  | "equipmentVisual"
  | "motionReduced"
  | "finisherSlowMotion"
> & { side: "player" | "bot" }) {
  const rootRef = useRef<THREE.Group>(null);
  const actorMotionRef = useRef<WorldMotion>({
    ...motionRef.current,
    velocityX: 0,
    velocityY: 0,
    hasMoved: false,
  });
  const renderedActor = combatRender?.[side];
  useFrame((_, delta) => {
    const actor = combatStateRef.current?.[side];
    if (!rootRef.current || !actor) return;
    actorMotionRef.current.depth = THREE.MathUtils.clamp(actor.x / 5.2, -1, 1);
    actorMotionRef.current.velocityX = actor.vx;
    actorMotionRef.current.velocityY = actor.vz;
    actorMotionRef.current.distance = motionRef.current.distance - actor.z;
    actorMotionRef.current.cameraX = motionRef.current.cameraX;
    actorMotionRef.current.stepPhase = (combatStateRef.current?.tick ?? 0) * 0.13;
    actorMotionRef.current.hasMoved = Math.hypot(actor.vx, actor.vz) > 0.25;
    rootRef.current.position.set(actor.x, 0, actor.z);
    const targetYaw = getCharacterRootYawForModel(actor.yaw, WARRIOR_MODEL_FORWARD_OFFSET);
    rootRef.current.rotation.y = dampCharacterYaw(rootRef.current.rotation.y, targetYaw, 18, Math.min(delta, 0.05));
  });
  if (!renderedActor) return null;
  const action = String(renderedActor.action);
  const mode = ["heavyAttack", "skillOne", "skillTwo", "windup"].includes(action)
    ? "attack"
    : Math.hypot(renderedActor.vx, renderedActor.vz) > 1.2
      ? "run"
      : "idle";
  const tint = side === "player"
    ? equipmentVisual.auraColor ?? "#8c8a82"
    : getWorldBotProfileByName(opponentName)?.appearance?.auraColor ?? "#815f6f";
  return (
    <group ref={rootRef} name={`world-v2-duel-${side}`}>
      <V2Warrior
        tint={tint}
        motionRef={actorMotionRef}
        mode={mode}
        player={side === "player"}
        weapon={side === "bot" ? getWorldBotProfileByName(opponentName)?.weapon : undefined}
        appearance={side === "player" ? equipmentVisual : undefined}
      />
      {!motionReduced && finisherSlowMotion && renderedActor.action === "attack" && (
        <mesh position={[0, 1.15, 0.5]}>
          <torusGeometry args={[0.72, 0.025, 5, 24]} />
          <meshBasicMaterial color="#bcecff" transparent opacity={0.45} />
        </mesh>
      )}
      {side === "bot" && (
        <Html position={[renderedActor.x, 2.62, renderedActor.z]} center distanceFactor={12} zIndexRange={[35, 0]} style={{ pointerEvents: "none" }}>
          <span className="world-v2-rival-label is-focused">
            <b>{opponentName}</b>
            <span>{getWorldBotProfileByName(opponentName)?.title ?? "SAVAŞÇI"}</span>
          </span>
        </Html>
      )}
    </group>
  );
}
