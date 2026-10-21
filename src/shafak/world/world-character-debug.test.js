import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { inspectWorldCharacterGroups } from "./world-character-debug.ts";
import { prepareWorldAsset, cloneWorldCharacter } from "./world-v2-assets.ts";
import { WORLD_V2_CONFIG } from "./world-v2-config.ts";

test("skinned mesh diagnostics measure the visible deformed bounds, not distant source pivots", async () => {
  const buffer = fs.readFileSync(new URL("../../../public/models/player-hero.glb", import.meta.url));
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
  const gltf = await new Promise((resolve, reject) =>
    new GLTFLoader().parse(arrayBuffer, "/", resolve, reject));
  const asset = prepareWorldAsset("/models/player-hero.glb", gltf, WORLD_V2_CONFIG.player);
  const model = cloneWorldCharacter(asset);
  const scene = new THREE.Scene();
  const actor = new THREE.Group();
  actor.name = "world-v2-player";
  actor.userData.worldCharacterRoot = true;
  actor.userData.worldPlayerActor = true;
  const modelAxis = new THREE.Group();
  modelAxis.rotation.y = WORLD_V2_CONFIG.modelFacing;
  modelAxis.add(model);
  actor.add(modelAxis);
  scene.add(actor);

  const [entry] = inspectWorldCharacterGroups(scene);

  assert.equal(entry.meshes.length, 7);
  assert.ok(entry.meshes.every((mesh) => mesh.offset < 3));
  assert.deepEqual(entry.errors, []);
});
