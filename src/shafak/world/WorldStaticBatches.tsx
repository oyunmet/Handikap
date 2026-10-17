import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MutableRefObject } from "react";
import type { WorldMotion } from "./movement";
import type { WorldObject } from "./world-generation";
import { raycastWorldGround } from "./WorldModel";

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
  type: "box" | "cylinder" | "cone" | "dodecahedron" | "octahedron" | "sphere" | "torus";
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
    case "octahedron":
      geometry = new THREE.OctahedronGeometry(...(shape.args as [number, number]));
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

function seededValue(seed: number, salt: number) {
  let value = (seed + Math.imul(salt, 0x9e3779b1)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}

function getParts(object: WorldObject): PartSpec[] {
  const biomeStone = object.biome === "frozen-pass"
    ? "#637985"
    : object.biome === "red-marsh"
      ? "#5c4545"
      : "#615655";
  const biomeWood = object.biome === "frozen-pass"
    ? "#465a67"
    : object.biome === "red-marsh"
      ? "#362b31"
      : "#332b2b";
  const darkStone: MaterialSpec = {
    color: object.flickerSeed % 3 === 0 ? "#51484a" : biomeStone,
    roughness: 0.94,
    flatShading: true,
  };
  const stoneLight: MaterialSpec = { color: "#73625d", roughness: 0.96, flatShading: true };
  const stoneMid: MaterialSpec = { color: "#655653", roughness: 0.96, flatShading: true };
  const moss: MaterialSpec = {
    color: object.biome === "frozen-pass" ? "#829094" : object.biome === "red-marsh" ? "#75634c" : "#53604c",
    roughness: 1,
    flatShading: true,
  };
  const ash: MaterialSpec = { color: "#403b3b", roughness: 1, flatShading: true };
  const vary = (salt: number, amount: number) => (seededValue(object.flickerSeed, salt) * 2 - 1) * amount;
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
      // Narrow raised courses and a broken crown interrupt the plain tower silhouette.
      cylinder([1.16, 1.17, 0.16, 7], stoneMid, [0, 1.02 + vary(1, 0.08), 0]);
      cylinder([1.08, 1.16, 0.13, 7], stoneLight, [0, 2.46 + vary(2, 0.07), 0]);
      cylinder([1.13, 1.15, 0.14, 7], stoneMid, [0, 3.88 + vary(3, 0.08), 0]);
      cylinder([1.15, 0.94, 0.38, 7], stoneLight, [0, 5.12, 0]);
      for (let index = 0; index < 4; index += 1) {
        const angle = (index / 4) * Math.PI * 2 + vary(4, 0.12);
        const x = Math.cos(angle) * 0.91;
        const z = Math.sin(angle) * 0.91;
        box(index % 2 ? stoneMid : stoneLight, [x, 5.39 + (index % 2) * 0.04, z], [0.42, 0.48, 0.38], [0, -angle, vary(5 + index, 0.08)]);
        if (index < 3) {
          box(darkStone, [x * 1.08, 0.27, z * 1.08], [0.62, 0.54, 0.58], [0, angle + 0.25, vary(9 + index, 0.12)]);
        }
      }
      box({ color: "#e58b50", emissive: "#a54a2e", emissiveIntensity: 0.6, roughness: 0.8 }, [-0.5, 3.2, -0.89], [0.2, 0.52, 0.08]);
      box({ color: "#e58b50", emissive: "#a54a2e", emissiveIntensity: 0.6, roughness: 0.8 }, [0.5, 3.85, -0.89], [0.2, 0.52, 0.08]);
      box({ color: "#19171a", roughness: 1 }, [0, 0.54, -1.02], [0.48, 1.1, 0.12]);
      box(moss, [-0.7, 0.68, -0.53], [0.34, 0.08, 0.18], [0, vary(12, 0.18), -0.08]);
      break;
    case "column":
      cylinder([0.31, 0.38, 3.75, 12], stoneLight, [0, 1.9, 0]);
      cylinder([0.5, 0.42, 0.22, 12], stoneMid, [0, 0.16, 0]);
      cylinder([0.44, 0.32, 0.18, 12], stoneLight, [0, 0.35, 0]);
      cylinder([0.46, 0.58, 0.25, 12], stoneMid, [0, 3.75, 0]);
      cylinder([0.3, 0.38, 0.16, 12], stoneLight, [0, 3.96, 0]);
      for (let groove = 0; groove < 8; groove += 1) {
        const angle = (groove / 8) * Math.PI * 2;
        const x = Math.cos(angle) * 0.305;
        const z = Math.sin(angle) * 0.305;
        box(stoneMid, [x, 2, z], [0.035, 2.92, 0.035], [0, -angle, 0]);
      }
      break;
    case "ruin":
      box(darkStone, [-0.82, 1.3, 0], [0.52, 2.6, 0.55]);
      box(stoneLight, [0.82, 1.78, 0], [0.54, 3.55, 0.58]);
      box(stoneMid, [0, 3.45, 0], [1.8, 0.52, 0.64]);
      // Exposed masonry courses make the surviving wall read as stacked stone.
      for (let course = 0; course < 3; course += 1) {
        const y = 0.72 + course * 0.82;
        box(course % 2 ? stoneMid : stoneLight, [-0.82, y, -0.31], [0.59, 0.16, 0.12], [0, vary(20 + course, 0.05), 0]);
        if (course !== 2 || seededValue(object.flickerSeed, 24) > 0.38) {
          box(course % 2 ? darkStone : stoneMid, [0.82, y + vary(25 + course, 0.08), -0.31], [0.61, 0.17, 0.12], [0, vary(28 + course, 0.06), 0]);
        }
      }
      box(stoneMid, [-0.82, 2.68, -0.04], [0.7, 0.28, 0.66], [0, 0.12, -0.04]);
      box(stoneLight, [0.82, 3.55, 0], [0.68, 0.34, 0.68], [0, -0.08, 0.02]);
      box(darkStone, [-1.06, 0.31, -0.22], [0.88, 0.48, 0.7], [0, 0.16, -0.08]);
      box({ color: biomeStone, roughness: 0.99, flatShading: true }, [1.06, 0.21, 0.3], [0.72, 0.31, 0.68], [0.08, -0.2, 0.12]);
      add("cone", [0.24, 0.52, 4], darkStone, [-0.82, 2.72, 0.02], [1, 1, 1], [0, 0.2, 0.24]);
      add("cone", [0.28, 0.6, 4], darkStone, [0.82, 2.14, 0], [1, 1, 1], [0, -0.16, -0.18]);
      for (let index = 0; index < 3; index += 1) {
        const side = index % 2 ? 1 : -1;
        add("dodecahedron", [0.28 + index * 0.025, 0], index % 2 ? stoneMid : darkStone,
          [side * (1.45 + index * 0.16), 0.17 + (index % 2) * 0.07, 0.14 + vary(30 + index, 0.2)],
          [1.25, 0.62, 0.85], [0, vary(33 + index, 0.4), vary(36 + index, 0.18)]);
      }
      box(moss, [-0.79, 1.84, -0.315], [0.3, 0.09, 0.035], [0, 0, vary(40, 0.06)]);
      if (object.biome !== "red-marsh") {
        box(ash, [0.56, 0.1, 0.5], [0.52, 0.07, 0.33], [0, vary(41, 0.35), 0]);
      }
      break;
    case "arch":
      cylinder([0.34, 0.46, 3.5, 6], stoneLight, [-1.45, 1.75, 0]);
      cylinder([0.34, 0.46, 3.5, 6], stoneLight, [1.45, 1.75, 0]);
      add("torus", [1.45, 0.27, 5, 10, Math.PI], { color: "#817069", roughness: 0.92, flatShading: true }, [0, 3.35, 0]);
      // Footings and a keystone give the thin arcade weight and a readable crown.
      box(stoneMid, [-1.45, 0.22, 0], [0.86, 0.42, 0.82], [0, vary(45, 0.08), 0]);
      box(stoneMid, [1.45, 0.22, 0], [0.86, 0.42, 0.82], [0, vary(46, 0.08), 0]);
      box(stoneLight, [-1.45, 3.4, 0], [0.76, 0.27, 0.7], [0, 0, 0.04]);
      box(stoneLight, [1.45, 3.4, 0], [0.76, 0.27, 0.7], [0, 0, -0.04]);
      add("dodecahedron", [0.32, 0], stoneMid, [0, 4.67, 0], [1.05, 0.92, 0.76], [0, vary(47, 0.2), 0]);
      for (let index = 0; index < 3; index += 1) {
        const side = index % 2 ? 1 : -1;
        add("dodecahedron", [0.24, 0], index % 2 ? darkStone : stoneMid,
          [side * (1.92 + index * 0.13), 0.16, 0.1 + vary(48 + index, 0.15)],
          [1.15, 0.62, 0.82], [0, vary(51 + index, 0.4), 0]);
      }
      box(moss, [-1.43, 1.02, -0.42], [0.28, 0.16, 0.06], [0, 0, 0.03]);
      break;
    case "tree":
      cylinder([0.17, 0.31, 2.4, 6], wood(biomeWood), [0, 1.2, 0]);
      cylinder([0.08, 0.13, 1.45, 5], wood(biomeWood), [-0.5 + vary(60, 0.08), 2.2, 0], [0, 0, -0.62]);
      cylinder([0.08, 0.13, 1.62, 5], wood(biomeWood), [0.48 + vary(61, 0.08), 2.55, 0], [0, 0, 0.7]);
      add("cone", [0.76 + seededValue(object.flickerSeed, 62) * 0.12, 1.42, 5], wood(object.biome === "frozen-pass" ? "#718693" : "#282b2d"), [0.1 + vary(63, 0.12), 3.1 + vary(64, 0.12), 0]);
      for (let index = 0; index < 3; index += 1) {
        const angle = index * (Math.PI * 2 / 3) + seededValue(object.flickerSeed, 65) * 0.5;
        cylinder([0.06, 0.12, 0.76, 5], wood(biomeWood),
          [Math.cos(angle) * 0.25, 0.35, Math.sin(angle) * 0.25], [Math.sin(angle) * 0.24, 0, Math.cos(angle) * 0.24]);
      }
      box(moss, [-0.13, 1.14, -0.3], [0.12, 0.36, 0.04], [0, 0, 0.08]);
      break;
    case "pine-tree": {
      const pineFoliage = wood(object.biome === "frozen-pass" ? "#718693" : "#30363a");
      cylinder([0.14, 0.25, 2.35, 6], wood(biomeWood), [0, 1.18, 0]);
      for (let tier = 0; tier < 3; tier += 1) {
        const radius = 0.92 - tier * 0.17 + seededValue(object.flickerSeed, 70 + tier) * 0.1;
        const height = 1.28 - tier * 0.08;
        add("cone", [radius, height, 5], pineFoliage,
          [vary(74 + tier, 0.1), 1.62 + tier * 0.79 + vary(78 + tier, 0.08), 0],
          [1, 1, 0.92], [0, vary(82 + tier, 0.12), 0]);
      }
      for (let index = 0; index < 3; index += 1) {
        const angle = index * (Math.PI * 2 / 3) + seededValue(object.flickerSeed, 86) * 0.4;
        cylinder([0.045, 0.09, 0.52, 5], wood(biomeWood),
          [Math.cos(angle) * 0.18, 0.46 + (index % 2) * 0.16, Math.sin(angle) * 0.18],
          [Math.sin(angle) * 0.2, 0, Math.cos(angle) * 0.2]);
      }
      break;
    }
    case "skeletal-tree":
      cylinder([0.19, 0.3, 2.6, 6], wood(biomeWood), [0, 1.3, 0], [0, 0, vary(90, 0.08)]);
      cylinder([0.09, 0.14, 1.82, 5], wood(biomeWood), [-0.48, 2.35, 0], [0, 0, -0.68]);
      cylinder([0.08, 0.13, 1.7, 5], wood(biomeWood), [0.5, 2.48, 0], [0, 0, 0.72]);
      cylinder([0.06, 0.1, 1.2, 5], wood("#55403a"), [-0.95, 2.78, 0], [0, 0, -0.54]);
      cylinder([0.06, 0.1, 1.08, 5], wood("#55403a"), [-0.3, 3.05, 0], [0, 0, -0.86]);
      cylinder([0.06, 0.1, 1.16, 5], wood("#463638"), [0.94, 2.91, 0], [0, 0, 0.62]);
      cylinder([0.055, 0.09, 1.04, 5], wood("#463638"), [0.25, 3.3, 0], [0, 0, 0.92]);
      add("cone", [0.11, 0.32, 4], wood(biomeWood), [0.05, 3.43, 0], [0.7, 1, 0.7]);
      break;
    case "rock":
      add("dodecahedron", [0.86, 0], { color: darkStone.color, roughness: 0.98, flatShading: true }, [vary(100, 0.08), 0.43, 0], [1 + vary(101, 0.1), 0.92 + seededValue(object.flickerSeed, 102) * 0.14, 1], [0.14, 0.36 + vary(103, 0.25), 0]);
      add("dodecahedron", [0.62, 0], stoneLight, [0.76 + vary(104, 0.1), 0.29, -0.18], [0.7, 0.72, 0.84], [0.2, -0.2, 0.18]);
      add("dodecahedron", [0.56, 0], { color: "#473f43", roughness: 1, flatShading: true }, [-0.72, 0.25, 0.14], [0.78, 0.65, 0.8], [0, 0.44, 0.1]);
      add("dodecahedron", [0.24, 0], moss, [-0.2 + vary(105, 0.16), 0.94, -0.19], [1.2, 0.2, 0.76], [0.1, vary(106, 0.3), 0]);
      if (object.biome === "frozen-pass" || seededValue(object.flickerSeed, 107) > 0.48) {
        add("dodecahedron", [0.18, 0], ash, [0.72, 0.09, 0.32], [1.3, 0.26, 0.8], [0, vary(108, 0.3), 0]);
      }
      break;
    case "torch":
      cylinder([0.07, 0.12, 1.8, 6], { color: "#4a3028", roughness: 0.88 }, [0, 0.9, 0]);
      cylinder([0.22, 0.16, 0.2, 6], { color: "#777071", roughness: 0.82, metalness: 0.34 }, [0, 1.72, 0]);
      cylinder([0.14, 0.2, 0.12, 6], wood("#49352d"), [0, 1.84, 0]);
      add("cone", [0.16 + seededValue(object.flickerSeed, 110) * 0.04, 0.44, 5],
        { color: "#e58b50", emissive: "#a54a2e", emissiveIntensity: 0.6, roughness: 0.8 },
        [vary(111, 0.05), 2.13, 0], [0.86, 1 + seededValue(object.flickerSeed, 112) * 0.24, 0.86],
        [0, vary(113, 0.32), vary(114, 0.12)]);
      box(ash, [0.12, 0.07, 0.04], [0.44, 0.08, 0.3], [0, vary(115, 0.4), 0]);
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
      box(wood("#654b3e"), [0, 0.66, 0.44], [1.7, 0.74, 0.13], [0, 0, 0.18 + vary(120, 0.04)]);
      box(wood("#594236"), [-0.78, 0.63, -0.43], [0.16, 0.72, 0.13], [0, 0, -0.04]);
      box(wood("#594236"), [0.78, 0.63, -0.43], [0.16, 0.72, 0.13], [0, 0, vary(121, 0.07)]);
      for (let plank = 0; plank < 3; plank += 1) {
        box(wood(plank % 2 ? "#594236" : "#654b3e"), [-0.49 + plank * 0.49, 0.43, 0.17],
          [0.44, 0.12, 0.62], [0, vary(122 + plank, 0.04), 0]);
      }
      cylinder([0.47, 0.47, 0.13, 9], wood("#32292a"), [-0.92, 0.32, -0.62], [0, 0, Math.PI / 2]);
      cylinder([0.36, 0.36, 0.13, 8], wood("#32292a"), [0.9, 0.28, -0.62], [0.1, 0.1, Math.PI / 2]);
      for (const wheel of [-0.92, 0.9]) {
        const radius = wheel < 0 ? 0.47 : 0.36;
        cylinder([0.12, 0.12, 0.17, 6], wood("#8a6a4c"), [wheel, wheel < 0 ? 0.32 : 0.28, -0.7], [0, 0, Math.PI / 2]);
        for (let spoke = 0; spoke < 4; spoke += 1) {
          const angle = spoke * Math.PI / 4;
          box(wood("#76563f"), [wheel, (wheel < 0 ? 0.32 : 0.28) + Math.sin(angle) * radius * 0.48, -0.7 + Math.cos(angle) * radius * 0.48],
            [0.16, 0.055, 0.055], [angle, 0, Math.PI / 2]);
        }
      }
      box(wood("#594236"), [-0.12, 0.28, -0.7], [2.1, 0.12, 0.12], [0, 0, 0]);
      box(wood("#594236"), [0.12, 1.08, -0.25], [0.12, 1.5, 0.12], [0, 0, -0.3]);
      box(wood("#654b3e"), [-0.58, 0.92, 0.28], [0.92, 0.11, 0.13], [0, 0, -0.08]);
      break;
    case "bones":
      for (let index = 0; index < 4; index += 1) {
        const x = -0.52 + index * 0.37 + vary(130 + index, 0.06);
        const y = 0.18 + (index % 2) * 0.12 + vary(134 + index, 0.025);
        const z = (index % 2 ? 0.08 : -0.08) + vary(138 + index, 0.05);
        const bone = { color: "#b7a990", roughness: 0.86, flatShading: true };
        cylinder([0.055, 0.055, 0.8, 5], bone, [x, y, z], [0.2 + vary(142 + index, 0.08), 0, index % 2 ? 0.08 : -0.08]);
        add("sphere", [0.1, 5, 4], { color: "#c5b89e", roughness: 0.86, flatShading: true }, [x, y - 0.43, z]);
        add("sphere", [0.1, 5, 4], { color: "#c5b89e", roughness: 0.86, flatShading: true }, [x, y + 0.43, z]);
      }
      add("sphere", [0.25, 6, 5], { color: "#baac91", roughness: 0.86, flatShading: true }, [0.25, 0.22, -0.38], [1, 1, 1], [0, 0.2, 0.6]);
      add("dodecahedron", [0.31, 0], { color: "#c0b197", roughness: 0.9, flatShading: true }, [0.76, 0.26, -0.08], [1, 0.82, 0.76]);
      box({ color: "#66594b", roughness: 0.97 }, [0.76, 0.17, -0.34], [0.36, 0.06, 0.08]);
      // A compact rib fragment and scattered chips keep the remains legible at a distance.
      for (let rib = 0; rib < 3; rib += 1) {
        cylinder([0.035, 0.035, 0.42, 5], { color: "#b7a990", roughness: 0.86, flatShading: true },
          [-0.76 + rib * 0.2, 0.2, 0.38 + vary(150 + rib, 0.08)], [0.22, 0, -0.38 + rib * 0.2]);
      }
      add("dodecahedron", [0.13, 0], { color: "#9b8c75", roughness: 0.96, flatShading: true },
        [-0.96 + vary(153, 0.1), 0.08, -0.3], [1.3, 0.45, 0.75], [0, vary(154, 0.5), 0]);
      box(ash, [0.1, 0.06, 0.43], [0.56, 0.06, 0.26], [0, vary(155, 0.4), 0]);
      break;
    case "reed":
      for (let index = 0; index < 5; index += 1) {
        const x = (index - 2) * 0.19;
        const lean = (index - 2) * 0.12;
        cylinder([0.025, 0.045, 1.7 + (index % 2) * 0.6, 5], wood("#826c46"), [x, 0.85, 0], [0, 0, lean]);
        add("cone", [0.11, 0.46, 4], wood(index % 2 ? "#8b9862" : "#707c50"), [x + lean * 0.4, 1.68 + (index % 2) * 0.3, 0], [0.62, 1, 0.48], [0, 0, lean]);
      }
      break;
    case "mangrove":
      cylinder([0.24, 0.43, 2.9, 6], wood("#453434"), [0, 1.35, 0]);
      cylinder([0.09, 0.15, 2.1, 5], wood("#55403a"), [-0.65, 2.3, 0], [0, 0, -0.72]);
      cylinder([0.09, 0.15, 2.35, 5], wood("#463638"), [0.55, 2.55, 0], [0, 0, 0.78]);
      cylinder([0.07, 0.14, 1.6, 5], wood("#574137"), [-0.26, 0.55, 0.12], [0, 0, -0.94]);
      cylinder([0.07, 0.14, 1.72, 5], wood("#574137"), [0.27, 0.57, -0.12], [0, 0, 0.96]);
      break;
  }
  return parts;
}

function buildStaticBatches(objects: WorldObject[], originDistance: number): StaticBatch[] {
  const batches = new Map<string, StaticBatch>();
  const root = new THREE.Object3D();
  const partTransform = new THREE.Object3D();
  for (const object of objects) {
    const x = object.lane * 9.7;
    root.position.set(x, raycastWorldGround(x, -150), -(object.worldX - originDistance));
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
  originDistance,
}: {
  objects: WorldObject[];
  motionRef: MotionRef;
  originDistance: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const batches = useMemo(() => buildStaticBatches(objects, originDistance), [objects, originDistance]);
  useFrame(() => {
    if (groupRef.current) groupRef.current.position.z = motionRef.current.cameraX - originDistance;
  });

  return (
    <group ref={groupRef}>
      {batches.map((batch) => <InstancedPropBatch key={batch.key} batch={batch} />)}
    </group>
  );
}
