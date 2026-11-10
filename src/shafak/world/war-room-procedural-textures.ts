import * as THREE from "three";

const TEXTURE_SIZE = 512;

function pixelNoise(x: number, y: number) {
  let value = Math.imul(x + 1, 0x45d9f3b) ^ Math.imul(y + 1, 0x119de1f3);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffff_ffff;
}

function createWarRoomPlasterTexture() {
  const pixels = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);
  const blockSize = 128;

  for (let y = 0; y < TEXTURE_SIZE; y += 1) {
    const row = Math.floor(y / blockSize);
    const rowOffset = row % 2 === 0 ? 0 : blockSize / 2;
    const localY = y % blockSize;

    for (let x = 0; x < TEXTURE_SIZE; x += 1) {
      const localX = (x + rowOffset) % blockSize;
      const blockX = Math.floor((x + rowOffset) / blockSize);
      const edgeDistance = Math.min(localX, blockSize - 1 - localX, localY, blockSize - 1 - localY);
      const mortar = edgeDistance < 3;
      const edgeShade = edgeDistance < 18 ? (18 - edgeDistance) * 0.42 : 0;
      const grain = (pixelNoise(x, y) - 0.5) * 12;
      const blockVariation = (pixelNoise(blockX, row) - 0.5) * 10;
      const brightness = THREE.MathUtils.clamp(
        (mortar ? 184 : 224) + grain + blockVariation - edgeShade,
        0,
        255,
      );
      const index = (y * TEXTURE_SIZE + x) * 4;
      pixels[index] = brightness;
      pixels[index + 1] = brightness * 0.985;
      pixels[index + 2] = brightness * 0.95;
      pixels[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(pixels, TEXTURE_SIZE, TEXTURE_SIZE, THREE.RGBAFormat);
  texture.name = "war-room-tileable-plaster";
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export const WAR_ROOM_PLASTER_TEXTURE = createWarRoomPlasterTexture();
