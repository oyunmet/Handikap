import * as THREE from "three";
import { getBiomeTransition, WORLD_BIOME_PALETTES, type WeatherMode } from "./world-biomes.ts";
import { WORLD_ROAD_WIDTH } from "./movement.ts";
import { createWorldRoadSurfaceTextures } from "./world-road-textures.ts";
import { BEVELED_STONE_BLOCK_GEOMETRY } from "./procedural-materials.ts";

export const WORLD_ROAD_TILE_LENGTH = 12;
export const WORLD_ROAD_TILE_OFFSETS = { first: -2, last: 14 } as const;

type Segment = { root: THREE.Group; offset: number };
type MountainLayer = { root: THREE.Group; distance: number; index: number };
type RoadQuality = "high" | "balanced" | "low";

export type WorldRoadEnvironment = {
  root: THREE.Group;
  segments: Segment[];
  mountainLayers: MountainLayer[];
  updatePalette: (distance: number, weather: WeatherMode) => void;
  dispose: () => void;
};

const BIOME_DETAIL_COLORS = {
  "ash-road": { foliage: "#595247", bark: "#37302d", stone: "#75685d", far: "#a99d94", mid: "#77736f", near: "#514f4d" },
  "frozen-pass": { foliage: "#829b99", bark: "#55595a", stone: "#76858a", far: "#a9bdc5", mid: "#849da8", near: "#637b86" },
  "red-marsh": { foliage: "#73734c", bark: "#4e3d34", stone: "#796b62", far: "#b2a29a", mid: "#897a73", near: "#6a6260" },
} as const;

const ASH_SURFACE_COLORS = {
  ground: "#a69b8c",
  road: "#bec7c7",
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
  const paletteColor = (biome: typeof transition.from) => {
    if (biome === "ash-road" && (key === "ground" || key === "road")) return ASH_SURFACE_COLORS[key];
    return key === "ground" || key === "road"
      ? WORLD_BIOME_PALETTES[biome][key]
      : BIOME_DETAIL_COLORS[biome][key];
  };
  const from = paletteColor(transition.from);
  const to = paletteColor(transition.to);
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

function setInstanceEuler(
  mesh: THREE.InstancedMesh,
  index: number,
  position: THREE.Vector3,
  scale: THREE.Vector3,
  rotation: THREE.Euler,
) {
  mesh.setMatrixAt(index, new THREE.Matrix4().compose(
    position,
    new THREE.Quaternion().setFromEuler(rotation),
    scale,
  ));
}

function createRoadPaving(
  geometry: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial,
  offset: number,
) {
  const roadHalf = WORLD_ROAD_WIDTH / 2;
  const columns = 9;
  const rows = 14;
  const tileWidth = WORLD_ROAD_WIDTH / columns;
  const tileDepth = WORLD_ROAD_TILE_LENGTH / rows;
  const mesh = new THREE.InstancedMesh(geometry, material, rows * (columns + 1));
  mesh.name = "world-cobblestone-road-stones";
  mesh.receiveShadow = true;
  const random = seededRandom((offset + 64) * 0x4f1bbcdc);
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  let count = 0;

  for (let row = 0; row < rows; row += 1) {
    const stagger = row % 2 === 0 ? 0 : tileWidth / 2;
    for (let column = 0; column <= columns; column += 1) {
      const intervalStart = -roadHalf + stagger + column * tileWidth;
      const left = Math.max(-roadHalf + 0.018, intervalStart + 0.035);
      const right = Math.min(roadHalf - 0.018, intervalStart + tileWidth - 0.035);
      const width = right - left;
      if (width < 0.38) continue;

      position.set(
        (left + right) / 2,
        -0.012 + random() * 0.006,
        -WORLD_ROAD_TILE_LENGTH / 2 + (row + 0.5) * tileDepth,
      );
      scale.set(width, 0.11 + random() * 0.012, tileDepth - 0.052);
      const tint = 0.78 + random() * 0.2;
      color.setRGB(tint, tint * (0.99 + random() * 0.018), tint * (0.97 + random() * 0.035));
      setInstance(mesh, count, position, scale, (random() - 0.5) * 0.018, color);
      count += 1;
    }
  }

  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function createEdgeBlendGeometry() {
  const width = 3.2;
  const geometry = new THREE.PlaneGeometry(width, WORLD_ROAD_TILE_LENGTH, 16, 1);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  const inner = new THREE.Color("#b2a28f");
  const outer = new THREE.Color("#887d71");
  const color = new THREE.Color();
  for (let index = 0; index < positions.count; index += 1) {
    const blend = THREE.MathUtils.clamp((positions.getX(index) + width / 2) / width, 0, 1);
    positions.setY(index, THREE.MathUtils.lerp(0.045, -0.08, blend));
    color.copy(inner).lerp(outer, blend);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createRuinArchGeometry() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.55, 0.2, 0),
    new THREE.Vector3(-1.55, 1.45, 0),
    new THREE.Vector3(-1.18, 2.18, 0),
    new THREE.Vector3(0, 2.55, 0),
    new THREE.Vector3(1.12, 2.05, 0),
    new THREE.Vector3(1.42, 1.36, 0),
  ]);
  return new THREE.TubeGeometry(curve, 18, 0.17, 5, false);
}

function createTile(
  offset: number,
  shared: {
    road: THREE.MeshStandardMaterial[];
    roadBed: THREE.MeshStandardMaterial;
    ground: THREE.MeshStandardMaterial;
    shoulder: THREE.MeshStandardMaterial[];
    curb: THREE.MeshStandardMaterial;
    stone: THREE.MeshStandardMaterial;
    bark: THREE.MeshStandardMaterial;
    foliage: THREE.MeshStandardMaterial;
    rock: THREE.MeshStandardMaterial;
    grass: THREE.MeshStandardMaterial;
    ember: THREE.MeshStandardMaterial;
    transition: THREE.MeshStandardMaterial;
    roadGeometry: THREE.BufferGeometry;
    pavingGeometry: THREE.BufferGeometry;
    shoulderGeometry: THREE.BufferGeometry;
    outerGroundGeometry: THREE.BufferGeometry;
    curbGeometry: THREE.BufferGeometry;
    transitionGeometry: THREE.BufferGeometry;
    trunkGeometry: THREE.BufferGeometry;
    canopyGeometry: THREE.BufferGeometry;
    rockGeometry: THREE.BufferGeometry;
    grassGeometry: THREE.BufferGeometry;
    ruinColumnGeometry: THREE.BufferGeometry;
    ruinCapGeometry: THREE.BufferGeometry;
    ruinArchGeometry: THREE.BufferGeometry;
    branchGeometry: THREE.BufferGeometry;
    lanternPoleGeometry: THREE.BufferGeometry;
    lanternGeometry: THREE.BufferGeometry;
    emberGeometry: THREE.BufferGeometry;
    cartBoardGeometry: THREE.BufferGeometry;
    cartWheelGeometry: THREE.BufferGeometry;
    fenceGeometry: THREE.BufferGeometry;
    quality: RoadQuality;
  },
) {
  const root = new THREE.Group();
  root.name = `rebuilt-world-road-tile-${offset}`;
  root.userData.worldRoadTileOffset = offset;
  const roadHalf = WORLD_ROAD_WIDTH / 2;
  const variant = ((offset + 2) % 3 + 3) % 3;
  const tileOrdinal = offset + 2;
  const side = (sign: number) => sign * (roadHalf + 1.2);
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

  makeMesh(shared.roadGeometry, shared.roadBed, "world-cobblestone-road", [0, -0.12, 0], true);
  root.add(createRoadPaving(shared.pavingGeometry, shared.road[variant], offset));
  for (const sign of [-1, 1]) {
    makeMesh(shared.shoulderGeometry, shared.shoulder[variant], "world-cobblestone-shoulder", [side(sign), -0.15, 0], true);
    makeMesh(shared.outerGroundGeometry, shared.ground, "world-road-verge", [sign * 19, -0.31, 0], true);
    makeMesh(shared.transitionGeometry, shared.transition, "world-road-dirt-transition", [sign * (roadHalf + 3.9), -0.105, 0], true);
    const curb = makeMesh(shared.curbGeometry, shared.curb, "world-road-stone-edge", [sign * (roadHalf + 0.08), 0.035, 0]);
    curb.castShadow = true;
    curb.userData.worldV2AuditExempt = true;

    const random = seededRandom((offset + 64) * 8191 + (sign + 2) * 113);
    const treeCount = shared.quality === "high" ? 3 : shared.quality === "balanced" ? 2 : 1;
    const trunks = new THREE.InstancedMesh(shared.trunkGeometry, shared.bark, treeCount);
    trunks.name = "world-road-tree-trunks";
    trunks.castShadow = true;
    const canopies = new THREE.InstancedMesh(shared.canopyGeometry, shared.foliage, treeCount * 3);
    canopies.name = "world-road-tree-canopies";
    canopies.castShadow = true;
    for (let tree = 0; tree < treeCount; tree += 1) {
      const x = sign * (roadHalf + 5.9 + random() * 5.6);
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

    const rockCount = shared.quality === "high" ? 5 : shared.quality === "balanced" ? 4 : 2;
    const grassCount = shared.quality === "high" ? 12 : shared.quality === "balanced" ? 8 : 4;
    const rocks = new THREE.InstancedMesh(shared.rockGeometry, shared.rock, rockCount);
    rocks.name = "world-roadside-rocks";
    const grass = new THREE.InstancedMesh(shared.grassGeometry, shared.grass, grassCount);
    grass.name = "world-roadside-grass";
    for (let index = 0; index < rockCount; index += 1) {
      const x = sign * (roadHalf + 5.25 + random() * 7.2);
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
    for (let index = 0; index < grassCount; index += 1) {
      const x = sign * (roadHalf + 5 + random() * 6.8);
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

    if (tileOrdinal % 5 === 2) {
      const fence = new THREE.InstancedMesh(shared.fenceGeometry, shared.bark, 5);
      fence.name = "world-road-broken-fence";
      const fenceSide = tileOrdinal % 2 === 0 ? -1 : 1;
      const fenceX = fenceSide * (roadHalf + 7.1);
      const fenceZ = (random() - 0.5) * WORLD_ROAD_TILE_LENGTH * 0.55;
      const pieces = [
        { position: [fenceX, 0.48, fenceZ - 1.15] as [number, number, number], scale: [0.13, 0.96, 0.13] as [number, number, number], tilt: 0 },
        { position: [fenceX, 0.36, fenceZ] as [number, number, number], scale: [0.13, 0.72, 0.13] as [number, number, number], tilt: 0.2 },
        { position: [fenceX, 0.48, fenceZ + 1.15] as [number, number, number], scale: [0.13, 0.96, 0.13] as [number, number, number], tilt: 0 },
        { position: [fenceX, 0.78, fenceZ - 0.58] as [number, number, number], scale: [0.13, 0.13, 0.82] as [number, number, number], tilt: -0.08 },
        { position: [fenceX, 0.64, fenceZ + 0.66] as [number, number, number], scale: [0.13, 0.13, 0.62] as [number, number, number], tilt: 0.14 },
      ];
      pieces.forEach((piece, index) => {
        setInstanceEuler(
          fence,
          index,
          new THREE.Vector3(...piece.position),
          new THREE.Vector3(...piece.scale),
          new THREE.Euler(0, 0, piece.tilt),
        );
      });
      fence.instanceMatrix.needsUpdate = true;
      fence.castShadow = true;
      root.add(fence);
    }

    if (tileOrdinal % 4 === 1) {
      const x = sign * (roadHalf + 9.2 + random() * 1.3);
      const z = (random() - 0.5) * WORLD_ROAD_TILE_LENGTH * 0.72;
      const deadTree = new THREE.InstancedMesh(shared.trunkGeometry, shared.bark, 1);
      const branches = new THREE.InstancedMesh(shared.branchGeometry, shared.bark, 4);
      deadTree.name = "world-ash-dead-tree-trunk";
      branches.name = "world-ash-dead-tree-branches";
      setInstance(deadTree, 0, new THREE.Vector3(x, 2.1, z), new THREE.Vector3(0.83, 1.55, 0.83), random() * Math.PI * 2);
      for (let branch = 0; branch < 4; branch += 1) {
        const branchSide = branch % 2 === 0 ? -1 : 1;
        setInstanceEuler(
          branches,
          branch,
          new THREE.Vector3(x + branchSide * (branch < 2 ? 0.42 : 0.2), 2.3 + Math.floor(branch / 2) * 0.56, z),
          new THREE.Vector3(0.8, 1, 0.8),
          new THREE.Euler(0, random() * Math.PI * 2, branchSide * (0.58 + random() * 0.34)),
        );
      }
      deadTree.instanceMatrix.needsUpdate = true;
      branches.instanceMatrix.needsUpdate = true;
      deadTree.castShadow = true;
      branches.castShadow = true;
      root.add(deadTree, branches);
    }

    if (tileOrdinal % 3 === 0) {
      const poles = new THREE.InstancedMesh(shared.lanternPoleGeometry, shared.bark, 1);
      const lanterns = new THREE.InstancedMesh(shared.lanternGeometry, shared.ember, 1);
      const x = sign * (roadHalf + 5.85);
      const z = (random() - 0.5) * WORLD_ROAD_TILE_LENGTH * 0.58;
      setInstanceEuler(
        poles,
        0,
        new THREE.Vector3(x, 1.2, z),
        new THREE.Vector3(1, 1, 1),
        new THREE.Euler(0, 0, sign * -0.08),
      );
      setInstance(lanterns, 0, new THREE.Vector3(x - sign * 0.16, 2.45, z), new THREE.Vector3(1, 1, 1), 0);
      poles.instanceMatrix.needsUpdate = true;
      lanterns.instanceMatrix.needsUpdate = true;
      poles.castShadow = true;
      root.add(poles, lanterns);
    }

    if (tileOrdinal % 6 === 2) {
      const fire = new THREE.InstancedMesh(shared.emberGeometry, shared.ember, 1);
      fire.name = "world-roadside-embers";
      setInstance(
        fire,
        0,
        new THREE.Vector3(sign * (roadHalf + 5.55), 0.28, (random() - 0.5) * 7),
        new THREE.Vector3(0.54, 0.74, 0.54),
        0,
      );
      fire.instanceMatrix.needsUpdate = true;
      root.add(fire);
    }
  }

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
    const ruinArch = new THREE.Mesh(shared.ruinArchGeometry, shared.stone);
    ruinArch.name = "world-roadside-ruined-arch";
    ruinArch.position.set((tileOrdinal % 2 === 0 ? -1 : 1) * (roadHalf + 9.4), -0.02, 0);
    ruinArch.rotation.y = tileOrdinal % 2 === 0 ? 0.12 : Math.PI - 0.12;
    ruinArch.castShadow = true;
    ruinArch.receiveShadow = true;
    root.add(pillars, capitals, ruinArch);
  }

  if (tileOrdinal % 13 === 5) {
    const towerRandom = seededRandom((offset + 64) * 7_919 + tileOrdinal * 173);
    const sideSign = tileOrdinal % 2 === 0 ? -1 : 1;
    const x = sideSign * (roadHalf + 11.4);
    const z = (towerRandom() - 0.5) * WORLD_ROAD_TILE_LENGTH * 0.64;
    const tower = new THREE.InstancedMesh(shared.ruinColumnGeometry, shared.stone, 1);
    const towerCap = new THREE.InstancedMesh(shared.ruinCapGeometry, shared.stone, 1);
    tower.name = "world-ash-broken-watchtower";
    towerCap.name = "world-ash-watchtower-cap";
    setInstanceEuler(
      tower,
      0,
      new THREE.Vector3(x, 2.76, z),
      new THREE.Vector3(2.6, 1.8, 2.6),
      new THREE.Euler(0, towerRandom() * Math.PI * 2, sideSign * 0.055),
    );
    setInstance(
      towerCap,
      0,
      new THREE.Vector3(x, 5.62, z),
      new THREE.Vector3(2.8, 1, 2.8),
      towerRandom() * Math.PI,
    );
    tower.instanceMatrix.needsUpdate = true;
    towerCap.instanceMatrix.needsUpdate = true;
    tower.castShadow = true;
    towerCap.castShadow = true;
    root.add(tower, towerCap);
  }

  if (tileOrdinal % 11 === 6) {
    const cartRoot = new THREE.Group();
    cartRoot.name = "world-roadside-broken-cart";
    cartRoot.position.set((tileOrdinal % 2 === 0 ? -1 : 1) * (roadHalf + 7.4), 0.33, 0);
    cartRoot.rotation.y = tileOrdinal % 2 === 0 ? 0.26 : Math.PI - 0.26;
    const boards = new THREE.InstancedMesh(shared.cartBoardGeometry, shared.bark, 5);
    const wheels = new THREE.InstancedMesh(shared.cartWheelGeometry, shared.stone, 2);
    for (let board = 0; board < 5; board += 1) {
      setInstanceEuler(
        boards,
        board,
        new THREE.Vector3((board - 2) * 0.18, board % 2 === 0 ? 0.45 : 0.12, (board % 3 - 1) * 0.3),
        new THREE.Vector3(1, 1, 1),
        new THREE.Euler(0, (board - 2) * 0.11, (board % 2 === 0 ? 1 : -1) * 0.22),
      );
    }
    for (let wheel = 0; wheel < 2; wheel += 1) {
      setInstance(wheels, wheel, new THREE.Vector3(wheel === 0 ? -0.52 : 0.52, 0.12, 0), new THREE.Vector3(0.74, 0.74, 0.74), 0);
    }
    boards.instanceMatrix.needsUpdate = true;
    wheels.instanceMatrix.needsUpdate = true;
    cartRoot.add(boards, wheels);
    root.add(cartRoot);
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

export function createWorldRoadEnvironment(showProps = true, quality: RoadQuality = "high"): WorldRoadEnvironment {
  const root = new THREE.Group();
  root.name = "rebuilt-3d-road-environment";
  const surfaceTextures = createWorldRoadSurfaceTextures();
  const createRoadMaterial = (variant: number, color: string, roughness: number) => new THREE.MeshStandardMaterial({
    color,
    map: surfaceTextures.roadVariants[variant].color,
    normalMap: surfaceTextures.roadVariants[variant].normal,
    roughnessMap: surfaceTextures.roadVariants[variant].roughness,
    normalScale: new THREE.Vector2(0.32, 0.32),
    roughness,
    flatShading: false,
  });
  const materials = {
    road: [0, 1, 2].map((variant) => createRoadMaterial(variant, "#d2d3ce", 0.96)),
    roadBed: new THREE.MeshStandardMaterial({ color: "#464a49", roughness: 0.99 }),
    ground: new THREE.MeshStandardMaterial({
      color: "#a69b8c",
      map: surfaceTextures.ground.color,
      normalMap: surfaceTextures.ground.normal,
      roughnessMap: surfaceTextures.ground.roughness,
      normalScale: new THREE.Vector2(0.28, 0.28),
      roughness: 1,
      flatShading: false,
    }),
    shoulder: [0, 1, 2].map((variant) => createRoadMaterial(variant, "#a99b88", 0.98)),
    curb: new THREE.MeshStandardMaterial({
      color: "#a49a8c",
      map: surfaceTextures.roadVariants[1].color,
      normalMap: surfaceTextures.roadVariants[1].normal,
      roughnessMap: surfaceTextures.roadVariants[1].roughness,
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughness: 0.96,
      flatShading: false,
    }),
    stone: new THREE.MeshStandardMaterial({
      color: "#a49a8c",
      map: surfaceTextures.roadVariants[2].color,
      normalMap: surfaceTextures.roadVariants[2].normal,
      roughnessMap: surfaceTextures.roadVariants[2].roughness,
      normalScale: new THREE.Vector2(0.34, 0.34),
      roughness: 0.98,
      flatShading: false,
    }),
    bark: new THREE.MeshStandardMaterial({ color: "#37302d", roughness: 1, flatShading: true }),
    foliage: new THREE.MeshStandardMaterial({ color: "#595247", roughness: 0.98, flatShading: true }),
    rock: new THREE.MeshStandardMaterial({ color: "#746e64", roughness: 0.98, flatShading: true }),
    grass: new THREE.MeshStandardMaterial({ color: "#8a795b", roughness: 1, flatShading: true }),
    ember: new THREE.MeshStandardMaterial({
      color: "#ff9a56",
      emissive: "#ff552b",
      emissiveIntensity: 1.45,
      roughness: 0.42,
      flatShading: true,
    }),
    transition: new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: surfaceTextures.ground.color,
      normalMap: surfaceTextures.ground.normal,
      roughnessMap: surfaceTextures.ground.roughness,
      vertexColors: true,
      normalScale: new THREE.Vector2(0.22, 0.22),
      roughness: 1,
    }),
    farMountain: new THREE.MeshStandardMaterial({ color: "#b4aaa0", roughness: 1, flatShading: true }),
    midMountain: new THREE.MeshStandardMaterial({ color: "#89877f", roughness: 1, flatShading: true }),
    nearMountain: new THREE.MeshStandardMaterial({ color: "#676a67", roughness: 1, flatShading: true }),
  };
  const geometries = {
    road: new THREE.BoxGeometry(WORLD_ROAD_WIDTH, 0.14, WORLD_ROAD_TILE_LENGTH),
    paving: BEVELED_STONE_BLOCK_GEOMETRY,
    shoulder: new THREE.BoxGeometry(2.2, 0.18, WORLD_ROAD_TILE_LENGTH),
    outerGround: new THREE.BoxGeometry(21, 0.25, WORLD_ROAD_TILE_LENGTH),
    curb: new THREE.BoxGeometry(0.16, 0.26, WORLD_ROAD_TILE_LENGTH),
    transition: createEdgeBlendGeometry(),
    trunk: new THREE.CylinderGeometry(0.12, 0.24, 2.8, 6),
    canopy: new THREE.ConeGeometry(1.08, 2.8, 6, 1),
    rock: new THREE.IcosahedronGeometry(0.55, 1),
    grass: new THREE.ConeGeometry(0.19, 0.75, 3, 1),
    ruinColumn: new THREE.CylinderGeometry(0.38, 0.5, 3.1, 6, 1),
    ruinCap: new THREE.BoxGeometry(0.94, 0.25, 0.94),
    ruinArch: createRuinArchGeometry(),
    branch: new THREE.CylinderGeometry(0.055, 0.095, 1.6, 5),
    lanternPole: new THREE.CylinderGeometry(0.07, 0.12, 2.4, 5),
    lantern: new THREE.IcosahedronGeometry(0.2, 0),
    ember: new THREE.ConeGeometry(0.18, 0.46, 5, 1),
    cartBoard: new THREE.BoxGeometry(0.14, 0.9, 0.09),
    cartWheel: new THREE.TorusGeometry(0.31, 0.055, 4, 12),
    fence: new THREE.BoxGeometry(1, 1, 1),
  };
  const resourceMaterials = Object.values(materials).flatMap((material) =>
    Array.isArray(material) ? material : [material],
  );
  const resourceGeometries = Object.values(geometries)
    .filter((geometry) => geometry !== BEVELED_STONE_BLOCK_GEOMETRY);
  const segments: Segment[] = [];
  for (let offset = WORLD_ROAD_TILE_OFFSETS.first; offset <= WORLD_ROAD_TILE_OFFSETS.last; offset += 1) {
    const segment = new THREE.Group();
    segment.name = `world-road-segment-${offset}`;
    segment.userData.worldRoadTileOffset = offset;
    if (showProps) {
      segment.add(createTile(offset, {
        road: materials.road,
         roadBed: materials.roadBed,
        ground: materials.ground,
        shoulder: materials.shoulder,
        curb: materials.curb,
        stone: materials.stone,
        bark: materials.bark,
        foliage: materials.foliage,
        rock: materials.rock,
        grass: materials.grass,
        ember: materials.ember,
        transition: materials.transition,
        roadGeometry: geometries.road,
         pavingGeometry: geometries.paving,
        shoulderGeometry: geometries.shoulder,
        outerGroundGeometry: geometries.outerGround,
        curbGeometry: geometries.curb,
        transitionGeometry: geometries.transition,
        trunkGeometry: geometries.trunk,
        canopyGeometry: geometries.canopy,
        rockGeometry: geometries.rock,
        grassGeometry: geometries.grass,
        ruinColumnGeometry: geometries.ruinColumn,
        ruinCapGeometry: geometries.ruinCap,
        ruinArchGeometry: geometries.ruinArch,
        branchGeometry: geometries.branch,
        lanternPoleGeometry: geometries.lanternPole,
        lanternGeometry: geometries.lantern,
        emberGeometry: geometries.ember,
        cartBoardGeometry: geometries.cartBoard,
        cartWheelGeometry: geometries.cartWheel,
        fenceGeometry: geometries.fence,
        quality,
      }));
    } else {
      const road = new THREE.Mesh(geometries.road, materials.roadBed);
      road.name = "world-road-surface";
      road.userData.worldV2RoadGround = true;
      road.position.y = -0.12;
      segment.add(road, createRoadPaving(geometries.paving, materials.road[0], offset));
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
    materials.road.forEach((material) => {
      material.color.copy(colorForBiome(distance, "road"))
        .lerp(new THREE.Color("#c5cbca"), 0.4)
        .multiplyScalar(1.08);
    });
    materials.roadBed.color.copy(colorForBiome(distance, "road"))
      .multiplyScalar(0.28);
    materials.ground.color.copy(colorForBiome(distance, "ground")).multiplyScalar(0.79);
    materials.shoulder.forEach((material) => {
      material.color.copy(colorForBiome(distance, "ground")).multiplyScalar(0.98);
    });
    materials.curb.color.copy(colorForBiome(distance, "stone")).multiplyScalar(0.88);
    materials.stone.color.copy(colorForBiome(distance, "stone"));
    materials.bark.color.copy(colorForBiome(distance, "bark"));
    materials.foliage.color.copy(colorForBiome(distance, "foliage"));
    materials.rock.color.copy(colorForBiome(distance, "stone")).multiplyScalar(0.93);
    materials.grass.color.copy(colorForBiome(distance, "foliage")).lerp(colorForBiome(distance, "ground"), 0.34);
    materials.farMountain.color.copy(colorForBiome(distance, "far"));
    materials.midMountain.color.copy(colorForBiome(distance, "mid"));
    materials.nearMountain.color.copy(colorForBiome(distance, "near"));
    materials.road.forEach((material) => {
      material.roughness = weather === "storm" ? 0.64 : weather === "rain" ? 0.72 : 0.94;
      material.metalness = weather === "storm" ? 0.035 : weather === "rain" ? 0.018 : 0;
    });
    materials.shoulder.forEach((material) => {
      material.roughness = weather === "storm" ? 0.68 : weather === "rain" ? 0.76 : 0.98;
      material.metalness = weather === "storm" ? 0.025 : weather === "rain" ? 0.012 : 0;
    });
    materials.ember.emissiveIntensity = ashWeather ? 1.85 : 1.45;
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
