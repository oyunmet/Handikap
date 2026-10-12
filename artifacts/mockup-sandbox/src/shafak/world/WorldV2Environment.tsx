import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getBiomeTransition, WORLD_BIOME_PALETTES, type WeatherMode } from "./world-biomes";
import type { WorldMotion } from "./movement";
import type { WorldQuality } from "./World3D";
import { createWorldV2DuneData } from "./world-v2-geometry";

type Props = {
  motionRef: { current: WorldMotion };
  weather: WeatherMode;
  quality: WorldQuality;
  motionReduced: boolean;
};

type InstanceTransform = {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
};

const SKY_VERTEX = `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = `
  varying vec3 vDirection;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uDawn;
  uniform float uTime;
  uniform float uWeather;
  void main() {
    vec3 direction = normalize(vDirection);
    float height = smoothstep(-0.25, 0.82, direction.y);
    vec3 sky = mix(uHorizon, uZenith, height);
    float dawnBand = exp(-abs(direction.y + 0.025) * 17.0);
    sky = mix(sky, uDawn, dawnBand * 0.72);
    vec3 sunDirection = normalize(vec3(-0.12, 0.075, -1.0));
    float sunDistance = distance(direction, sunDirection);
    float halo = exp(-sunDistance * 8.0) * dawnBand * 0.34;
    float core = exp(-sunDistance * 72.0) * dawnBand * 0.72;
    sky += uDawn * (halo + core);
    float vapor = sin(direction.x * 4.0 + uTime * 0.012)
      * sin(direction.z * 3.0 - uTime * 0.009);
    sky = mix(sky, uHorizon, smoothstep(0.48, 0.93, vapor) * uWeather * (1.0 - height) * 0.1);
    gl_FragColor = vec4(max(sky, vec3(0.018)), 1.0);
    #include <colorspace_fragment>
  }
`;

const WEATHER_DENSITY: Record<WeatherMode, number> = {
  clear: 0.0016,
  ash: 0.0037,
  ember: 0.0031,
  fog: 0.0062,
};

const CAMERA_LOOK_TARGET = new THREE.Vector3();

const PALETTE_COLORS = Object.fromEntries(
  Object.entries(WORLD_BIOME_PALETTES).map(([key, palette]) => [key, {
    zenith: new THREE.Color(palette.zenith),
    horizon: new THREE.Color(palette.horizon),
    dawn: new THREE.Color(palette.skyTint),
    ground: new THREE.Color(palette.ground),
    road: new THREE.Color(palette.road),
    far: new THREE.Color(palette.mountainFar),
    mid: new THREE.Color(palette.mountainMid),
    near: new THREE.Color(palette.mountainNear),
    particles: new THREE.Color(palette.particles),
  }]),
) as Record<keyof typeof WORLD_BIOME_PALETTES, {
  zenith: THREE.Color;
  horizon: THREE.Color;
  dawn: THREE.Color;
  ground: THREE.Color;
  road: THREE.Color;
  far: THREE.Color;
  mid: THREE.Color;
  near: THREE.Color;
  particles: THREE.Color;
}>;

function createRoadGeometry() {
  const columns = 16;
  const rows = 176;
  const positions = new Float32Array((columns + 1) * (rows + 1) * 3);
  const colors = new Float32Array(positions.length);
  const indices: number[] = [];
  const worn = new THREE.Color("#806c59");
  const base = new THREE.Color("#38383d");
  for (let row = 0; row <= rows; row += 1) {
    const distance = -22 + (row / rows) * 242;
    const depth = Math.max(0, Math.min(1, (distance + 22) / 242));
    const width = 12.4 + (3.65 - 12.4) * Math.pow(depth, 0.74);
    const shoulder = Math.sin(distance * 0.093) * 0.3 + Math.sin(distance * 0.23) * 0.09;
    for (let column = 0; column <= columns; column += 1) {
      const vertex = row * (columns + 1) + column;
      const offset = vertex * 3;
      const u = column / columns;
      const across = (u - 0.5) * 2;
      const roughEdge = shoulder * Math.pow(Math.abs(across), 4);
      positions[offset] = across * width * 0.5 + roughEdge;
      positions[offset + 1] = 0.035 + Math.sin(distance * 0.13 + column * 0.8) * 0.018;
      positions[offset + 2] = 20 - distance;
      const centerWear = 1 - Math.min(1, Math.abs(across) * 1.12);
      const grit = 0.88 + ((row * 29 + column * 13 + row * column * 3) % 21) / 100;
      const color = base.clone().lerp(worn, centerWear * 0.24).multiplyScalar(grit);
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
      if (row < rows && column < columns) {
        const a = vertex;
        const b = a + columns + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeTransforms(count: number, seed: number, kind: "rubble" | "spire" | "marker"): InstanceTransform[] {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0xffff_ffff;
  };
  return Array.from({ length: count }, (_, index) => {
    const side = index % 2 ? 1 : -1;
    if (kind === "spire") {
      const height = 7 + random() * 18;
      return {
        x: side * (18 + random() * 34),
        y: height * 0.5 - 0.4,
        z: -158 - random() * 110,
        rx: (random() - 0.5) * 0.09,
        ry: random() * Math.PI,
        rz: (random() - 0.5) * 0.12,
        sx: 2.2 + random() * 3.6,
        sy: height,
        sz: 2.3 + random() * 3.3,
      };
    }
    if (kind === "marker") {
      const height = 2.1 + random() * 3.3;
      return {
        x: side * (6.5 + random() * 1.9),
        y: height * 0.5,
        z: -27 - index * (104 / Math.max(count - 1, 1)),
        rx: (random() - 0.5) * 0.1,
        ry: random() * Math.PI,
        rz: side * (random() * 0.09),
        sx: 0.72 + random() * 0.5,
        sy: height,
        sz: 0.82 + random() * 0.46,
      };
    }
    return {
      x: side * (6.5 + random() * 19),
      y: 0.12 + random() * 0.35,
      z: 10 - random() * 164,
      rx: random() * 0.4,
      ry: random() * Math.PI,
      rz: (random() - 0.5) * 0.3,
      sx: 0.5 + random() * 1.9,
      sy: 0.35 + random() * 1.25,
      sz: 0.55 + random() * 1.75,
    };
  });
}

function setInstances(mesh: THREE.InstancedMesh | null, transforms: InstanceTransform[]) {
  if (!mesh) return;
  const node = new THREE.Object3D();
  for (let index = 0; index < transforms.length; index += 1) {
    const item = transforms[index];
    node.position.set(item.x, item.y, item.z);
    node.rotation.set(item.rx, item.ry, item.rz);
    node.scale.set(item.sx, item.sy, item.sz);
    node.updateMatrix();
    mesh.setMatrixAt(index, node.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

function makeDuneGeometry() {
  const dune = createWorldV2DuneData();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(dune.positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(dune.colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(dune.indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}

export default function WorldV2Environment({ motionRef, weather, quality, motionReduced }: Props) {
  const rootRef = useRef<THREE.Group>(null);
  const skyRef = useRef<THREE.Mesh>(null);
  const rubbleRef = useRef<THREE.InstancedMesh>(null);
  const spireRef = useRef<THREE.InstancedMesh>(null);
  const markerRef = useRef<THREE.InstancedMesh>(null);
  const particleRef = useRef<THREE.Points>(null);
  const dawnLightRef = useRef<THREE.PointLight>(null);
  const { camera, scene } = useThree();
  const biomeTransitionRef = useRef(getBiomeTransition(0));
  const biomeSampleDistanceRef = useRef(-Infinity);
  const rubbleCount = quality === "high" ? 116 : quality === "balanced" ? 72 : 38;
  const spireCount = quality === "high" ? 26 : quality === "balanced" ? 18 : 10;
  const markerCount = quality === "high" ? 18 : quality === "balanced" ? 12 : 7;
  const particleCount = quality === "high" ? 92 : quality === "balanced" ? 56 : 28;

  const roadGeometry = useMemo(() => createRoadGeometry(), []);
  const duneGeometry = useMemo(() => makeDuneGeometry(), []);
  const rockGeometry = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  const spireGeometry = useMemo(() => new THREE.CylinderGeometry(0.72, 1, 1, 6, 1), []);
  const markerGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const skyGeometry = useMemo(() => new THREE.SphereGeometry(390, 36, 20), []);
  const particlesPosition = useMemo(() => new Float32Array(particleCount * 3), [particleCount]);
  const roadMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#494347",
    vertexColors: true,
    roughness: 0.97,
    metalness: 0,
    flatShading: true,
  }), []);
  const duneMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#5c514c",
    vertexColors: true,
    roughness: 1,
    flatShading: true,
    side: THREE.DoubleSide,
  }), []);
  const rubbleMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#49444a",
    roughness: 0.96,
    flatShading: true,
  }), []);
  const spireMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#302d39",
    roughness: 0.9,
    flatShading: true,
  }), []);
  const markerMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#655953",
    roughness: 0.96,
    flatShading: true,
  }), []);
  const skyMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color("#161b2b") },
      uHorizon: { value: new THREE.Color("#915b4d") },
      uDawn: { value: new THREE.Color("#f8c18b") },
      uTime: { value: 0 },
      uWeather: { value: 0.32 },
    },
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    toneMapped: false,
  }), []);
  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(particlesPosition, 3));
    const seeds = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const offset = index * 3;
      seeds[offset] = ((index * 67 + 13) % 101) / 100;
      seeds[offset + 1] = ((index * 43 + 7) % 97) / 96;
      seeds[offset + 2] = ((index * 31 + 19) % 103) / 102;
    }
    geometry.userData.seeds = seeds;
    return geometry;
  }, [particleCount, particlesPosition]);
  const particleMaterial = useMemo(() => new THREE.PointsMaterial({
    color: "#d9b18e",
    size: 0.072,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    sizeAttenuation: true,
  }), []);
  const rubbleInstances = useMemo(() => makeTransforms(rubbleCount, 493, "rubble"), [rubbleCount]);
  const spireInstances = useMemo(() => makeTransforms(spireCount, 151, "spire"), [spireCount]);
  const markerInstances = useMemo(() => makeTransforms(markerCount, 937, "marker"), [markerCount]);
  const fog = useMemo(() => new THREE.FogExp2("#554c54", WEATHER_DENSITY.ash), []);
  const roadGlowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#c38e64",
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  }), []);

  useEffect(() => {
    scene.fog = fog;
    return () => {
      if (scene.fog === fog) scene.fog = null;
      roadGeometry.dispose();
      duneGeometry.dispose();
      rockGeometry.dispose();
      spireGeometry.dispose();
      markerGeometry.dispose();
      skyGeometry.dispose();
      particleGeometry.dispose();
      roadMaterial.dispose();
      duneMaterial.dispose();
      rubbleMaterial.dispose();
      spireMaterial.dispose();
      markerMaterial.dispose();
      skyMaterial.dispose();
      particleMaterial.dispose();
    };
  }, [
    duneGeometry, duneMaterial, fog, markerGeometry, markerMaterial, particleGeometry, particleMaterial,
    roadGeometry, roadMaterial, rockGeometry, scene, skyGeometry, skyMaterial, spireGeometry, spireMaterial,
    rubbleMaterial,
  ]);

  useEffect(() => () => roadGlowMaterial.dispose(), [roadGlowMaterial]);

  useEffect(() => {
    setInstances(rubbleRef.current, rubbleInstances);
    setInstances(spireRef.current, spireInstances);
    setInstances(markerRef.current, markerInstances);
  }, [markerInstances, rubbleInstances, spireInstances]);

  useEffect(() => {
    particleMaterial.opacity = weather === "ash" ? 0.58 : weather === "ember" ? 0.72 : weather === "fog" ? 0.2 : 0.07;
    particleMaterial.size = weather === "ember" ? 0.09 : 0.064;
    particleMaterial.color.set(weather === "ember" ? "#ed9c66" : "#d8c1a3");
    skyMaterial.uniforms.uWeather.value = weather === "fog" ? 0.85 : weather === "ash" ? 0.42 : weather === "ember" ? 0.22 : 0.05;
  }, [particleMaterial, skyMaterial, weather]);

  useFrame((frame, delta) => {
    const motion = motionRef.current;
    const playerX = Number.isFinite(motion.depth) ? motion.depth * 5.2 : 0;
    const playerZ = Number.isFinite(motion.distance - motion.cameraX) ? -(motion.distance - motion.cameraX) : 0;
    const safeTime = Number.isFinite(frame.clock.elapsedTime) ? frame.clock.elapsedTime : 0;
    if (Math.abs(motion.distance - biomeSampleDistanceRef.current) >= 0.2) {
      biomeTransitionRef.current = getBiomeTransition(motion.distance);
      biomeSampleDistanceRef.current = motion.distance;
    }
    const transition = biomeTransitionRef.current;
    const from = PALETTE_COLORS[transition.from];
    const to = PALETTE_COLORS[transition.to];
    rootRef.current?.position.set(playerX, 0, playerZ);

    camera.position.x = THREE.MathUtils.damp(camera.position.x, playerX * 0.72, 2.1, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 6.2, 2.1, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, playerZ + 14.5, 2.1, delta);
    CAMERA_LOOK_TARGET.set(playerX * 0.35, 2.6, playerZ - 48);
    camera.lookAt(CAMERA_LOOK_TARGET);

    const uniforms = skyMaterial.uniforms;
    (uniforms.uZenith.value as THREE.Color).lerpColors(from.zenith, to.zenith, transition.mix);
    (uniforms.uHorizon.value as THREE.Color).lerpColors(from.horizon, to.horizon, transition.mix);
    (uniforms.uDawn.value as THREE.Color).lerpColors(from.dawn, to.dawn, transition.mix);
    uniforms.uTime.value = safeTime * (motionReduced ? 0.12 : 1);
    if (skyRef.current) skyRef.current.position.copy(camera.position);

    const ground = duneMaterial.color;
    ground.lerpColors(from.ground, to.ground, transition.mix);
    ground.multiplyScalar(weather === "fog" ? 0.9 : 1);
    roadMaterial.color.lerpColors(from.road, to.road, transition.mix);
    spireMaterial.color.lerpColors(from.far, to.far, transition.mix);
    rubbleMaterial.color.lerpColors(from.near, to.near, transition.mix);
    markerMaterial.color.lerpColors(from.mid, to.mid, transition.mix);
    particleMaterial.color.lerpColors(from.particles, to.particles, transition.mix);
    fog.color.lerpColors(from.horizon, to.horizon, transition.mix);
    fog.density = WEATHER_DENSITY[weather] * (transition.biome === "frozen-pass" ? 1.08 : transition.biome === "red-marsh" ? 1.13 : 1);

    const reducedScale = motionReduced ? 0.12 : 1;
    uniforms.uTime.value *= reducedScale === 0.12 ? 0.18 : 1;
    if (weather !== "clear" && particleRef.current) {
      const positions = (particleGeometry.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
      const seeds = particleGeometry.userData.seeds as Float32Array;
      const drift = reducedScale * (weather === "fog" ? 0.16 : 0.28);
      for (let index = 0; index < particleCount; index += 1) {
        const offset = index * 3;
        const sx = seeds[offset];
        const sy = seeds[offset + 1];
        const sz = seeds[offset + 2];
        positions[offset] = camera.position.x + (sx - 0.5) * 34 + Math.sin(safeTime * 0.2 * drift + index) * 0.45;
        positions[offset + 1] = camera.position.y - 1 + sy * 13 + Math.sin(safeTime * drift + index * 0.8) * 0.6;
        positions[offset + 2] = camera.position.z - 3 - sz * 94;
      }
      (particleGeometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    }
    if (dawnLightRef.current) {
      dawnLightRef.current.intensity = 17 + (motionReduced ? 0 : Math.sin(safeTime * 0.32) * 0.8);
    }
  });

  return (
    <group ref={rootRef} dispose={null} name="safak-ash-pilgrimage">
      <mesh
        ref={skyRef}
        geometry={skyGeometry}
        material={skyMaterial}
        renderOrder={-100}
        frustumCulled={false}
      />

      <mesh
        geometry={duneGeometry}
        material={duneMaterial}
        position={[0, -0.52, -92]}
        rotation={[-Math.PI / 2, 0, 0]}
        frustumCulled={false}
        receiveShadow={false}
      />
      <mesh geometry={roadGeometry} material={roadMaterial} frustumCulled={false} />
      <mesh
        position={[0, 0.058, -97]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[0.14, 165]} />
        <primitive object={roadGlowMaterial} attach="material" />
      </mesh>

      <instancedMesh
        ref={rubbleRef}
        args={[rockGeometry, rubbleMaterial, rubbleCount]}
        frustumCulled={false}
        receiveShadow={false}
      />
      <instancedMesh
        ref={spireRef}
        args={[spireGeometry, spireMaterial, spireCount]}
        frustumCulled={false}
        receiveShadow={false}
      />
      <instancedMesh
        ref={markerRef}
        args={[markerGeometry, markerMaterial, markerCount]}
        frustumCulled={false}
        receiveShadow={false}
      />

      <group name="split-basalt-gate" position={[0, 0, -104]}>
        <mesh position={[-13.4, 18.1, 0]} rotation={[0.01, 0.04, 0.045]} castShadow>
          <cylinderGeometry args={[2.55, 3.7, 36.2, 7, 1]} />
          <meshStandardMaterial color="#302c38" roughness={0.89} flatShading />
        </mesh>
        <mesh position={[13.1, 15.6, -1.2]} rotation={[0.02, -0.06, -0.06]} castShadow>
          <cylinderGeometry args={[2.9, 4.1, 31.2, 7, 1]} />
          <meshStandardMaterial color="#38313c" roughness={0.9} flatShading />
        </mesh>
        <mesh position={[-6.1, 32.4, 0.4]} rotation={[0.05, 0.02, -0.13]} castShadow>
          <boxGeometry args={[9.7, 3.8, 5.7]} />
          <meshStandardMaterial color="#3a333d" roughness={0.92} flatShading />
        </mesh>
        <mesh position={[6.4, 29.5, -0.8]} rotation={[0.02, -0.04, 0.16]} castShadow>
          <boxGeometry args={[10.2, 3.4, 5.3]} />
          <meshStandardMaterial color="#302c38" roughness={0.9} flatShading />
        </mesh>
        <mesh position={[-4.5, 26.2, 2]} rotation={[0.22, 0.1, 0.32]}>
          <dodecahedronGeometry args={[2.35, 0]} />
          <meshStandardMaterial color="#4a4147" roughness={0.97} flatShading />
        </mesh>
        <mesh position={[5.1, 23.4, -1.1]} rotation={[-0.16, 0.5, -0.28]}>
          <dodecahedronGeometry args={[2.7, 0]} />
          <meshStandardMaterial color="#3b3540" roughness={0.97} flatShading />
        </mesh>
        <mesh position={[0, 9.5, 1]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.7, 32]} />
          <meshBasicMaterial color="#e6a575" transparent opacity={0.08} depthWrite={false} />
        </mesh>
        <pointLight
          ref={dawnLightRef}
          position={[0, 17, -11]}
          color="#ffd19d"
          intensity={17}
          distance={92}
          decay={2}
        />
      </group>

      <group position={[0, 0, -43]} name="pilgrim-stone">
        <mesh position={[-5.5, 3.4, 0]} rotation={[0.02, 0.2, -0.07]}>
          <boxGeometry args={[1.4, 6.8, 1.6]} />
          <meshStandardMaterial color="#63554f" roughness={0.96} flatShading />
        </mesh>
        <mesh position={[5.2, 2.7, -0.3]} rotation={[0.04, -0.14, 0.08]}>
          <boxGeometry args={[1.15, 5.4, 1.4]} />
          <meshStandardMaterial color="#584b4b" roughness={0.96} flatShading />
        </mesh>
        <mesh position={[0, 6.7, -0.2]} rotation={[0.01, 0.04, -0.015]}>
          <boxGeometry args={[12.6, 1.35, 2.05]} />
          <meshStandardMaterial color="#60534f" roughness={0.96} flatShading />
        </mesh>
        <mesh position={[0.6, 6.5, 0.92]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[1.7, 1.6, 0.5]} />
          <meshStandardMaterial color="#78634f" roughness={0.9} flatShading />
        </mesh>
      </group>

      <mesh position={[0, 0.018, -20]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.82, 0.91, 40]} />
        <meshBasicMaterial color="#ad8664" transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      <points
        ref={particleRef}
        geometry={particleGeometry}
        material={particleMaterial}
        frustumCulled={false}
        visible={weather !== "clear"}
      />
      <hemisphereLight args={["#dfc1aa", "#252633", 1.05]} />
      <directionalLight position={[-30, 26, -70]} color="#ffd2a1" intensity={2.4} />
      <ambientLight color="#9a9aa4" intensity={0.2} />
    </group>
  );
}
