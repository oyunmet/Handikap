import * as THREE from "three";
import { getBiomeTransition, WORLD_BIOME_PALETTES, type WeatherMode } from "./world-biomes.ts";
import { WORLD_ROAD_WIDTH } from "./movement.ts";

export const WORLD_ROAD_TILE_LENGTH = 12;
export const WORLD_ROAD_TILE_OFFSETS = { first: -2, last: 14 } as const;

type Segment = { root: THREE.Group; offset: number };
type MountainLayer = { root: THREE.Group; distance: number; index: number };

export type WorldRoadEnvironment = {
  root: THREE.Group;
  segments: Segment[];
  mountainLayers: MountainLayer[];
  updatePalette: (distance: number, weather: WeatherMode) => void;
  dispose: () => void;
};

const BIOME_DETAIL_COLORS = {
  "ash-road": { foliage: "#69704d", bark: "#514237", stone: "#716a60", far: "#b4aaa0", mid: "#89877f", near: "#676a67" },
  "frozen-pass": { foliage: "#829b99", bark: "#55595a", stone: "#76858a", far: "#a9bdc5", mid: "#849da8", near: "#637b86" },
  "red-marsh": { foliage: "#73734c", bark: "#4e3d34", stone: "#796b62", far: "#b2a29a", mid: "#897a73", near: "#6a6260" },
} as const;

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function colorForBiome(distance: number, key: "ground" | "road" | "foliage" | "bark" | "stone" | "far" | "mid" | "near") {
  const transition = getBiomeTransition(distance);
  const from = key === "ground" || key === "road"
    ? WORLD_BIOME_PALETTES[transition.from][key as "ground" | "road"]
    : BIOME_DETAIL_COLORS[transition.from][key as "foliage" | "bark" | "stone" | "far" | "mid" | "near"];
  const to = key === "ground" || key === "road"
    ? WORLD_BIOME_PALETTES[transition.to][key as "ground" | "road"]
    : BIOME_DETAIL_COLORS[transition.to][key as "foliage" | "bark" | "stone" | "far" | "mid" | "near"];
  return new THREE.Color(from).lerp(new THREE.Color(to), transition.mix);
}

function setInstance(
  mesh: THREE.InstancedMesh,
  index: number,
  position: THREE.Vector3,
  scale: THREE.Vector3,
  rotationY: number,
  color?: THREE.Color,
) {
  const matrix = new THREE.Matrix4().compose(
    position,
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY, 0)),
    scale,
  );
  mesh.setMatrixAt(index, matrix);
  if (color) mesh.setColorAt(index, color);
}

function createTile(
  offset: number,
  shared: {
    road: THREE.MeshStandardMaterial;
    ground: THREE.MeshStandardMaterial;
    shoulder: THREE.MeshStandardMaterial;
    curb: THREE.MeshStandardMaterial;
    stone: THREE.MeshStandardMaterial;
    bark: THREE.MeshStandardMaterial;
    foliage: THREE.MeshStandardMaterial;
    rock: THREE.MeshStandardMaterial;
    grass: THREE.MeshStandardMaterial;
    roadGeometry: THREE.BufferGeometry;
    shoulderGeometry: THREE.BufferGeometry;
    outerGroundGeometry: THREE.BufferGeometry;
    curbGeometry: THREE.BufferGeometry;
    trunkGeometry: THREE.BufferGeometry;
    canopyGeometry: THREE.BufferGeometry;
    rockGeometry: THREE.BufferGeometry;
    grassGeometry: THREE.BufferGeometry;
    ruinColumnGeometry: THREE.BufferGeometry;
    ruinCapGeometry: THREE.BufferGeometry;
  },
) {
  const root = new THREE.Group();
  root.name = `rebuilt-world-road-tile-${offset}`;
  root.userData.worldRoadTileOffset = offset;
  const roadHalf = WORLD_ROAD_WIDTH / 2;
  const side = (sign: number) => sign * (roadHalf + 3.25);
  const makeMesh = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    name: string,
    position: [number, number, number],
    roadGround = false,
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.receiveShadow = roadGround;
    mesh.userData.worldV2RoadGround = roadGround;
    root.add(mesh);
    return mesh;
  };

  makeMesh(shared.roadGeometry, shared.road, "world-road-surface", [0, -0.12, 0], true);
  for (const sign of [-1, 1]) {
    makeMesh(shared.shoulderGeometry, shared.shoulder, "world-road-shoulder", [side(sign), -0.15, 0], true);
    makeMesh(shared.outerGroundGeometry, shared.ground, "world-road-verge", [sign * 19, -0.31, 0], true);
    const curb = makeMesh(shared.curbGeometry, shared.curb, "world-road-stone-edge", [sign * (roadHalf + 0.08), 0.035, 0]);
    curb.castShadow = true;
    curb.userData.worldV2AuditExempt = true;

    const random = seededRandom((offset + 64) * 8191 + (sign + 2) * 113);
    const treeCount = 3;
    const trunks = new THREE.InstancedMesh(shared.trunkGeometry, shared.bark, treeCount);
    trunks.name = "world-road-tree-trunks";
    trunks.castShadow = true;
    const canopies = new THREE.InstancedMesh(shared.canopyGeometry, shared.foliage, treeCount * 3);
    canopies.name = "world-road-tree-canopies";
    canopies.castShadow = true;
    for (let tree = 0; tree < treeCount; tree += 1) {
      const x = sign * (roadHalf + 3.6 + random() * 5.6);
      const z = (random() - 0.5) * WORLD_ROAD_TILE_LENGTH * 0.82;
      const height = 0.86 + random() * 0.34;
      setInstance(
        trunks,
        tree,
        new THREE.Vector3(x, 1.4 * height, z),
        new THREE.Vector3(height, height, height),
        random() * Math.PI * 2,
      );
      for (let tier = 0; tier < 3; tier += 1) {
        const tierScale = 1.16 - tier * 0.24;
        setInstance(
          canopies,
          tree * 3 + tier,
          new THREE.Vector3(x, (2.0 + tier * 0.84) * height, z),
          new THREE.Vector3(tierScale * height, 1.35 * tierScale * height, tierScale * height),
          random() * Math.PI * 2,
        );
      }
    }
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    root.add(trunks, canopies);

    const rocks = new THREE.InstancedMesh(shared.rockGeometry, shared.rock, 5);
    rocks.name = "world-roadside-rocks";
    const grass = new THREE.InstancedMesh(shared.grassGeometry, shared.grass, 12);
    grass.name = "world-roadside-grass";
    for (let index = 0; index < 5; index += 1) {
      const x = sign * (roadHalf + 2.7 + random() * 7.2);
      const z = (random() - 0.5) * WORLD_ROAD_TILE_LENGTH;
      const scale = 0.32 + random() * 0.6;
      setInstance(
        rocks,
        index,
        new THREE.Vector3(x, scale * 0.38, z),
        new THREE.Vector3(scale * (0.8 + random() * 0.7), scale, scale * (0.8 + random() * 0.7)),
        random() * Math.PI,
      );
    }
    for (let index = 0; index < 12; index += 1) {
      const x = sign * (roadHalf + 2.3 + random() * 6.8);
      const z = (random() - 0.5) * WORLD_ROAD_TILE_LENGTH;
      const scale = 0.55 + random() * 0.8;
      setInstance(
        grass,
        index,
        new THREE.Vector3(x, 0.24 * scale, z),
        new THREE.Vector3(scale, scale, scale),
        random() * Math.PI,
      );
    }
    root.add(rocks, grass);
  }

  const tileOrdinal = offset + 2;
  if (tileOrdinal % 8 === 3) {
    const pillars = new THREE.InstancedMesh(shared.ruinColumnGeometry, shared.stone, 2);
    const capitals = new THREE.InstancedMesh(shared.ruinCapGeometry, shared.stone, 2);
    pillars.name = "world-road-ruined-pillars";
    capitals.name = "world-road-ruin-capitals";
    for (const [index, sign] of [-1, 1].entries()) {
      const x = sign * (roadHalf + 8.6);
      const z = (index - 0.5) * 3;
      setInstance(pillars, index, new THREE.Vector3(x, 1.55, z), new THREE.Vector3(1, 1, 1), sign * 0.08);
      setInstance(capitals, index, new THREE.Vector3(x, 3.12, z), new THREE.Vector3(1, 1, 1), sign * 0.08);
    }
    pillars.instanceMatrix.needsUpdate = true;
    capitals.instanceMatrix.needsUpdate = true;
    root.add(pillars, capitals);
  }

  return root;
}

function createMountainGeometry() {
  const geometry = new THREE.ConeGeometry(1, 1, 5, 1);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createMountainLayer(index: number, distance: number, material: THREE.MeshStandardMaterial) {
  const count = 66;
  const mesh = new THREE.InstancedMesh(createMountainGeometry(), material, count);
  mesh.name = `world-horizon-mountains-${index}`;
  mesh.userData.worldV2AuditExempt = true;
  mesh.frustumCulled = false;
  const random = seededRandom(0x4192 + index * 0x71a);
  const baseX = -148;
  const spacing = 4.55;
  for (let item = 0; item < count; item += 1) {
    const height = (index === 0 ? 5.5 : index === 1 ? 7.4 : 8.8) * (0.62 + random() * 0.65);
    const width = 7.2 + random() * 0.8;
    const x = baseX + item * spacing + random() * 2.8;
    const z = -random() * 9;
    setInstance(
      mesh,
      item,
      new THREE.Vector3(x, height * 0.5 - 0.4, z),
      new THREE.Vector3(width * 0.5, height, 3.4 + random() * 0.55),
      random() * Math.PI * 2,
      new THREE.Color(0.87 + random() * 0.2, 0.88 + random() * 0.18, 0.89 + random() * 0.16),
    );
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  const root = new THREE.Group();
  root.name = `world-horizon-layer-${index}`;
  root.add(mesh);
  return { root, distance, index };
}

export function createWorldRoadEnvironment(showProps = true): WorldRoadEnvironment {
  const root = new THREE.Group();
  root.name = "rebuilt-3d-road-environment";
  const materials = {
    road: new THREE.MeshStandardMaterial({ color: "#9b8e7c", roughness: 0.94, flatShading: true }),
    ground: new THREE.MeshStandardMaterial({ color: "#837c6a", roughness: 1, flatShading: true }),
    shoulder: new THREE.MeshStandardMaterial({ color: "#aa967c", roughness: 1, flatShading: true }),
    curb: new THREE.MeshStandardMaterial({ color: "#77746e", roughness: 0.94, flatShading: true }),
    stone: new THREE.MeshStandardMaterial({ color: "#66635f", roughness: 0.96, flatShading: true }),
    bark: new THREE.MeshStandardMaterial({ color: "#514237", roughness: 1, flatShading: true }),
    foliage: new THREE.MeshStandardMaterial({ color: "#69704d", roughness: 0.98, flatShading: true }),
    rock: new THREE.MeshStandardMaterial({ color: "#746e64", roughness: 0.98, flatShading: true }),
    grass: new THREE.MeshStandardMaterial({ color: "#9c946c", roughness: 1, flatShading: true }),
    farMountain: new THREE.MeshStandardMaterial({ color: "#b4aaa0", roughness: 1, flatShading: true }),
    midMountain: new THREE.MeshStandardMaterial({ color: "#89877f", roughness: 1, flatShading: true }),
    nearMountain: new THREE.MeshStandardMaterial({ color: "#676a67", roughness: 1, flatShading: true }),
  };
  const geometries = {
    road: new THREE.BoxGeometry(WORLD_ROAD_WIDTH, 0.14, WORLD_ROAD_TILE_LENGTH),
    shoulder: new THREE.BoxGeometry(5.4, 0.18, WORLD_ROAD_TILE_LENGTH),
    outerGround: new THREE.BoxGeometry(17.5, 0.25, WORLD_ROAD_TILE_LENGTH),
    curb: new THREE.BoxGeometry(0.16, 0.26, WORLD_ROAD_TILE_LENGTH),
    trunk: new THREE.CylinderGeometry(0.12, 0.24, 2.8, 6),
    canopy: new THREE.ConeGeometry(1.08, 2.8, 6, 1),
    rock: new THREE.IcosahedronGeometry(0.55, 1),
    grass: new THREE.ConeGeometry(0.19, 0.75, 3, 1),
    ruinColumn: new THREE.CylinderGeometry(0.38, 0.5, 3.1, 6, 1),
    ruinCap: new THREE.BoxGeometry(0.94, 0.25, 0.94),
  };
  const resourceMaterials = Object.values(materials);
  const resourceGeometries = Object.values(geometries);
  const segments: Segment[] = [];
  for (let offset = WORLD_ROAD_TILE_OFFSETS.first; offset <= WORLD_ROAD_TILE_OFFSETS.last; offset += 1) {
    const segment = new THREE.Group();
    segment.name = `world-road-segment-${offset}`;
    segment.userData.worldRoadTileOffset = offset;
    if (showProps) {
      segment.add(createTile(offset, {
        road: materials.road,
        ground: materials.ground,
        shoulder: materials.shoulder,
        curb: materials.curb,
        stone: materials.stone,
        bark: materials.bark,
        foliage: materials.foliage,
        rock: materials.rock,
        grass: materials.grass,
        roadGeometry: geometries.road,
        shoulderGeometry: geometries.shoulder,
        outerGroundGeometry: geometries.outerGround,
        curbGeometry: geometries.curb,
        trunkGeometry: geometries.trunk,
        canopyGeometry: geometries.canopy,
        rockGeometry: geometries.rock,
        grassGeometry: geometries.grass,
        ruinColumnGeometry: geometries.ruinColumn,
        ruinCapGeometry: geometries.ruinCap,
      }));
    } else {
      const road = new THREE.Mesh(geometries.road, materials.road);
      road.name = "world-road-surface";
      road.userData.worldV2RoadGround = true;
      road.position.y = -0.12;
      segment.add(road);
    }
    root.add(segment);
    segments.push({ root: segment, offset });
  }

  const mountainMaterials = [materials.farMountain, materials.midMountain, materials.nearMountain];
  const mountainDistances = [210, 156, 112];
  const mountainLayers = mountainDistances.map((distance, index) =>
    createMountainLayer(index, distance, mountainMaterials[index]),
  );
  mountainLayers.forEach((layer) => root.add(layer.root));

  let lastPaletteDistance = Number.NaN;
  let lastWeather: WeatherMode | null = null;
  const updatePalette = (distance: number, weather: WeatherMode) => {
    if (Math.abs(distance - lastPaletteDistance) < 0.65 && weather === lastWeather) return;
    lastPaletteDistance = distance;
    lastWeather = weather;
    materials.road.color.copy(colorForBiome(distance, "road"));
    materials.ground.color.copy(colorForBiome(distance, "ground")).multiplyScalar(0.72);
    materials.shoulder.color.copy(colorForBiome(distance, "ground")).multiplyScalar(0.91);
    materials.curb.color.copy(colorForBiome(distance, "stone")).multiplyScalar(0.88);
    materials.stone.color.copy(colorForBiome(distance, "stone"));
    materials.bark.color.copy(colorForBiome(distance, "bark"));
    materials.foliage.color.copy(colorForBiome(distance, "foliage"));
    materials.rock.color.copy(colorForBiome(distance, "stone")).multiplyScalar(0.93);
    materials.grass.color.copy(colorForBiome(distance, "foliage")).lerp(colorForBiome(distance, "ground"), 0.34);
    materials.farMountain.color.copy(colorForBiome(distance, "far"));
    materials.midMountain.color.copy(colorForBiome(distance, "mid"));
    materials.nearMountain.color.copy(colorForBiome(distance, "near"));
    materials.road.roughness = weather === "storm" ? 0.64 : weather === "rain" ? 0.72 : 0.94;
    materials.road.metalness = weather === "storm" ? 0.035 : weather === "rain" ? 0.018 : 0;
  };

  updatePalette(0, "clear");

  return {
    root,
    segments,
    mountainLayers,
    updatePalette,
    dispose: () => {
      resourceGeometries.forEach((geometry) => geometry.dispose());
      const mountainGeometries = new Set<THREE.BufferGeometry>();
      root.traverse((object) => {
        if (object instanceof THREE.InstancedMesh && object.name.startsWith("world-horizon-mountains")) {
          mountainGeometries.add(object.geometry);
        }
      });
      mountainGeometries.forEach((geometry) => geometry.dispose());
      resourceMaterials.forEach((material) => material.dispose());
    },
  };
}

export function positionWorldRoadEnvironment(environment: WorldRoadEnvironment, distance: number, cameraX: number, playerX: number) {
  const currentTile = Math.floor(distance / WORLD_ROAD_TILE_LENGTH);
  for (const segment of environment.segments) {
    const start = (currentTile + segment.offset) * WORLD_ROAD_TILE_LENGTH;
    segment.root.position.z = -(start + WORLD_ROAD_TILE_LENGTH / 2 - cameraX);
  }
  const playerZ = -(distance - cameraX);
  for (const layer of environment.mountainLayers) {
    layer.root.position.set(playerX * (0.7 + layer.index * 0.08), 0, playerZ - layer.distance);
  }
}
