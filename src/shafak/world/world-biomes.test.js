import assert from "node:assert/strict";
import test from "node:test";
import {
  BIOME_SPAN_METERS,
  BIOME_TRANSITION_METERS,
  getBiomeForDistance,
  getBiomeTransition,
  getWorldFogDensity,
  nextWeatherMode,
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

test("weather control cycles through clear, ash, embers, and fog without disabling the scene", () => {
  const cycle = ["clear", "ash", "ember", "fog"];
  for (let index = 0; index < cycle.length; index += 1) {
    assert.equal(nextWeatherMode(cycle[index]), cycle[(index + 1) % cycle.length]);
  }
});

test("fog settings stay readable for travel and combat in every weather", () => {
  assert.equal(getWorldFogDensity("clear", "ash-road"), 0.0025);
  assert.equal(getWorldFogDensity("ash", "ash-road"), 0.0038);
  assert.equal(getWorldFogDensity("ember", "ash-road"), 0.0042);
  assert.equal(getWorldFogDensity("fog", "ash-road"), 0.006);
  assert.equal(getWorldFogDensity("ash", "frozen-pass"), 0.0038 * 1.08);
  assert.equal(getWorldFogDensity("fog", "red-marsh"), 0.006 * 1.13);
  assert.equal(getWorldFogDensity("fog", "red-marsh", true), 0.0028);
});

test("generated scenic batches contain location-specific ice and marsh flora", () => {
  const frozenPass = createWorldChunk(9);
  const redMarsh = createWorldChunk(18);
  assert.equal(frozenPass.biome, "frozen-pass");
  assert.equal(redMarsh.biome, "red-marsh");
  assert.ok(frozenPass.objects.some((object) => object.kind === "ice-crystal"));
  assert.ok(redMarsh.objects.some((object) => object.kind === "mangrove"));
  assert.ok(redMarsh.objects.some((object) => object.kind === "reed"));
});
