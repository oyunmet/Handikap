import * as THREE from "three";
import { getBiomeTransition, WORLD_BIOME_PALETTES } from "./world-biomes.ts";

export const WORLD_SKY_BACKGROUND_WIDTH = 256;
export const WORLD_SKY_BACKGROUND_HEIGHT = 128;

/** Paints a smooth equirectangular background texture; no world-space sky mesh is needed. */
export function paintWorldSkyGradient(
  pixels: Uint8Array,
  width: number,
  height: number,
  distance: number,
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
  const color = new THREE.Color();
  const srgbColor = new THREE.Color();

  for (let y = 0; y < height; y += 1) {
    const latitude = Math.abs(y / (height - 1) - 0.5) * 2;
    if (latitude < 0.55) {
      color.copy(horizon).lerp(middle, THREE.MathUtils.smoothstep(latitude, 0, 0.55));
    } else {
      color.copy(middle).lerp(zenith, THREE.MathUtils.smoothstep(latitude, 0.55, 1));
    }
    srgbColor.copy(color).convertLinearToSRGB();

    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      pixels[offset] = Math.round(THREE.MathUtils.clamp(srgbColor.r, 0, 1) * 255);
      pixels[offset + 1] = Math.round(THREE.MathUtils.clamp(srgbColor.g, 0, 1) * 255);
      pixels[offset + 2] = Math.round(THREE.MathUtils.clamp(srgbColor.b, 0, 1) * 255);
      pixels[offset + 3] = 255;
    }
  }
}
