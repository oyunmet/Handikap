import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldMotion } from "./movement";
import { WORLD_CHUNK_LENGTH_METERS } from "./movement";
import {
  createWorldChunk,
  WORLD_SCENERY_LATERAL_SCALE,
  type WorldChunk,
  type WorldObject,
} from "./world-generation";
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
  getWorldRidgeDistance,
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
import {
  paintWorldSkyGradient,
  WORLD_SKY_BACKGROUND_HEIGHT,
  WORLD_SKY_BACKGROUND_WIDTH,
} from "./world-sky-background.ts";
import WorldStaticBatches from "./WorldStaticBatches";
import { getWorldGlowTexture } from "./world-glow.ts";

type WorldQuality = LandscapeQuality;

function WorldGlowSprite({
  color,
  position = [0, 0.3, 0],
  size = 2.8,
  opacity = 0.3,
}: {
  color: string;
  position?: [number, number, number];
  size?: number;
  opacity?: number;
}) {
  const texture = useMemo(() => getWorldGlowTexture(), []);
  if (!texture) return null;
  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

type Props = {
  motionRef: MutableRefObject<WorldMotion>;
  quality: WorldQuality;
  weather: WeatherMode;
  motionReduced: boolean;
};

const ROAD_LENGTH = 440;
const ROAD_CENTER_Z = -150;

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
  const background = useMemo(() => {
    const pixels = new Uint8Array(
      WORLD_SKY_BACKGROUND_WIDTH * WORLD_SKY_BACKGROUND_HEIGHT * 4,
    );
    const texture = new THREE.DataTexture(
      pixels,
      WORLD_SKY_BACKGROUND_WIDTH,
      WORLD_SKY_BACKGROUND_HEIGHT,
      THREE.RGBAFormat,
    );
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return { pixels, texture };
  }, []);
  const lastPaintedBiome = useMemo(() => ({ biome: "", mix: -1 }), []);
  const { scene } = useThree();
  useLayoutEffect(() => {
    const previousBackground = scene.background;
    const previousBackgroundIntensity = scene.backgroundIntensity;
    scene.background = background.texture;
    scene.backgroundIntensity = 1;
    return () => {
      if (scene.background === background.texture) scene.background = previousBackground;
      scene.backgroundIntensity = previousBackgroundIntensity;
      background.texture.dispose();
    };
  }, [background, scene]);
  useFrame(() => {
    const transition = getBiomeTransition(motionRef.current.distance);
    if (transition.biome !== lastPaintedBiome.biome || Math.abs(transition.mix - lastPaintedBiome.mix) > 0.012) {
      paintWorldSkyGradient(
        background.pixels,
        WORLD_SKY_BACKGROUND_WIDTH,
        WORLD_SKY_BACKGROUND_HEIGHT,
        motionRef.current.distance,
      );
      background.texture.needsUpdate = true;
      lastPaintedBiome.biome = transition.biome;
      lastPaintedBiome.mix = transition.mix;
    }
    if (scene.background !== background.texture) scene.background = background.texture;
  });
  return null;
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
    mesh.position.z = -getWorldRidgeDistance(motionRef.current.cameraX, layer);
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
      name={`distant-ridge-layer-${layer}`}
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
          <mesh position={[x * 1.02, -0.015, ROAD_CENTER_Z]} rotation={[Math.PI / 2, 0, 0]} receiveShadow castShadow={false}>
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
  const sceneryX = object.lane * WORLD_SCENERY_LATERAL_SCALE;
  const groundY = useMemo(() => raycastWorldGround(sceneryX, -150), [sceneryX]);

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
      name={`world-scenery:${object.kind}:${object.id}`}
      userData={{ cameraOccluder: true }}
      position={[sceneryX, groundY, 0]}
      rotation={[0, (seed % 63) * 0.1, 0]}
      scale={object.scale}
    >
      {(object.kind === "tower" || object.kind === "column" || object.kind === "ruin" || object.kind === "arch") && (
        <group>
          {landmarkGeometry && (
            <mesh
              geometry={landmarkGeometry}
              material={WEATHERED_LANDMARK_MATERIAL}
              castShadow={false}
              receiveShadow={false}
            />
          )}
        </group>
      )}
      {(object.kind === "tree" || object.kind === "pine-tree" || object.kind === "skeletal-tree" || object.kind === "mangrove") && (
        <group ref={swayRef}>
          <mesh
            geometry={treeGeometry}
            material={NATURAL_TREE_MATERIAL}
            castShadow={false}
            receiveShadow={false}
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
            castShadow={false}
            receiveShadow={false}
          >
            <meshStandardMaterial {...STONE_PBR_MATERIAL_PROPS} color="#a69f90" roughness={0.9} metalness={0} />
          </mesh>
          <mesh
            geometry={getNaturalRockGeometry(seed + 1)}
            position={[0.62, 0.3, -0.12]}
            rotation={[0.2, 0.1, 0.16]}
            scale={[0.54, 0.48, 0.58]}
            castShadow={false}
            receiveShadow={false}
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
          <WorldGlowSprite
            color={object.biome === "frozen-pass" ? "#8ce7ff" : "#ff9957"}
            position={[0, 0.25, 0.02]}
            size={3}
            opacity={0.34}
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

function PlayerShadowSun({
  motionRef,
  quality,
  shadowMapSize,
}: {
  motionRef: Props["motionRef"];
  quality: WorldQuality;
  shadowMapSize: number;
}) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const shadowTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.name = "player-following-shadow-target";
    return target;
  }, []);

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;
    const playerX = motionRef.current.depth * 5.2;
    shadowTarget.position.set(playerX, 0, 0);
    light.position.set(playerX - 18, 30, 22);
    light.target = shadowTarget;
    shadowTarget.updateMatrixWorld();
    light.updateMatrixWorld();
  });

  return (
    <>
      <primitive object={shadowTarget} />
      <directionalLight
        ref={lightRef}
        position={[-18, 30, 22]}
        color="#ffd39b"
        intensity={1.45}
        castShadow={quality !== "low"}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-12.5}
        shadow-camera-right={12.5}
        shadow-camera-top={12.5}
        shadow-camera-bottom={-12.5}
        shadow-camera-near={0.5}
        shadow-camera-far={75}
        shadow-bias={-0.0002}
        shadow-normalBias={0.025}
        shadow-radius={3}
      />
    </>
  );
}

export default function WorldLandscape({ motionRef, quality, weather, motionReduced }: Props) {
  const [chunkState, setChunkState] = useState(() => ({
    index: Math.floor(motionRef.current.distance / WORLD_CHUNK_LENGTH_METERS),
    chunks: getChunks(motionRef.current.distance),
  }));
  const objects = useMemo(() => chunkState.chunks.flatMap((chunk) => chunk.objects), [chunkState.chunks]);
  const rockObjects = useMemo(() => objects.filter((object) => object.kind === "rock"), [objects]);
  const scenicObjects = useMemo(() => objects.filter((object) => object.kind !== "rock"), [objects]);
  const instancedScenery = useMemo(() => scenicObjects.filter((object) => object.kind !== "flag"), [scenicObjects]);
  const animatedScenery = useMemo(() => scenicObjects.filter((object) => object.kind === "flag"), [scenicObjects]);
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
      <WorldStaticBatches
        objects={instancedScenery}
        motionRef={motionRef}
        originDistance={motionRef.current.originDistance}
      />
      {animatedScenery.map((object) => (
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
      <PlayerShadowSun motionRef={motionRef} quality={quality} shadowMapSize={shadowMapSize} />
      <directionalLight position={[14, 18, -26]} color="#b7d9ed" intensity={0.32} />
    </group>
  );
}
