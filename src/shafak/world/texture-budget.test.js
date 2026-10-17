import assert from "node:assert/strict";
import test from "node:test";
import {
  getTextureDimensionsAtCap,
  WORLD_TEXTURE_MAX_DIMENSION,
} from "./texture-budget.ts";

test("world texture budget preserves small images and caps the longest side at 1024", () => {
  assert.equal(WORLD_TEXTURE_MAX_DIMENSION, 1024);
  assert.deepEqual(getTextureDimensionsAtCap(512, 512), { width: 512, height: 512 });
  assert.deepEqual(getTextureDimensionsAtCap(2048, 1024), { width: 1024, height: 512 });
  assert.deepEqual(getTextureDimensionsAtCap(4096, 1024), { width: 1024, height: 256 });
});
