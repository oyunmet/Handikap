import * as THREE from "three";

export const WORLD_ROAD_TEXTURE_SIZE = 512;

export type WorldRoadTextureSet = {
  roadVariants: Array<{
    color: THREE.DataTexture;
    normal: THREE.DataTexture;
    roughness: THREE.DataTexture;
  }>;
  ground: {
    color: THREE.DataTexture;
    normal: THREE.DataTexture;
    roughness: THREE.DataTexture;
  };
  dispose: () => void;
};

type SurfacePixels = {
  color: Uint8Array;
  normal: Uint8Array;
  roughness: Uint8Array;
  size: number;
};

function hash(x: number, y: number, seed: number) {
  let value = Math.imul(x + 1, 0x45d9f3b) ^ Math.imul(y + 7, 0x119de1f3) ^ seed;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 4_294_967_295;
}

function wrap(value: number, period: number) {
  return ((value % period) + period) % period;
}

function smooth(value: number) {
  return value * value * (3 - 2 * value);
}

function periodicNoise(x: number, y: number, periodX: number, periodY: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  const a = hash(wrap(x0, periodX), wrap(y0, periodY), seed);
  const b = hash(wrap(x0 + 1, periodX), wrap(y0, periodY), seed);
  const c = hash(wrap(x0, periodX), wrap(y0 + 1, periodY), seed);
  const d = hash(wrap(x0 + 1, periodX), wrap(y0 + 1, periodY), seed);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, tx), THREE.MathUtils.lerp(c, d, tx), ty);
}

function createSurfacePixels(kind: "cobble" | "ash-gravel", size: number, seed: number): SurfacePixels {
  const color = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const heightMap = new Float32Array(size * size);
  const cells = 8;
  const cellSize = size / cells;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const lowNoise = periodicNoise(x / 64, y / 64, size / 64, size / 64, seed);
      const midNoise = periodicNoise(x / 13, y / 13, size / 13, size / 13, seed ^ 0x61c88647);
      const grain = periodicNoise(x / 3, y / 3, size / 3, size / 3, seed ^ 0x1b873593);
      let base: number;
      let joint = false;
      let crack = false;
      let relief: number;

      if (kind === "cobble") {
        const row = Math.floor(y / cellSize);
        const stagger = row % 2 === 0 ? 0 : cellSize / 2;
        const shiftedX = wrap(x + stagger, size);
        const cellX = Math.floor(shiftedX / cellSize);
        const cellY = Math.floor(y / cellSize);
        const localX = (shiftedX % cellSize) / cellSize;
        const localY = (y % cellSize) / cellSize;
        const edgeNoise = periodicNoise(shiftedX / 7, y / 7, size / 7, size / 7, seed ^ 0x27d4eb2d);
        const edgeDistance = Math.min(localX, 1 - localX, localY, 1 - localY) * cellSize;
        joint = edgeDistance < 4.2 + edgeNoise * 2.4;
        const stoneTone = hash(cellX % cells, cellY % cells, seed ^ 0x165667b1);
        const stoneWorn = periodicNoise(x / 19, y / 19, size / 19, size / 19, seed ^ 0x9e3779b9);
        const crackSeed = hash(cellX % cells, cellY % cells, seed ^ 0x85ebca6b);
        const crackPath = 0.24 + 0.49 * (0.5 + 0.5 * Math.sin(localX * Math.PI * 2 + crackSeed * Math.PI * 2));
        crack = !joint && crackSeed > 0.68 && localX > 0.18 && localX < 0.84
          && Math.abs(localY - crackPath) < 0.012 + edgeNoise * 0.008;
        base = joint
          ? 48 + midNoise * 21
          : 136 + stoneTone * 38 + (stoneWorn - 0.5) * 22 + (lowNoise - 0.5) * 12;
        if (crack) base *= 0.62;
        relief = joint ? -0.2 : 0.035 + stoneWorn * 0.04 - (crack ? 0.12 : 0);
      } else {
        const coarse = periodicNoise(x / 36, y / 36, size / 36, size / 36, seed ^ 0x243f6a88);
        const patch = periodicNoise(x / 8, y / 8, size / 8, size / 8, seed ^ 0xb7e15162);
        const fleck = periodicNoise(x / 2, y / 2, size / 2, size / 2, seed ^ 0xdeadbeef);
        const pebble = patch > 0.77 && fleck > 0.58;
        const ashStreak = coarse < 0.18 && patch > 0.38;
        base = pebble
          ? 112 + fleck * 31
          : 60 + coarse * 35 + (patch - 0.5) * 24 + (grain - 0.5) * 15;
        if (ashStreak) base -= 16;
        crack = ashStreak;
        relief = pebble ? 0.075 : (grain - 0.5) * 0.045 - (ashStreak ? 0.035 : 0);
      }

      const index = y * size + x;
      const pixel = index * 4;
      const safeBase = Math.max(26, Math.min(204, Math.round(base)));
      const warmVariation = kind === "ash-gravel" && periodicNoise(x / 11, y / 11, size / 11, size / 11, seed ^ 0x3c6ef372) > 0.91;
      color[pixel] = Math.min(255, safeBase + (warmVariation ? 18 : 3));
      color[pixel + 1] = Math.min(255, safeBase + (warmVariation ? 5 : 1));
      color[pixel + 2] = Math.max(0, safeBase - (warmVariation ? 12 : 3));
      color[pixel + 3] = 255;
      roughness[pixel] = crack ? 244 : 176 + Math.round(midNoise * 58);
      roughness[pixel + 1] = roughness[pixel];
      roughness[pixel + 2] = roughness[pixel];
      roughness[pixel + 3] = 255;
      heightMap[index] = relief + (midNoise - 0.5) * 0.025 + (grain - 0.5) * 0.012;
    }
  }

  const normal = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = heightMap[y * size + wrap(x - 1, size)];
      const right = heightMap[y * size + wrap(x + 1, size)];
      const above = heightMap[wrap(y - 1, size) * size + x];
      const below = heightMap[wrap(y + 1, size) * size + x];
      const nx = -(right - left) * 2.8;
      const ny = -(below - above) * 2.8;
      const length = Math.hypot(nx, ny, 1);
      const pixel = (y * size + x) * 4;
      normal[pixel] = Math.round((nx / length * 0.5 + 0.5) * 255);
      normal[pixel + 1] = Math.round((ny / length * 0.5 + 0.5) * 255);
      normal[pixel + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      normal[pixel + 3] = 255;
    }
  }
  return { color, normal, roughness, size };
}

function createDataTexture(
  pixels: Uint8Array,
  size: number,
  colorSpace: THREE.ColorSpace,
  repeat: [number, number],
) {
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.name = "shafak-world-road-pbr";
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export function createWorldRoadSurfaceTextures(size = WORLD_ROAD_TEXTURE_SIZE): WorldRoadTextureSet {
  if (!Number.isInteger(size) || size < 64 || size > 1_024) {
    throw new RangeError("World road textures must be between 64 and 1,024 pixels.");
  }

  const textureResources = new Set<THREE.DataTexture>();
  const roadNormalPixels = createSurfacePixels("cobble", size, 0x7a31);
  const roadNormal = createDataTexture(roadNormalPixels.normal, size, THREE.NoColorSpace, [1.5, 3]);
  const roadRoughness = createDataTexture(roadNormalPixels.roughness, size, THREE.NoColorSpace, [1.5, 3]);
  textureResources.add(roadNormal);
  textureResources.add(roadRoughness);
  const roadVariants = [0x7a31, 0x19c4, 0x44ef].map((seed) => {
    const pixels = createSurfacePixels("cobble", size, seed);
    const color = createDataTexture(pixels.color, size, THREE.SRGBColorSpace, [1.5, 3]);
    textureResources.add(color);
    return { color, normal: roadNormal, roughness: roadRoughness };
  });

  const groundPixels = createSurfacePixels("ash-gravel", size, 0x5d17);
  const ground = {
    color: createDataTexture(groundPixels.color, size, THREE.SRGBColorSpace, [4, 4]),
    normal: createDataTexture(groundPixels.normal, size, THREE.NoColorSpace, [4, 4]),
    roughness: createDataTexture(groundPixels.roughness, size, THREE.NoColorSpace, [4, 4]),
  };
  Object.values(ground).forEach((texture) => textureResources.add(texture));

  return {
    roadVariants,
    ground,
    dispose: () => textureResources.forEach((texture) => texture.dispose()),
  };
}
