import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import type { WorldMotion } from "./movement";
import { getBiomeTransition, getWorldDaylight, WORLD_BIOME_PALETTES, type WeatherMode } from "./world-biomes";
import {
  createWorldRoadEnvironment,
  positionWorldRoadEnvironment,
} from "./world-road-environment";
import { paintWorldSkyGradient, WORLD_SKY_BACKGROUND_HEIGHT, WORLD_SKY_BACKGROUND_WIDTH } from "./world-sky-background";

type MotionRef = MutableRefObject<WorldMotion>;

export default function WorldRoadEnvironmentLayer({
  motionRef,
  weather,
  showProps,
  quality,
}: {
  motionRef: MotionRef;
  weather: WeatherMode;
  showProps: boolean;
  quality: "high" | "balanced" | "low";
}) {
  const { scene } = useThree();
  const environment = useMemo(
    () => createWorldRoadEnvironment(showProps, quality),
    [quality, showProps],
  );
  const skyTexture = useMemo(() => {
    const pixels = new Uint8Array(WORLD_SKY_BACKGROUND_WIDTH * WORLD_SKY_BACKGROUND_HEIGHT * 4);
    paintWorldSkyGradient(pixels, WORLD_SKY_BACKGROUND_WIDTH, WORLD_SKY_BACKGROUND_HEIGHT, 0, weather);
    const texture = new THREE.DataTexture(
      pixels,
      WORLD_SKY_BACKGROUND_WIDTH,
      WORLD_SKY_BACKGROUND_HEIGHT,
      THREE.RGBAFormat,
    );
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }, [weather]);
  const lastSkyDistance = useRef(Number.NaN);
  const lastSkyWeather = useRef<WeatherMode | null>(null);
  const lastLightingDistance = useRef(Number.NaN);
  const hemisphereRef = useRef<THREE.HemisphereLight>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const coolTarget = useMemo(() => new THREE.Color(), []);
  const groundTarget = useMemo(() => new THREE.Color(), []);
  const sunTarget = useMemo(() => new THREE.Color(), []);
  const skyPixels = skyTexture.image.data as Uint8Array;

  useEffect(() => {
    const previousBackground = scene.background;
    const previousFog = scene.fog;
    scene.background = skyTexture;
    scene.fog = new THREE.Fog(
      WORLD_BIOME_PALETTES["ash-road"].horizon,
      quality === "low" ? 155 : 180,
      quality === "low" ? 370 : 440,
    );
    return () => {
      scene.background = previousBackground;
      scene.fog = previousFog;
    };
  }, [quality, scene, skyTexture]);

  useEffect(() => () => {
    skyTexture.dispose();
  }, [skyTexture]);

  useEffect(() => () => {
    environment.dispose();
  }, [environment]);

  useFrame(() => {
    const motion = motionRef.current;
    const distance = motion.distance;
    positionWorldRoadEnvironment(
      environment,
      distance,
      motion.cameraX,
      motion.depth * 5.2,
    );
    environment.updatePalette(distance, weather);

    if (Math.abs(distance - lastSkyDistance.current) >= 0.75 || weather !== lastSkyWeather.current) {
      paintWorldSkyGradient(skyPixels, WORLD_SKY_BACKGROUND_WIDTH, WORLD_SKY_BACKGROUND_HEIGHT, distance, weather);
      skyTexture.needsUpdate = true;
      const transition = getBiomeTransition(distance);
      const from = WORLD_BIOME_PALETTES[transition.from];
      const to = WORLD_BIOME_PALETTES[transition.to];
      const fogColor = new THREE.Color(from.horizon).lerp(new THREE.Color(to.horizon), transition.mix);
      if (weather === "ash") fogColor.lerp(new THREE.Color("#a1968a"), 0.28);
      const fog = scene.fog;
      if (fog instanceof THREE.Fog) fog.color.copy(fogColor);
      lastSkyDistance.current = distance;
      lastSkyWeather.current = weather;
    }

    if (Math.abs(distance - lastLightingDistance.current) >= 0.75) {
      lastLightingDistance.current = distance;
      const daylight = getWorldDaylight(distance);
      const hemisphere = hemisphereRef.current;
      const sun = sunRef.current;
      if (!hemisphere || !sun) return;
      const transition = getBiomeTransition(distance);
      const from = WORLD_BIOME_PALETTES[transition.from];
      const to = WORLD_BIOME_PALETTES[transition.to];
      hemisphere.color.set(from.coolLight).lerp(coolTarget.set(to.coolLight), transition.mix);
      hemisphere.groundColor.set(from.ground).lerp(groundTarget.set(to.ground), transition.mix);
      hemisphere.intensity = 0.9 + daylight * 0.42;
      sun.color.set(from.torch).lerp(sunTarget.set(to.torch), transition.mix);
      sun.intensity = 0.52 + daylight * 0.76;
    }
  });

  return (
    <>
      <hemisphereLight ref={hemisphereRef} args={["#a3c9df", "#857c6d", 1.12]} />
      <ambientLight color="#fff0dc" intensity={0.34} />
      <directionalLight
        ref={sunRef}
        position={[-8, 14, 5]}
        color="#f4a45e"
        intensity={0.96}
        castShadow
        shadow-mapSize={[768, 768]}
        shadow-camera-near={0.5}
        shadow-camera-far={32}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={13}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[7, 8, -9]} color="#a3c9df" intensity={0.42} />
      <primitive object={environment.root} dispose={null} />
    </>
  );
}
