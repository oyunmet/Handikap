import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const STONE_TEXTURE_SIZE = 96;

function stoneHash(x: number, y: number) {
  let value = Math.imul(x + 1, 0x45d9f3b) ^ Math.imul(y + 7, 0x119de1f3);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 4_294_967_295;
}

export function createProceduralStonePixels(size = STONE_TEXTURE_SIZE) {
  const color = new Uint8Array(size * size * 4);
  const normal = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const height = new Float32Array(size * size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const noise = stoneHash(x, y);
      const strata = Math.abs(Math.sin(v * 47 + Math.sin(u * 19) * 1.7));
      const fissure = strata < 0.045 && noise > 0.22;
      const pit = noise > 0.985;
      const index = y * size + x;
      height[index] = (noise - 0.5) * 0.1 - (fissure ? 0.22 : 0) + (pit ? 0.08 : 0);

      const pixel = index * 4;
      const base = Math.max(72, Math.min(244, Math.round(174 + (noise - 0.5) * 38 - (fissure ? 54 : 0) + (pit ? 10 : 0))));
      color[pixel] = base + 4;
      color[pixel + 1] = base;
      color[pixel + 2] = Math.max(0, base - 3);
      color[pixel + 3] = 255;
      roughness[pixel] = fissure ? 236 : pit ? 153 : 188 + Math.round(noise * 38);
      roughness[pixel + 1] = roughness[pixel];
      roughness[pixel + 2] = roughness[pixel];
      roughness[pixel + 3] = 255;
    }
  }

  const wrap = (value: number) => (value + size) % size;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = height[y * size + wrap(x - 1)];
      const right = height[y * size + wrap(x + 1)];
      const above = height[wrap(y - 1) * size + x];
      const below = height[wrap(y + 1) * size + x];
      const nx = -(right - left) * 3.2;
      const ny = -(below - above) * 3.2;
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

function createStoneTexture(
  data: Uint8Array,
  size: number,
  colorSpace: THREE.ColorSpace = THREE.NoColorSpace,
) {
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.colorSpace = colorSpace;
  texture.needsUpdate = true;
  return texture;
}

const stonePixels = createProceduralStonePixels();
export const STONE_PBR_TEXTURES = {
  color: createStoneTexture(stonePixels.color, stonePixels.size, THREE.SRGBColorSpace),
  normal: createStoneTexture(stonePixels.normal, stonePixels.size),
  roughness: createStoneTexture(stonePixels.roughness, stonePixels.size),
};

export const STONE_PBR_MATERIAL_PROPS: THREE.MeshStandardMaterialParameters = {
  map: STONE_PBR_TEXTURES.color,
  normalMap: STONE_PBR_TEXTURES.normal,
  normalScale: new THREE.Vector2(0.2, 0.2),
  roughnessMap: STONE_PBR_TEXTURES.roughness,
};

export function applyRockPbrMaterials(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      material.color.set("#a69f90");
      material.map = STONE_PBR_TEXTURES.color;
      material.normalMap = STONE_PBR_TEXTURES.normal;
      material.normalScale.set(0.2, 0.2);
      material.roughnessMap = STONE_PBR_TEXTURES.roughness;
      material.roughness = 0.9;
      material.metalness = 0;
      material.emissive.set(0);
      material.emissiveIntensity = 0;
      material.needsUpdate = true;
    }
  });
}

export const BEVELED_STONE_BLOCK_GEOMETRY = new RoundedBoxGeometry(1, 1, 1, 3, 0.075);

const STONE_PROP_KINDS = new Set([
  "tower",
  "ruin",
  "arch",
  "rock",
  "skull",
  "column",
  "monolith",
  "statue",
  "shrine",
  "gate",
]);

export function applyProceduralStoneMaterials(root: THREE.Object3D, kind: string) {
  if (!STONE_PROP_KINDS.has(kind)) return;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      if (material.roughness < 0.78 || material.metalness > 0.28 || material.emissive.getHex() !== 0) continue;
      material.map ??= STONE_PBR_TEXTURES.color;
      material.normalMap ??= STONE_PBR_TEXTURES.normal;
      material.roughnessMap ??= STONE_PBR_TEXTURES.roughness;
      material.normalScale.set(0.2, 0.2);
      material.flatShading = false;
      material.needsUpdate = true;
    }
  });
}
