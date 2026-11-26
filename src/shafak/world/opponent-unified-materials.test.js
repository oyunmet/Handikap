import assert from "node:assert/strict";
import test from "node:test";
import { getRivalModelConfig } from "./opponent-model-config.ts";
import { getWorldBotProfileByArchetype } from "./world-bot-profiles.ts";

test("Mor Hançer uses the same static knight with its own outfit", () => {
  const profile = getWorldBotProfileByArchetype("iron-oath");
  const config = getRivalModelConfig("Mor Hançer", profile);

  assert.equal(config?.modelPath, "/models/fantasy_knight.glb");
  assert.equal(config?.targetHeight, 1.8);
  assert.ok(config?.appearance.armor);
});
