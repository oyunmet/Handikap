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

export type CharacterSurfaceKind = "skin" | "hair" | "cloth" | "leather" | "metal";

function createCharacterSurfaceMaps(kind: CharacterSurfaceKind): KnightSurfaceMaps {
  const size = 256;
  const colorData = new Uint8Array(size * size * 4);
  const roughnessData = new Uint8Array(size * size * 4);
  const normalData = new Uint8Array(size * size * 4);
  const height = new Float32Array(size * size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const noise = hash(x, y);
      const pore = kind === "skin" && noise > 0.975 ? 0.018 : 0;
      const hairWave = (Math.sin(x * 0.42 + Math.sin(y * 0.075) * 2.2) + 1) * 0.5;
      const weave = Math.sin(x * 0.92) * Math.sin(y * 0.92);
      const leatherGrain = Math.sin(x * 0.14 + y * 0.08) * Math.cos(y * 0.17);
      const scratch = kind === "metal" && (x * 11 + y * 17) % 131 < 2 ? 0.016 : 0;

      if (kind === "skin") height[index] = pore + (noise - 0.5) * 0.003;
      else if (kind === "hair") height[index] = (hairWave - 0.5) * 0.025 + (noise - 0.5) * 0.004;
      else if (kind === "cloth") height[index] = weave * 0.004 + (noise - 0.5) * 0.003;
      else if (kind === "leather") height[index] = leatherGrain * 0.006 + (noise - 0.5) * 0.006;
      else height[index] = (noise - 0.5) * 0.012 + scratch;

      const colorBase = kind === "hair"
        ? 230 + Math.round(hairWave * 23) - Math.round(noise * 5)
        : kind === "cloth"
          ? 242 - Math.round(Math.abs(weave) * 5) - Math.round(noise * 4)
          : kind === "leather"
            ? 238 - Math.round(Math.abs(leatherGrain) * 8) - Math.round(noise * 5)
            : 248 - Math.round(noise * 4) - (pore ? 7 : 0) - (scratch ? 12 : 0);
      const roughness = kind === "skin"
        ? 174 + Math.round(noise * 28)
        : kind === "hair"
          ? 146 + Math.round(noise * 42)
          : kind === "cloth"
            ? 212 + Math.round(noise * 26)
            : kind === "leather"
              ? 188 + Math.round(noise * 38)
              : 150 + Math.round(noise * 74);
      const pixel = index * 4;
      colorData[pixel] = colorBase;
      colorData[pixel + 1] = colorBase;
      colorData[pixel + 2] = colorBase;
      colorData[pixel + 3] = 255;
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
      const nx = -(right - left) * 7;
      const ny = -(below - above) * 7;
      const length = Math.hypot(nx, ny, 1);
      const pixel = (y * size + x) * 4;
      normalData[pixel] = Math.round((nx / length * 0.5 + 0.5) * 255);
      normalData[pixel + 1] = Math.round((ny / length * 0.5 + 0.5) * 255);
      normalData[pixel + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      normalData[pixel + 3] = 255;
    }
  }

  const texture = (data: Uint8Array, colorSpace: THREE.ColorSpace = THREE.NoColorSpace) => {
    const result = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.repeat.set(kind === "hair" ? 1.5 : 2, kind === "hair" ? 2.8 : 2);
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

export const CHARACTER_SURFACE_MAPS: Record<CharacterSurfaceKind, KnightSurfaceMaps> = {
  skin: createCharacterSurfaceMaps("skin"),
  hair: createCharacterSurfaceMaps("hair"),
  cloth: createCharacterSurfaceMaps("cloth"),
  leather: createCharacterSurfaceMaps("leather"),
  metal: createCharacterSurfaceMaps("metal"),
};

export function resolveCharacterSurfaceKind(
  materialName: string,
  meshName = "",
): CharacterSurfaceKind | null {
  const material = materialName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const mesh = meshName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const classify = (name: string): CharacterSurfaceKind | null => {
    if (!name || /eye|pupil|teeth|sclera|white/.test(name)) return null;
    if (/hair|brow/.test(name)) return "hair";
    if (/skin|face|body|neck|hand/.test(name)) return "skin";
    if (/boot|shoe|leather/.test(name)) return "leather";
    if (/cloth|shirt|fabric|pants|trouser|tunic|cape|cloak/.test(name)) return "cloth";
    if (/armor|armour|metal|steel/.test(name)) return "metal";
    return null;
  };
  return classify(material) ?? classify(mesh);
}

export function applyCharacterSurfaceDetail(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  kind: CharacterSurfaceKind,
) {
  if (!(material instanceof THREE.MeshStandardMaterial)) return false;
  ensureKnightGeometryUVs(geometry);
  const maps = CHARACTER_SURFACE_MAPS[kind];
  material.map ??= maps.color;
  material.normalMap ??= maps.normal;
  material.roughnessMap ??= maps.roughness;
  material.normalScale.set(kind === "skin" ? 0.13 : kind === "hair" ? 0.2 : 0.16, kind === "skin" ? 0.13 : kind === "hair" ? 0.2 : 0.16);
  material.roughness = Math.max(material.roughness, kind === "skin" ? 0.62 : kind === "hair" ? 0.58 : 0.7);
  material.metalness = Math.min(material.metalness, kind === "metal" ? 0.16 : 0.08);
  material.needsUpdate = true;
  return true;
}

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
