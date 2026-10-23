import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { shouldAttachOpponentCostume } from "./opponent-costume.ts";
import { getAnimatedRivalModelConfig } from "./opponent-model-config.ts";
import { getWorldBotProfileByArchetype } from "./world-bot-profiles.ts";
import {
  cloneCharacterResources,
  fitCharacterModel,
  getCharacterBounds,
} from "./character-model.ts";
import { prepareWorldAsset } from "./world-v2-assets.ts";

const modelPath = new URL("../../../public/models/fantasy_knight.glb", import.meta.url);

function readGlb(path) {
  const buffer = fs.readFileSync(path);
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").trim());
}

test("Demir Taç selects the original armored knight GLB without recoloring or generated gear", () => {
  const gltf = readGlb(modelPath);
  const profile = getWorldBotProfileByArchetype("chapter-boss");
  const worldConfig = getAnimatedRivalModelConfig("Demir Taç", profile, "world");
  const duelConfig = getAnimatedRivalModelConfig("Demir Taç", profile, "duel");

  assert.equal(worldConfig.modelPath, "/models/fantasy_knight.glb");
  assert.equal(worldConfig.isDemirTac, true);
  assert.equal(worldConfig.rootBoneName, "world");
  assert.deepEqual(worldConfig.modelRotation, [-Math.PI / 2, 0, 0]);
  assert.equal(gltf.animations?.length ?? 0, 0);
  assert.equal(gltf.skins?.length ?? 0, 0);
  const modelParts = gltf.nodes.map((node) => node.name);
  for (const part of ["flowing_crimson_cape", "sword_blade", "gold_chest_rim_-1", "pauldron_plate1"]) {
    assert.ok(modelParts.includes(part), `missing bundled character part: ${part}`);
  }
  assert.equal(shouldAttachOpponentCostume(worldConfig), false);
  assert.equal(worldConfig.targetHeight, 1.95);
  assert.equal(duelConfig.targetHeight, 3.35);
  assert.equal(worldConfig.weapon, "greatsword");
  assert.equal(worldConfig.maxDimension, 2.925);
  assert.equal(duelConfig.maxDimension, 4.6);
});

test("Demir Taç's bundled cape, armor, and sword stay inside world and duel size targets", async () => {
  const buffer = fs.readFileSync(modelPath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const gltf = await new GLTFLoader().parseAsync(arrayBuffer, "");
  const profile = getWorldBotProfileByArchetype("chapter-boss");

  for (const context of ["world", "duel"]) {
    const config = getAnimatedRivalModelConfig("Demir Taç", profile, context);
    const model = cloneSkinned(gltf.scene);
    let dimensions;
    let groundOffset;
    if (context === "world") {
      const asset = prepareWorldAsset(config.modelPath, {
        scene: model,
        animations: gltf.animations,
      }, {
        targetHeight: config.targetHeight,
        maxDimension: config.maxDimension,
        modelRotation: config.modelRotation,
      });
      const bounds = getCharacterBounds(asset.scene);
      dimensions = bounds.getSize(new THREE.Vector3());
      groundOffset = bounds.min.y;
    } else {
      cloneCharacterResources(model);
      model.rotation.set(...config.modelRotation);
      fitCharacterModel(model, config.targetHeight, config.modelPath, config.maxDimension);
      const bounds = getCharacterBounds(model);
      dimensions = bounds.getSize(new THREE.Vector3());
      groundOffset = bounds.min.y;
    }

    assert.ok(Math.abs(dimensions.y - config.targetHeight) < 0.02, `${context} height=${dimensions.y}`);
    assert.ok(Math.max(dimensions.x, dimensions.y, dimensions.z) <= config.maxDimension + 0.01);
    assert.ok(Math.abs(groundOffset) < 0.02, `${context} ground offset=${groundOffset}`);
  }
});
