import * as THREE from "three";
import type { WorldBiome } from "./world-biomes.ts";
import { WORLD_ROAD_WIDTH } from "./movement.ts";

export { WORLD_ROAD_WIDTH } from "./movement.ts";

export type TreeSpecies = "ash" | "pine" | "skeletal" | "mangrove";

export type LandmarkKind = "tower" | "column" | "ruin" | "arch";
export type LandscapeQuality = "high" | "balanced" | "low";

export const WORLD_RIDGE_BASE_DISTANCE_METERS = 420;
export const WORLD_RIDGE_LAYER_SPACING_METERS = 38;
export const WORLD_RIDGE_PARALLAX_LIMIT_METERS = 6;

export function getWorldRidgeDistance(cameraX: number, layer: number) {
  const safeCameraX = Number.isFinite(cameraX) ? cameraX : 0;
  const safeLayer = THREE.MathUtils.clamp(Math.floor(Number.isFinite(layer) ? layer : 0), 0, 2);
  const phase = safeCameraX * (0.002 + safeLayer * 0.00035) + safeLayer * 1.7;
  const drift = Math.sin(phase) * WORLD_RIDGE_PARALLAX_LIMIT_METERS;
  return WORLD_RIDGE_BASE_DISTANCE_METERS + safeLayer * WORLD_RIDGE_LAYER_SPACING_METERS + drift;
}

function seededRandom(initialSeed: number) {
  let seed = initialSeed >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createConnectedRidgeGeometry(
  seed: number,
  layer = 0,
  quality: LandscapeQuality = "high",
) {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const random = seededRandom(seed);
  const segments = quality === "high" ? 96 : quality === "balanced" ? 64 : 40;
  const crossSections = 3;
  const controls = Array.from({ length: 20 }, () => 0.1 + random() * 0.82);
  // Keep the ridge low and distant. A solid sheet that rises too high or
  // approaches the camera reads as a wall across the whole mobile view.
  const baseHeight = 0.8 + layer * 0.45;
  const elevation = 7 + layer * 1.2;

  for (let segment = 0; segment <= segments; segment += 1) {
    const progress = segment / segments;
    const controlPosition = progress * (controls.length - 1);
    const controlIndex = Math.min(controls.length - 2, Math.floor(controlPosition));
    const blend = controlPosition - controlIndex;
    const easedBlend = blend * blend * (3 - 2 * blend);
    const broadForm = THREE.MathUtils.lerp(controls[controlIndex], controls[controlIndex + 1], easedBlend);
    const fineForm = Math.sin(progress * 37 + seed * 0.001) * 0.045
      + Math.sin(progress * 91 + seed * 0.003) * 0.018;
    const height = baseHeight + Math.max(0.025, broadForm + fineForm) * elevation;
    const x = (progress - 0.5) * 420;
    const ridgeDepth = Math.sin(progress * 23 + seed * 0.002) * 1.2;
    const shade = 0.78 + broadForm * 0.22;
    const rowData = [
      { y: height, z: ridgeDepth, color: shade },
      { y: -3.5, z: ridgeDepth, color: 0.73 },
      { y: -3.5, z: -9 + ridgeDepth, color: 0.66 },
    ];
    for (let row = 0; row < crossSections; row += 1) {
      const vertex = rowData[row];
      positions.push(x, vertex.y, vertex.z);
      colors.push(vertex.color, vertex.color * 0.99, vertex.color * 0.97);
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    const current = segment * crossSections;
    const next = current + crossSections;
    for (let row = 0; row < crossSections - 1; row += 1) {
      const a = current + row;
      const b = a + 1;
      const c = next + row + 1;
      const d = next + row;
      indices.push(a, b, c, a, c, d);
    }
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function addWeatheredStoneColor(geometry: THREE.BufferGeometry, biome: WorldBiome) {
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  const base = new THREE.Color(
    biome === "frozen-pass" ? "#929da0" : biome === "red-marsh" ? "#91877d" : "#969389",
  );
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const seam = Math.abs(Math.sin(Math.atan2(z, x) * 8 + y * 0.7)) < 0.13 ? 0.72 : 1;
    const erosion = 0.86 + (Math.sin(x * 6.7 + y * 4.1 + z * 5.3) + 1) * 0.08;
    const course = Math.sin(y * 8.2 + Math.sin(x * 3.1) * 0.5) > 0.93 ? 0.78 : 1;
    const shade = seam * erosion * course;
    colors[index * 3] = base.r * shade;
    colors[index * 3 + 1] = base.g * shade;
    colors[index * 3 + 2] = base.b * shade;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function createBrokenTowerGeometry() {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];
  const segments = 48;
  const outside = [
    { y: 0, radius: 0.95 },
    { y: 0.12, radius: 1.24 },
    { y: 0.36, radius: 1.31 },
    { y: 0.58, radius: 1.08 },
    { y: 4.05, radius: 0.91 },
    { y: 4.28, radius: 1.02 },
  ];
  const rings = [
    ...outside.map((ring, index) => ({ ...ring, wave: index === outside.length - 1 ? 0.32 : 0 })),
    { y: 4.17, radius: 0.69, wave: 0.32 },
    { y: 3.82, radius: 0.68, wave: 0 },
  ];
  rings.forEach((ring, ringIndex) => {
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const irregularity = 0.97 + Math.sin(angle * 5 + ringIndex * 1.7) * 0.025;
      const brokenEdge = ring.wave ? Math.sin(angle * 3.4 + 0.6) * ring.wave : 0;
      positions.push(
        Math.cos(angle) * ring.radius * irregularity,
        ring.y + brokenEdge,
        Math.sin(angle) * ring.radius * irregularity,
      );
    }
  });
  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    const reverse = ring >= outside.length;
    for (let segment = 0; segment < segments; segment += 1) {
      const a = ring * segments + segment;
      const b = ring * segments + (segment + 1) % segments;
      const c = b + segments;
      const d = a + segments;
      if (reverse) indices.push(a, c, b, a, d, c);
      else indices.push(a, d, c, a, c, b);
    }
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createCarvedColumnGeometry() {
  const profile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.52, 0),
    new THREE.Vector2(0.66, 0.07),
    new THREE.Vector2(0.68, 0.2),
    new THREE.Vector2(0.54, 0.29),
    new THREE.Vector2(0.43, 0.43),
    new THREE.Vector2(0.39, 0.56),
    new THREE.Vector2(0.42, 0.61),
    new THREE.Vector2(0.42, 0.67),
    new THREE.Vector2(0.39, 0.72),
    new THREE.Vector2(0.38, 1.52),
    new THREE.Vector2(0.42, 1.57),
    new THREE.Vector2(0.42, 1.64),
    new THREE.Vector2(0.38, 1.69),
    new THREE.Vector2(0.38, 2.47),
    new THREE.Vector2(0.42, 2.52),
    new THREE.Vector2(0.42, 2.59),
    new THREE.Vector2(0.38, 2.64),
    new THREE.Vector2(0.4, 3.37),
    new THREE.Vector2(0.48, 3.48),
    new THREE.Vector2(0.62, 3.57),
    new THREE.Vector2(0.68, 3.65),
    new THREE.Vector2(0.68, 3.82),
    new THREE.Vector2(0.48, 3.91),
    new THREE.Vector2(0, 3.91),
  ];
  const geometry = new THREE.LatheGeometry(profile, 48);
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const angle = Math.atan2(z, x);
    const shaftBlend = THREE.MathUtils.smoothstep(y, 0.7, 1.05)
      * (1 - THREE.MathUtils.smoothstep(y, 3.1, 3.45));
    const fluting = 1 - (0.028 + Math.cos(angle * 12) * 0.026) * shaftBlend;
    positions.setXYZ(index, x * fluting, y, z * fluting);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createExtrudedRuin(kind: "ruin" | "arch") {
  const outline = new THREE.Shape();
  const opening = new THREE.Path();
  if (kind === "arch") {
    outline.moveTo(-1.55, 0);
    outline.lineTo(-1.55, 2.6);
    outline.quadraticCurveTo(-1.52, 4.3, 0, 4.56);
    outline.quadraticCurveTo(1.52, 4.3, 1.55, 2.6);
    outline.lineTo(1.55, 0);
    outline.closePath();
    opening.moveTo(-0.72, 0);
    opening.lineTo(0.72, 0);
    opening.lineTo(0.72, 2.17);
    opening.quadraticCurveTo(0, 3.1, -0.72, 2.17);
    opening.closePath();
  } else {
    outline.moveTo(-1.95, 0);
    outline.lineTo(-1.85, 3.05);
    outline.lineTo(-1.36, 2.94);
    outline.lineTo(-1.07, 2.55);
    outline.lineTo(-0.58, 3.22);
    outline.lineTo(-0.18, 2.88);
    outline.lineTo(0.48, 3.31);
    outline.lineTo(0.84, 2.82);
    outline.lineTo(1.43, 2.99);
    outline.lineTo(1.58, 1.83);
    outline.lineTo(1.5, 0);
    outline.closePath();
    opening.moveTo(-0.52, 0);
    opening.lineTo(0.52, 0);
    opening.lineTo(0.52, 1.55);
    opening.quadraticCurveTo(0, 2.2, -0.52, 1.55);
    opening.closePath();
  }
  outline.holes.push(opening);
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: kind === "arch" ? 0.78 : 0.66,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.075,
    bevelThickness: 0.08,
    curveSegments: 20,
  });
  geometry.clearGroups();
  geometry.computeVertexNormals();
  return geometry;
}

const landmarkGeometryCache = new Map<string, THREE.BufferGeometry>();

export function getLandmarkGeometry(kind: LandmarkKind, biome: WorldBiome) {
  const key = `${kind}:${biome}`;
  let geometry = landmarkGeometryCache.get(key);
  if (!geometry) {
    geometry = kind === "tower"
      ? createBrokenTowerGeometry()
      : kind === "column"
        ? createCarvedColumnGeometry()
        : createExtrudedRuin(kind);
    addWeatheredStoneColor(geometry, biome);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    landmarkGeometryCache.set(key, geometry);
  }
  return geometry;
}

export function createRoadShoulderGeometry(quality: LandscapeQuality) {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const segmentsAlong = quality === "high" ? 80 : quality === "balanced" ? 40 : 20;
  const segmentsAcross = quality === "high" ? 10 : quality === "balanced" ? 6 : 3;
  const segmentLength = 440;
  const roadHalfWidth = WORLD_ROAD_WIDTH / 2;
  const roadsideClearance = 2.5;
  const shoulderWidth = 5.2;

  for (const side of [-1, 1]) {
    const start = positions.length / 3;
    for (let along = 0; along <= segmentsAlong; along += 1) {
      const z = (along / segmentsAlong - 0.5) * segmentLength;
      const wave = Math.sin(z * 0.046 + side * 1.8) * 0.022
        + Math.sin(z * 0.117 - side) * 0.009;
      for (let across = 0; across <= segmentsAcross; across += 1) {
        const blend = across / segmentsAcross;
        const x = side * (roadHalfWidth + roadsideClearance + blend * shoulderWidth);
        const y = -0.08 - Math.pow(blend, 1.18) * 0.44 + wave * Math.sin(blend * Math.PI * 0.5);
        positions.push(x, y, z);
        const soil = 0.76 + blend * 0.18 + Math.sin(z * 0.19 + across * 3.7) * 0.035;
        colors.push(soil * (side < 0 ? 1 : 0.98), soil * 0.96, soil * 0.91);
      }
    }

    for (let along = 0; along < segmentsAlong; along += 1) {
      for (let across = 0; across < segmentsAcross; across += 1) {
        const rowWidth = segmentsAcross + 1;
        const a = start + along * rowWidth + across;
        const b = a + 1;
        const d = a + rowWidth;
        const c = d + 1;
        if (side > 0) indices.push(a, c, b, a, d, c);
        else indices.push(a, b, c, a, c, d);
      }
    }
  }

  const uv: number[] = [];
  for (let index = 0; index < positions.length; index += 3) {
    uv.push(positions[index] / 5.2, positions[index + 2] / 5.2);
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createTreeGeometry(species: TreeSpecies, biome: WorldBiome) {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const leafColor = new THREE.Color(
    biome === "frozen-pass" ? "#829b99" : biome === "red-marsh" ? "#728052" : "#78804e",
  );
  const barkColor = new THREE.Color(
    biome === "frozen-pass" ? "#514f50" : biome === "red-marsh" ? "#49352f" : "#49362d",
  );
  const append = (
    source: THREE.BufferGeometry,
    color: THREE.Color,
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number],
  ) => {
    const part = source.clone();
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    );
    part.applyMatrix4(matrix);
    const attribute = part.getAttribute("position");
    const index = part.getIndex();
    const start = positions.length / 3;
    for (let vertex = 0; vertex < attribute.count; vertex += 1) {
      positions.push(attribute.getX(vertex), attribute.getY(vertex), attribute.getZ(vertex));
      colors.push(color.r, color.g, color.b);
    }
    if (index) {
      for (let item = 0; item < index.count; item += 1) indices.push(start + index.getX(item));
    } else {
      for (let vertex = 0; vertex < attribute.count; vertex += 1) indices.push(start + vertex);
    }
    part.dispose();
  };

  const trunk = new THREE.CylinderGeometry(0.115, species === "mangrove" ? 0.3 : 0.24, 3.6, 16, 4);
  append(trunk, barkColor, [0, 1.72, 0], [0, 0, species === "mangrove" ? -0.08 : 0], [1, 1, 1]);
  trunk.dispose();

  if (species !== "skeletal") {
    const root = new THREE.CylinderGeometry(0.018, 0.2, 0.72, 12, 3);
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * Math.PI * 2;
      append(
        root,
        barkColor.clone().multiplyScalar(0.88),
        [Math.cos(angle) * 0.17, 0.27, Math.sin(angle) * 0.17],
        [Math.cos(angle) * 0.52, angle, Math.sin(angle) * 0.52],
        [species === "mangrove" ? 1.4 : 1, 1, 1],
      );
    }
    root.dispose();
  }

  const branch = new THREE.CylinderGeometry(0.025, 0.105, 1.7, 12, 2);
  const branchCount = species === "skeletal" ? 7 : species === "mangrove" ? 6 : 5;
  for (let index = 0; index < branchCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const height = 1.35 + (index % 3) * 0.56;
    const angle = index * 2.399;
    const length = species === "mangrove" && index < 2 ? 1.25 : 1;
    append(
      branch,
      barkColor,
      [Math.cos(angle) * 0.36 * length, height, Math.sin(angle) * 0.2],
      [Math.sin(angle) * 0.36, 0, -side * (0.58 + (index % 2) * 0.12)],
      [length, 1, 1],
    );
  }
  branch.dispose();

  if (species !== "skeletal") {
    const foliage = new THREE.SphereGeometry(1, 18, 12);
    const foliagePositions = foliage.getAttribute("position") as THREE.BufferAttribute;
    const phase = species === "pine" ? 2.2 : species === "mangrove" ? 4.6 : 0.8;
    for (let index = 0; index < foliagePositions.count; index += 1) {
      const x = foliagePositions.getX(index);
      const y = foliagePositions.getY(index);
      const z = foliagePositions.getZ(index);
      const weather = Math.sin(x * 4.8 + phase) * Math.cos(z * 5.2 - phase)
        + Math.sin(y * 6.3 - x * 2.1 + phase * 0.4) * 0.42;
      const radius = 1 + weather * 0.033;
      foliagePositions.setXYZ(index, x * radius, y * radius, z * radius);
    }
    foliagePositions.needsUpdate = true;
    foliage.computeVertexNormals();
    const clumps = species === "pine"
      ? [
        [-0.08, 2.84, 0, 0.86, 0.57, 0.8],
        [0.16, 3.43, -0.04, 0.73, 0.62, 0.71],
        [-0.11, 4.02, 0.02, 0.61, 0.56, 0.6],
        [0.04, 4.49, 0, 0.43, 0.51, 0.44],
      ]
      : species === "mangrove"
        ? [
          [-0.66, 3.34, 0.06, 0.68, 0.48, 0.52],
          [0.45, 3.53, -0.08, 0.72, 0.52, 0.6],
          [-0.12, 4.1, 0.08, 0.64, 0.52, 0.62],
          [0.9, 3.02, -0.1, 0.5, 0.39, 0.45],
        ]
        : [
          [-0.7, 2.9, 0.04, 0.68, 0.52, 0.6],
          [0.65, 3.16, -0.06, 0.72, 0.56, 0.65],
          [-0.18, 3.6, 0.08, 0.77, 0.62, 0.68],
          [0.42, 4.08, -0.03, 0.62, 0.56, 0.6],
          [-0.38, 4.36, 0.04, 0.5, 0.46, 0.54],
        ];
    clumps.forEach(([x, y, z, sx, sy, sz], index) => {
      const shade = leafColor.clone().multiplyScalar(0.86 + (index % 3) * 0.09);
      append(foliage, shade, [x, y, z], [0.08 * index, 0.24 * index, -0.12 * index], [sx, sy, sz]);
    });
    foliage.dispose();
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const treeGeometryCache = new Map<string, THREE.BufferGeometry>();

export function getNaturalTreeGeometry(species: TreeSpecies, biome: WorldBiome) {
  const key = `${species}:${biome}`;
  let geometry = treeGeometryCache.get(key);
  if (!geometry) {
    geometry = createTreeGeometry(species, biome);
    treeGeometryCache.set(key, geometry);
  }
  return geometry;
}

const naturalRockGeometryCache = new Map<number, THREE.BufferGeometry>();

function createNaturalRockGeometry(variant: number) {
  const geometry = new THREE.SphereGeometry(1, 32, 24);
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const phase = variant * 1.731;

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const broadForm = Math.sin(x * 3.1 + phase)
      * Math.cos(y * 2.7 - phase * 0.6)
      + Math.sin(z * 3.4 - phase * 0.8) * 0.55;
    const weathering = Math.sin(x * 7.2 + y * 4.1 + phase)
      * Math.cos(z * 6.3 - y * 3.8 + phase * 0.4);
    const radius = 1 + broadForm * 0.034 + weathering * 0.009;
    positions.setXYZ(index, x * radius, y * radius * 0.88, z * radius);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const fallbackNormal = new THREE.Vector3();
  for (let index = 0; index < normals.count; index += 1) {
    fallbackNormal.set(normals.getX(index), normals.getY(index), normals.getZ(index));
    if (fallbackNormal.lengthSq() < 1e-12) {
      fallbackNormal.set(
        positions.getX(index),
        positions.getY(index) / (0.88 * 0.88),
        positions.getZ(index),
      );
    }
    fallbackNormal.normalize();
    normals.setXYZ(index, fallbackNormal.x, fallbackNormal.y, fallbackNormal.z);
  }
  normals.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Rounded, weathered fallback rocks shared by the scenery and road renderers. */
export function getNaturalRockGeometry(variant = 0) {
  const normalizedVariant = ((Math.floor(variant) % 6) + 6) % 6;
  let geometry = naturalRockGeometryCache.get(normalizedVariant);
  if (!geometry) {
    geometry = createNaturalRockGeometry(normalizedVariant);
    naturalRockGeometryCache.set(normalizedVariant, geometry);
  }
  return geometry;
}
