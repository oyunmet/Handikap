import { useLayoutEffect, useMemo, useRef, useFrame } from "react";
import * as THREE from "three";
import type { MutableRefObject } from "react";
import type { WorldMotion } from "./movement";
import type { WorldObject } from "./world-generation";

type Transform = {
  position: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
};

type MaterialSpec = {
  color: string;
  roughness: number;
  metalness?: number;
  flatShading?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
};

type ShapeSpec = {
  type: "box" | "cylinder" | "cone" | "dodecahedron" | "sphere" | "torus";
  args: number[];
};

type PartSpec = ShapeSpec & Transform & { material: MaterialSpec };
type StaticBatch = {
  key: string;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  matrices: THREE.Matrix4[];
};
type MotionRef = MutableRefObject<WorldMotion>;

const sharedGeometries = new Map<string, THREE.BufferGeometry>();
const sharedMaterials = new Map<string, THREE.MeshStandardMaterial>();

function getGeometry(shape: ShapeSpec) {
  const key = `${shape.type}:${shape.args.join(",")}`;
  let geometry = sharedGeometries.get(key);
  if (geometry) return geometry;
  switch (shape.type) {
    case "box":
      geometry = new THREE.BoxGeometry(...(shape.args as [number, number, number]));
      break;
    case "cylinder":
      geometry = new THREE.CylinderGeometry(...(shape.args as [number, number, number, number]));
      break;
    case "cone":
      geometry = new THREE.ConeGeometry(...(shape.args as [number, number, number]));
      break;
    case "dodecahedron":
      geometry = new THREE.DodecahedronGeometry(...(shape.args as [number, number]));
      break;
    case "sphere":
      geometry = new THREE.SphereGeometry(...(shape.args as [number, number, number]));
      break;
    case "torus":
      geometry = new THREE.TorusGeometry(...(shape.args as [number, number, number, number, number]));
      break;
  }
  sharedGeometries.set(key, geometry);
  return geometry;
}

function getMaterial(spec: MaterialSpec) {
  const key = JSON.stringify(spec);
  let material = sharedMaterials.get(key);
  if (!material) {
    material = new THREE.MeshStandardMaterial(spec);
    sharedMaterials.set(key, material);
  }
  return material;
}

function getParts(object: WorldObject): PartSpec[] {
  const darkStone: MaterialSpec = {
    color: object.flickerSeed % 3 === 0 ? "#51484a" : "#615655",
    roughness: 0.94,
    flatShading: true,
  };
  const parts: PartSpec[] = [];
  const add = (
    type: ShapeSpec["type"],
    args: number[],
    material: MaterialSpec,
    position: [number, number, number],
    scale?: [number, number, number],
    rotation?: [number, number, number],
  ) => parts.push({ type, args, material, position, scale, rotation });
  const box = (material: MaterialSpec, position: [number, number, number], scale: [number, number, number], rotation?: [number, number, number]) =>
    add("box", [1, 1, 1], material, position, scale, rotation);
  const cylinder = (args: [number, number, number, number], material: MaterialSpec, position: [number, number, number], rotation?: [number, number, number]) =>
    add("cylinder", args, material, position, undefined, rotation);
  const wood = (color: string): MaterialSpec => ({ color, roughness: 0.95, flatShading: true });

  switch (object.kind) {
    case "tower":
      cylinder([0.9, 1.15, 5, 7], darkStone, [0, 2.5, 0]);
      cylinder([1.15, 0.94, 0.38, 7], { color: "#73625d", roughness: 0.92, flatShading: true }, [0, 5.12, 0]);
      box({ color: "#e58b50", emissive: "#a54a2e", emissiveIntensity: 0.6, roughness: 0.8 }, [-0.5, 3.2, -0.89], [0.2, 0.52, 0.08]);
      box({ color: "#e58b50", emissive: "#a54a2e", emissiveIntensity: 0.6, roughness: 0.8 }, [0.5, 3.85, -0.89], [0.2, 0.52, 0.08]);
      box({ color: "#19171a", roughness: 1 }, [0, 0.54, -1.02], [0.48, 1.1, 0.12]);
      break;
    case "ruin":
      box(darkStone, [-0.82, 1.3, 0], [0.52, 2.6, 0.55]);
      box({ color: "#73635e", roughness: 0.96, flatShading: true }, [0.82, 1.78, 0], [0.54, 3.55, 0.58]);
      box({ color: "#655653", roughness: 0.96, flatShading: true }, [0, 3.45, 0], [1.8, 0.52, 0.64]);
      break;
    case "arch":
      cylinder([0.34, 0.46, 3.5, 6], { color: "#77655e", roughness: 0.95, flatShading: true }, [-1.45, 1.75, 0]);
      cylinder([0.34, 0.46, 3.5, 6], { color: "#77655e", roughness: 0.95, flatShading: true }, [1.45, 1.75, 0]);
      add("torus", [1.45, 0.27, 5, 10, Math.PI], { color: "#817069", roughness: 0.92, flatShading: true }, [0, 3.35, 0]);
      break;
    case "tree":
      cylinder([0.17, 0.31, 2.4, 6], wood("#332b2b"), [0, 1.2, 0]);
      cylinder([0.08, 0.13, 1.45, 5], wood("#382f2e"), [-0.5, 2.2, 0], [0, 0, -0.62]);
      cylinder([0.08, 0.13, 1.62, 5], wood("#382f2e"), [0.48, 2.55, 0], [0, 0, 0.7]);
      add("cone", [0.76, 1.42, 5], wood("#282b2d"), [0.1, 3.1, 0]);
      break;
    case "rock":
      add("dodecahedron", [0.86, 0], { color: darkStone.color, roughness: 0.98, flatShading: true }, [0, 0.45, 0], [1, 1, 1], [0.14, 0.36, 0]);
      add("dodecahedron", [0.62, 0], { color: "#786662", roughness: 0.96, flatShading: true }, [0.76, 0.3, -0.18], [0.7, 0.72, 0.84], [0.2, -0.2, 0.18]);
      add("dodecahedron", [0.56, 0], { color: "#473f43", roughness: 1, flatShading: true }, [-0.72, 0.25, 0.14], [0.78, 0.65, 0.8], [0, 0.44, 0.1]);
      break;
    case "torch":
      cylinder([0.07, 0.12, 1.8, 6], { color: "#4a3028", roughness: 0.88 }, [0, 0.9, 0]);
      cylinder([0.22, 0.16, 0.2, 6], { color: "#777071", roughness: 0.82, metalness: 0.34 }, [0, 1.72, 0]);
      break;
    case "firepit":
      for (let index = 0; index < 7; index += 1) {
        const angle = (index / 7) * Math.PI * 2;
        add(
          "dodecahedron",
          [0.28, 0],
          { color: index % 2 ? "#6d5951" : "#82706a", roughness: 0.96, flatShading: true },
          [Math.cos(angle) * 0.58, 0.16, Math.sin(angle) * 0.58],
        );
      }
      break;
    case "cart":
      box(wood("#594236"), [0, 0.22, 0], [1.85, 0.22, 1.02]);
      box(wood("#654b3e"), [0, 0.66, 0.44], [1.7, 0.74, 0.13], [0, 0, 0.18]);
      cylinder([0.47, 0.47, 0.13, 9], wood("#32292a"), [-0.92, 0.32, -0.62], [0, 0, Math.PI / 2]);
      cylinder([0.36, 0.36, 0.13, 8], wood("#32292a"), [0.9, 0.28, -0.62], [0.1, 0.1, Math.PI / 2]);
      box(wood("#594236"), [0.12, 1.08, -0.25], [0.12, 1.5, 0.12], [0, 0, -0.3]);
      break;
    case "bones":
      for (let index = 0; index < 4; index += 1) {
        const x = -0.52 + index * 0.37;
        const y = 0.18 + (index % 2) * 0.12;
        const z = index % 2 ? 0.08 : -0.08;
        const bone = { color: "#b7a990", roughness: 0.86, flatShading: true };
        cylinder([0.055, 0.055, 0.8, 5], bone, [x, y, z], [0.2, 0, index % 2 ? 0.08 : -0.08]);
        add("sphere", [0.1, 5, 4], { color: "#c5b89e", roughness: 0.86, flatShading: true }, [x, y - 0.43, z]);
        add("sphere", [0.1, 5, 4], { color: "#c5b89e", roughness: 0.86, flatShading: true }, [x, y + 0.43, z]);
      }
      add("sphere", [0.25, 6, 5], { color: "#baac91", roughness: 0.86, flatShading: true }, [0.25, 0.22, -0.38], [1, 1, 1], [0, 0.2, 0.6]);
      break;
  }
  return parts;
}

function buildStaticBatches(objects: WorldObject[]): StaticBatch[] {
  const batches = new Map<string, StaticBatch>();
  const root = new THREE.Object3D();
  const partTransform = new THREE.Object3D();
  for (const object of objects) {
    root.position.set(object.lane * 9.3, 0, -object.worldX);
    root.rotation.set(0, (object.flickerSeed % 628) / 100, 0);
    root.scale.setScalar(object.scale);
    root.updateMatrix();
    for (const part of getParts(object)) {
      const geometry = getGeometry(part);
      const material = getMaterial(part.material);
      const materialKey = JSON.stringify(part.material);
      const key = `${part.type}:${part.args.join(",")}|${materialKey}`;
      let batch = batches.get(key);
      if (!batch) {
        batch = { key, geometry, material, matrices: [] };
        batches.set(key, batch);
      }
      partTransform.position.set(...part.position);
      partTransform.rotation.set(...(part.rotation ?? [0, 0, 0]));
      partTransform.scale.set(...(part.scale ?? [1, 1, 1]));
      partTransform.updateMatrix();
      batch.matrices.push(new THREE.Matrix4().multiplyMatrices(root.matrix, partTransform.matrix));
    }
  }
  return Array.from(batches.values());
}

function InstancedPropBatch({ batch }: { batch: StaticBatch }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return undefined;
    batch.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    return () => mesh.dispose();
  }, [batch]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[batch.geometry, batch.material, batch.matrices.length]}
      castShadow={false}
      receiveShadow={false}
      dispose={null}
    />
  );
}

export default function WorldStaticBatches({
  objects,
  motionRef,
}: {
  objects: WorldObject[];
  motionRef: MotionRef;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const batches = useMemo(() => buildStaticBatches(objects), [objects]);
  useFrame(() => {
    if (groupRef.current) groupRef.current.position.z = motionRef.current.cameraX;
  });

  return (
    <group ref={groupRef}>
      {batches.map((batch) => <InstancedPropBatch key={batch.key} batch={batch} />)}
    </group>
  );
}
