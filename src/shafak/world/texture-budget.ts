import * as THREE from "three";

export const WORLD_TEXTURE_MAX_DIMENSION = 1_024;

const processedTextures = new WeakSet<THREE.Texture>();
const warnedTextures = new WeakSet<THREE.Texture>();

export function getTextureDimensionsAtCap(
  width: number,
  height: number,
  maxDimension = WORLD_TEXTURE_MAX_DIMENSION,
) {
  const safeWidth = Number.isFinite(width) ? Math.max(1, Math.floor(width)) : 1;
  const safeHeight = Number.isFinite(height) ? Math.max(1, Math.floor(height)) : 1;
  const safeCap = Number.isFinite(maxDimension) ? Math.max(1, Math.floor(maxDimension)) : WORLD_TEXTURE_MAX_DIMENSION;
  const largest = Math.max(safeWidth, safeHeight);
  if (largest <= safeCap) return { width: safeWidth, height: safeHeight };
  const scale = safeCap / largest;
  return {
    width: Math.max(1, Math.floor(safeWidth * scale)),
    height: Math.max(1, Math.floor(safeHeight * scale)),
  };
}

function getImageSize(image: unknown) {
  if (!image || typeof image !== "object") return null;
  const source = image as {
    width?: number;
    height?: number;
    naturalWidth?: number;
    naturalHeight?: number;
    videoWidth?: number;
    videoHeight?: number;
  };
  const width = source.naturalWidth || source.videoWidth || source.width || 0;
  const height = source.naturalHeight || source.videoHeight || source.height || 0;
  return width > 0 && height > 0 ? { width, height } : null;
}

export function capWorldTextures(root: THREE.Object3D, maxDimension = WORLD_TEXTURE_MAX_DIMENSION) {
  if (typeof document === "undefined") return;

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (!(value instanceof THREE.Texture) || processedTextures.has(value)) continue;
        const imageSize = getImageSize(value.image);
        if (!imageSize) continue;
        const dimensions = getTextureDimensionsAtCap(imageSize.width, imageSize.height, maxDimension);
        if (dimensions.width === imageSize.width && dimensions.height === imageSize.height) {
          processedTextures.add(value);
          continue;
        }
        if (value instanceof THREE.DataTexture || value instanceof THREE.CompressedTexture) {
          if (!warnedTextures.has(value)) {
            warnedTextures.add(value);
            console.warn("[shafak-world] A texture exceeded the 1k budget and cannot be downscaled as an image.", {
              texture: value.name || "unnamed",
              width: imageSize.width,
              height: imageSize.height,
            });
          }
          continue;
        }
        const canvas = document.createElement("canvas");
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const context = canvas.getContext("2d");
        if (!context) continue;
        try {
          context.drawImage(value.image as CanvasImageSource, 0, 0, dimensions.width, dimensions.height);
          value.image = canvas;
          value.anisotropy = Math.min(value.anisotropy, 4);
          value.needsUpdate = true;
          processedTextures.add(value);
        } catch (error) {
          if (!warnedTextures.has(value)) {
            warnedTextures.add(value);
            console.warn("[shafak-world] A texture exceeded the 1k budget and could not be downscaled.", {
              texture: value.name || "unnamed",
              error,
            });
          }
        }
      }
    }
  });
}
