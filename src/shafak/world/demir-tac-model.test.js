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
import { prepareWorldActorClips } from "./model-animation.ts";
import { prepareWorldAsset } from "./world-v2-assets.ts";
import { WORLD_MODEL_SIZE_TARGETS } from "./world-model-sizing.ts";

if (!globalThis.self) globalThis.self = globalThis;
if (!globalThis.createImageBitmap) {
  globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
}

const modelPath = new URL("../../../public/models/player-hero.glb", import.meta.url);

function readGlb(path) {
  const buffer = fs.readFileSync(path);
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").trim());
}

test("Demir Taç uses the campaign hero rig and keeps a distinct boss identity", async () => {
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
  assert.equal(worldConfig.appearance.armorLight, "#a8b1b8");
  assert.equal(worldConfig.appearance.trim, "#d7b16a");
  assert.equal(worldConfig.appearance.cape, "#681f2c");
  assert.equal(shouldAttachOpponentCostume(worldConfig), true);
  assert.ok(loaded.scene.getObjectByName("Root"));
  assert.ok(loaded.scene.getObjectByName("Head"));
  assert.ok(loaded.animations.some((clip) => clip.name === "CharacterArmature|Run"));
  assert.ok(worldConfig.animationClips.run?.includes("Run"));
  const materials = new Map();
  loaded.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const list = Array.isArray(object.material) ? object.material : [object.material];
    list.forEach((material) => materials.set(material.name.toLowerCase(), material));
  });
  const heroShirt = materials.get("shirt");
  assert.ok(heroShirt, "the shared hero shirt material remains available for boss colors");
  applyOpponentBasePalette(loaded.scene, worldConfig);
  assert.equal(heroShirt.color.getHexString(), new THREE.Color(worldConfig.appearance.armor).getHexString());
  assert.equal(worldConfig.targetHeight, 1.95);
  assert.equal(duelConfig.targetHeight, 2.15);
  assert.equal(worldConfig.weapon, "greatsword");
  assert.equal(worldConfig.maxDimension, 2.925);
  assert.equal(duelConfig.maxDimension, 3.25);
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

test("the shared hero model fits the campaign's measured character size", async () => {
  const buffer = fs.readFileSync(modelPath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const gltf = await new GLTFLoader().parseAsync(arrayBuffer, "");
  const fitted = prepareWorldAsset("/models/player-hero.glb", gltf, WORLD_MODEL_SIZE_TARGETS.player);
  const bounds = getCharacterBounds(fitted.scene);
  const dimensions = bounds.getSize(new THREE.Vector3());

  assert.ok(Math.abs(dimensions.y - WORLD_MODEL_SIZE_TARGETS.player.targetHeight) < 0.08);
  assert.ok(Math.max(dimensions.x, dimensions.y, dimensions.z) <= WORLD_MODEL_SIZE_TARGETS.player.maxDimension + 0.03);
  assert.ok(Math.abs(bounds.min.y) < 0.03);
  assert.ok(fitted.scene.children.length > 0);
});

test("boss locomotion uses the shared hero's clean in-place walk and run clips", async () => {
  const buffer = fs.readFileSync(modelPath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const gltf = await new GLTFLoader().parseAsync(arrayBuffer, "");
  const demirTacConfig = getAnimatedRivalModelConfig(
    "Demir Taç",
    getWorldBotProfileByArchetype("chapter-boss"),
    "world",
  );
  assert.ok(demirTacConfig);
  const preparedClips = prepareWorldActorClips(
    demirTacConfig.modelPath,
    gltf.animations,
    demirTacConfig.rootBoneName,
  );

  for (const clipName of ["CharacterArmature|Walk", "CharacterArmature|Run"]) {
    const source = gltf.animations.find((clip) => clip.name === clipName);
    const prepared = preparedClips.find((clip) => clip.name === clipName);
    assert.ok(source, `the shared hero GLB should contain ${clipName}`);
    assert.ok(prepared, `the world actor should prepare ${clipName}`);
    assert.notEqual(prepared, source);
    assert.equal(
      prepared.tracks.some((track) => track.name === `${demirTacConfig.rootBoneName}.position`),
      false,
      `${clipName} should not translate the shared hero root`,
    );
    assert.ok(prepared.tracks.some((track) => track.name.endsWith(".quaternion")));
  }
});
