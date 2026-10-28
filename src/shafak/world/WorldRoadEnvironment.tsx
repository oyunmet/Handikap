import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import type { WorldMotion } from "./movement";
import { getBiomeTransition, WORLD_BIOME_PALETTES, type WeatherMode } from "./world-biomes";
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
      const fog = scene.fog;
      if (fog instanceof THREE.Fog) fog.color.copy(fogColor);
      lastSkyDistance.current = distance;
      lastSkyWeather.current = weather;
    }
  });

  return (
    <>
      <hemisphereLight args={["#a3c9df", "#857c6d", 1.35]} />
      <ambientLight color="#fff0dc" intensity={0.52} />
      <directionalLight
        position={[-8, 14, 5]}
        color="#fff1dc"
        intensity={1.45}
        castShadow
        shadow-mapSize={[768, 768]}
        shadow-camera-near={0.5}
        shadow-camera-far={32}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={13}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[7, 8, -9]} color="#a3c9df" intensity={0.5} />
      <primitive object={environment.root} dispose={null} />
    </>
  );
}
