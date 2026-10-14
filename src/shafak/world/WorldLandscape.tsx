import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldMotion } from "./movement";
import { WORLD_CHUNK_LENGTH_METERS } from "./movement";
import { createWorldChunk, type WorldChunk, type WorldObject } from "./world-generation";
import { getBiomeTransition, WORLD_BIOME_PALETTES, type WeatherMode } from "./world-biomes";

type WorldQuality = "high" | "balanced" | "low";

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
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Yol dokusu için 2D canvas oluşturulamadı.");

  const base = context.createLinearGradient(0, 0, canvas.width, 0);
  base.addColorStop(0, "#493b3b");
  base.addColorStop(0.14, "#514340");
  base.addColorStop(0.5, "#45383a");
  base.addColorStop(0.86, "#51413d");
  base.addColorStop(1, "#443638");
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const random = seededRandom(0x4b11a7);
  for (let index = 0; index < 1500; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const size = 0.4 + random() * 2.2;
    const light = random() > 0.53;
    context.fillStyle = light
      ? `rgba(211,174,139,${0.035 + random() * 0.1})`
      : `rgba(12,11,15,${0.04 + random() * 0.11})`;
    context.fillRect(x, y, size * (1 + random() * 3), size);
  }

  context.lineCap = "round";
  for (let index = 0; index < 26; index += 1) {
    const x = 35 + random() * 185;
    const y = random() * canvas.height;
    const length = 12 + random() * 54;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 13, y + length * 0.52);
    context.lineTo(x + (random() - 0.5) * 28, y + length);
    context.strokeStyle = `rgba(17,15,18,${0.28 + random() * 0.35})`;
    context.lineWidth = 0.6 + random() * 1.5;
    context.stroke();
  }

  for (const x of [19, 237]) {
    context.fillStyle = "rgba(236,197,137,.66)";
    context.fillRect(x, 0, 1.3, canvas.height);
    context.fillStyle = "rgba(30,24,26,.6)";
    context.fillRect(x + (x < 128 ? 3 : -3), 0, 1, canvas.height);
  }
  context.setLineDash([18, 22]);
  context.strokeStyle = "rgba(234,201,150,.4)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(128, 0);
  context.lineTo(128, canvas.height);
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, ROAD_LENGTH / 46);
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

function WorldSky({ motionRef }: { motionRef: Props["motionRef"] }) {
  const geometry = useMemo(makeSkyGeometry, []);
  const lastPaintedBiome = useMemo(() => ({ biome: "", mix: -1 }), []);
  const moonColor = useMemo(() => new THREE.Color("#ffd7a3"), []);
  useFrame(() => {
    const transition = getBiomeTransition(motionRef.current.distance);
    if (transition.biome !== lastPaintedBiome.biome || Math.abs(transition.mix - lastPaintedBiome.mix) > 0.012) {
      paintSky(geometry, motionRef.current.distance);
      lastPaintedBiome.biome = transition.biome;
      lastPaintedBiome.mix = transition.mix;
    }
  });
  return (
    <>
      <mesh geometry={geometry} frustumCulled={false} renderOrder={-30}>
        <meshBasicMaterial vertexColors side={THREE.BackSide} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[37, 47, -168]} renderOrder={-20}>
        <sphereGeometry args={[4.4, 20, 14]} />
        <meshBasicMaterial color={moonColor} toneMapped={false} />
      </mesh>
      <mesh position={[37, 47, -168]} scale={[2.35, 2.35, 0.2]} renderOrder={-21}>
        <sphereGeometry args={[5.1, 20, 14]} />
        <meshBasicMaterial color="#ed956e" transparent opacity={0.08} depthWrite={false} toneMapped={false} />
      </mesh>
      <color attach="background" args={["#443541"]} />
    </>
  );
}

function RidgeLayer({
  motionRef,
  layer,
  seed,
  color,
}: {
  motionRef: Props["motionRef"];
  layer: number;
  seed: number;
  color: string;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.ConeGeometry(1, 1, 6, 1), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    flatShading: true,
    emissive: color,
    emissiveIntensity: 0.08,
  }), [color]);
  const peaks = useMemo(() => {
    const random = seededRandom(seed);
    return Array.from({ length: 48 }, (_, index) => {
      const row = Math.floor(index / 16);
      const column = index % 16;
      return {
        x: (column - 7.5) * (row === 0 ? 21 : 17) + (random() - 0.5) * 8,
        y: 4 + random() * (row === 0 ? 18 : 29),
        z: -92 - layer * 28 - row * 33 - random() * 20,
        width: 10 + random() * 18,
        height: 24 + random() * (row === 0 ? 34 : 56),
        lean: (random() - 0.5) * 0.3,
      };
    });
  }, [layer, seed]);
  const transform = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let index = 0; index < peaks.length; index += 1) {
      const peak = peaks[index];
      transform.position.set(peak.x, peak.y, peak.z);
      transform.rotation.set(0, peak.lean, 0);
      transform.scale.set(peak.width, peak.height, peak.width * 0.7);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [peaks, transform]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.position.z = -((motionRef.current.cameraX * (0.025 + layer * 0.018)) % 150);
  });
  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, peaks.length]}
      frustumCulled={false}
      castShadow={false}
      receiveShadow={false}
    />
  );
}

function DistantRidges({ motionRef }: { motionRef: Props["motionRef"] }) {
  const colors = useMemo(() => ({
    far: new THREE.Color("#373746"),
    middle: new THREE.Color("#51414a"),
    near: new THREE.Color("#6a4b4c"),
  }), []);
  return (
    <>
      <RidgeLayer motionRef={motionRef} layer={0} seed={0x45a21} color={colors.far.getStyle()} />
      <RidgeLayer motionRef={motionRef} layer={1} seed={0x92a51} color={colors.middle.getStyle()} />
      <RidgeLayer motionRef={motionRef} layer={2} seed={0x175a2} color={colors.near.getStyle()} />
    </>
  );
}

function Road({ motionRef, weather }: { motionRef: Props["motionRef"]; weather: WeatherMode }) {
  const texture = useMemo(createRoadTexture, []);
  const chipsRef = useRef<THREE.InstancedMesh>(null);
  const chipTransform = useMemo(() => new THREE.Object3D(), []);
  const chipGeometry = useMemo(() => new THREE.CircleGeometry(1, 5), []);
  const chipMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 1,
    flatShading: true,
  }), []);
  const groundMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#554447",
    roughness: 1,
    flatShading: true,
  }), []);
  const roadMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    map: texture,
    color: "#eee2d7",
    roughness: weather === "rain" ? 0.42 : 0.94,
    metalness: weather === "rain" ? 0.1 : 0.02,
    emissive: "#201819",
    emissiveIntensity: 0.16,
  }), [texture, weather]);
  const railMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#927266",
    roughness: 0.88,
    metalness: 0.1,
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
    groundMaterial.color.set(from.ground).lerp(new THREE.Color(to.ground), transition.mix);
    roadMaterial.color.set(from.road).lerp(new THREE.Color(to.road), transition.mix);
    texture.offset.y = ((motionRef.current.cameraX / 46) % 1 + 1) % 1;
    if (weather === "rain") {
      roadMaterial.roughness = 0.42;
      roadMaterial.metalness = 0.1;
    } else {
      roadMaterial.roughness = 0.94;
      roadMaterial.metalness = 0.02;
    }
  });

  return (
    <group>
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
        <planeGeometry args={[14.2, ROAD_LENGTH]} />
        <primitive object={roadMaterial} attach="material" />
      </mesh>
      {[-7.12, 7.12].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.03, ROAD_CENTER_Z]} receiveShadow castShadow>
            <boxGeometry args={[0.3, 0.26, ROAD_LENGTH]} />
            <primitive object={railMaterial} attach="material" />
          </mesh>
          <mesh position={[x * 1.07, -0.05, ROAD_CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.2, ROAD_LENGTH]} />
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
            <cylinderGeometry args={[0.07, 0.15, 2.5, 6]} />
            <meshStandardMaterial color="#55413c" roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.58, 0]}>
            <octahedronGeometry args={[0.22, 0]} />
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
  const tint = object.biome === "frozen-pass" ? "#77919e"
    : object.biome === "red-marsh" ? "#72504d" : "#705d58";
  const seed = object.flickerSeed;

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
      position={[object.lane * 9.7, 0, 0]}
      rotation={[0, (seed % 63) * 0.1, 0]}
      scale={object.scale}
    >
      {(object.kind === "tower" || object.kind === "ruin" || object.kind === "arch") && (
        <group>
          <mesh position={[-1.35, 1.9, 0]}>
            <boxGeometry args={[0.72, 3.8, 0.82]} />
            <meshStandardMaterial color={tint} roughness={0.96} flatShading />
          </mesh>
          <mesh position={[1.35, 2.35, 0]}>
            <boxGeometry args={[0.7, 4.7, 0.86]} />
            <meshStandardMaterial color="#806761" roughness={0.93} flatShading />
          </mesh>
          <mesh position={[0, 4.45, 0]}>
            <boxGeometry args={[3.5, 0.62, 0.94]} />
            <meshStandardMaterial color="#76605d" roughness={0.94} flatShading />
          </mesh>
          <mesh position={[-1.35, 2.52, 0.44]}>
            <boxGeometry args={[0.18, 0.62, 0.08]} />
            <meshBasicMaterial color="#f3a36c" toneMapped={false} />
          </mesh>
          <mesh position={[1.35, 2.92, 0.46]}>
            <boxGeometry args={[0.16, 0.56, 0.08]} />
            <meshBasicMaterial color="#ffd49a" toneMapped={false} />
          </mesh>
          {object.kind === "arch" && (
            <mesh position={[0, 3.9, 0.08]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[1.15, 0.2, 6, 10, Math.PI]} />
              <meshStandardMaterial color="#90776b" roughness={0.92} flatShading />
            </mesh>
          )}
        </group>
      )}
      {(object.kind === "tree" || object.kind === "mangrove") && (
        <group ref={swayRef}>
          <mesh position={[0, 1.55, 0]}>
            <cylinderGeometry args={[0.12, 0.32, 3.1, 6]} />
            <meshStandardMaterial color="#392c2b" roughness={1} flatShading />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.56, 2.24, 0]} rotation={[0, 0, -side * 0.56]}>
              <cylinderGeometry args={[0.035, 0.13, 1.8, 5]} />
              <meshStandardMaterial color="#413130" roughness={1} flatShading />
            </mesh>
          ))}
          <mesh position={[0.04, 3.22, 0]} rotation={[0.04, 0.18, -0.08]}>
            <coneGeometry args={[1.1, 2.25, 5]} />
            <meshStandardMaterial color={object.kind === "mangrove" ? "#53614b" : "#303039"} roughness={1} flatShading />
          </mesh>
        </group>
      )}
      {(object.kind === "rock" || object.kind === "ice-crystal" || object.kind === "crystal") && (
        <group>
          <mesh position={[0, 0.58, 0]} rotation={[0.12, 0.34, 0.14]}>
            {object.kind === "ice-crystal"
              ? <octahedronGeometry args={[0.88, 0]} />
              : <dodecahedronGeometry args={[0.82, 0]} />}
            <meshStandardMaterial
              color={object.kind === "ice-crystal" ? "#9ed8e8" : object.kind === "crystal" ? "#d58866" : "#655858"}
              emissive={object.kind === "ice-crystal" ? "#3caaba" : object.kind === "crystal" ? "#bd593b" : "#000000"}
              emissiveIntensity={object.kind === "rock" ? 0 : 0.52}
              metalness={object.kind === "rock" ? 0.04 : 0.34}
              roughness={0.48}
              flatShading
            />
          </mesh>
          {object.kind === "rock" && (
            <mesh position={[0.62, 0.34, -0.12]} rotation={[0.2, 0.1, 0.16]} scale={0.62}>
              <dodecahedronGeometry args={[0.72, 0]} />
              <meshStandardMaterial color="#51494b" roughness={0.98} flatShading />
            </mesh>
          )}
        </group>
      )}
      {object.kind === "flag" && (
        <group ref={swayRef}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.045, 0.08, 3, 6]} />
            <meshStandardMaterial color="#b18a5a" metalness={0.35} roughness={0.65} />
          </mesh>
          <mesh position={[0.67, 2.64, 0]}>
            <boxGeometry args={[1.35, 0.78, 0.08]} />
            <meshStandardMaterial color={seed % 2 ? "#863a43" : "#35445b"} roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, 3.17, 0]}>
            <coneGeometry args={[0.11, 0.24, 5]} />
            <meshStandardMaterial color="#e6bf7d" metalness={0.45} roughness={0.42} />
          </mesh>
        </group>
      )}
      {(object.kind === "torch" || object.kind === "firepit") && (
        <group position={[0, object.kind === "torch" ? 1.68 : 0.4, 0]}>
          <mesh position={[0, -0.65, 0]}>
            <cylinderGeometry args={[0.06, 0.12, object.kind === "torch" ? 1.35 : 0.5, 6]} />
            <meshStandardMaterial color="#58413a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <coneGeometry args={[0.16, 0.4, 5]} />
            <meshBasicMaterial color={object.biome === "frozen-pass" ? "#92edff" : "#ffbd75"} toneMapped={false} />
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
          <cylinderGeometry args={[0.025, 0.055, 1.4, 4]} />
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
    for (let index = 0; index < count; index += 1) {
      const [x, y, z] = seeds[index];
      const fall = (time * (weather === "rain" ? 13 : 1.2) + z * 28) % 28;
      positions[index * 3] = (x - 0.5) * 30 + (weather === "rain" ? -fall * 0.08 : Math.sin(time + y * 8) * 0.45);
      positions[index * 3 + 1] = 1 + y * 12 - fall * (weather === "rain" ? 0.42 : 0.12);
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
        color={weather === "rain" ? "#b4d9f0" : weather === "fog" ? "#d4c9c0" : "#ffca8a"}
        size={weather === "rain" ? 0.09 : 0.1}
        sizeAttenuation
        transparent
        opacity={weather === "fog" ? 0.34 : 0.66}
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

  useFrame(() => {
    const index = Math.floor(motionRef.current.distance / WORLD_CHUNK_LENGTH_METERS);
    if (index === chunkState.index) return;
    setChunkState({ index, chunks: getChunks(motionRef.current.distance) });
  });

  return (
    <group name="rebuilt-road-world">
      <WorldSky motionRef={motionRef} />
      <DistantRidges motionRef={motionRef} />
      <Road motionRef={motionRef} weather={weather} />
      {objects.map((object) => (
        <ScenicProp
          key={object.id}
          object={object}
          motionRef={motionRef}
          motionReduced={motionReduced}
        />
      ))}
      <WeatherParticles weather={weather} quality={quality} motionReduced={motionReduced} />
      <hemisphereLight args={["#f2d6c6", "#322a32", 1.72]} />
      <ambientLight color="#f4d5c0" intensity={0.72} />
      <directionalLight position={[-22, 32, 18]} color="#ffe0b9" intensity={2.45} />
      <directionalLight position={[14, 18, -26]} color="#a6c4e6" intensity={0.62} />
      <pointLight position={[0, 5.8, 1.5]} color="#ffb66d" intensity={11} distance={20} decay={2} />
    </group>
  );
}
