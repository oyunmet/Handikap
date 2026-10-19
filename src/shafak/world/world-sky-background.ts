import * as THREE from "three";
import { getBiomeTransition, WORLD_BIOME_PALETTES } from "./world-biomes.ts";
import type { WeatherMode } from "./world-biomes.ts";

export const WORLD_SKY_BACKGROUND_WIDTH = 256;
export const WORLD_SKY_BACKGROUND_HEIGHT = 128;
const cloudCoverageCache = new Map<string, Float32Array>();

function getCloudCoverage(width: number, height: number) {
  const key = `${width}x${height}`;
  const cached = cloudCoverageCache.get(key);
  if (cached) return cached;
  const coverage = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const latitude = Math.abs(y / (height - 1) - 0.5) * 2;
    const cloudBand = 1 - THREE.MathUtils.smoothstep(latitude, 0.28, 0.82);
    for (let x = 0; x < width; x += 1) {
      const u = x / width * Math.PI * 2;
      const v = y / height;
      const cloudWave = 0.5
        + Math.sin(u * 3 + v * 9 + Math.sin(v * 15 - u * 2) * 0.8) * 0.22
        + Math.sin(u * 7 - v * 16) * 0.16
        + Math.cos(u * 13 + v * 5) * 0.1;
      coverage[y * width + x] = THREE.MathUtils.smoothstep(cloudWave, 0.51, 0.82) * cloudBand;
    }
  }
  cloudCoverageCache.set(key, coverage);
  return coverage;
}

/** Paints a smooth equirectangular background texture; no world-space sky mesh is needed. */
export function paintWorldSkyGradient(
  pixels: Uint8Array,
  width: number,
  height: number,
  distance: number,
  weather: WeatherMode = "clear",
) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 2) {
    throw new RangeError("World sky texture dimensions must be positive and at least two pixels high.");
  }
  if (pixels.length < width * height * 4) {
    throw new RangeError("World sky pixel buffer is too small for the requested dimensions.");
  }

  const transition = getBiomeTransition(distance);
  const from = WORLD_BIOME_PALETTES[transition.from];
  const to = WORLD_BIOME_PALETTES[transition.to];
  const mix = transition.mix;
  const horizon = new THREE.Color(from.horizon).lerp(new THREE.Color(to.horizon), mix);
  const middle = new THREE.Color(from.middle).lerp(new THREE.Color(to.middle), mix);
  const zenith = new THREE.Color(from.zenith).lerp(new THREE.Color(to.zenith), mix);
  const cloud = new THREE.Color(from.cloud).lerp(new THREE.Color(to.cloud), mix);
  if (weather === "ash") {
    horizon.lerp(new THREE.Color("#9d8b7c"), 0.44);
    middle.lerp(new THREE.Color("#737779"), 0.52);
    zenith.lerp(new THREE.Color("#41484d"), 0.34);
    cloud.lerp(new THREE.Color("#aa9688"), 0.46);
  }
  const clouds = getCloudCoverage(width, height);
  const color = new THREE.Color();
  const rowBase = new THREE.Color();
  const srgbColor = new THREE.Color();

  for (let y = 0; y < height; y += 1) {
    const latitude = Math.abs(y / (height - 1) - 0.5) * 2;
    if (latitude < 0.55) {
      color.copy(horizon).lerp(middle, THREE.MathUtils.smoothstep(latitude, 0, 0.55));
    } else {
      color.copy(middle).lerp(zenith, THREE.MathUtils.smoothstep(latitude, 0.55, 1));
    }
    rowBase.copy(color);
    for (let x = 0; x < width; x += 1) {
      color.copy(rowBase).lerp(cloud, clouds[y * width + x] * (weather === "ash" ? 0.38 : 0.28));
      srgbColor.copy(color).convertLinearToSRGB();
      const offset = (y * width + x) * 4;
      pixels[offset] = Math.round(THREE.MathUtils.clamp(srgbColor.r, 0, 1) * 255);
      pixels[offset + 1] = Math.round(THREE.MathUtils.clamp(srgbColor.g, 0, 1) * 255);
      pixels[offset + 2] = Math.round(THREE.MathUtils.clamp(srgbColor.b, 0, 1) * 255);
      pixels[offset + 3] = 255;
    }
  }
}
