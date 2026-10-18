import * as THREE from "three";
import { WORLD_V2_CONFIG } from "./world-v2-config";

export const WORLD_V2_CAMERA_COLLISION_LAYER = 1;
const TILE = WORLD_V2_CONFIG.road.tileLength;
const ROAD_COLOR = "#746d66";

function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  position: [number, number, number],
  options: { cameraCollision?: boolean; roadGround?: boolean; castShadow?: boolean; receiveShadow?: boolean } = {},
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = options.castShadow ?? false;
  mesh.receiveShadow = options.receiveShadow ?? false;
  if (options.cameraCollision) mesh.layers.enable(WORLD_V2_CAMERA_COLLISION_LAYER);
  if (options.roadGround) mesh.userData.worldV2RoadGround = true;
  parent.add(mesh);
  return mesh;
}

function addRoadsideTower(parent: THREE.Object3D, x: number, side: number, materials: Record<string, THREE.Material>) {
  const tower = new THREE.Group();
  tower.name = `roadside-tower-${side}`;
  tower.position.x = x;
  parent.add(tower);
  const bodyHeight = WORLD_V2_CONFIG.tower.targetHeight * 0.82;
  addMesh(
    tower,
    new THREE.BoxGeometry(0.88, bodyHeight, 0.88),
    materials.stone,
    "tower-stone",
    [0, bodyHeight / 2, 0],
    { cameraCollision: true },
  );
  addMesh(
    tower,
    new THREE.ConeGeometry(0.82, WORLD_V2_CONFIG.tower.targetHeight - bodyHeight, 4),
    materials.roof,
    "tower-roof",
    [0, bodyHeight + (WORLD_V2_CONFIG.tower.targetHeight - bodyHeight) / 2, 0],
    { cameraCollision: true },
  );
}

function addLantern(parent: THREE.Object3D, x: number, side: number, materials: Record<string, THREE.Material>) {
  const group = new THREE.Group();
  group.name = `roadside-lantern-${side}`;
  group.position.x = x;
  parent.add(group);
  const poleHeight = WORLD_V2_CONFIG.lantern.targetHeight * 0.78;
  addMesh(group, new THREE.CylinderGeometry(0.045, 0.075, poleHeight, 6), materials.iron, "lantern-pole", [0, poleHeight / 2, 0], { cameraCollision: true });
  addMesh(group, new THREE.BoxGeometry(0.34, 0.42, 0.34), materials.lantern, "lantern-housing", [0, poleHeight + 0.12, 0], { cameraCollision: true });
  addMesh(group, new THREE.ConeGeometry(0.28, 0.22, 4), materials.iron, "lantern-cap", [0, poleHeight + 0.44, 0], { cameraCollision: true });
}

function addPine(parent: THREE.Object3D, x: number, side: number, variant: number, materials: Record<string, THREE.Material>) {
  const group = new THREE.Group();
  group.name = `roadside-pine-${side}-${variant}`;
  group.position.x = x;
  parent.add(group);
  const height = 3.2 + (variant % 3) * 0.55;
  addMesh(group, new THREE.CylinderGeometry(0.12, 0.2, height * 0.32, 5), materials.wood, "pine-trunk", [0, height * 0.16, 0], { cameraCollision: true });
  for (let tier = 0; tier < 3; tier += 1) {
    const tierHeight = height * 0.48;
    const radius = 1 - tier * 0.2;
    addMesh(
      group,
      new THREE.ConeGeometry(radius, tierHeight, 5),
      tier === 1 ? materials.pineLight : materials.pine,
      "pine-crown",
      [0, height * 0.32 + tier * tierHeight * 0.5, 0],
      { cameraCollision: true },
    );
  }
}

export type WorldV2Environment = {
  root: THREE.Group;
  segments: THREE.Group[];
  dispose: () => void;
};

/**
 * Builds a short, recycled ring of 12m world pieces. No environment mesh is
 * longer than one tile; the road itself is the only mesh exempted by the audit.
 */
export function createWorldV2Environment(showProps = true): WorldV2Environment {
  const root = new THREE.Group();
  root.name = "world-v2-environment";
  const roadMaterial = new THREE.MeshStandardMaterial({ color: ROAD_COLOR, roughness: 0.96, flatShading: true });
  const terrainMaterial = new THREE.MeshStandardMaterial({ color: "#6f7067", roughness: 1, flatShading: true });
  const railMaterial = new THREE.MeshStandardMaterial({ color: "#4c4945", roughness: 0.92, flatShading: true });
  const postMaterial = new THREE.MeshStandardMaterial({ color: "#5c554e", roughness: 0.96, flatShading: true });
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: "#57524f", roughness: 0.95, flatShading: true });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: "#403d3c", roughness: 1, flatShading: true });
  const ironMaterial = new THREE.MeshStandardMaterial({ color: "#35393b", metalness: 0.48, roughness: 0.56, flatShading: true });
  const lanternMaterial = new THREE.MeshStandardMaterial({
    color: "#e8aa62",
    emissive: "#bd6c31",
    emissiveIntensity: 0.7,
    roughness: 0.48,
    flatShading: true,
  });
  const woodMaterial = new THREE.MeshStandardMaterial({ color: "#493c31", roughness: 1, flatShading: true });
  const pineMaterial = new THREE.MeshStandardMaterial({ color: "#384a3b", roughness: 1, flatShading: true });
  const pineLightMaterial = new THREE.MeshStandardMaterial({ color: "#526148", roughness: 1, flatShading: true });
  const materials = {
    stone: stoneMaterial,
    roof: roofMaterial,
    iron: ironMaterial,
    lantern: lanternMaterial,
    wood: woodMaterial,
    pine: pineMaterial,
    pineLight: pineLightMaterial,
  };
  const segments: THREE.Group[] = [];
  const roadGeometry = new THREE.BoxGeometry(WORLD_V2_CONFIG.road.width, 0.18, TILE);
  const terrainGeometry = new THREE.BoxGeometry(4.2, 0.12, TILE);
  const railGeometry = new THREE.BoxGeometry(0.14, 0.24, TILE);
  const postGeometry = new THREE.BoxGeometry(0.16, 0.66, 0.16);

  for (let offset = -2; offset <= 10; offset += 1) {
    const segment = new THREE.Group();
    segment.name = `world-v2-tile-${offset}`;
    segment.userData.worldV2TileOffset = offset;
    segments.push(segment);
    root.add(segment);

    addMesh(segment, roadGeometry, roadMaterial, "road-ground", [0, -0.09, 0], { roadGround: true, receiveShadow: true });
    for (const side of [-1, 1] as const) {
      const x = side * (WORLD_V2_CONFIG.road.width / 2 + 2.1);
      addMesh(segment, terrainGeometry, terrainMaterial, "roadside-ground", [x, -0.2, 0], { receiveShadow: true });
      const railX = side * (WORLD_V2_CONFIG.road.width / 2 + 0.08);
      addMesh(segment, railGeometry, railMaterial, "roadside-rail", [railX, 0.36, 0], { cameraCollision: true });
      for (const postZ of [-5.2, 0, 5.2]) {
        addMesh(segment, postGeometry, postMaterial, "rail-post", [railX, 0.34, postZ], { cameraCollision: true });
      }

      if (showProps) {
        const tileOrdinal = offset + 2;
        if (tileOrdinal % 5 === 2) {
          addRoadsideTower(segment, side * 7.2, side, materials);
        } else if (tileOrdinal % 2 === 0) {
          addLantern(segment, side * 5.05, side, materials);
        } else {
          addPine(segment, side * (6.2 + (tileOrdinal % 3) * 0.45), side, tileOrdinal, materials);
        }
      }
    }
  }

  return {
    root,
    segments,
    dispose: () => {
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        // Shared geometries/materials are disposed once by the renderer owners.
      });
      [
        roadGeometry,
        terrainGeometry,
        railGeometry,
        postGeometry,
      ].forEach((geometry) => geometry.dispose());
      [
        roadMaterial,
        terrainMaterial,
        railMaterial,
        postMaterial,
        stoneMaterial,
        roofMaterial,
        ironMaterial,
        lanternMaterial,
        woodMaterial,
        pineMaterial,
        pineLightMaterial,
      ].forEach((material) => material.dispose());
    },
  };
}
