import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { CORE_ASSETS } from "../../data/asset-manifest.ts";
import { PRINCESS_BASE_MODEL_URL } from "./princess-model-config.ts";
import {
  FANTASY_KNIGHT_MODEL_PATH,
  getFantasyKnightHeadAccessory,
  getFantasyKnightOutfitVariant,
} from "./fantasy-knight-model.ts";
import { KNIGHT_CONFIG } from "./knight-config.ts";
import { PLAYER_CHARACTER_MODEL_FACING, PLAYER_CHARACTER_MODEL_PATH, PLAYER_CHARACTER_TARGET_HEIGHT } from "./player-model.ts";

const modelUrl = new URL("../../../public/models/fantasy_knight.glb", import.meta.url);

function readGlbJson(bytes) {
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  const jsonLength = bytes.readUInt32LE(12);
  return JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8").trim());
}

test("all game modes share the same static character model", async () => {
  const expectedPath = "/models/fantasy_knight.glb";
  assert.equal(FANTASY_KNIGHT_MODEL_PATH, expectedPath);
  assert.equal(CORE_ASSETS.player, expectedPath);
  assert.equal(PLAYER_CHARACTER_MODEL_PATH, expectedPath);
  assert.equal(KNIGHT_CONFIG.modelPath, expectedPath);
  assert.equal(PRINCESS_BASE_MODEL_URL, expectedPath);
  assert.equal(PLAYER_CHARACTER_MODEL_FACING, Math.PI);
  assert.equal(PLAYER_CHARACTER_TARGET_HEIGHT, 1.7);

  const model = readGlbJson(fs.readFileSync(modelUrl));
  assert.ok(model.meshes?.length > 0, "the shared character GLB should contain visible mesh parts");
  assert.equal(model.skins?.length ?? 0, 0, "the shared character stays a static mesh model");
  assert.equal(model.animations?.length ?? 0, 0, "the shared character has no body animation clips");
  assert.ok(model.nodes.some((node) => node.mesh !== undefined));
  assert.ok(model.nodes.every((node) => node.skin === undefined));
});

test("outfit colors and head accessories stay stable for each character identity", () => {
  assert.deepEqual(
    getFantasyKnightOutfitVariant("city-resident-7"),
    getFantasyKnightOutfitVariant("city-resident-7"),
  );
  assert.equal(
    getFantasyKnightHeadAccessory("city-resident-7"),
    getFantasyKnightHeadAccessory("city-resident-7"),
  );

  const outfits = new Set(
    Array.from({ length: 20 }, (_, index) =>
      JSON.stringify(getFantasyKnightOutfitVariant(`rival-${index}`))),
  );
  assert.ok(outfits.size > 1, "different characters can wear different static color variants");
});
