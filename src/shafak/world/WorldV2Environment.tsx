import { Html } from "@react-three/drei";
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

type MotionRef = MutableRefObject<WorldMotion>;

export function WorldV2RouteGates({
  motionRef,
  unlockedThroughChapter,
}: {
  motionRef: MotionRef;
  unlockedThroughChapter: number;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const poleRef = useRef<THREE.Group>(null);
  const gateMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#807469", roughness: 0.92, flatShading: true }), []);
  const trimMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c5a26e", metalness: 0.34, roughness: 0.54 }), []);
  const markCollision = (object: THREE.Object3D | null) => {
    object?.layers.enable(WORLD_V2_CAMERA_COLLISION_LAYER);
  };

  useEffect(() => () => {
    gateMaterial.dispose();
    trimMaterial.dispose();
  }, [gateMaterial, trimMaterial]);

  useFrame(() => {
    const motion = motionRef.current;
    const gateDistance = nextGateDistanceForCamera(
      motion.cameraX,
      WORLD_V2_CONFIG.camera.distanceBehind,
    );
    if (rootRef.current) rootRef.current.position.z = -(gateDistance - motion.cameraX);
    const chapterAtGate = Math.max(0, Math.floor(gateDistance / WORLD_GATE_INTERVAL_METERS) - 1);
    if (poleRef.current) poleRef.current.visible = chapterAtGate <= unlockedThroughChapter;
  });

  return (
    <group ref={rootRef} name="world-v2-route-gates">
      <group ref={poleRef}>
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * 2.55, 0, 0]}>
            <mesh ref={markCollision} position={[0, 0.85, 0]}>
              <boxGeometry args={[0.22, 1.7, 0.24]} />
              <primitive object={gateMaterial} attach="material" />
            </mesh>
            <mesh position={[0, 1.75, 0]}>
              <boxGeometry args={[0.34, 0.12, 0.32]} />
              <primitive object={trimMaterial} attach="material" />
            </mesh>
            <Html position={[0, 2.05, 0]} center style={{ pointerEvents: "none" }}>
              <span className="world-v2-label">{side < 0 ? "SOL GEÇİT" : "SAĞ GEÇİT"}</span>
            </Html>
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
