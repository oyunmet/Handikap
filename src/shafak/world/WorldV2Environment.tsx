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
  const gateMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#807469", roughness: 0.92, flatShading: true }), []);
  const trimMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c5a26e", metalness: 0.34, roughness: 0.54 }), []);
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
  const markCollision = (object: THREE.Object3D | null) => {
    object?.layers.enable(WORLD_V2_CAMERA_COLLISION_LAYER);
  };

  useEffect(() => () => {
    gateMaterial.dispose();
    trimMaterial.dispose();
    lampMaterial.dispose();
    archGeometry.dispose();
  }, [archGeometry, gateMaterial, lampMaterial, trimMaterial]);

  useFrame(() => {
    const motion = motionRef.current;
    const gateDistance = nextGateDistanceForCamera(
      motion.cameraX,
      WORLD_V2_CONFIG.camera.distanceBehind,
    );
    if (rootRef.current) rootRef.current.position.z = -(gateDistance - motion.cameraX);
    const chapterAtGate = Math.max(0, Math.floor(gateDistance / WORLD_GATE_INTERVAL_METERS) - 1);
    if (routeSignsRef.current) routeSignsRef.current.visible = chapterAtGate <= unlockedThroughChapter;
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

function createWeatherPoints() {
  const positions = new Float32Array(48 * 3);
  for (let index = 0; index < 48; index += 1) {
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
}: {
  motionRef: MotionRef;
  weather: WeatherMode;
  enabled: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const geometry = useMemo(createWeatherPoints, []);
  const color = weather === "storm" || weather === "rain"
    ? "#c6d8e6"
    : weather === "fog" ? "#d4c9c0" : weather === "ash" ? "#ff9b55" : "#e7b27f";
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((frame) => {
    const motion = motionRef.current;
    if (!pointsRef.current) return;
    pointsRef.current.position.set(
      motion.depth * 5.2,
      0,
      -(motion.distance - motion.cameraX),
    );
    if (weather === "ash") {
      pointsRef.current.rotation.z = Math.sin(frame.clock.elapsedTime * 0.14) * 0.012;
    } else {
      pointsRef.current.rotation.z = 0;
    }
    pointsRef.current.visible = enabled && weather !== "clear";
  });
  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color={color}
        size={0.07}
        sizeAttenuation
        transparent
        opacity={weather === "fog" ? 0.24 : weather === "ash" ? 0.5 : 0.42}
        depthWrite={false}
      />
    </points>
  );
}
