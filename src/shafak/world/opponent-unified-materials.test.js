import assert from "node:assert/strict";
import test from "node:test";
import { getAnimatedRivalModelConfig } from "./opponent-model-config.ts";
import { getWorldBotProfileByArchetype } from "./world-bot-profiles.ts";

test("Mor Hançer's combined human texture atlas keeps its skin and clothing colors", () => {
  const profile = getWorldBotProfileByArchetype("iron-oath");
  const config = getAnimatedRivalModelConfig("Mor Hançer", profile);

  assert.equal(config?.modelPath, "/models/human.glb");
  assert.ok(config?.preserveOriginalMaterialAliases?.includes("texture"));
});
