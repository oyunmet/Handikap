import assert from "node:assert/strict";
import test from "node:test";
import { getRivalModelConfig } from "./opponent-model-config.ts";
import { PLAYER_CHARACTER_MODEL_PATH } from "./player-model.ts";
import { getWorldBotProfileByArchetype } from "./world-bot-profiles.ts";

test("Demir Taç uses the shared animated hero with a distinct boss outfit", () => {
  const profile = getWorldBotProfileByArchetype("chapter-boss");
  const worldConfig = getRivalModelConfig("Demir Taç", profile, "world");
  const duelConfig = getRivalModelConfig("Demir Taç", profile, "duel");

  assert.equal(worldConfig.modelPath, PLAYER_CHARACTER_MODEL_PATH);
  assert.equal(duelConfig.modelPath, PLAYER_CHARACTER_MODEL_PATH);
  assert.equal(worldConfig.isDemirTac, true);
  assert.equal(worldConfig.isBoss, true);
  assert.equal(worldConfig.appearance.armorLight, "#a8b1b8");
  assert.equal(worldConfig.appearance.trim, "#d7b16a");
  assert.equal(worldConfig.appearance.cape, "#681f2c");
  assert.equal(worldConfig.targetHeight, 1.95);
  assert.equal(duelConfig.targetHeight, 2.15);
  assert.equal(worldConfig.weapon, "greatsword");
  assert.equal(worldConfig.costume.helmet, true);
  assert.equal(worldConfig.costume.cape, true);
  assert.equal("animationClips" in worldConfig, false);
});
