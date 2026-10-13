import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateWorldLightRadius,
  WORLD_LIGHTING_DARKNESS_ALPHA,
} from "./world-lighting-model.ts";

test("global lighting cannot black out the world", () => {
  assert.ok(WORLD_LIGHTING_DARKNESS_ALPHA > 0);
  assert.ok(WORLD_LIGHTING_DARKNESS_ALPHA <= 0.15);
});

test("character levels and collected relics increase the light radius", () => {
  const base = calculateWorldLightRadius(400, 1, 0);
  const leveled = calculateWorldLightRadius(400, 5, 0);
  const relicBoosted = calculateWorldLightRadius(400, 1, 3);
  assert.ok(leveled > base);
  assert.ok(relicBoosted > base);
});

test("light radius remains within viewport-based bounds", () => {
  const width = 400;
  assert.equal(calculateWorldLightRadius(width, 1, 0), width * .64);
  assert.equal(calculateWorldLightRadius(width, 99, 99), width * .96);
  assert.ok(Number.isFinite(calculateWorldLightRadius(Number.NaN, 2, 1)));
});
