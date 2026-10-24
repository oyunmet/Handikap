import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  applyOpponentBasePalette,
  attachOpponentCostume,
  shouldAttachOpponentCostume,
} from "./opponent-costume.ts";
import { getAnimatedRivalModelConfig } from "./opponent-model-config.ts";
import { getWorldBotProfileByArchetype } from "./world-bot-profiles.ts";
import {
  cloneCharacterResources,
  disposeCharacterResources,
  fitCharacterModel,
  getCharacterBounds,
} from "./character-model.ts";
import { prepareWorldAsset } from "./world-v2-assets.ts";

const modelPath = new URL("../../../public/models/player-hero.glb", import.meta.url);

function readGlb(path) {
  const buffer = fs.readFileSync(path);
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").trim());
}

test("Demir Taç uses the animated player rig and keeps a distinct boss identity", async () => {
  const gltf = readGlb(modelPath);
  const profile = getWorldBotProfileByArchetype("chapter-boss");
  const worldConfig = getAnimatedRivalModelConfig("Demir Taç", profile, "world");
  const duelConfig = getAnimatedRivalModelConfig("Demir Taç", profile, "duel");
  const buffer = fs.readFileSync(modelPath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const loaded = await new GLTFLoader().parseAsync(arrayBuffer, "");

  assert.equal(worldConfig.modelPath, "/models/player-hero.glb");
  assert.equal(worldConfig.isDemirTac, true);
  assert.equal(worldConfig.rootBoneName, "Root");
  assert.equal(worldConfig.modelFacing, Math.PI);
  assert.equal(worldConfig.modelRotation, undefined);
  assert.equal(shouldAttachOpponentCostume(worldConfig), true);
  assert.ok(loaded.scene.getObjectByName("Root"));
  assert.ok(loaded.scene.getObjectByName("Head"));
  assert.ok(loaded.scene.getObjectByName("ShoulderL"));
  assert.ok(loaded.scene.getObjectByName("LowerArmR"));
  assert.ok(loaded.scene.getObjectByName("LowerLegR"));
  assert.ok(loaded.scene.getObjectByName("FistR"));
  assert.ok(loaded.animations.some((clip) => clip.name === "Run"));
  assert.ok(worldConfig.animationClips.run?.includes("CharacterArmature|Run"));
  const materials = new Map();
  loaded.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const list = Array.isArray(object.material) ? object.material : [object.material];
    list.forEach((material) => materials.set(material.name.toLowerCase(), material));
  });
  const eyeColor = materials.get("eye").color.getHexString();
  applyOpponentBasePalette(loaded.scene, worldConfig);
  assert.equal(
    materials.get("shirt").color.getHexString(),
    worldConfig.appearance.armor.slice(1),
  );
  assert.equal(
    materials.get("hair").color.getHexString(),
    worldConfig.materialPalette.hair.slice(1),
  );
  assert.equal(materials.get("eye").color.getHexString(), eyeColor);
  assert.equal(worldConfig.targetHeight, 1.95);
  assert.equal(duelConfig.targetHeight, 3.35);
  assert.equal(worldConfig.weapon, "greatsword");
  assert.equal(worldConfig.maxDimension, 2.925);
  assert.equal(duelConfig.maxDimension, 4.6);
});

test("Demir Taç's rig-mounted armor stays grounded and within world and duel size targets", async () => {
  const buffer = fs.readFileSync(modelPath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const gltf = await new GLTFLoader().parseAsync(arrayBuffer, "");
  const profile = getWorldBotProfileByArchetype("chapter-boss");

  for (const context of ["world", "duel"]) {
    const config = getAnimatedRivalModelConfig("Demir Taç", profile, context);
    let model = cloneSkinned(gltf.scene);
    const resources = cloneCharacterResources(model);
    if (context === "world") {
      const asset = prepareWorldAsset(config.modelPath, {
        scene: model,
        animations: gltf.animations,
      }, {
        targetHeight: config.targetHeight,
        maxDimension: config.maxDimension,
        modelRotation: config.modelRotation,
      });
      model = asset.scene;
    } else {
      model.rotation.set(...(config.modelRotation ?? [0, 0, 0]));
      fitCharacterModel(model, config.targetHeight, config.modelPath, config.maxDimension);
    }

    const costume = attachOpponentCostume(model, config, config.appearance);
    model.updateMatrixWorld(true);
    const bounds = getCharacterBounds(model);
    const dimensions = bounds.getSize(new THREE.Vector3());
    try {
      assert.ok(model.getObjectByName("demir-tac-head-gear"));
      assert.ok(model.getObjectByName("demir-tac-crimson-cape"));
      assert.ok(Math.max(dimensions.x, dimensions.y, dimensions.z) <= config.maxDimension + 0.03);
      assert.ok(dimensions.y >= config.targetHeight, `${context} gear should remain visible above the fitted rig`);
      assert.ok(Math.abs(bounds.min.y) < 0.03, `${context} ground offset=${bounds.min.y}`);
    } finally {
      costume.dispose();
      disposeCharacterResources(resources);
    }
  }
});
