import assert from "node:assert/strict";
import test from "node:test";
import {
  BIOME_SPAN_METERS,
  BIOME_TRANSITION_METERS,
  getBiomeForDistance,
  getWeatherHandlingMultiplier,
  getBiomeTransition,
} from "./world-biomes.ts";
import { createWorldChunk } from "./world-generation.ts";

test("the three biomes repeat in the specified order at stable world distances", () => {
  assert.equal(getBiomeForDistance(0), "ash-road");
  assert.equal(getBiomeForDistance(BIOME_SPAN_METERS), "frozen-pass");
  assert.equal(getBiomeForDistance(BIOME_SPAN_METERS * 2), "red-marsh");
  assert.equal(getBiomeForDistance(BIOME_SPAN_METERS * 3), "ash-road");
});

test("biome palettes blend smoothly across the first chunk after each biome gate", () => {
  const boundary = BIOME_SPAN_METERS;
  assert.deepEqual(getBiomeTransition(boundary), {
    from: "ash-road",
    to: "frozen-pass",
    mix: 0,
    biome: "frozen-pass",
  });
  const midpoint = getBiomeTransition(boundary + BIOME_TRANSITION_METERS / 2);
  assert.equal(midpoint.from, "ash-road");
  assert.equal(midpoint.to, "frozen-pass");
  assert.equal(midpoint.mix, 0.5);
  assert.deepEqual(getBiomeTransition(boundary + BIOME_TRANSITION_METERS), {
    from: "frozen-pass",
    to: "frozen-pass",
    mix: 0,
    biome: "frozen-pass",
  });
});

test("rain and storms reduce steering response while other weather keeps normal handling", () => {
  assert.equal(getWeatherHandlingMultiplier("clear"), 1);
  assert.equal(getWeatherHandlingMultiplier("fog"), 1);
  assert.equal(getWeatherHandlingMultiplier("rain"), 0.9);
  assert.equal(getWeatherHandlingMultiplier("storm"), 0.76);
});

test("generated scenic batches contain road props and marsh flora, not fake gems", () => {
  const frozenPass = createWorldChunk(9);
  const redMarsh = createWorldChunk(18);
  assert.equal(frozenPass.biome, "frozen-pass");
  assert.equal(redMarsh.biome, "red-marsh");
  assert.ok(frozenPass.objects.some((object) => ["rock", "cart", "flag"].includes(object.kind)));
  assert.ok(frozenPass.objects.every((object) => object.kind !== "ice-crystal" && object.kind !== "crystal"));
  assert.ok(redMarsh.objects.some((object) => object.kind === "mangrove"));
  assert.ok(redMarsh.objects.some((object) => object.kind === "reed"));
});
