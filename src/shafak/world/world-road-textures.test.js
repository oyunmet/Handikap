import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  createWorldRoadSurfaceTextures,
  WORLD_ROAD_TEXTURE_SIZE,
} from "./world-road-textures.ts";
import { createWorldRoadEnvironment } from "./world-road-environment.ts";
import { BEVELED_STONE_BLOCK_GEOMETRY } from "./procedural-materials.ts";

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
    const roadPixels = textures.roadVariants[0].color.image.data;
    assert.ok(roadPixels.some((value, index) => index % 4 === 0 && value > 165));
    assert.ok(roadPixels.some((value, index) => index % 4 === 0 && value < 90));
    assert.ok(textures.roadVariants[0].normal.image.data.some((value) => value !== 0));
    assert.ok(textures.ground.color.image.data.some((value) => value !== 0));
  } finally {
    textures.dispose();
  }
});

test("the low-detail road still uses raised staggered cobblestones", () => {
  const environment = createWorldRoadEnvironment(false, "low");
  try {
    const segment = environment.segments[0].root;
    const paving = segment.getObjectByName("world-cobblestone-road-stones");
    assert.ok(paving instanceof THREE.InstancedMesh);
    assert.equal(paving.geometry, BEVELED_STONE_BLOCK_GEOMETRY);
    assert.ok(paving.count >= 120);

    const firstRowStart = new THREE.Matrix4();
    const secondRowStart = new THREE.Matrix4();
    const firstPosition = new THREE.Vector3();
    const secondPosition = new THREE.Vector3();
    paving.getMatrixAt(0, firstRowStart);
    paving.getMatrixAt(9, secondRowStart);
    firstRowStart.decompose(firstPosition, new THREE.Quaternion(), new THREE.Vector3());
    secondRowStart.decompose(secondPosition, new THREE.Quaternion(), new THREE.Vector3());
    assert.ok(Math.abs(secondPosition.x - firstPosition.x) > 0.4, "adjacent rows are offset like running-bond masonry");
  } finally {
    environment.dispose();
  }
});

test("disposing a road environment also releases its generated surface textures", () => {
  const environment = createWorldRoadEnvironment(false, "low");
  const textures = new Set();
  environment.root.traverse((object) => {
    const material = object.material;
    if (!material) return;
    const materials = Array.isArray(material) ? material : [material];
    for (const entry of materials) {
      for (const value of Object.values(entry)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  let disposeEvents = 0;
  textures.forEach((texture) => texture.addEventListener("dispose", () => disposeEvents += 1));

  environment.dispose();

  assert.ok(textures.size > 0);
  assert.equal(disposeEvents, textures.size);
});
