import assert from "node:assert/strict";
import test from "node:test";
import { getAnimatedRivalModelConfig } from "./opponent-model-config.ts";
import { getWorldBotProfileByArchetype } from "./world-bot-profiles.ts";

test("Mor Hançer uses the existing full-body skinned hero rig", () => {
  const profile = getWorldBotProfileByArchetype("iron-oath");
  const config = getAnimatedRivalModelConfig("Mor Hançer", profile);

  assert.equal(config?.modelPath, "/models/player-hero.glb");
  assert.equal(config?.rootBoneName, "Root");
  assert.equal(config?.targetHeight, 1.8);
  assert.ok(config?.animationClips.idle?.length);
});
