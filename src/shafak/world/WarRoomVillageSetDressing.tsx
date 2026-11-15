import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { WarRoomBuilding } from "../game/war-room-data";

const ROAD_STONE_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const ROAD_STONE_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  roughness: 0.96,
  metalness: 0,
  flatShading: true,
});
const CURB_STONE_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  roughness: 0.98,
  metalness: 0,
  flatShading: true,
});

const PAVER_STEP = 1.16;
const ROAD_HALF_WIDTH = 2.44;
const LONG_STREET_LIMIT = 31.4;
const INNER_STREET_LIMIT = 16.25;
const STREET_CENTERS = [-12, 0, 12] as const;
const PAVER_COLORS = ["#897e6d", "#938673", "#807769", "#9a8c77", "#786f64"];

type StoneInstance = {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
};

function stableNoise(x: number, z: number, salt: number) {
  const value = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453123;
  return value - Math.floor(value);
}

function isRoadCell(x: number, z: number) {
  const horizontalOuter = [-12, 12].some((center) => (
    Math.abs(z - center) <= ROAD_HALF_WIDTH && Math.abs(x) <= LONG_STREET_LIMIT
  ));
  const verticalOuter = [-12, 12].some((center) => (
    Math.abs(x - center) <= ROAD_HALF_WIDTH && Math.abs(z) <= LONG_STREET_LIMIT
  ));
  const horizontalCourt = Math.abs(z) <= ROAD_HALF_WIDTH
    && Math.abs(x) <= INNER_STREET_LIMIT;
  const verticalCourt = Math.abs(x) <= ROAD_HALF_WIDTH
    && Math.abs(z) <= INNER_STREET_LIMIT;
  const mainGatePath = Math.abs(x) <= ROAD_HALF_WIDTH
    && Math.abs(z) <= LONG_STREET_LIMIT;

  return horizontalOuter || verticalOuter || horizontalCourt || verticalCourt || mainGatePath;
}

function createPavers(): StoneInstance[] {
  const pavers: StoneInstance[] = [];
  for (let ix = -27; ix <= 27; ix += 1) {
    for (let iz = -27; iz <= 27; iz += 1) {
      const x = ix * PAVER_STEP;
      const z = iz * PAVER_STEP;
      if (!isRoadCell(x, z)) continue;

      const shape = stableNoise(ix, iz, 1);
      const shade = stableNoise(ix, iz, 2);
      pavers.push({
        x,
        z,
        width: 1.085 + shape * 0.045,
        depth: 1.085 + stableNoise(ix, iz, 3) * 0.045,
        height: 0.065,
        color: PAVER_COLORS[Math.floor(shade * PAVER_COLORS.length)],
      });
    }
  }
  return pavers;
}

function createCurbStones(): StoneInstance[] {
  const stones: StoneInstance[] = [];
  const addStone = (x: number, z: number, horizontal: boolean) => {
    stones.push({
      x,
      z,
      width: horizontal ? 1.45 : 0.28,
      depth: horizontal ? 0.28 : 1.45,
      height: 0.055,
      color: "#6f695f",
    });
  };

  // Low, broken curb runs frame the side streets and leave each junction open.
  for (const centerZ of [-12, 12]) {
    for (let x = -29.5; x <= 29.5; x += 2.9) {
      if (STREET_CENTERS.some((junction) => Math.abs(x - junction) < 3.2)) continue;
      for (const side of [-1, 1]) addStone(x, centerZ + side * 3.04, true);
    }
  }
  for (const centerX of [-12, 12]) {
    for (let z = -29.5; z <= 29.5; z += 2.9) {
      if (STREET_CENTERS.some((junction) => Math.abs(z - junction) < 3.2)) continue;
      for (const side of [-1, 1]) addStone(centerX + side * 3.04, z, false);
    }
  }
  for (let z = -29.5; z <= 29.5; z += 2.9) {
    if (STREET_CENTERS.some((junction) => Math.abs(z - junction) < 3.2)) continue;
    for (const side of [-1, 1]) addStone(side * 3.04, z, false);
  }

  return stones;
}

const ROAD_PAVERS = createPavers();
const ROAD_CURBS = createCurbStones();

function VillageRoadSurface() {
  const paversRef = useRef<THREE.InstancedMesh>(null);
  const curbsRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const pavers = paversRef.current;
    if (!pavers) return;

    const transform = new THREE.Object3D();
    const color = new THREE.Color();
    ROAD_PAVERS.forEach((stone, index) => {
      transform.position.set(stone.x, -0.066, stone.z);
      transform.rotation.set(0, 0, 0);
      transform.scale.set(stone.width, stone.height, stone.depth);
      transform.updateMatrix();
      pavers.setMatrixAt(index, transform.matrix);
      pavers.setColorAt(index, color.set(stone.color));
    });
    pavers.instanceMatrix.needsUpdate = true;
    if (pavers.instanceColor) pavers.instanceColor.needsUpdate = true;

    const curbs = curbsRef.current;
    if (!curbs) return;
    ROAD_CURBS.forEach((stone, index) => {
      transform.position.set(stone.x, -0.067, stone.z);
      transform.scale.set(stone.width, stone.height, stone.depth);
      transform.updateMatrix();
      curbs.setMatrixAt(index, transform.matrix);
      curbs.setColorAt(index, color.set(stone.color));
    });
    curbs.instanceMatrix.needsUpdate = true;
    if (curbs.instanceColor) curbs.instanceColor.needsUpdate = true;
  }, []);

  return (
    <>
      <instancedMesh
        ref={paversRef}
        args={[ROAD_STONE_GEOMETRY, ROAD_STONE_MATERIAL, ROAD_PAVERS.length]}
        receiveShadow
        name="war-room-village-stone-streets"
      />
      <instancedMesh
        ref={curbsRef}
        args={[ROAD_STONE_GEOMETRY, CURB_STONE_MATERIAL, ROAD_CURBS.length]}
        name="war-room-village-low-curbs"
      />
    </>
  );
}

/**
 * Adds a compact, collision-free street grid in the canonical 72-by-72 room.
 * A parent rotation keeps the paving aligned with the room's quarter-turn.
 */
export function WarRoomVillageSetDressing({ quarterTurns }: { quarterTurns: number }) {
  const turns = ((Math.trunc(quarterTurns) % 4) + 4) % 4;
  return (
    <group
      name="war-room-village-set-dressing"
      rotation={[0, turns * Math.PI / 2, 0]}
      userData={{ warRoomSetDressing: true, collisionGeometry: false }}
    >
      <VillageRoadSurface />
    </group>
  );
}

const SKY_VERTEX_SHADER = `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT_SHADER = `
  precision highp float;
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uCloud;
  varying vec3 vDirection;

  void main() {
    vec3 direction = normalize(vDirection);
    if (direction.y < -0.012) discard;

    float height = smoothstep(-0.025, 0.86, direction.y);
    vec3 sky = mix(uHorizon, uZenith, height);
    float haze = exp(-abs(direction.y - 0.095) * 8.0);
    sky = mix(sky, uHorizon, haze * 0.12);

    vec2 cloudUv = direction.xz / max(0.22, direction.y + 0.28);
    cloudUv *= 2.05;
    float broadCloud = sin(cloudUv.x * 1.15 + sin(cloudUv.y * 0.82 + 0.7) * 0.72)
      * cos(cloudUv.y * 1.34 - cloudUv.x * 0.18);
    float brokenEdge = sin(cloudUv.x * 2.3 - cloudUv.y * 1.55)
      + cos(cloudUv.y * 2.05 + cloudUv.x * 0.64);
    float cloudField = 0.5 + broadCloud * 0.24 + brokenEdge * 0.055;
    float cloudShape = smoothstep(0.61, 0.81, cloudField);
    float cloudBand = smoothstep(0.015, 0.13, direction.y)
      * (1.0 - smoothstep(0.53, 0.84, direction.y));
    sky = mix(sky, uCloud, cloudShape * cloudBand * 0.16);

    gl_FragColor = vec4(sky, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * A single inside-facing dome gives the existing room sky color a soft
 * horizon-to-zenith gradient and sparse, broad cloud wisps. No frame updates.
 */
export function WarRoomSky({ skyColor }: { skyColor: string }) {
  const uniforms = useMemo(() => ({
    uHorizon: { value: new THREE.Color() },
    uZenith: { value: new THREE.Color() },
    uCloud: { value: new THREE.Color() },
  }), []);
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SKY_VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
  }), [uniforms]);

  useLayoutEffect(() => {
    const horizon = new THREE.Color(skyColor);
    const luminance = horizon.r * 0.2126 + horizon.g * 0.7152 + horizon.b * 0.0722;
    const zenithTarget = new THREE.Color(luminance < 0.16 ? "#172033" : "#536d83");
    uniforms.uHorizon.value.copy(horizon);
    uniforms.uZenith.value.copy(horizon).lerp(zenithTarget, 0.56);
    uniforms.uCloud.value.copy(horizon).lerp(new THREE.Color("#eee5d5"), 0.62);
  }, [skyColor, uniforms]);

  useLayoutEffect(() => () => material.dispose(), [material]);

  return (
    <mesh
      name="war-room-procedural-open-sky"
      renderOrder={-1000}
      frustumCulled={false}
      userData={{ warRoomSetDressing: true }}
    >
      <sphereGeometry args={[80, 24, 12]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

const PLANTER_WOOD = new THREE.MeshStandardMaterial({
  color: "#70533a",
  roughness: 0.9,
});
const PLANTER_SOIL = new THREE.MeshStandardMaterial({
  color: "#49382b",
  roughness: 1,
});
const WINDOW_HERBS = new THREE.MeshStandardMaterial({
  color: "#68744e",
  roughness: 0.94,
  flatShading: true,
});
const HERB_BLOOM = new THREE.MeshStandardMaterial({
  color: "#a77450",
  roughness: 0.88,
});

function WindowPlanter({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]} userData={{ warRoomSetDressing: true, collisionGeometry: false }}>
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[1.12, 0.19, 0.28]} />
        <primitive object={PLANTER_WOOD} attach="material" />
      </mesh>
      <mesh position={[0, 0.102, 0.015]}>
        <boxGeometry args={[0.98, 0.025, 0.2]} />
        <primitive object={PLANTER_SOIL} attach="material" />
      </mesh>
      {[-0.34, 0, 0.34].map((leafX, index) => (
        <group key={`herb-${index}`} position={[leafX, 0.19, -0.035]}>
          <mesh position={[0, 0.12, 0]} rotation={[0.12, 0, (index - 1) * 0.12]}>
            <coneGeometry args={[0.105, 0.28, 5]} />
            <primitive object={WINDOW_HERBS} attach="material" />
          </mesh>
          {index !== 1 && (
            <mesh position={[index === 0 ? 0.13 : -0.13, 0.2, -0.025]}>
              <sphereGeometry args={[0.045, 6, 5]} />
              <primitive object={HERB_BLOOM} attach="material" />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/** Small exterior herb boxes make each shell read as a lived-in home. */
export function WarRoomHomeAccent({ building }: { building: WarRoomBuilding }) {
  const frontZ = -building.depth / 2;
  const windowY = building.storyHeight * 0.57;
  const planterY = windowY - 0.56;
  const planterZ = frontZ - 0.23;

  return (
    <group
      position={[building.x, 0, building.z]}
      rotation={[0, building.rotationY, 0]}
      name={`war-room-home-accent:${building.id}`}
    >
      {[-1, 1].map((side) => (
        <WindowPlanter
          key={`window-planter-${side}`}
          x={side * building.width * 0.29}
          y={planterY}
          z={planterZ}
        />
      ))}
    </group>
  );
}
