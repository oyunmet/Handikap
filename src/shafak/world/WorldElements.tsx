import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MutableRefObject } from "react";
import { WORLD_GATE_INTERVAL_METERS, type WorldMotion } from "./movement";
import { nextGateDistance } from "./world-generation";
import type { WorldChunk, WorldObject } from "./world-generation";
import type { WorldQuality } from "./World3D";

type MotionRef = MutableRefObject<WorldMotion>;
type LocalLightIds = MutableRefObject<Set<string>>;

const STONE_GEOMETRY = new THREE.DodecahedronGeometry(0.5, 0);
const STONE_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#665c56",
  roughness: 0.94,
  metalness: 0.06,
  flatShading: true,
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
  motionRef,
  quality,
}: {
  chunk: WorldChunk;
  motionRef: MotionRef;
  quality: WorldQuality;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const stonesRef = useRef<THREE.InstancedMesh>(null);
  const stones = useMemo(() => {
    const random = seededRandom(chunk.index * 0x45d9f3b);
    const count = quality === "high" ? 30 : quality === "balanced" ? 20 : 12;
    return Array.from({ length: count }, () => ({
      x: (random() - 0.5) * 12.6,
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

  useFrame(() => {
    if (!rootRef.current) return;
    rootRef.current.position.z = -((chunk.start + (chunk.end - chunk.start) / 2) - motionRef.current.cameraX);
  });

  return (
    <group ref={rootRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <planeGeometry args={[100, chunk.end - chunk.start]} />
        <meshStandardMaterial color="#50464a" roughness={1} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.045, 0]}>
        <planeGeometry args={[13.6, chunk.end - chunk.start]} />
        <meshStandardMaterial color="#332f34" roughness={0.98} metalness={0.08} />
      </mesh>
      <mesh position={[-6.75, 0.02, 0]}>
        <boxGeometry args={[0.26, 0.08, chunk.end - chunk.start]} />
        <meshStandardMaterial color="#897164" roughness={0.9} />
      </mesh>
      <mesh position={[6.75, 0.02, 0]}>
        <boxGeometry args={[0.26, 0.08, chunk.end - chunk.start]} />
        <meshStandardMaterial color="#897164" roughness={0.9} />
      </mesh>
      <instancedMesh
        ref={stonesRef}
        args={[STONE_GEOMETRY, STONE_MATERIAL, stones.length]}
        castShadow={false}
        receiveShadow={false}
        dispose={null}
      />
    </group>
  );
}

function FlagCloth({ motionReduced }: { motionReduced: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
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

function Flame({
  color = "#f7a957",
  sourceId,
  localLightIds,
}: {
  color?: string;
  sourceId: string;
  localLightIds: LocalLightIds;
}) {
  const flameRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    const pulse = 0.88 + Math.sin(state.clock.elapsedTime * 13.4) * 0.1
      + Math.sin(state.clock.elapsedTime * 7.1 + 1.7) * 0.08;
    const isActive = localLightIds.current.has(sourceId);
    if (flameRef.current) flameRef.current.scale.y = pulse;
    if (lightRef.current) {
      lightRef.current.visible = isActive;
      lightRef.current.intensity = isActive ? 1.5 + pulse * 0.75 : 0;
    }
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
      <pointLight ref={lightRef} position={[0, 0.25, 0]} color={color} distance={10} decay={2} intensity={0} />
    </group>
  );
}

function WorldProp({
  object,
  motionRef,
  motionReduced,
  localLightIds,
}: {
  object: WorldObject;
  motionRef: MotionRef;
  motionReduced: boolean;
  localLightIds: LocalLightIds;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const scale = object.scale;
  const swayRef = useRef<THREE.Group>(null);

  useFrame((frame) => {
    const cameraX = motionRef.current.cameraX;
    if (rootRef.current) rootRef.current.position.z = -(object.worldX - cameraX);
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
            <>
              <mesh position={[0, 0.9, 0]}>
                <cylinderGeometry args={[0.07, 0.12, 1.8, 6]} />
                <meshStandardMaterial color="#4a3028" roughness={0.88} />
              </mesh>
              <mesh position={[0, 1.72, 0]}>
                <cylinderGeometry args={[0.22, 0.16, 0.2, 6]} />
                <meshStandardMaterial color="#777071" roughness={0.82} metalness={0.34} />
              </mesh>
          <group position={[0, 1.82, 0]}><Flame sourceId={object.id} localLightIds={localLightIds} /></group>
            </>
          ) : (
            <>
              {Array.from({ length: 7 }, (_, index) => {
                const angle = (index / 7) * Math.PI * 2;
                return (
                  <mesh key={index} position={[Math.cos(angle) * 0.58, 0.16, Math.sin(angle) * 0.58]}>
                    <dodecahedronGeometry args={[0.28, 0]} />
                    <meshStandardMaterial color={index % 2 ? "#6d5951" : "#82706a"} roughness={0.96} flatShading />
                  </mesh>
                );
              })}
              <group position={[0, 0.28, 0]}><Flame sourceId={object.id} localLightIds={localLightIds} /></group>
            </>
          )}
        </group>
      )}
      {object.kind === "crystal" && (
        <CrystalProp object={object} localLightIds={localLightIds} />
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

function CrystalProp({ object, localLightIds }: { object: WorldObject; localLightIds: LocalLightIds }) {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (!lightRef.current) return;
    const isActive = localLightIds.current.has(object.id);
    lightRef.current.visible = isActive;
    lightRef.current.intensity = isActive ? 1.2 : 0;
  });
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
      <pointLight ref={lightRef} position={[0, 0.9, 0]} color="#ee935e" intensity={0} distance={9} />
    </group>
  );
}

function createSkyGeometry() {
  const geometry = new THREE.SphereGeometry(260, 32, 16);
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  const horizon = new THREE.Color("#9c5a48");
  const middle = new THREE.Color("#343044");
  const zenith = new THREE.Color("#141d32");
  const dusk = new THREE.Color("#60434a");
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
const SKY_MATERIAL = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, toneMapped: false });

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

function FarMountains({ motionRef }: { motionRef: MotionRef }) {
  const rootRef = useRef<THREE.Group>(null);
  const shapes = useMemo(() => {
    const random = seededRandom(0x101f881);
    return Array.from({ length: 11 }, (_, index) => ({
      x: (index - 5) * 18 + (random() - 0.5) * 8,
      y: 9 + random() * 8,
      z: -86 - random() * 32,
      radius: 16 + random() * 15,
      height: 25 + random() * 24,
      color: ["#2b2935", "#33303a", "#3c3038"][index % 3],
      rotation: random() * 0.45,
    }));
  }, []);
  useFrame(() => {
    if (!rootRef.current) return;
    rootRef.current.position.z = -((motionRef.current.cameraX * 0.12) % 88);
  });
  return (
    <group ref={rootRef}>
      {shapes.map((mountain, index) => (
        <mesh
          key={index}
          position={[mountain.x, mountain.y, mountain.z]}
          rotation={[0, mountain.rotation, 0]}
          scale={[1.2, 1, 0.7]}
        >
          <coneGeometry args={[mountain.radius, mountain.height, 5]} />
          <meshStandardMaterial color={mountain.color} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

export function AshSky({ motionRef }: { motionRef: MotionRef }) {
  const moonPosition: [number, number, number] = [48, 54, -108];
  return (
    <>
      <mesh geometry={SKY_GEOMETRY} material={SKY_MATERIAL} frustumCulled={false} dispose={null} />
      <points geometry={STAR_GEOMETRY} frustumCulled={false} dispose={null}>
        <pointsMaterial color="#f8dba4" size={0.72} sizeAttenuation={false} transparent opacity={0.72} depthWrite={false} />
      </points>
      <mesh position={moonPosition}>
        <sphereGeometry args={[5.5, 10, 8]} />
        <meshBasicMaterial color="#eac29b" transparent opacity={0.09} depthWrite={false} />
      </mesh>
      <mesh position={moonPosition}>
        <sphereGeometry args={[2.15, 12, 8]} />
        <meshStandardMaterial color="#ead3b0" emissive="#9f785f" emissiveIntensity={0.38} roughness={0.8} />
      </mesh>
      <FarMountains motionRef={motionRef} />
    </>
  );
}

export function WorldChunks({
  chunks,
  motionRef,
  motionReduced,
  quality,
  airEnabled,
}: {
  chunks: WorldChunk[];
  motionRef: MotionRef;
  motionReduced: boolean;
  quality: WorldQuality;
  airEnabled: boolean;
}) {
  const lightCandidates = chunks.flatMap((chunk) => chunk.objects)
    .filter((object) => object.kind === "torch" || object.kind === "firepit" || object.kind === "crystal");
  const localLightIds = useRef(new Set<string>());
  useFrame(() => {
    const nearest = lightCandidates
      .map((object) => ({ id: object.id, distance: Math.abs(object.worldX - motionRef.current.cameraX) }))
      .filter((object) => object.distance < 40)
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 3);
    localLightIds.current.clear();
    for (const light of nearest) localLightIds.current.add(light.id);
  });
  return (
    <>
      {chunks.map((chunk) => <RoadSegment key={`road-${chunk.index}`} chunk={chunk} motionRef={motionRef} quality={quality} />)}
      {chunks.flatMap((chunk) => chunk.objects.map((object) => {
        return (
          <WorldProp
            key={object.id}
            object={object}
            motionRef={motionRef}
            motionReduced={motionReduced}
            localLightIds={localLightIds}
          />
        );
      }))}
      <FinalGate motionRef={motionRef} />
      <group position={[0, 1.4, -12]} visible={airEnabled}>
        <Sparkles
          count={quality === "high" ? 40 : quality === "balanced" ? 24 : 10}
          scale={[18, 5, 34]}
          size={quality === "high" ? 2.3 : 1.6}
          speed={motionReduced ? 0 : 0.18}
          color="#e5a566"
          opacity={0.48}
          noise={0.8}
        />
      </group>
    </>
  );
}

function FinalGate({ motionRef }: { motionRef: MotionRef }) {
  const groupRef = useRef<THREE.Group>(null);
  const flareRef = useRef<THREE.Mesh>(null);
  useFrame((frame) => {
    if (!groupRef.current) return;
    const distance = motionRef.current.distance;
    const gateDistance = nextGateDistance(distance);
    groupRef.current.position.z = -(gateDistance - distance);
    if (flareRef.current) {
      const material = flareRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.12 + (Math.sin(frame.clock.elapsedTime * 1.4) + 1) * 0.045;
    }
  });
  return (
      <group ref={groupRef} position={[0, 0, -WORLD_GATE_INTERVAL_METERS]}>
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
      <mesh position={[0, 5.1, 0.06]}>
        <boxGeometry args={[9.2, 8.2, 0.7]} />
        <meshStandardMaterial color="#1b1a22" emissive="#713f37" emissiveIntensity={0.14} roughness={0.86} />
      </mesh>
      <mesh ref={flareRef} position={[0, 5.1, 0.48]}>
        <planeGeometry args={[8.4, 7.3]} />
        <meshBasicMaterial color="#f29a62" transparent opacity={0.15} depthWrite={false} />
      </mesh>
      {[-6.2, 6.2].map((x) => (
        <group key={x} position={[x, 8.5, -0.7]}>
          <mesh>
            <coneGeometry args={[0.34, 1.4, 5]} />
            <meshStandardMaterial color="#c19964" metalness={0.45} roughness={0.4} flatShading />
          </mesh>
          <pointLight position={[0, 0, 0.5]} color="#e88951" intensity={1.2} distance={18} />
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
