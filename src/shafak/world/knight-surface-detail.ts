import * as THREE from "three";

type KnightSurfaceMaps = {
  color: THREE.DataTexture;
  normal: THREE.DataTexture;
  roughness: THREE.DataTexture;
};

function hash(x: number, y: number) {
  const value = Math.sin(x * 91.7 + y * 247.3) * 13927.17;
  return value - Math.floor(value);
}

function createKnightSurfaceMaps(): KnightSurfaceMaps {
  const size = 128;
  const colorData = new Uint8Array(size * size * 4);
  const roughnessData = new Uint8Array(size * size * 4);
  const normalData = new Uint8Array(size * size * 4);
  const height = new Float32Array(size * size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const noise = hash(x, y);
      const scratch = (x * 13 + y * 7) % 113 < 3 && hash(x + 17, y + 31) > 0.48;
      height[index] = (noise - 0.5) * 0.014 + (scratch ? 0.025 : 0);

      const pixel = index * 4;
      const base = 248 - Math.round(noise * 4) - (scratch ? 20 : 0);
      colorData[pixel] = base;
      colorData[pixel + 1] = base;
      colorData[pixel + 2] = base;
      colorData[pixel + 3] = 255;
      const roughness = Math.min(255, 144 + Math.round(noise * 64) + (scratch ? 40 : 0));
      roughnessData[pixel] = roughness;
      roughnessData[pixel + 1] = roughness;
      roughnessData[pixel + 2] = roughness;
      roughnessData[pixel + 3] = 255;
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = height[y * size + Math.max(0, x - 1)];
      const right = height[y * size + Math.min(size - 1, x + 1)];
      const above = height[Math.max(0, y - 1) * size + x];
      const below = height[Math.min(size - 1, y + 1) * size + x];
      const nx = -(right - left) * 5;
      const ny = -(below - above) * 5;
      const length = Math.hypot(nx, ny, 1);
      const pixel = (y * size + x) * 4;
      normalData[pixel] = Math.round((nx / length * 0.5 + 0.5) * 255);
      normalData[pixel + 1] = Math.round((ny / length * 0.5 + 0.5) * 255);
      normalData[pixel + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      normalData[pixel + 3] = 255;
    }
  }

  const texture = (
    data: Uint8Array,
    colorSpace: THREE.ColorSpace = THREE.NoColorSpace,
  ) => {
    const result = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.repeat.set(2, 2);
    result.colorSpace = colorSpace;
    result.generateMipmaps = true;
    result.minFilter = THREE.LinearMipmapLinearFilter;
    result.magFilter = THREE.LinearFilter;
    result.anisotropy = 4;
    result.needsUpdate = true;
    return result;
  };

  return {
    color: texture(colorData, THREE.SRGBColorSpace),
    normal: texture(normalData),
    roughness: texture(roughnessData),
  };
}

export const KNIGHT_SURFACE_MAPS = createKnightSurfaceMaps();
export const KNIGHT_SURFACE_NORMAL_SCALE = 0.28;

/**
 * Some bundled character meshes have no authored UVs. Project each face along
 * its dominant normal so their PBR material maps still render in-game.
 */
export function ensureKnightGeometryUVs(geometry: THREE.BufferGeometry) {
  if (geometry.getAttribute("uv")) return false;
  const position = geometry.getAttribute("position");
  if (!position) return false;
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
  const normal = geometry.getAttribute("normal");
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!normal || !bounds) return false;

  const width = Math.max(0.001, bounds.max.x - bounds.min.x);
  const height = Math.max(0.001, bounds.max.y - bounds.min.y);
  const depth = Math.max(0.001, bounds.max.z - bounds.min.z);
  const uvs = new Float32Array(position.count * 2);

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const nx = Math.abs(normal.getX(index));
    const ny = Math.abs(normal.getY(index));
    const nz = Math.abs(normal.getZ(index));

    if (nx >= ny && nx >= nz) {
      uvs[index * 2] = (z - bounds.min.z) / depth;
      uvs[index * 2 + 1] = (y - bounds.min.y) / height;
    } else if (ny >= nx && ny >= nz) {
      uvs[index * 2] = (x - bounds.min.x) / width;
      uvs[index * 2 + 1] = (z - bounds.min.z) / depth;
    } else {
      uvs[index * 2] = (x - bounds.min.x) / width;
      uvs[index * 2 + 1] = (y - bounds.min.y) / height;
    }
  }

  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  return true;
}
