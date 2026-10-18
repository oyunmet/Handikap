import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { inspectWorldModelMeshes } from "./world-model-diagnostics.ts";

test("world diagnostics report named hazards, props and NPCs using world-space dimensions and scale", () => {
  const scene = new THREE.Scene();
  const hazard = new THREE.Group();
  hazard.position.x = 3;
  hazard.scale.set(2, 1, 1);
  hazard.userData.worldModelCategory = "hazard";
  hazard.userData.worldModelLabel = "falling-rock:chapter-2";
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 3), new THREE.MeshBasicMaterial());
  hazard.add(mesh);
  scene.add(hazard);

  const rows = inspectWorldModelMeshes(scene);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].category, "hazard");
  assert.equal(rows[0].name, "falling-rock:chapter-2/Mesh#0");
  assert.deepEqual(rows[0].worldSizeM, [2, 2, 3]);
  assert.deepEqual(rows[0].worldScale, [2, 1, 1]);
  assert.equal(rows[0].oversized, false);
});

test("world diagnostics flag individual oversized meshes without hiding them", () => {
  const scene = new THREE.Scene();
  const npc = new THREE.Group();
  npc.userData.worldModelCategory = "npc";
  npc.userData.worldModelLabel = "Mor Hançer";
  npc.add(new THREE.Mesh(new THREE.BoxGeometry(6, 2, 1), new THREE.MeshBasicMaterial()));
  scene.add(npc);

  const rows = inspectWorldModelMeshes(scene);
  assert.equal(rows[0].oversized, true);
  assert.equal(rows[0].maxDimension, 6);
  assert.equal(npc.visible, true);
});
