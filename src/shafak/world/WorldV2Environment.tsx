import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import type { WorldMotion } from "./movement";
import type { WeatherMode } from "./world-biomes";
import { WORLD_GATE_INTERVAL_METERS } from "./movement";
import { nextGateDistanceForCamera } from "./world-generation";
import { WORLD_V2_CONFIG } from "./world-v2-config";
import { WORLD_V2_CAMERA_COLLISION_LAYER } from "./world-v2-geometry";
import { shouldOpenWorldV2Gate } from "./world-v2-gate-state";
import { WorldV2Label } from "./WorldV2Labels";

type MotionRef = MutableRefObject<WorldMotion>;

export function WorldV2RouteGates({
  motionRef,
  unlockedThroughChapter,
}: {
  motionRef: MotionRef;
  unlockedThroughChapter: number;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const routeSignsRef = useRef<THREE.Group>(null);
  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);
  const gateMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#807469", roughness: 0.92, flatShading: true }), []);
  const trimMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c5a26e", metalness: 0.34, roughness: 0.54 }), []);
  const doorMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#50382c", roughness: 0.88, flatShading: true }), []);
  const lampMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#ffbd70",
    emissive: "#ff672d",
    emissiveIntensity: 2.1,
    roughness: 0.28,
    metalness: 0.12,
  }), []);
  const archGeometry = useMemo(() => new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-5.05, 4.35, 0),
      new THREE.Vector3(-4.65, 5.45, 0),
      new THREE.Vector3(-3.25, 6.15, 0),
      new THREE.Vector3(0, 6.55, 0),
      new THREE.Vector3(3.25, 6.15, 0),
      new THREE.Vector3(4.65, 5.45, 0),
      new THREE.Vector3(5.05, 4.35, 0),
    ]),
    32,
    0.24,
    7,
    false,
  ), []);
  const doorPanelGeometry = useMemo(() => new THREE.BoxGeometry(4.45, 4.1, 0.32), []);
  const doorBraceGeometry = useMemo(() => new THREE.BoxGeometry(3.72, 0.14, 0.1), []);
  const markCollision = (object: THREE.Object3D | null) => {
    object?.layers.enable(WORLD_V2_CAMERA_COLLISION_LAYER);
  };

  useEffect(() => () => {
    gateMaterial.dispose();
    trimMaterial.dispose();
    doorMaterial.dispose();
    lampMaterial.dispose();
    archGeometry.dispose();
    doorPanelGeometry.dispose();
    doorBraceGeometry.dispose();
  }, [archGeometry, doorBraceGeometry, doorMaterial, doorPanelGeometry, gateMaterial, lampMaterial, trimMaterial]);

  useFrame((_frame, delta) => {
    const motion = motionRef.current;
    const gateDistance = nextGateDistanceForCamera(
      motion.cameraX,
      WORLD_V2_CONFIG.camera.distanceBehind,
    );
    if (rootRef.current) rootRef.current.position.z = -(gateDistance - motion.cameraX);
    const chapterAtGate = Math.max(0, Math.floor(gateDistance / WORLD_GATE_INTERVAL_METERS) - 1);
    if (routeSignsRef.current) routeSignsRef.current.visible = chapterAtGate <= unlockedThroughChapter;
    const open = shouldOpenWorldV2Gate(
      gateDistance - motion.distance,
      chapterAtGate,
      unlockedThroughChapter,
    );
    const targetAngle = open ? Math.PI * 0.49 : 0;
    const safeDelta = Math.min(Math.max(delta, 0), 0.05);
    if (leftDoorRef.current) {
      leftDoorRef.current.rotation.y = THREE.MathUtils.damp(
        leftDoorRef.current.rotation.y,
        targetAngle,
        8,
        safeDelta,
      );
    }
    if (rightDoorRef.current) {
      rightDoorRef.current.rotation.y = THREE.MathUtils.damp(
        rightDoorRef.current.rotation.y,
        targetAngle,
        8,
        safeDelta,
      );
    }
  });

  return (
    <group ref={rootRef} name="world-v2-route-gates">
      <mesh geometry={archGeometry} material={gateMaterial} position={[0, 0, 0.18]} castShadow receiveShadow />
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * 5.15, 0, 0]}>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[1.28, 0.4, 1.08]} />
            <primitive object={trimMaterial} attach="material" />
          </mesh>
          <mesh ref={markCollision} position={[0, 2.35, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.49, 0.67, 4.3, 7]} />
            <primitive object={gateMaterial} attach="material" />
          </mesh>
          <mesh position={[0, 4.58, 0]}>
            <boxGeometry args={[1.35, 0.34, 1.14]} />
            <primitive object={trimMaterial} attach="material" />
          </mesh>
          <mesh position={[0, 5.18, 0]}>
            <cylinderGeometry args={[0.44, 0.52, 1.12, 6]} />
            <primitive object={gateMaterial} attach="material" />
          </mesh>
          <mesh position={[0, 5.86, 0]}>
            <sphereGeometry args={[0.29, 10, 8]} />
            <primitive object={lampMaterial} attach="material" />
          </mesh>
        </group>
      ))}
      {([-1, 1] as const).map((side) => (
        <group
          key={`gate-door-${side}`}
          ref={side < 0 ? leftDoorRef : rightDoorRef}
          name={side < 0 ? "world-v2-gate-door-left" : "world-v2-gate-door-right"}
          position={[side * 4.1, 0.12, 0]}
        >
          <mesh
            name="world-v2-gate-door-leaf"
            geometry={doorPanelGeometry}
            material={doorMaterial}
            position={[-side * 2.225, 2.05, 0]}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={doorBraceGeometry}
            material={trimMaterial}
            position={[-side * 2.225, 0.55, 0.2]}
            castShadow
          />
          <mesh
            geometry={doorBraceGeometry}
            material={trimMaterial}
            position={[-side * 2.225, 3.55, 0.2]}
            castShadow
          />
        </group>
      ))}
      <mesh position={[0, 6.45, 0]}>
        <sphereGeometry args={[0.2, 10, 8]} />
        <primitive object={lampMaterial} attach="material" />
      </mesh>
      <group ref={routeSignsRef}>
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * 2.55, 0, 0]}>
            <WorldV2Label position={[0, 2.05, 0]} maxDistance={48}>
              {side < 0 ? "SOL GEÇİT" : "SAĞ GEÇİT"}
            </WorldV2Label>
          </group>
        ))}
      </group>
    </group>
  );
}

function createWeatherPoints(count: number) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399963229728653;
    const radius = 3 + (index % 11) * 0.78;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = 0.5 + ((index * 37) % 73) / 9;
    // The nearest particle is at least 3m in front of the player; camera is behind.
    positions[index * 3 + 2] = -3 - ((index * 17) % 58);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}

export function WorldV2WeatherPoints({
  motionRef,
  weather,
  enabled,
  quality,
}: {
  motionRef: MotionRef;
  weather: WeatherMode;
  enabled: boolean;
  quality: "high" | "balanced" | "low";
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = quality === "high" ? 48 : quality === "balanced" ? 24 : 10;
  const geometry = useMemo(() => createWeatherPoints(count), [count]);
  const color = weather === "storm" || weather === "rain"
    ? "#c6d8e6"
    : weather === "fog" ? "#d4c9c0" : "#e7b27f";
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    const motion = motionRef.current;
    if (!pointsRef.current) return;
    pointsRef.current.position.set(
      motion.depth * 5.2,
      0,
      -(motion.distance - motion.cameraX),
    );
    pointsRef.current.rotation.z = 0;
    pointsRef.current.visible = enabled && weather !== "clear";
  });
  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color={color}
        size={0.07}
        sizeAttenuation
        transparent
        opacity={weather === "fog" ? 0.24 : 0.42}
        depthWrite={false}
      />
    </points>
  );
}
