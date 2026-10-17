import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  applyRockPbrMaterials,
  createProceduralStonePixels,
  STONE_PBR_TEXTURES,
} from "./procedural-materials.ts";

test("procedural stone PBR channels are deterministic, complete, and distinct", () => {
  const first = createProceduralStonePixels(16);
  const second = createProceduralStonePixels(16);

  assert.deepEqual(first, second);
  assert.equal(first.size, 16);
  assert.equal(first.color.length, 16 * 16 * 4);
  assert.equal(first.normal.length, 16 * 16 * 4);
  assert.equal(first.roughness.length, 16 * 16 * 4);
  assert.notDeepEqual(first.color, first.normal);
  assert.ok(first.roughness.every((channel) => channel > 0));
});

test("loaded rock materials use matte grey-beige procedural stone", () => {
  const model = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: "#39271f", metalness: 0.8, roughness: 0.2 }),
  );
  model.add(mesh);

  applyRockPbrMaterials(model);

  const material = mesh.material;
  assert.equal(material.color.getHexString(), "a69f90");
  assert.equal(material.roughness, 0.9);
  assert.equal(material.metalness, 0);
  assert.equal(material.map, STONE_PBR_TEXTURES.color);
  assert.equal(material.normalMap, STONE_PBR_TEXTURES.normal);
});
