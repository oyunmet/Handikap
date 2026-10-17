import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldMotion } from "./movement";
import { WORLD_CHUNK_LENGTH_METERS } from "./movement";
import { createWorldChunk, type WorldChunk, type WorldObject } from "./world-generation";
import { getBiomeTransition, WORLD_BIOME_PALETTES, type WeatherMode } from "./world-biomes";
import {
  STONE_PBR_MATERIAL_PROPS,
  STONE_PBR_TEXTURES,
} from "./procedural-materials";
import { getShadowMapSize } from "./graphics-quality";
import {
  createConnectedRidgeGeometry,
  createRoadShoulderGeometry,
  getLandmarkGeometry,
  getNaturalRockGeometry,
  getNaturalTreeGeometry,
  WORLD_ROAD_WIDTH,
  type LandmarkKind,
  type LandscapeQuality,
  type TreeSpecies,
} from "./world-natural-geometry";
import {
  raycastWorldGround,
  WorldAssetErrorBoundary,
  WorldAssetInstanceBatch,
  WorldRockFarLod,
} from "./WorldModel";

type WorldQuality = LandscapeQuality;

type Props = {
  motionRef: MutableRefObject<WorldMotion>;
  quality: WorldQuality;
  weather: WeatherMode;
  motionReduced: boolean;
};

const ROAD_LENGTH = 440;
const ROAD_CENTER_Z = -150;
const WORLD_RADIUS = 260;

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

function makeSkyGeometry() {
  const geometry = new THREE.SphereGeometry(WORLD_RADIUS, 32, 20);
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

const NATURAL_TREE_MATERIAL = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.94,
  metalness: 0,
});
const WEATHERED_LANDMARK_MATERIAL = new THREE.MeshStandardMaterial({
  ...STONE_PBR_MATERIAL_PROPS,
  vertexColors: true,
  color: "#ffffff",
  roughness: 0.96,
  metalness: 0,
});

function paintSky(geometry: THREE.SphereGeometry, distance: number) {
  const transition = getBiomeTransition(distance);
  const from = WORLD_BIOME_PALETTES[transition.from];
  const to = WORLD_BIOME_PALETTES[transition.to];
  const horizon = new THREE.Color(from.horizon).lerp(new THREE.Color(to.horizon), transition.mix);
  const middle = new THREE.Color(from.middle).lerp(new THREE.Color(to.middle), transition.mix);
  const zenith = new THREE.Color(from.zenith).lerp(new THREE.Color(to.zenith), transition.mix);
  const colors = geometry.getAttribute("color") as THREE.BufferAttribute;
  const positions = geometry.getAttribute("position");
  const color = new THREE.Color();

  for (let index = 0; index < positions.count; index += 1) {
    const elevation = positions.getY(index) / WORLD_RADIUS;
    if (elevation < 0.1) {
      color.copy(horizon).lerp(middle, THREE.MathUtils.smoothstep(elevation, -0.82, 0.18));
    } else {
      color.copy(middle).lerp(zenith, THREE.MathUtils.smoothstep(elevation, 0.05, 0.9));
    }
    colors.setXYZ(index, color.r, color.g, color.b);
  }
  colors.needsUpdate = true;
}

function createRoadTexture() {
  const size = 512;
  const cellSize = 32;
  const cellsPerAxis = size / cellSize;
  const random = seededRandom(0x4b11a7);
  const tileDetails = Array.from({ length: cellsPerAxis * cellsPerAxis }, () => ({
    shade: random(),
    hasCrack: random() > 0.57,
    crackStart: 4 + random() * 8,
    crackEnd: 20 + random() * 10,
    crackY: 8 + random() * 16,
    crackSlope: (random() - 0.5) * 0.35,
  }));
  const color = new Uint8Array(size * size * 4);
  const normal = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const height = new Float32Array(size * size);

  for (let y = 0; y < size; y += 1) {
    const row = Math.floor(y / cellSize);
    const offset = row % 2 ? cellSize / 2 : 0;
    const localY = y % cellSize;
    for (let x = 0; x < size; x += 1) {
      const shiftedX = x + offset;
      const column = Math.floor(shiftedX / cellSize) % cellsPerAxis;
      const localX = shiftedX % cellSize;
      const tile = tileDetails[(row % cellsPerAxis) * cellsPerAxis + column];
      const index = y * size + x;
      const pixel = index * 4;
      const mortar = localX < 2 || localX >= cellSize - 2 || localY < 2 || localY >= cellSize - 2;
      const crackY = tile.crackY + (localX - tile.crackStart) * tile.crackSlope;
      const cracked = !mortar
        && tile.hasCrack
        && localX > tile.crackStart
        && localX < tile.crackEnd
        && Math.abs(localY - crackY) < 1;
      const grain = (random() - 0.5) * 10;
      const shade = (tile.shade - 0.5) * 18 + grain;

      if (mortar) {
        color[pixel] = 112 + grain * 0.45;
        color[pixel + 1] = 103 + grain * 0.42;
        color[pixel + 2] = 91 + grain * 0.38;
        height[index] = 0.22 + grain * 0.001;
        roughness[pixel] = 232;
      } else if (cracked) {
        color[pixel] = 92 + grain * 0.35;
        color[pixel + 1] = 83 + grain * 0.32;
        color[pixel + 2] = 75 + grain * 0.28;
        height[index] = 0.3;
        roughness[pixel] = 246;
      } else {
        color[pixel] = 163 + shade;
        color[pixel + 1] = 151 + shade * 0.9;
        color[pixel + 2] = 133 + shade * 0.8;
        height[index] = 0.72 + grain * 0.003;
        roughness[pixel] = 192 + Math.round(tile.shade * 38);
      }
      color[pixel + 3] = 255;
      roughness[pixel + 1] = roughness[pixel];
      roughness[pixel + 2] = roughness[pixel];
      roughness[pixel + 3] = 255;
    }
  }

  const wrap = (value: number) => (value + size) % size;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = height[y * size + wrap(x - 1)];
      const right = height[y * size + wrap(x + 1)];
      const above = height[wrap(y - 1) * size + x];
      const below = height[wrap(y + 1) * size + x];
      const nx = -(right - left) * 1.8;
      const ny = -(below - above) * 1.8;
      const length = Math.hypot(nx, ny, 1);
      const pixel = (y * size + x) * 4;
      normal[pixel] = Math.round((nx / length * 0.5 + 0.5) * 255);
      normal[pixel + 1] = Math.round((ny / length * 0.5 + 0.5) * 255);
      normal[pixel + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      normal[pixel + 3] = 255;
    }
  }

  const createTexture = (
    data: Uint8Array,
    colorSpace: THREE.ColorSpace = THREE.NoColorSpace,
  ) => {
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.colorSpace = colorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(14.2 / 8, ROAD_LENGTH / 8);
    texture.anisotropy = 4;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  };

  return {
    color: createTexture(color, THREE.SRGBColorSpace),
    normal: createTexture(normal),
    roughness: createTexture(roughness),
  };
}

function createCloudTexture(seed: number, warm: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Gökyüzü bulutları için 2D canvas oluşturulamadı.");
  const random = seededRandom(seed);
  const cloudColor = warm ? "255,226,194" : "246,250,255";

  for (let index = 0; index < 22; index += 1) {
    const x = random() * canvas.width;
    const y = 102 + random() * 64;
    const radius = 24 + random() * 48;
    for (const wrap of [-canvas.width, 0, canvas.width]) {
      const gradient = context.createRadialGradient(x + wrap, y, radius * 0.06, x + wrap, y, radius);
      gradient.addColorStop(0, `rgba(${cloudColor},${0.19 + random() * 0.1})`);
      gradient.addColorStop(0.52, `rgba(${cloudColor},0.09)`);
      gradient.addColorStop(1, `rgba(${cloudColor},0)`);
      context.fillStyle = gradient;
      context.fillRect(x + wrap - radius, y - radius * 0.45, radius * 2, radius * 0.9);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createSunHaloTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Güneş halesi için 2D canvas oluşturulamadı.");
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,250,220,1)");
  gradient.addColorStop(0.09, "rgba(255,238,184,.98)");
  gradient.addColorStop(0.2, "rgba(255,198,123,.62)");
  gradient.addColorStop(0.46, "rgba(255,172,103,.2)");
  gradient.addColorStop(1, "rgba(255,158,92,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function cloneRepeatedTexture(texture: THREE.Texture, repeatX: number, repeatY: number) {
  const clone = texture.clone();
  clone.wrapS = THREE.RepeatWrapping;
  clone.wrapT = THREE.RepeatWrapping;
  clone.repeat.set(repeatX, repeatY);
  clone.anisotropy = 4;
  clone.needsUpdate = true;
  return clone;
}

function WorldSky({ motionRef }: { motionRef: Props["motionRef"] }) {
  const geometry = useMemo(makeSkyGeometry, []);
  const cloudGeometry = useMemo(() => new THREE.SphereGeometry(WORLD_RADIUS - 1, 32, 20), []);
  const firstCloudTexture = useMemo(() => createCloudTexture(0x1023, true), []);
  const secondCloudTexture = useMemo(() => createCloudTexture(0x3819, false), []);
  const sunTexture = useMemo(createSunHaloTexture, []);
  const skyRef = useRef<THREE.Mesh>(null);
  const firstCloudRef = useRef<THREE.Mesh>(null);
  const secondCloudRef = useRef<THREE.Mesh>(null);
  const sunRef = useRef<THREE.Sprite>(null);
  const lastPaintedBiome = useMemo(() => ({ biome: "", mix: -1 }), []);
  const { scene, camera } = useThree();
  const sunPosition = useMemo(() => new THREE.Vector3(), []);
  const sunDirection = useMemo(() => new THREE.Vector3(), []);
  const sunRight = useMemo(() => new THREE.Vector3(), []);
  const sunUp = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => () => {
    geometry.dispose();
    cloudGeometry.dispose();
    firstCloudTexture.dispose();
    secondCloudTexture.dispose();
    sunTexture.dispose();
  }, [cloudGeometry, firstCloudTexture, geometry, secondCloudTexture, sunTexture]);
  useFrame(() => {
    const hasHdriSky = scene.background instanceof THREE.Texture;
    if (skyRef.current) skyRef.current.visible = !hasHdriSky;
    if (firstCloudRef.current) firstCloudRef.current.visible = !hasHdriSky;
    if (secondCloudRef.current) secondCloudRef.current.visible = !hasHdriSky;
    if (sunRef.current) {
      sunRef.current.visible = !hasHdriSky;
      if (!hasHdriSky) {
        camera.getWorldPosition(sunPosition);
        camera.getWorldDirection(sunDirection);
        sunRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
        sunUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
        sunPosition
          .addScaledVector(sunDirection, WORLD_RADIUS * 0.88)
          .addScaledVector(sunRight, -WORLD_RADIUS * 0.25)
          .addScaledVector(sunUp, WORLD_RADIUS * 0.06);
        sunRef.current.position.copy(sunPosition);
      }
    }
    const transition = getBiomeTransition(motionRef.current.distance);
    if (transition.biome !== lastPaintedBiome.biome || Math.abs(transition.mix - lastPaintedBiome.mix) > 0.012) {
      paintSky(geometry, motionRef.current.distance);
      lastPaintedBiome.biome = transition.biome;
      lastPaintedBiome.mix = transition.mix;
    }
  });
  return (
    <>
      <mesh ref={skyRef} geometry={geometry} frustumCulled={false} renderOrder={-30}>
        <meshBasicMaterial vertexColors side={THREE.BackSide} toneMapped={false} fog={false} />
      </mesh>
      <mesh ref={firstCloudRef} geometry={cloudGeometry} frustumCulled={false} renderOrder={-29}>
        <meshBasicMaterial
          map={firstCloudTexture}
          transparent
          opacity={0.62}
          side={THREE.BackSide}
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </mesh>
      <mesh ref={secondCloudRef} geometry={cloudGeometry} scale={[1, 1, 0.995]} frustumCulled={false} renderOrder={-28}>
        <meshBasicMaterial
          map={secondCloudTexture}
          transparent
          opacity={0.42}
          side={THREE.BackSide}
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </mesh>
      <sprite ref={sunRef} scale={[44, 44, 1]} frustumCulled={false} renderOrder={-27}>
        <spriteMaterial
          map={sunTexture}
          transparent
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </>
  );
}

function RidgeLayer({
  motionRef,
  layer,
  seed,
  color,
  quality,
}: {
  motionRef: Props["motionRef"];
  layer: number;
  seed: number;
  color: string;
  quality: WorldQuality;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => createConnectedRidgeGeometry(seed, layer, quality), [layer, quality, seed]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    vertexColors: true,
    color,
    roughness: 1,
    flatShading: false,
    emissive: color,
    emissiveIntensity: 0.08,
  }), [color]);
  const targetColor = useMemo(() => new THREE.Color(), []);
  const lastPalette = useMemo(() => ({ distance: -10, biome: "", mix: -1 }), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.position.z = -92 - layer * 28 - ((motionRef.current.cameraX * (0.025 + layer * 0.018)) % 150);
    const distance = motionRef.current.distance;
    if (Math.abs(distance - lastPalette.distance) < 0.75) return;
    const transition = getBiomeTransition(distance);
    if (transition.biome === lastPalette.biome && Math.abs(transition.mix - lastPalette.mix) < 0.012) {
      lastPalette.distance = distance;
      return;
    }
    const from = WORLD_BIOME_PALETTES[transition.from];
    const to = WORLD_BIOME_PALETTES[transition.to];
    material.color.set(from[`mountain${layer === 0 ? "Far" : layer === 1 ? "Mid" : "Near"}`])
      .lerp(targetColor.set(to[`mountain${layer === 0 ? "Far" : layer === 1 ? "Mid" : "Near"}`]), transition.mix);
    material.emissive.copy(material.color).multiplyScalar(0.08);
    lastPalette.distance = distance;
    lastPalette.biome = transition.biome;
    lastPalette.mix = transition.mix;
  });
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      castShadow={false}
      receiveShadow={false}
    />
  );
}

function DistantRidges({ motionRef, quality }: { motionRef: Props["motionRef"]; quality: WorldQuality }) {
  const colors = useMemo(() => ({
    far: new THREE.Color("#373746"),
    middle: new THREE.Color("#51414a"),
    near: new THREE.Color("#6a4b4c"),
  }), []);
  return (
    <>
      <RidgeLayer motionRef={motionRef} layer={0} seed={0x45a21} color={colors.far.getStyle()} quality={quality} />
      <RidgeLayer motionRef={motionRef} layer={1} seed={0x92a51} color={colors.middle.getStyle()} quality={quality} />
      <RidgeLayer motionRef={motionRef} layer={2} seed={0x175a2} color={colors.near.getStyle()} quality={quality} />
    </>
  );
}

function Road({
  motionRef,
  weather,
  quality,
}: {
  motionRef: Props["motionRef"];
  weather: WeatherMode;
  quality: WorldQuality;
}) {
  const roadTextures = useMemo(createRoadTexture, []);
  const groundTextures = useMemo(() => ({
    color: cloneRepeatedTexture(STONE_PBR_TEXTURES.color, 34, 44),
    normal: cloneRepeatedTexture(STONE_PBR_TEXTURES.normal, 34, 44),
    roughness: cloneRepeatedTexture(STONE_PBR_TEXTURES.roughness, 34, 44),
  }), []);
  const chipsRef = useRef<THREE.InstancedMesh>(null);
  const chipTransform = useMemo(() => new THREE.Object3D(), []);
  const chipGeometry = useMemo(() => new THREE.CircleGeometry(1, 5), []);
  const shoulderGeometry = useMemo(() => createRoadShoulderGeometry(quality), [quality]);
  const groundTargetColor = useMemo(() => new THREE.Color(), []);
  const roadTargetColor = useMemo(() => new THREE.Color(), []);
  const chipMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 1,
    flatShading: false,
  }), []);
  const groundMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: groundTextures.color,
    normalMap: groundTextures.normal,
    normalScale: new THREE.Vector2(0.24, 0.24),
    roughnessMap: groundTextures.roughness,
    roughness: 0.96,
    metalness: 0,
    flatShading: false,
  }), [groundTextures]);
  const shoulderMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: groundTextures.color,
    normalMap: groundTextures.normal,
    normalScale: new THREE.Vector2(0.24, 0.24),
    roughnessMap: groundTextures.roughness,
    roughness: 0.98,
    metalness: 0,
    vertexColors: true,
    flatShading: false,
  }), [groundTextures]);
  const roadMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    map: roadTextures.color,
    normalMap: roadTextures.normal,
    normalScale: new THREE.Vector2(0.27, 0.27),
    roughnessMap: roadTextures.roughness,
    color: "#ffffff",
    roughness: weather === "storm" ? 0.56 : weather === "rain" ? 0.68 : 0.94,
    metalness: weather === "storm" ? 0.06 : weather === "rain" ? 0.025 : 0,
    flatShading: false,
  }), [roadTextures, weather]);
  const railMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    ...STONE_PBR_MATERIAL_PROPS,
    color: "#846d61",
    roughness: 0.95,
    metalness: 0.02,
  }), []);
  const chipPositions = useMemo(() => {
    const random = seededRandom(0x99a731);
    return Array.from({ length: 110 }, () => ({
      x: (random() - 0.5) * 42,
      z: (random() - 0.5) * ROAD_LENGTH + ROAD_CENTER_Z,
      scale: 0.12 + random() * 0.44,
      tilt: random() * Math.PI,
      color: random() > 0.5 ? "#786361" : "#342b30",
    }));
  }, []);

  useEffect(() => () => {
    Object.values(roadTextures).forEach((texture) => texture.dispose());
    Object.values(groundTextures).forEach((texture) => texture.dispose());
  }, [groundTextures, roadTextures]);

  useLayoutEffect(() => {
    const mesh = chipsRef.current;
    if (!mesh) return;
    chipPositions.forEach((chip, index) => {
      chipTransform.position.set(chip.x, -0.065, chip.z);
      chipTransform.rotation.set(-Math.PI / 2, 0, chip.tilt);
      chipTransform.scale.set(chip.scale * 1.9, chip.scale * 0.7, 1);
      chipTransform.updateMatrix();
      mesh.setMatrixAt(index, chipTransform.matrix);
      mesh.setColorAt(index, new THREE.Color(chip.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [chipPositions, chipTransform]);

  useFrame(() => {
    const transition = getBiomeTransition(motionRef.current.distance);
    const from = WORLD_BIOME_PALETTES[transition.from];
    const to = WORLD_BIOME_PALETTES[transition.to];
    groundMaterial.color
      .set(from.ground)
      .lerp(groundTargetColor.set(to.ground), transition.mix)
      .multiplyScalar(0.74);
    roadMaterial.color.set(from.road).lerp(roadTargetColor.set(to.road), transition.mix);
    shoulderMaterial.color.copy(groundMaterial.color).multiplyScalar(1.08);
    const roadOffset = ((motionRef.current.cameraX / 8) % 1 + 1) % 1;
    roadTextures.color.offset.y = roadOffset;
    roadTextures.normal.offset.y = roadOffset;
    roadTextures.roughness.offset.y = roadOffset;
    if (weather === "rain" || weather === "storm") {
      roadMaterial.roughness = weather === "storm" ? 0.56 : 0.68;
      roadMaterial.metalness = weather === "storm" ? 0.06 : 0.025;
    } else {
      roadMaterial.roughness = 0.94;
      roadMaterial.metalness = 0;
    }
  });

  return (
    <group>
      <mesh geometry={shoulderGeometry} material={shoulderMaterial} position={[0, 0, ROAD_CENTER_Z]} />
      <mesh
        position={[0, -0.52, ROAD_CENTER_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[340, ROAD_LENGTH]} />
        <primitive object={groundMaterial} attach="material" />
      </mesh>
      <mesh
        position={[0, -0.08, ROAD_CENTER_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[WORLD_ROAD_WIDTH, ROAD_LENGTH]} />
        <primitive object={roadMaterial} attach="material" />
      </mesh>
      {[-WORLD_ROAD_WIDTH / 2, WORLD_ROAD_WIDTH / 2].map((x) => (
        <group key={x}>
          <mesh position={[x * 1.02, -0.015, ROAD_CENTER_Z]} rotation={[Math.PI / 2, 0, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.078, 0.078, ROAD_LENGTH, 10, 1]} />
            <primitive object={railMaterial} attach="material" />
          </mesh>
          <mesh position={[x, -0.079, ROAD_CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.14, ROAD_LENGTH]} />
            <meshBasicMaterial color="#d7a778" transparent opacity={0.42} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <instancedMesh
        ref={chipsRef}
        args={[chipGeometry, chipMaterial, chipPositions.length]}
        receiveShadow
        frustumCulled={false}
      />
      <RoadLanterns motionRef={motionRef} />
    </group>
  );
}

function RoadLanterns({ motionRef }: { motionRef: Props["motionRef"] }) {
  const groupRef = useRef<THREE.Group>(null);
  const lampPositions = useMemo(() => [-88, -52, -16, 20, 56, 92, 128, 164], []);
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const cameraX = motionRef.current.cameraX;
    group.position.z = -((cameraX % 36) + 36);
  });
  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {lampPositions.map((z) => [-1, 1].map((side) => (
        <group key={`${side}:${z}`} position={[side * 8.1, 0, z]}>
          <mesh position={[0, 1.25, 0]}>
            <cylinderGeometry args={[0.07, 0.15, 2.5, 16, 3]} />
            <meshStandardMaterial color="#55413c" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.58, 0]}>
            <sphereGeometry args={[0.18, 16, 12]} />
            <meshBasicMaterial color="#ffd09a" toneMapped={false} />
          </mesh>
          <mesh position={[0, 2.55, 0]} scale={[2.3, 2.3, 2.3]}>
            <sphereGeometry args={[0.2, 8, 6]} />
            <meshBasicMaterial color="#f39458" transparent opacity={0.12} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      )))}
    </group>
  );
}

function ScenicProp({
  object,
  motionRef,
  motionReduced,
}: {
  object: WorldObject;
  motionRef: Props["motionRef"];
  motionReduced: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const swayRef = useRef<THREE.Group>(null);
  const seed = object.flickerSeed;
  const landmarkKind: LandmarkKind | null = object.kind === "tower"
    || object.kind === "column"
    || object.kind === "ruin"
    || object.kind === "arch"
    ? object.kind
    : null;
  const landmarkGeometry = landmarkKind ? getLandmarkGeometry(landmarkKind, object.biome) : null;
  const treeSpecies: TreeSpecies = object.kind === "pine-tree" ? "pine"
    : object.kind === "skeletal-tree" ? "skeletal"
      : object.kind === "mangrove" ? "mangrove" : "ash";
  const treeGeometry = getNaturalTreeGeometry(treeSpecies, object.biome);
  const rockGeometry = object.kind === "rock" ? getNaturalRockGeometry(seed) : null;
  const groundY = useMemo(() => raycastWorldGround(object.lane * 9.7, -150), [object.lane]);

  useFrame((frame) => {
    const root = rootRef.current;
    if (!root) return;
    const gap = object.worldX - motionRef.current.distance;
    root.position.z = -(object.worldX - motionRef.current.cameraX) * object.parallax;
    root.visible = gap > -32 && gap < 150;
    if (swayRef.current && !motionReduced) {
      swayRef.current.rotation.z = Math.sin(frame.clock.elapsedTime * 1.4 + seed) * 0.035;
    }
  });

  return (
    <group
      ref={rootRef}
      position={[object.lane * 9.7, groundY, 0]}
      rotation={[0, (seed % 63) * 0.1, 0]}
      scale={object.scale}
    >
      {(object.kind === "tower" || object.kind === "column" || object.kind === "ruin" || object.kind === "arch") && (
        <group>
          {landmarkGeometry && (
            <mesh
              geometry={landmarkGeometry}
              material={WEATHERED_LANDMARK_MATERIAL}
              castShadow
              receiveShadow
            />
          )}
        </group>
      )}
      {(object.kind === "tree" || object.kind === "pine-tree" || object.kind === "skeletal-tree" || object.kind === "mangrove") && (
        <group ref={swayRef}>
          <mesh
            geometry={treeGeometry}
            material={NATURAL_TREE_MATERIAL}
            castShadow
            receiveShadow
            rotation={[0, 0, treeSpecies === "skeletal" ? -0.035 : 0]}
          />
        </group>
      )}
      {(object.kind === "fern" || object.kind === "moss-bush") && (
        <group ref={swayRef}>
          {object.kind === "moss-bush" ? (
            <>
              {[-0.32, 0, 0.32].map((x, index) => (
                <mesh key={x} position={[x, 0.22 + (index === 1 ? 0.08 : 0), index === 1 ? -0.12 : 0.06]} scale={[0.46, 0.34, 0.38]}>
                  <sphereGeometry args={[0.64, 16, 12]} />
                  <meshStandardMaterial
                    color={object.biome === "frozen-pass" ? "#657b75" : "#526f42"}
                    roughness={0.96}
                  />
                </mesh>
              ))}
            </>
          ) : (
            [-0.42, -0.2, 0, 0.2, 0.42].map((x, index) => (
              <mesh
                key={x}
                  position={[x, 0.37 + (index % 2) * 0.08, 0]}
                rotation={[0.08, 0, -x * 0.9]}
                  scale={[0.7, 1.25, 0.68]}
              >
                  <sphereGeometry args={[0.23, 14, 10]} />
                <meshStandardMaterial
                  color={object.biome === "frozen-pass" ? "#70867e" : "#637f48"}
                  roughness={0.94}
                />
              </mesh>
            ))
          )}
        </group>
      )}
      {object.kind === "rock" && (
        <group>
          <mesh
            geometry={rockGeometry!}
            position={[0, 0.56, 0]}
            rotation={[0.12, 0.34, 0.14]}
            scale={[1.02, 0.78, 0.94]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial {...STONE_PBR_MATERIAL_PROPS} color="#a69f90" roughness={0.9} metalness={0} />
          </mesh>
          <mesh
            geometry={getNaturalRockGeometry(seed + 1)}
            position={[0.62, 0.3, -0.12]}
            rotation={[0.2, 0.1, 0.16]}
            scale={[0.54, 0.48, 0.58]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial {...STONE_PBR_MATERIAL_PROPS} color="#938c80" roughness={0.9} metalness={0} />
          </mesh>
        </group>
      )}
      {object.kind === "flag" && (
        <group ref={swayRef}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.045, 0.08, 3, 16, 2]} />
            <meshStandardMaterial color="#b18a5a" metalness={0.35} roughness={0.65} />
          </mesh>
          <mesh position={[0.67, 2.64, 0]}>
            <boxGeometry args={[1.35, 0.78, 0.08]} />
            <meshStandardMaterial color={seed % 2 ? "#863a43" : "#35445b"} roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, 3.17, 0]}>
            <sphereGeometry args={[0.14, 16, 10]} />
            <meshStandardMaterial color="#e6bf7d" metalness={0.45} roughness={0.42} />
          </mesh>
        </group>
      )}
      {(object.kind === "torch" || object.kind === "firepit") && (
        <group position={[0, object.kind === "torch" ? 1.68 : 0.4, 0]}>
          <mesh position={[0, -0.65, 0]}>
            <cylinderGeometry args={[0.06, 0.12, object.kind === "torch" ? 1.35 : 0.5, 16, 2]} />
            <meshStandardMaterial color="#58413a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.12, 0]} scale={[0.72, 1.3, 0.72]}>
            <sphereGeometry args={[0.2, 16, 12]} />
            <meshBasicMaterial color={object.biome === "frozen-pass" ? "#92edff" : "#ffbd75"} toneMapped={false} />
          </mesh>
          <mesh position={[0.03, 0.28, 0]} scale={[0.44, 0.86, 0.48]}>
            <sphereGeometry args={[0.18, 14, 10]} />
            <meshBasicMaterial color={object.biome === "frozen-pass" ? "#c9f7ff" : "#ffdf9d"} toneMapped={false} />
          </mesh>
          <pointLight
            color={object.biome === "frozen-pass" ? "#8ce7ff" : "#ff9957"}
            intensity={1.2}
            distance={6}
            decay={2}
          />
        </group>
      )}
      {object.kind === "reed" && [-0.36, 0, 0.36].map((x) => (
        <mesh key={x} position={[x, 0.7, 0]} rotation={[0, 0, x * 0.3]}>
          <cylinderGeometry args={[0.025, 0.055, 1.4, 12, 2]} />
          <meshStandardMaterial color="#8c8a62" roughness={0.94} />
        </mesh>
      ))}
      {object.kind === "cart" && (
        <group position={[0, 0.55, 0]}>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[1.75, 0.72, 1]} />
            <meshStandardMaterial color="#74513b" roughness={0.86} />
          </mesh>
          {[-0.86, 0.86].map((x) => (
            <mesh key={x} position={[x, 0, 0.54]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.39, 0.39, 0.12, 10]} />
              <meshStandardMaterial color="#332c2d" roughness={0.96} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function WeatherParticles({
  weather,
  quality,
  motionReduced,
}: {
  weather: WeatherMode;
  quality: WorldQuality;
  motionReduced: boolean;
}) {
  const count = weather === "clear" ? 0 : quality === "high" ? 44 : quality === "balanced" ? 26 : 12;
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const seeds = useMemo(() => {
    const random = seededRandom(0x5f0aa3);
    return Array.from({ length: count }, () => [random(), random(), random()]);
  }, [count]);
  useFrame((frame) => {
    if (!pointsRef.current || !count) return;
    const time = motionReduced ? 0 : frame.clock.elapsedTime;
    const wetWeather = weather === "rain" || weather === "storm";
    const rainIntensity = weather === "storm" ? 17 : 13;
    for (let index = 0; index < count; index += 1) {
      const [x, y, z] = seeds[index];
      const fall = (time * (wetWeather ? rainIntensity : 1.2) + z * 28) % 28;
      positions[index * 3] = (x - 0.5) * 30 + (wetWeather ? -fall * (weather === "storm" ? 0.13 : 0.08) : Math.sin(time + y * 8) * 0.45);
      positions[index * 3 + 1] = 1 + y * 12 - fall * (wetWeather ? weather === "storm" ? 0.52 : 0.42 : 0.12);
      positions[index * 3 + 2] = 8 - z * 42 - fall * 0.4;
    }
    const attribute = pointsRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    attribute.needsUpdate = true;
  });
  if (count === 0) return null;
  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} usage={THREE.DynamicDrawUsage} />
      </bufferGeometry>
      <pointsMaterial
        color={weather === "ash" ? "#f2e7d8" : weather === "storm" ? "#c6dcf5" : weather === "rain" ? "#b4d9f0" : weather === "fog" ? "#d4c9c0" : "#ffca8a"}
        size={weather === "ash" ? 0.058 : weather === "storm" ? 0.11 : weather === "rain" ? 0.09 : 0.1}
        sizeAttenuation
        transparent
        opacity={weather === "ash" ? 0.5 : weather === "fog" ? 0.34 : weather === "storm" ? 0.76 : 0.66}
        depthWrite={false}
      />
    </points>
  );
}

function AmbientMotes({
  motionRef,
  quality,
  motionReduced,
}: {
  motionRef: Props["motionRef"];
  quality: WorldQuality;
  motionReduced: boolean;
}) {
  const count = quality === "high" ? 28 : quality === "balanced" ? 16 : 8;
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const seeds = useMemo(() => {
    const random = seededRandom(0x42cafe);
    return Array.from({ length: count }, () => [random(), random(), random()]);
  }, [count]);
  useFrame((frame) => {
    const points = pointsRef.current;
    if (!points) return;
    const time = motionReduced ? 0 : frame.clock.elapsedTime;
    for (let index = 0; index < count; index += 1) {
      const [x, y, z] = seeds[index];
      positions[index * 3] = (x - 0.5) * 29 + Math.sin(time * 0.18 + z * 12) * 0.7;
      positions[index * 3 + 1] = 0.8 + y * 8 + Math.sin(time * 0.5 + x * 9) * 0.35;
      positions[index * 3 + 2] = 8 - z * 42;
    }
    const position = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    position.needsUpdate = true;
  });
  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} usage={THREE.DynamicDrawUsage} />
      </bufferGeometry>
      <pointsMaterial
        color="#e5bb83"
        size={0.075}
        sizeAttenuation
        transparent
        opacity={0.42}
        depthWrite={false}
      />
    </points>
  );
}

function getChunks(distance: number) {
  const current = Math.floor(Math.max(0, distance) / WORLD_CHUNK_LENGTH_METERS);
  const chunks: WorldChunk[] = [];
  for (let index = current - 1; index <= current + 3; index += 1) {
    if (index >= 0) chunks.push(createWorldChunk(index));
  }
  return chunks;
}

export default function WorldLandscape({ motionRef, quality, weather, motionReduced }: Props) {
  const [chunkState, setChunkState] = useState(() => ({
    index: Math.floor(motionRef.current.distance / WORLD_CHUNK_LENGTH_METERS),
    chunks: getChunks(motionRef.current.distance),
  }));
  const objects = useMemo(() => chunkState.chunks.flatMap((chunk) => chunk.objects), [chunkState.chunks]);
  const rockObjects = useMemo(() => objects.filter((object) => object.kind === "rock"), [objects]);
  const scenicObjects = useMemo(() => objects.filter((object) => object.kind !== "rock"), [objects]);
  const shadowMapSize = getShadowMapSize(
    quality,
    typeof window === "undefined" ? 1 : window.devicePixelRatio,
  );

  useFrame(() => {
    const index = Math.floor(motionRef.current.distance / WORLD_CHUNK_LENGTH_METERS);
    if (index === chunkState.index) return;
    setChunkState({ index, chunks: getChunks(motionRef.current.distance) });
  });

  return (
    <group name="rebuilt-road-world">
      <WorldSky motionRef={motionRef} />
      <DistantRidges motionRef={motionRef} quality={quality} />
      <Road motionRef={motionRef} weather={weather} quality={quality} />
      {scenicObjects.map((object) => (
        <ScenicProp
          key={object.id}
          object={object}
          motionRef={motionRef}
          motionReduced={motionReduced}
        />
      ))}
      {rockObjects.length > 0 && (
        <Suspense fallback={(
          <group>
            {rockObjects.map((object) => (
              <ScenicProp key={object.id} object={object} motionRef={motionRef} motionReduced={motionReduced} />
            ))}
          </group>
        )}>
          <WorldAssetErrorBoundary fallback={(
            <group>
              {rockObjects.map((object) => (
                <ScenicProp key={object.id} object={object} motionRef={motionRef} motionReduced={motionReduced} />
              ))}
            </group>
          )}>
            <WorldAssetInstanceBatch
              src="/assets/rock-wall.glb"
              targetHeight={2.15}
              items={rockObjects}
              motionRef={motionRef}
              maxDetailedDistance={72}
            />
          </WorldAssetErrorBoundary>
          <WorldRockFarLod items={rockObjects} motionRef={motionRef} />
        </Suspense>
      )}
      <WeatherParticles weather={weather} quality={quality} motionReduced={motionReduced} />
      <AmbientMotes motionRef={motionRef} quality={quality} motionReduced={motionReduced} />
      <hemisphereLight args={["#fff1d9", "#81796b", 1.35]} />
      <ambientLight color="#ffe8c9" intensity={0.3} />
      <directionalLight
        position={[-22, 34, -42]}
        color="#ffd39b"
        intensity={1.45}
        castShadow={quality !== "low"}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={38}
        shadow-camera-bottom={-18}
        shadow-camera-far={180}
        shadow-bias={-0.0002}
        shadow-normalBias={0.025}
        shadow-radius={4}
      />
      <directionalLight position={[14, 18, -26]} color="#b7d9ed" intensity={0.32} />
      <pointLight position={[0, 5.8, 1.5]} color="#ffc681" intensity={3.1} distance={20} decay={2} />
    </group>
  );
}
