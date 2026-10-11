import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { MutableRefObject } from "react";
import { getBiomeTransition, WORLD_BIOME_PALETTES } from "./world-biomes";
import type { WorldMotion } from "./movement";
import type { WorldQuality } from "./World3D";
import { createWorldV2DuneData } from "./world-v2-geometry";

const BIOME_GROUND_COLORS = Object.fromEntries(
  Object.entries(WORLD_BIOME_PALETTES).map(([key, palette]) => [key, new THREE.Color(palette.ground)]),
) as Record<keyof typeof WORLD_BIOME_PALETTES, THREE.Color>;

export default function WorldV2Terrain({
  motionRef,
  weather,
  quality,
}: {
  motionRef: MutableRefObject<WorldMotion>;
  weather: "clear" | "ash" | "rain" | "fog";
  quality: WorldQuality;
}) {
  const terrainRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const geometry = useMemo(() => {
    const data = createWorldV2DuneData();
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    result.setAttribute("color", new THREE.BufferAttribute(data.colors, 3));
    result.setIndex(new THREE.BufferAttribute(data.indices, 1));
    result.computeVertexNormals();
    return result;
  }, []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#6c5a50",
    vertexColors: true,
    roughness: 0.98,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
  }), []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame(() => {
    if (!terrainRef.current) return;
    const distance = Number.isFinite(motionRef.current.distance) ? motionRef.current.distance : 0;
    const transition = getBiomeTransition(distance);
    material.color.lerpColors(
      BIOME_GROUND_COLORS[transition.from],
      BIOME_GROUND_COLORS[transition.to],
      transition.mix,
    );
    material.roughness = weather === "rain" ? 0.72 : 0.98;
    material.metalness = weather === "rain" ? 0.025 : 0;
    terrainRef.current.position.set(camera.position.x * 0.88, 0, camera.position.z * 0.92 - 24);
    terrainRef.current.visible = quality !== "low";
  });

  return (
    <group ref={terrainRef} dispose={null}>
      <mesh
        geometry={geometry}
        material={material}
        rotation={[-Math.PI / 2, 0, 0]}
        frustumCulled={false}
        receiveShadow={false}
      />
    </group>
  );
}
