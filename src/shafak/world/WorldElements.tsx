import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MutableRefObject } from "react";
import { WORLD_GATE_INTERVAL_METERS, type WorldMotion } from "./movement";
import { getTravelCameraSettings, WORLD_SKY_RADIUS } from "./camera-settings";
import { nextGateDistanceForCamera } from "./world-generation";
import type { WorldChunk, WorldObject } from "./world-generation";
import { getBiomeTransition, WORLD_BIOME_PALETTES, type WeatherMode } from "./world-biomes";
import type { WorldQuality } from "./World3D";
import WorldStaticBatches from "./WorldStaticBatches";

type MotionRef = MutableRefObject<WorldMotion>;
type LocalLightIds = MutableRefObject<Set<string>>;

const STONE_GEOMETRY = new THREE.DodecahedronGeometry(0.5, 0);
const STONE_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#665c56",
  roughness: 0.94,
  metalness: 0.06,
  flatShading: true,
});
const ROAD_TEXTURE_SIZE = 128;
function createRoadTextures() {
  const roadHeight = new Float32Array(ROAD_TEXTURE_SIZE * ROAD_TEXTURE_SIZE);
  const colorData = new Uint8Array(ROAD_TEXTURE_SIZE * ROAD_TEXTURE_SIZE * 4);
  const roughnessData = new Uint8Array(ROAD_TEXTURE_SIZE * ROAD_TEXTURE_SIZE * 4);
  const normalData = new Uint8Array(ROAD_TEXTURE_SIZE * ROAD_TEXTURE_SIZE * 4);
  const hash = (x: number, y: number) => {
    const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };

  for (let y = 0; y < ROAD_TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < ROAD_TEXTURE_SIZE; x += 1) {
      const u = x / ROAD_TEXTURE_SIZE;
      const v = y / ROAD_TEXTURE_SIZE;
      const noise = hash(x, y);
      const fissureA = Math.abs(u - (0.43 + Math.sin(v * 19) * 0.035 + Math.sin(v * 41) * 0.012));
      const fissureB = Math.abs(u - (0.58 + Math.sin(v * 13 + 1.7) * 0.05));
      const cracked = fissureA < 0.004 || fissureB < 0.003;
      const markerDistance = Math.min(Math.abs(u - 0.2), Math.abs(u - 0.8));
      const marker = markerDistance < 0.008 && Math.floor(v * 22) % 5 < 3;
      const index = y * ROAD_TEXTURE_SIZE + x;
      roadHeight[index] = (noise - 0.5) * 0.08 - (cracked ? 0.24 : 0) + (marker ? 0.015 : 0);

      const pixel = index * 4;
      const grit = Math.round((noise - 0.5) * 22);
      const base = cracked ? 115 + grit : marker ? 187 + grit : 218 + grit;
      colorData[pixel] = Math.max(0, Math.min(255, base + 5));
      colorData[pixel + 1] = Math.max(0, Math.min(255, base));
      colorData[pixel + 2] = Math.max(0, Math.min(255, base - 2));
      colorData[pixel + 3] = 255;
      roughnessData[pixel] = cracked ? 248 : marker ? 166 : 224;
      roughnessData[pixel + 1] = roughnessData[pixel];
      roughnessData[pixel + 2] = roughnessData[pixel];
      roughnessData[pixel + 3] = 255;
    }
  }

  for (let y = 0; y < ROAD_TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < ROAD_TEXTURE_SIZE; x += 1) {
      const left = roadHeight[y * ROAD_TEXTURE_SIZE + Math.max(0, x - 1)];
      const right = roadHeight[y * ROAD_TEXTURE_SIZE + Math.min(ROAD_TEXTURE_SIZE - 1, x + 1)];
      const above = roadHeight[Math.max(0, y - 1) * ROAD_TEXTURE_SIZE + x];
      const below = roadHeight[Math.min(ROAD_TEXTURE_SIZE - 1, y + 1) * ROAD_TEXTURE_SIZE + x];
      const nx = -(right - left) * 3.4;
      const ny = -(below - above) * 3.4;
      const length = Math.hypot(nx, ny, 1);
      const pixel = (y * ROAD_TEXTURE_SIZE + x) * 4;
      normalData[pixel] = Math.round((nx / length * 0.5 + 0.5) * 255);
      normalData[pixel + 1] = Math.round((ny / length * 0.5 + 0.5) * 255);
      normalData[pixel + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      normalData[pixel + 3] = 255;
    }
  }

  const create = (data: Uint8Array, colorSpace: THREE.ColorSpace = THREE.NoColorSpace) => {
    const texture = new THREE.DataTexture(data, ROAD_TEXTURE_SIZE, ROAD_TEXTURE_SIZE, THREE.RGBAFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 24);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 4;
    texture.colorSpace = colorSpace;
    texture.needsUpdate = true;
    return texture;
  };

  return {
    color: create(colorData, THREE.SRGBColorSpace),
    normal: create(normalData),
    roughness: create(roughnessData),
  };
}
const ROAD_TEXTURES = createRoadTextures();
const ROAD_TERRAIN_GEOMETRY = new THREE.PlaneGeometry(100, WORLD_GATE_INTERVAL_METERS * 6);
const ROAD_TERRAIN_MATERIAL = new THREE.MeshStandardMaterial({ color: "#5a504b", roughness: 1, metalness: 0 });
const ROAD_SURFACE_GEOMETRY = new THREE.PlaneGeometry(13.6, WORLD_GATE_INTERVAL_METERS * 6);
const ROAD_SURFACE_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#40383b",
  map: ROAD_TEXTURES.color,
  normalMap: ROAD_TEXTURES.normal,
  roughnessMap: ROAD_TEXTURES.roughness,
  roughness: 0.96,
  metalness: 0.03,
});
const ROAD_RAIL_GEOMETRY = new THREE.BoxGeometry(0.26, 0.08, WORLD_GATE_INTERVAL_METERS * 6);
const ROAD_RAIL_MATERIAL = new THREE.MeshStandardMaterial({ color: "#897164", roughness: 0.9 });
const ROAD_PALETTE_COLORS = Object.fromEntries(
  Object.entries(WORLD_BIOME_PALETTES).map(([biome, palette]) => [
    biome,
    {
      ground: new THREE.Color(palette.ground),
      road: new THREE.Color(palette.road),
      fog: new THREE.Color(palette.fog),
      sky: new THREE.Color(palette.skyTint),
      cloud: new THREE.Color(palette.cloud),
      particles: new THREE.Color(palette.particles),
    },
  ]),
) as Record<keyof typeof WORLD_BIOME_PALETTES, {
  ground: THREE.Color;
  road: THREE.Color;
  fog: THREE.Color;
  sky: THREE.Color;
  cloud: THREE.Color;
  particles: THREE.Color;
}>;
const HORIZON_FOG_GEOMETRY = new THREE.PlaneGeometry(150, 28);
const HORIZON_FOG_MATERIAL = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color("#69505a") },
    uOpacity: { value: 0.2 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;
    void main() {
      float heightFalloff = 1.0 - smoothstep(0.08, 0.95, vUv.y);
      float sideFade = smoothstep(0.0, 0.14, vUv.x) * (1.0 - smoothstep(0.86, 1.0, vUv.x));
      gl_FragColor = vec4(uColor, heightFalloff * sideFade * uOpacity);
    }
  `,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  toneMapped: false,
});

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function RoadSegment({
  chunk,
  quality,
}: {
  chunk: WorldChunk;
  quality: WorldQuality;
}) {
  const stonesRef = useRef<THREE.InstancedMesh>(null);
  const stones = useMemo(() => {
    const random = seededRandom(chunk.index * 0x45d9f3b);
    const count = quality === "high" ? 30 : quality === "balanced" ? 20 : 12;
    return Array.from({ length: count }, () => ({
      x: (random() < 0.5 ? -1 : 1) * (5.7 + random() * 1.45),
      z: (random() - 0.5) * 45,
      y: 0.012 + random() * 0.025,
      scale: [0.16 + random() * 0.42, 0.025 + random() * 0.04, 0.18 + random() * 0.48] as const,
      rotation: random() * Math.PI,
    }));
  }, [chunk.index, quality]);

  useLayoutEffect(() => {
    const mesh = stonesRef.current;
    if (!mesh) return;
    const transform = new THREE.Object3D();
    stones.forEach((stone, index) => {
      transform.position.set(stone.x, stone.y, stone.z);
      transform.rotation.set(0, stone.rotation, 0);
      transform.scale.set(...stone.scale);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [stones]);

  return (
    <>
      <instancedMesh
        ref={stonesRef}
        args={[STONE_GEOMETRY, STONE_MATERIAL, stones.length]}
        castShadow={false}
        receiveShadow={false}
        dispose={null}
      />
    </>
  );
}

function RoadSurface({ motionRef, quality, weather }: { motionRef: MotionRef; quality: WorldQuality; weather: WeatherMode }) {
  const rootRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!rootRef.current) return;
    const distance = motionRef.current.distance;
    const chunkStart = Math.floor(distance / WORLD_GATE_INTERVAL_METERS) * WORLD_GATE_INTERVAL_METERS;
    rootRef.current.position.z = motionRef.current.cameraX - (chunkStart + WORLD_GATE_INTERVAL_METERS * 2);
    const transition = getBiomeTransition(distance);
    const from = ROAD_PALETTE_COLORS[transition.from];
    const to = ROAD_PALETTE_COLORS[transition.to];
    ROAD_TERRAIN_MATERIAL.color.lerpColors(from.ground, to.ground, transition.mix);
    ROAD_SURFACE_MATERIAL.color.lerpColors(from.road, to.road, transition.mix);
    ROAD_SURFACE_MATERIAL.roughness = weather === "rain" ? 0.32 : 0.96;
    ROAD_SURFACE_MATERIAL.metalness = weather === "rain" ? 0.24 : 0.03;
  });
  return (
    <group ref={rootRef}>
      <mesh
        geometry={ROAD_TERRAIN_GEOMETRY}
        material={ROAD_TERRAIN_MATERIAL}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.2, 0]}
        receiveShadow={quality !== "low"}
        dispose={null}
      />
      <mesh
        geometry={ROAD_SURFACE_GEOMETRY}
        material={ROAD_SURFACE_MATERIAL}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.045, 0]}
        receiveShadow={quality !== "low"}
        dispose={null}
      />
      <mesh geometry={ROAD_RAIL_GEOMETRY} material={ROAD_RAIL_MATERIAL} position={[-6.75, 0.02, 0]} dispose={null} />
      <mesh geometry={ROAD_RAIL_GEOMETRY} material={ROAD_RAIL_MATERIAL} position={[6.75, 0.02, 0]} dispose={null} />
      <HorizonFogBank motionRef={motionRef} weather={weather} />
    </group>
  );
}

function HorizonFogBank({ motionRef, weather }: { motionRef: MotionRef; weather: WeatherMode }) {
  useFrame(() => {
    const transition = getBiomeTransition(motionRef.current.distance);
    const from = ROAD_PALETTE_COLORS[transition.from].fog;
    const to = ROAD_PALETTE_COLORS[transition.to].fog;
    HORIZON_FOG_MATERIAL.uniforms.uColor.value.lerpColors(from, to, transition.mix);
    HORIZON_FOG_MATERIAL.uniforms.uOpacity.value =
      weather === "fog" ? 0.56 : weather === "rain" ? 0.28 : weather === "ash" ? 0.2 : 0.08;
  });
  return (
    <mesh
      geometry={HORIZON_FOG_GEOMETRY}
      material={HORIZON_FOG_MATERIAL}
      position={[0, 12, -78]}
      renderOrder={1}
      frustumCulled={false}
      dispose={null}
    />
  );
}

function FlagCloth({ motionReduced }: { motionReduced: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lastUpdateRef = useRef(-1);
  const geometry = useMemo(() => {
    const columns = 4;
    const rows = 3;
    const positions = new Float32Array((columns + 1) * (rows + 1) * 3);
    const indices: number[] = [];
    for (let row = 0; row <= rows; row += 1) {
      for (let column = 0; column <= columns; column += 1) {
        const vertex = row * (columns + 1) + column;
        if (row < rows && column < columns) {
          const nextRow = vertex + columns + 1;
          indices.push(vertex, nextRow, vertex + 1, vertex + 1, nextRow, nextRow + 1);
        }
      }
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    result.setIndex(indices);
    return result;
  }, []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#8b3038",
    roughness: 0.88,
    side: THREE.DoubleSide,
    flatShading: true,
  }), []);
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((frame) => {
    if (lastUpdateRef.current >= 0 && frame.clock.elapsedTime - lastUpdateRef.current < 1 / 30) return;
    lastUpdateRef.current = frame.clock.elapsedTime;
    const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;
    const time = motionReduced ? 0 : frame.clock.elapsedTime;
    const columns = 4;
    const rows = 3;
    for (let row = 0; row <= rows; row += 1) {
      for (let column = 0; column <= columns; column += 1) {
        const vertex = row * (columns + 1) + column;
        const u = column / columns;
        const v = row / rows;
        const wave = motionReduced ? 0 : Math.sin(time * 2.2 - u * 4.2 + v * 0.7) * u * 0.16;
        attribute.setXYZ(vertex, u * 1.15, 0.98 - v * 0.76, wave);
      }
    }
    attribute.needsUpdate = true;
    geometry.computeVertexNormals();
  });
  return <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />;
}

function Flame({ color = "#f7a957" }: { color?: string }) {
  const flameRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const pulse = 0.88 + Math.sin(state.clock.elapsedTime * 13.4) * 0.1
      + Math.sin(state.clock.elapsedTime * 7.1 + 1.7) * 0.08;
    if (flameRef.current) flameRef.current.scale.y = pulse;
  });
  return (
    <group>
      <mesh ref={flameRef} position={[0, 0.16, 0]}>
        <coneGeometry args={[0.14, 0.44, 5]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.6} roughness={0.36} />
      </mesh>
      <mesh position={[0, 0.13, 0]} scale={[0.28, 0.38, 0.28]}>
        <sphereGeometry args={[1, 7, 5]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

function WorldProp({
  object,
  motionRef,
  motionReduced,
}: {
  object: WorldObject;
  motionRef: MotionRef;
  motionReduced: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const scale = object.scale;
  const swayRef = useRef<THREE.Group>(null);

  useFrame((frame) => {
    const cameraX = motionRef.current.cameraX;
    if (rootRef.current) {
      const distance = Math.abs(object.worldX - motionRef.current.distance);
      rootRef.current.position.z = -(object.worldX - cameraX);
      rootRef.current.visible = distance <= 190;
      if (distance > 190) return;
    }
    if (swayRef.current && object.kind === "flag") {
      swayRef.current.rotation.z = motionReduced ? 0 : Math.sin(frame.clock.elapsedTime * 1.5 + object.flickerSeed) * 0.035;
    }
  });

  const darkStone = object.flickerSeed % 3 === 0 ? "#51484a" : "#615655";
  return (
    <group
      ref={rootRef}
      position={[object.lane * 9.3, 0, 0]}
      rotation={[0, (object.flickerSeed % 628) / 100, 0]}
      scale={scale}
    >
      {object.kind === "tower" && (
        <group>
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.9, 1.15, 5, 7]} />
            <meshStandardMaterial color={darkStone} roughness={0.94} flatShading />
          </mesh>
          <mesh position={[0, 5.12, 0]}>
            <cylinderGeometry args={[1.15, 0.94, 0.38, 7]} />
            <meshStandardMaterial color="#73625d" roughness={0.92} flatShading />
          </mesh>
          {[-0.5, 0.5].map((x) => (
            <mesh key={x} position={[x, 3.2 + (x > 0 ? 0.65 : 0), -0.89]}>
              <boxGeometry args={[0.2, 0.52, 0.08]} />
              <meshStandardMaterial color="#e58b50" emissive="#a54a2e" emissiveIntensity={0.6} />
            </mesh>
          ))}
          <mesh position={[0, 0.54, -1.02]}>
            <boxGeometry args={[0.48, 1.1, 0.12]} />
            <meshStandardMaterial color="#19171a" />
          </mesh>
        </group>
      )}
      {object.kind === "ruin" && (
        <group>
          <mesh position={[-0.82, 1.3, 0]}>
            <boxGeometry args={[0.52, 2.6, 0.55]} />
            <meshStandardMaterial color={darkStone} roughness={0.96} flatShading />
          </mesh>
          <mesh position={[0.82, 1.78, 0]}>
            <boxGeometry args={[0.54, 3.55, 0.58]} />
            <meshStandardMaterial color="#73635e" roughness={0.96} flatShading />
          </mesh>
          <mesh position={[0, 3.45, 0]}>
            <boxGeometry args={[1.8, 0.52, 0.64]} />
            <meshStandardMaterial color="#655653" roughness={0.96} flatShading />
          </mesh>
        </group>
      )}
      {object.kind === "arch" && (
        <group>
          <mesh position={[-1.45, 1.75, 0]}>
            <cylinderGeometry args={[0.34, 0.46, 3.5, 6]} />
            <meshStandardMaterial color="#77655e" roughness={0.95} flatShading />
          </mesh>
          <mesh position={[1.45, 1.75, 0]}>
            <cylinderGeometry args={[0.34, 0.46, 3.5, 6]} />
            <meshStandardMaterial color="#77655e" roughness={0.95} flatShading />
          </mesh>
          <mesh position={[0, 3.35, 0]}>
            <torusGeometry args={[1.45, 0.27, 5, 10, Math.PI]} />
            <meshStandardMaterial color="#817069" roughness={0.92} flatShading />
          </mesh>
        </group>
      )}
      {object.kind === "tree" && (
        <group>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.17, 0.31, 2.4, 6]} />
            <meshStandardMaterial color="#332b2b" roughness={1} flatShading />
          </mesh>
          <mesh position={[-0.5, 2.2, 0]} rotation={[0, 0, -0.62]}>
            <cylinderGeometry args={[0.08, 0.13, 1.45, 5]} />
            <meshStandardMaterial color="#382f2e" roughness={1} flatShading />
          </mesh>
          <mesh position={[0.48, 2.55, 0]} rotation={[0, 0, 0.7]}>
            <cylinderGeometry args={[0.08, 0.13, 1.62, 5]} />
            <meshStandardMaterial color="#382f2e" roughness={1} flatShading />
          </mesh>
          <mesh position={[0.1, 3.1, 0]}>
            <coneGeometry args={[0.76, 1.42, 5]} />
            <meshStandardMaterial color="#282b2d" roughness={1} flatShading />
          </mesh>
        </group>
      )}
      {object.kind === "flag" && (
        <group ref={swayRef}>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.045, 0.065, 2.4, 6]} />
            <meshStandardMaterial color="#9c7948" roughness={0.78} metalness={0.28} />
          </mesh>
          <group position={[0.04, 2.3, 0]}>
            <FlagCloth motionReduced={motionReduced} />
          </group>
          <mesh position={[0, 2.45, 0]}>
            <coneGeometry args={[0.08, 0.18, 5]} />
            <meshStandardMaterial color="#c59b5d" metalness={0.48} roughness={0.4} />
          </mesh>
        </group>
      )}
      {object.kind === "rock" && (
        <group>
          <mesh position={[0, 0.45, 0]} rotation={[0.14, 0.36, 0]}>
            <dodecahedronGeometry args={[0.86, 0]} />
            <meshStandardMaterial color={darkStone} roughness={0.98} flatShading />
          </mesh>
          <mesh position={[0.76, 0.3, -0.18]} rotation={[0.2, -0.2, 0.18]} scale={[0.7, 0.72, 0.84]}>
            <dodecahedronGeometry args={[0.62, 0]} />
            <meshStandardMaterial color="#786662" roughness={0.96} flatShading />
          </mesh>
          <mesh position={[-0.72, 0.25, 0.14]} rotation={[0, 0.44, 0.1]} scale={[0.78, 0.65, 0.8]}>
            <dodecahedronGeometry args={[0.56, 0]} />
            <meshStandardMaterial color="#473f43" roughness={1} flatShading />
          </mesh>
        </group>
      )}
      {(object.kind === "torch" || object.kind === "firepit") && (
        <group>
          {object.kind === "torch" ? (
            <group position={[0, 1.82, 0]}><Flame /></group>
          ) : (
            <group position={[0, 0.28, 0]}><Flame /></group>
          )}
        </group>
      )}
      {object.kind === "crystal" && (
        <CrystalProp object={object} />
      )}
      {object.kind === "cart" && (
        <group position={[0, 0.48, 0]} rotation={[0, 0, -0.12]}>
          <mesh position={[0, 0.22, 0]}>
            <boxGeometry args={[1.85, 0.22, 1.02]} />
            <meshStandardMaterial color="#594236" roughness={0.94} />
          </mesh>
          <mesh position={[0, 0.66, 0.44]} rotation={[0, 0, 0.18]}>
            <boxGeometry args={[1.7, 0.74, 0.13]} />
            <meshStandardMaterial color="#654b3e" roughness={0.96} />
          </mesh>
          <mesh position={[-0.92, 0.32, -0.62]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.47, 0.47, 0.13, 9]} />
            <meshStandardMaterial color="#332c2c" roughness={1} />
          </mesh>
          <mesh position={[0.9, 0.28, -0.62]} rotation={[0.1, 0.1, Math.PI / 2]}>
            <cylinderGeometry args={[0.36, 0.36, 0.13, 8]} />
            <meshStandardMaterial color="#332c2c" roughness={1} />
          </mesh>
          <mesh position={[0.12, 1.08, -0.25]} rotation={[0, 0, -0.3]}>
            <boxGeometry args={[0.12, 1.5, 0.12]} />
            <meshStandardMaterial color="#594236" roughness={0.92} />
          </mesh>
        </group>
      )}
      {object.kind === "bones" && (
        <group rotation={[0.1, 0.35, -0.08]}>
          {[-0.52, -0.14, 0.26, 0.59].map((x, index) => (
            <group key={index} position={[x, 0.18 + (index % 2) * 0.08, (index % 2) * 0.3]} rotation={[0.2, 0, index % 2 ? 0.1 : -0.08]}>
              <mesh>
                <cylinderGeometry args={[0.055, 0.055, 0.8, 5]} />
                <meshStandardMaterial color="#b7a990" roughness={0.91} />
              </mesh>
              {[-0.43, 0.43].map((end) => (
                <mesh key={end} position={[0, end, 0]}>
                  <sphereGeometry args={[0.1, 5, 4]} />
                  <meshStandardMaterial color="#c5b89e" roughness={0.9} flatShading />
                </mesh>
              ))}
            </group>
          ))}
          <mesh position={[0.25, 0.22, -0.38]} rotation={[0, 0.2, 0.6]}>
            <sphereGeometry args={[0.25, 6, 5]} />
            <meshStandardMaterial color="#baac91" roughness={0.9} flatShading />
          </mesh>
        </group>
      )}
    </group>
  );
}

function CrystalProp({ object }: { object: WorldObject }) {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} rotation={[0.12, 0.3, 0.12]}>
        <octahedronGeometry args={[0.68, 0]} />
        <meshStandardMaterial color="#f0aa70" emissive="#df7949" emissiveIntensity={1.05} metalness={0.26} roughness={0.28} flatShading />
      </mesh>
      <mesh position={[0.42, 0.53, 0.08]} rotation={[0.18, 0.2, -0.2]} scale={[0.66, 0.78, 0.66]}>
        <octahedronGeometry args={[0.46, 0]} />
        <meshStandardMaterial color="#b27654" emissive="#a64e34" emissiveIntensity={0.56} metalness={0.22} roughness={0.35} flatShading />
      </mesh>
    </group>
  );
}

function createSkyGeometry() {
  const geometry = new THREE.SphereGeometry(WORLD_SKY_RADIUS, 32, 16);
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  const horizon = new THREE.Color("#a05d4d");
  const middle = new THREE.Color("#3a3047");
  const zenith = new THREE.Color("#11192e");
  const dusk = new THREE.Color("#6a4654");
  const color = new THREE.Color();
  for (let index = 0; index < positions.count; index += 1) {
    const height = THREE.MathUtils.clamp(positions.getY(index) / 260, -1, 1);
    const blend = THREE.MathUtils.smoothstep(height, -0.25, 0.62);
    color.copy(horizon).lerp(middle, THREE.MathUtils.smoothstep(height, -0.12, 0.38));
    color.lerp(zenith, THREE.MathUtils.smoothstep(height, 0.24, 0.92));
    color.lerp(dusk, (1 - Math.min(1, Math.abs(height + 0.04) * 5)) * 0.08);
    color.multiplyScalar(0.92 + blend * 0.08);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

const SKY_GEOMETRY = createSkyGeometry();
const SKY_MATERIAL = new THREE.MeshBasicMaterial({
  vertexColors: true,
  side: THREE.BackSide,
  toneMapped: false,
  fog: false,
});

function createStarGeometry() {
  const random = seededRandom(0x87a4c2);
  const positions = new Float32Array(190 * 3);
  for (let index = 0; index < 190; index += 1) {
    const angle = random() * Math.PI * 2;
    const height = 0.12 + random() * 0.84;
    const radius = 155 + random() * 75;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = height * 165;
    positions[index * 3 + 2] = Math.sin(angle) * radius - 40;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}

const STAR_GEOMETRY = createStarGeometry();

type MountainColorKey = "mountainFar" | "mountainMid" | "mountainNear";
const MOUNTAIN_COLORS = Object.fromEntries(
  Object.entries(WORLD_BIOME_PALETTES).map(([biome, palette]) => [
    biome,
    {
      mountainFar: new THREE.Color(palette.mountainFar),
      mountainMid: new THREE.Color(palette.mountainMid),
      mountainNear: new THREE.Color(palette.mountainNear),
    },
  ]),
) as Record<keyof typeof WORLD_BIOME_PALETTES, Record<MountainColorKey, THREE.Color>>;

function MountainLayer({
  motionRef,
  layer,
  depth,
  colorKey,
  seed,
}: {
  motionRef: MotionRef;
  layer: "far" | "mid" | "near";
  depth: number;
  colorKey: MountainColorKey;
  seed: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.ConeGeometry(1, 2, 5), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#33303a",
    roughness: 1,
    flatShading: true,
  }), []);
  const instances = useMemo(() => {
    const random = seededRandom(seed);
    const count = layer === "near" ? 13 : layer === "mid" ? 16 : 20;
    const offsets = [-120, 0, 120];
    return offsets.flatMap((offset) => Array.from({ length: count }, (_, index) => ({
      x: (index - (count - 1) / 2) * (layer === "near" ? 19 : 16) + (random() - 0.5) * 9,
      y: (layer === "far" ? 7 : 8) + random() * (layer === "near" ? 9 : 7),
      z: (layer === "far" ? -123 : layer === "mid" ? -99 : -78) + offset + random() * 13,
      radius: (layer === "near" ? 17 : 13) + random() * (layer === "near" ? 16 : 13),
      height: (layer === "near" ? 25 : 19) + random() * (layer === "near" ? 25 : 19),
      rotation: (random() - 0.5) * 0.52,
    })));
  }, [layer, seed]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const transform = new THREE.Object3D();
    instances.forEach((mountain, index) => {
      transform.position.set(mountain.x, mountain.y, mountain.z);
      transform.rotation.set(0, mountain.rotation, 0);
      transform.scale.set(mountain.radius, mountain.height / 2, mountain.radius * 0.34);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [instances]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.position.z = -((motionRef.current.cameraX * depth) % 120);
    const transition = getBiomeTransition(motionRef.current.distance);
    material.color.lerpColors(
      MOUNTAIN_COLORS[transition.from][colorKey],
      MOUNTAIN_COLORS[transition.to][colorKey],
      transition.mix,
    );
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, instances.length]}
      frustumCulled={false}
      castShadow={false}
      receiveShadow={false}
    />
  );
}

function CloudLayer({
  motionRef,
  seed,
  altitude,
  depth,
  opacity,
}: {
  motionRef: MotionRef;
  seed: number;
  altitude: number;
  depth: number;
  opacity: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#c69d8e",
    transparent: true,
    opacity,
    depthWrite: false,
  }), [opacity]);
  const instances = useMemo(() => {
    const random = seededRandom(seed);
    const clouds = Array.from({ length: 11 }, () => ({
      x: (random() - 0.5) * 210,
      y: altitude + (random() - 0.5) * 5,
      z: -112 + (random() - 0.5) * 18,
      scale: [8 + random() * 10, 1.8 + random() * 2.6, 2 + random() * 2.5] as const,
    }));
    return [-150, 0, 150].flatMap((offset) => clouds.map((cloud) => ({ ...cloud, z: cloud.z + offset })));
  }, [altitude, seed]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const transform = new THREE.Object3D();
    instances.forEach((cloud, index) => {
      transform.position.set(cloud.x, cloud.y, cloud.z);
      transform.scale.set(...cloud.scale);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [instances]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.position.z = -((motionRef.current.cameraX * depth) % 150);
    const transition = getBiomeTransition(motionRef.current.distance);
    material.color.lerpColors(
      ROAD_PALETTE_COLORS[transition.from].cloud,
      ROAD_PALETTE_COLORS[transition.to].cloud,
      transition.mix,
    );
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[
        geometry,
        material,
        instances.length,
      ]}
      frustumCulled={false}
      renderOrder={-1}
    />
  );
}

export function AshSky({ motionRef }: { motionRef: MotionRef }) {
  const moonPosition: [number, number, number] = [48, 54, -108];
  useFrame(() => {
    const transition = getBiomeTransition(motionRef.current.distance);
    SKY_MATERIAL.color.lerpColors(
      ROAD_PALETTE_COLORS[transition.from].sky,
      ROAD_PALETTE_COLORS[transition.to].sky,
      transition.mix,
    );
  });
  return (
    <>
      <mesh geometry={SKY_GEOMETRY} material={SKY_MATERIAL} frustumCulled={false} dispose={null} />
      <CloudLayer motionRef={motionRef} seed={0x524f4e} altitude={34} depth={0.025} opacity={0.12} />
      <CloudLayer motionRef={motionRef} seed={0x132e9f} altitude={28} depth={0.045} opacity={0.1} />
      <points geometry={STAR_GEOMETRY} frustumCulled={false} dispose={null}>
        <pointsMaterial color="#f8dba4" size={0.72} sizeAttenuation={false} transparent opacity={0.72} depthWrite={false} />
      </points>
      <mesh position={moonPosition}>
        <sphereGeometry args={[7.6, 10, 8]} />
        <meshBasicMaterial color="#eac29b" transparent opacity={0.035} depthWrite={false} />
      </mesh>
      <mesh position={moonPosition}>
        <sphereGeometry args={[5.5, 10, 8]} />
        <meshBasicMaterial color="#eac29b" transparent opacity={0.09} depthWrite={false} />
      </mesh>
      <mesh position={moonPosition}>
        <sphereGeometry args={[2.15, 12, 8]} />
        <meshStandardMaterial color="#ead3b0" emissive="#9f785f" emissiveIntensity={0.38} roughness={0.8} />
      </mesh>
      <MountainLayer motionRef={motionRef} layer="far" depth={0.025} colorKey="mountainFar" seed={0x101f881} />
      <MountainLayer motionRef={motionRef} layer="mid" depth={0.055} colorKey="mountainMid" seed={0x204eb2} />
      <MountainLayer motionRef={motionRef} layer="near" depth={0.1} colorKey="mountainNear" seed={0x73428} />
    </>
  );
}

export function WorldChunks({
  chunks,
  motionRef,
  motionReduced,
  quality,
  weather,
  unlockedThroughChapter,
  touchRenderer,
}: {
  chunks: WorldChunk[];
  motionRef: MotionRef;
  motionReduced: boolean;
  quality: WorldQuality;
  weather: WeatherMode;
  unlockedThroughChapter: number;
  touchRenderer: boolean;
}) {
  const objects = useMemo(() => chunks.flatMap((chunk) => chunk.objects), [chunks]);
  const staticLodChunk = Math.floor(motionRef.current.distance / WORLD_GATE_INTERVAL_METERS);
  const animatedObjects = useMemo(
    () => objects.filter((object) => object.kind === "flag" || object.kind === "torch" || object.kind === "firepit" || object.kind === "crystal"),
    [objects],
  );
  const staticObjects = useMemo(
    () => objects.filter((object) =>
      object.kind !== "flag" && object.kind !== "torch" && object.kind !== "firepit" && object.kind !== "crystal" &&
      Math.abs(object.worldX - motionRef.current.distance) <= 190,
    ),
    [objects, staticLodChunk, motionRef.current.originDistance],
  );
  return (
    <>
      <RoadSurface motionRef={motionRef} quality={quality} weather={weather} />
      {chunks.map((chunk) => <RoadSegment key={`road-${chunk.index}`} chunk={chunk} quality={quality} />)}
      <WorldStaticBatches
        objects={staticObjects}
        motionRef={motionRef}
        originDistance={motionRef.current.originDistance}
      />
      {animatedObjects.map((object) => (
        <WorldProp
          key={object.id}
          object={object}
          motionRef={motionRef}
          motionReduced={motionReduced}
        />
      ))}
      <FinalGate
        motionRef={motionRef}
        unlockedThroughChapter={unlockedThroughChapter}
        touchRenderer={touchRenderer}
      />
      <group position={[0, 1.4, -12]} visible={weather !== "clear"}>
        <Sparkles
          count={quality === "high" ? 48 : quality === "balanced" ? 30 : 12}
          scale={[18, 5, 34]}
          size={quality === "high" ? 2.3 : quality === "balanced" ? 1.8 : 1.4}
          speed={motionReduced ? 0 : 0.42}
          color={weather === "rain" ? "#a5dcf5" : weather === "fog" ? "#c7d4d9" : weather === "ash" ? "#e5a566" : "#e5a566"}
          opacity={0.48}
          noise={0.8}
        />
      </group>
    </>
  );
}

function FinalGate({
  motionRef,
  unlockedThroughChapter,
  touchRenderer,
}: {
  motionRef: MotionRef;
  unlockedThroughChapter: number;
  touchRenderer: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const getCurrentGateDistance = () => {
    const motion = motionRef.current;
    const speed = Math.hypot(motion.velocityX, motion.velocityY);
    const cameraDistanceBehind = getTravelCameraSettings(speed, touchRenderer).distanceBehind;
    return nextGateDistanceForCamera(motion.cameraX, cameraDistanceBehind);
  };
  const gateDistanceAtRender = getCurrentGateDistance();
  const gateChapterAtRender = Math.max(0, Math.floor(gateDistanceAtRender / WORLD_GATE_INTERVAL_METERS) - 1);
  const gateOpen = gateChapterAtRender < unlockedThroughChapter;
  useFrame(() => {
    if (!groupRef.current) return;
    const motion = motionRef.current;
    const gateDistance = getCurrentGateDistance();
    groupRef.current.position.z = motion.cameraX - gateDistance;
  });
  return (
      <group
        ref={groupRef}
        position={[0, 0, motionRef.current.cameraX - gateDistanceAtRender]}
      >
      <mesh position={[-6.2, 5.2, 0]}>
        <boxGeometry args={[2.3, 10.4, 2.2]} />
        <meshStandardMaterial color="#55464a" roughness={0.94} flatShading />
      </mesh>
      <mesh position={[6.2, 5.2, 0]}>
        <boxGeometry args={[2.3, 10.4, 2.2]} />
        <meshStandardMaterial color="#5a4b4d" roughness={0.94} flatShading />
      </mesh>
      <mesh position={[0, 10.3, 0]}>
        <boxGeometry args={[14.7, 2.3, 2.8]} />
        <meshStandardMaterial color="#705957" roughness={0.9} flatShading />
      </mesh>
      {/* Leave the gate opening unobstructed; full-size transparent portal planes can cover the mobile camera view. */}
      {!gateOpen && (
        <group position={[0, 5.1, 0.52]}>
          {[-3.6, -1.8, 0, 1.8, 3.6].map((x) => (
            <mesh key={`gate-bar-v-${x}`} position={[x, 0, 0]}>
              <boxGeometry args={[0.13, 7.4, 0.12]} />
              <meshBasicMaterial color="#f0a06c" transparent opacity={0.72} depthWrite={false} toneMapped={false} />
            </mesh>
          ))}
          {[-2.4, 0, 2.4].map((y) => (
            <mesh key={`gate-bar-h-${y}`} position={[0, y, 0]}>
              <boxGeometry args={[8.9, 0.12, 0.12]} />
              <meshBasicMaterial color="#f0a06c" transparent opacity={0.72} depthWrite={false} toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}
      {[-6.2, 6.2].map((x) => (
        <group key={x} position={[x, 8.5, -0.7]}>
          <mesh>
            <coneGeometry args={[0.34, 1.4, 5]} />
            <meshStandardMaterial color="#c19964" metalness={0.45} roughness={0.4} flatShading />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 7 }, (_, index) => (
        <mesh key={index} position={[-5.1 + index * 1.7, 11.58, 0]}>
          <boxGeometry args={[0.55, 0.62, 2.5]} />
          <meshStandardMaterial color="#75605b" roughness={0.93} />
        </mesh>
      ))}
    </group>
  );
}

export function getLoadedChunkCount(chunks: WorldChunk[]) {
  return chunks.length;
}
