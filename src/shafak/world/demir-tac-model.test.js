import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { attachOpponentCostume } from "./opponent-costume.ts";
import { getAnimatedRivalModelConfig } from "./opponent-model-config.ts";
import { getWorldBotProfileByArchetype } from "./world-bot-profiles.ts";
import {
  cloneCharacterResources,
  fitCharacterModel,
  getCharacterBounds,
  prepareCharacterSkinnedMeshes,
} from "./character-model.ts";

const modelPath = new URL("../../../public/models/player-hero.glb", import.meta.url);

function readGlb(path) {
  const buffer = fs.readFileSync(path);
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").trim());
}

test("Demir Taç uses the animated humanoid rig with a detailed, correctly sized iron identity", () => {
  const gltf = readGlb(modelPath);
  const profile = getWorldBotProfileByArchetype("chapter-boss");
  const worldConfig = getAnimatedRivalModelConfig("Demir Taç", profile, "world");
  const duelConfig = getAnimatedRivalModelConfig("Demir Taç", profile, "duel");

  assert.equal(worldConfig.modelPath, "/models/player-hero.glb");
  assert.equal(worldConfig.isDemirTac, true);
  assert.equal(worldConfig.rootBoneName, "Root");
  assert.ok(gltf.animations.some((clip) => clip.name === "CharacterArmature|Dagger_Attack"));
  assert.equal(worldConfig.targetHeight, 1.95);
  assert.equal(duelConfig.targetHeight, 3.35);
  assert.equal(worldConfig.weapon, "greatsword");
  assert.equal(worldConfig.appearance.armor, "#252a30");
  assert.equal(worldConfig.appearance.armorLight, "#858e96");
  assert.equal(worldConfig.appearance.trim, "#bc4142");
  assert.equal(worldConfig.costume.helmet, true);
  assert.equal(worldConfig.costume.mask, true);
  assert.equal(worldConfig.costume.cape, true);

  assert.equal(worldConfig.maxDimension, 2.925);
  assert.equal(duelConfig.maxDimension, 4.6);
});

test("Demir Taç's crown, cape, and armor stay inside world and duel size targets", async () => {
  const buffer = fs.readFileSync(modelPath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const gltf = await new GLTFLoader().parseAsync(arrayBuffer, "");
  const profile = getWorldBotProfileByArchetype("chapter-boss");

  for (const context of ["world", "duel"]) {
    const config = getAnimatedRivalModelConfig("Demir Taç", profile, context);
    const model = cloneSkinned(gltf.scene);
    cloneCharacterResources(model);
    prepareCharacterSkinnedMeshes(model);
    fitCharacterModel(model, config.targetHeight, config.modelPath, config.maxDimension);
    const costume = attachOpponentCostume(model, config, config.appearance);
    fitCharacterModel(model, config.targetHeight, config.modelPath, config.maxDimension);
    const bounds = getCharacterBounds(model);
    const dimensions = bounds.getSize(new THREE.Vector3());

    assert.ok(Math.abs(dimensions.y - config.targetHeight) < 0.02, `${context} height=${dimensions.y}`);
    assert.ok(Math.max(dimensions.x, dimensions.y, dimensions.z) <= config.maxDimension + 0.01);
    assert.ok(Math.abs(bounds.min.y) < 0.02, `${context} ground offset=${bounds.min.y}`);

    costume.dispose();
  }
});
