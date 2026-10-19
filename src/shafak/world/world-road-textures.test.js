import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  createWorldRoadSurfaceTextures,
  WORLD_ROAD_TEXTURE_SIZE,
} from "./world-road-textures.ts";

test("road and ash-gravel PBR maps stay within the mobile texture budget", () => {
  const textures = createWorldRoadSurfaceTextures();
  try {
    assert.equal(WORLD_ROAD_TEXTURE_SIZE, 512);
    assert.equal(textures.roadVariants.length, 3);
    const allTextures = [
      ...textures.roadVariants.flatMap((variant) => Object.values(variant)),
      ...Object.values(textures.ground),
    ];
    for (const texture of allTextures) {
      assert.ok(texture.image.width <= 1_024);
      assert.ok(texture.image.height <= 1_024);
      assert.equal(texture.generateMipmaps, true);
      assert.equal(texture.wrapS, THREE.RepeatWrapping);
      assert.equal(texture.wrapT, THREE.RepeatWrapping);
      assert.equal(texture.anisotropy, 4);
    }
    assert.notDeepEqual(
      textures.roadVariants[0].color.image.data,
      textures.roadVariants[1].color.image.data,
    );
    assert.ok(textures.roadVariants[0].normal.image.data.some((value) => value !== 0));
    assert.ok(textures.ground.color.image.data.some((value) => value !== 0));
  } finally {
    textures.dispose();
  }
});
