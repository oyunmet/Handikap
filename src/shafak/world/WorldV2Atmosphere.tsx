import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { MutableRefObject } from "react";
import { getBiomeTransition, WORLD_BIOME_PALETTES, type WeatherMode } from "./world-biomes";
import type { WorldMotion } from "./movement";
import type { WorldQuality } from "./World3D";
import { WORLD_SKY_SPHERE_RADIUS } from "./world-render-config";

type Props = {
  motionRef: MutableRefObject<WorldMotion>;
  weather: WeatherMode;
  quality: WorldQuality;
  motionReduced: boolean;
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
  uniform vec3 uSunset;
  uniform float uTime;
  uniform float uClouds;
  uniform float uLightning;

  void main() {
    vec3 direction = normalize(vDirection);
    float height = clamp(direction.y * 1.28 + 0.3, 0.0, 1.0);
    float skyFade = smoothstep(0.0, 1.0, height);
    vec3 sky = mix(uHorizon, uZenith, skyFade);
    float sunsetBand = exp(-abs(direction.y + 0.045) * 18.0);
    sky = mix(sky, uSunset, sunsetBand * 0.62);

    vec2 cloudUv = direction.xz / max(0.18, abs(direction.y) + 0.2);
    float cloudField = sin(cloudUv.x * 3.1 + uTime * 0.016) * 0.56
      + sin(cloudUv.y * 4.0 - cloudUv.x * 1.3 - uTime * 0.008) * 0.44;
    float cloudShape = smoothstep(0.52, 0.96, cloudField) * uClouds;
    vec3 cloudTone = mix(uHorizon, uZenith, 0.24);
    sky = mix(sky, cloudTone, cloudShape * (1.0 - height * 0.42));

    vec3 sunDirection = normalize(vec3(-0.62, 0.075, -0.78));
    float sunDistance = distance(direction, sunDirection);
    float sunHalo = exp(-sunDistance * 8.5) * sunsetBand * 0.28;
    float sunCore = exp(-sunDistance * 86.0) * sunsetBand * 0.3;
    sky += uSunset * (sunHalo + sunCore);
    float horizonHaze = exp(-abs(direction.y + 0.16) * 7.0) * 0.08;
    sky = mix(sky, uHorizon, horizonHaze);

    sky += vec3(0.78, 0.8, 1.0) * uLightning;
    gl_FragColor = vec4(max(sky, vec3(0.025)), 1.0);
    #include <colorspace_fragment>
  }
`;

function createRidgeGeometry(seed: number, width: number, peakHeight: number) {
  const segments = 64;
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const indices: number[] = [];
  const ridgeY = new Float32Array(segments + 1);
  let value = seed >>> 0;
  for (let index = 0; index <= segments; index += 1) {
    value = (Math.imul(value, 1_664_525) + 1_013_904_223) >>> 0;
    const variation = value / 0xffff_ffff;
    const broadPeak = Math.pow(Math.max(0, Math.sin(index / segments * Math.PI * 5 + seed)), 1.7);
    ridgeY[index] = 5 + peakHeight * (0.12 + broadPeak * 0.65 + variation * 0.22);
    const x = (index / segments - 0.5) * width;
    const top = index * 6;
    positions[top] = x;
    positions[top + 1] = ridgeY[index];
    positions[top + 2] = 0;
    positions[top + 3] = x;
    positions[top + 4] = -48;
    positions[top + 5] = 0;
  }
  for (let index = 0; index < segments; index += 1) {
    const first = index * 2;
    const next = first + 2;
    indices.push(first, next, first + 1, next, next + 1, first + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const RIDGE_LAYERS = [
  { seed: 21, width: 230, height: 22, distance: 118, opacity: 0.5 },
  { seed: 57, width: 270, height: 30, distance: 190, opacity: 0.64 },
  { seed: 89, width: 310, height: 38, distance: 275, opacity: 0.78 },
] as const;

const WEATHER_CLOUDS: Record<WeatherMode, number> = {
  clear: 0.1,
  ash: 0.32,
  ember: 0.24,
  fog: 0.72,
};

const SKY_COLORS = Object.fromEntries(
  Object.entries(WORLD_BIOME_PALETTES).map(([key, palette]) => [
    key,
    {
      zenith: new THREE.Color(palette.zenith),
      horizon: new THREE.Color(palette.horizon),
      sunset: new THREE.Color(palette.skyTint),
      mountain: new THREE.Color(palette.mountainFar),
    },
  ]),
) as Record<keyof typeof WORLD_BIOME_PALETTES, {
  zenith: THREE.Color;
  horizon: THREE.Color;
  sunset: THREE.Color;
  mountain: THREE.Color;
}>;

const PARTICLE_COLORS = Object.fromEntries(
  Object.entries(WORLD_BIOME_PALETTES).map(([key, palette]) => [key, new THREE.Color(palette.particles)]),
) as Record<keyof typeof WORLD_BIOME_PALETTES, THREE.Color>;

export default function WorldV2Atmosphere({ motionRef, weather, quality, motionReduced }: Props) {
  const skyRef = useRef<THREE.Mesh>(null);
  const ridgeRefs = useRef<Array<THREE.Group | null>>([]);
  const { camera } = useThree();
  const particleCount = quality === "high" ? 72 : quality === "balanced" ? 44 : 22;
  const particlePositions = useMemo(() => new Float32Array(particleCount * 3), [particleCount]);
  const skyGeometry = useMemo(() => new THREE.SphereGeometry(WORLD_SKY_SPHERE_RADIUS, 36, 20), []);
  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const seeds = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const offset = index * 3;
      seeds[offset] = ((index * 73) % 101) / 100;
      seeds[offset + 1] = ((index * 41 + 19) % 97) / 96;
      seeds[offset + 2] = ((index * 29 + 7) % 103) / 102;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    geometry.userData.seeds = seeds;
    return geometry;
  }, [particleCount, particlePositions]);
  const skyMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color("#171b2d") },
      uHorizon: { value: new THREE.Color("#a35f4d") },
      uSunset: { value: new THREE.Color("#ffd09c") },
      uTime: { value: 0 },
      uClouds: { value: WEATHER_CLOUDS[weather] },
      uLightning: { value: 0 },
    },
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    toneMapped: false,
  }), []);
  const ridgeGeometry = useMemo(
    () => RIDGE_LAYERS.map((layer) => createRidgeGeometry(layer.seed, layer.width, layer.height)),
    [],
  );
  const ridgeMaterials = useMemo(
    () => RIDGE_LAYERS.map((layer) => new THREE.MeshBasicMaterial({
      color: "#433642",
      transparent: true,
      opacity: layer.opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    })),
    [],
  );
  const particleMaterial = useMemo(() => new THREE.PointsMaterial({
    color: "#e3ad79",
    size: 0.055,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    sizeAttenuation: true,
  }), []);

  useEffect(() => () => {
    skyGeometry.dispose();
    skyMaterial.dispose();
    particleGeometry.dispose();
    particleMaterial.dispose();
    for (const geometry of ridgeGeometry) geometry.dispose();
    for (const material of ridgeMaterials) material.dispose();
  }, [particleGeometry, particleMaterial, ridgeGeometry, ridgeMaterials, skyGeometry, skyMaterial]);

  useEffect(() => {
    skyMaterial.uniforms.uClouds.value = WEATHER_CLOUDS[weather];
    particleMaterial.opacity = weather === "ash" ? 0.52 : weather === "ember" ? 0.88 : weather === "fog" ? 0.24 : 0.1;
    particleMaterial.size = weather === "ember" ? 0.072 : 0.052;
    particleMaterial.color.set(weather === "ember" ? "#f2a15f" : "#d8c0a0");
  }, [particleMaterial, skyMaterial, weather]);

  useFrame((frame) => {
    const safeTime = Number.isFinite(frame.clock.elapsedTime) ? frame.clock.elapsedTime : 0;
    const motion = motionRef.current;
    const transition = getBiomeTransition(motion.distance);
    const from = SKY_COLORS[transition.from];
    const to = SKY_COLORS[transition.to];
    const uniforms = skyMaterial.uniforms;
    (uniforms.uZenith.value as THREE.Color).lerpColors(from.zenith, to.zenith, transition.mix);
    (uniforms.uHorizon.value as THREE.Color).lerpColors(from.horizon, to.horizon, transition.mix);
    (uniforms.uSunset.value as THREE.Color).lerpColors(from.sunset, to.sunset, transition.mix);
    if (weather !== "ember") {
      particleMaterial.color.lerpColors(
        PARTICLE_COLORS[transition.from],
        PARTICLE_COLORS[transition.to],
        transition.mix,
      );
    }
    uniforms.uTime.value = safeTime * (motionReduced ? 0.15 : 1);
    uniforms.uClouds.value = WEATHER_CLOUDS[weather];
    uniforms.uLightning.value = weather === "ember"
      ? Math.max(0, Math.sin(safeTime * 1.5)) * 0.025
      : 0;

    if (skyRef.current) skyRef.current.position.copy(camera.position);
    for (let index = 0; index < ridgeRefs.current.length; index += 1) {
      const layer = ridgeRefs.current[index];
      if (!layer) continue;
      layer.position.set(camera.position.x * 0.88, -8, camera.position.z - RIDGE_LAYERS[index].distance);
      ridgeMaterials[index].color.lerpColors(from.mountain, to.mountain, transition.mix);
    }

    if (weather === "clear") return;
    const attribute = particleGeometry.getAttribute("position") as THREE.BufferAttribute;
    const positions = attribute.array as Float32Array;
    const seeds = particleGeometry.userData.seeds as Float32Array;
    const motionAmount = motionReduced ? 0.15 : 1;
    for (let index = 0; index < particleCount; index += 1) {
      const offset = index * 3;
      const seedX = seeds[offset];
      const seedY = seeds[offset + 1];
      const seedZ = seeds[offset + 2];
      positions[offset] = camera.position.x + (seedX - 0.5) * 38 + Math.sin(safeTime * 0.24 + index) * 0.35;
      const particleCycle = (safeTime * motionAmount * (0.22 + seedZ * 0.18) + seedY * 24) % 15;
      positions[offset + 1] = weather === "ember"
        ? camera.position.y - 1 + seedY * 15 + particleCycle
        : camera.position.y - 1 + seedY * 15 - particleCycle;
      positions[offset + 2] = camera.position.z - 3 - seedZ * 88;
    }
    attribute.needsUpdate = true;
  });

  return (
    <group dispose={null}>
      <mesh
        ref={skyRef}
        renderOrder={-100}
        frustumCulled={false}
        geometry={skyGeometry}
        material={skyMaterial}
      />
      {RIDGE_LAYERS.map((layer, index) => (
        <group
          key={layer.seed}
          ref={(element) => { ridgeRefs.current[index] = element; }}
          frustumCulled={false}
          renderOrder={-20 + index}
        >
          <mesh geometry={ridgeGeometry[index]} material={ridgeMaterials[index]} frustumCulled={false} />
        </group>
      ))}
      <points
        geometry={particleGeometry}
        material={particleMaterial}
        frustumCulled={false}
        visible={weather === "ash" || weather === "ember"}
      />
    </group>
  );
}
