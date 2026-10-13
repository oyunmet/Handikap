import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorldChunk,
  getVisibleWorldChunks,
  nextGateDistance,
  nextGateDistanceForCamera,
} from "./world-generation.ts";

test("world chunks are deterministic for a seed and vary between seeds", () => {
  const first = createWorldChunk(4, 1234);
  assert.deepEqual(createWorldChunk(4, 1234), first);
  assert.notDeepEqual(createWorldChunk(4, 4321), first);
  assert.equal(first.objects.length, 8);
  assert.ok(first.objects.some((object) => ["torch", "crystal", "firepit"].includes(object.kind)));
  assert.ok(first.objects.every((object) => object.worldX >= first.start && object.worldX < first.end));
});

test("large architecture stays outside the player's camera corridor", () => {
  for (let index = 0; index < 100; index += 1) {
    const chunk = createWorldChunk(index);
    for (const object of chunk.objects) {
      if (!["tower", "ruin", "arch"].includes(object.kind)) continue;
      assert.ok(
        Math.abs(object.lane * 9.3) >= 6.696,
        `${object.kind} ${object.id} spawned inside the road camera corridor`,
      );
    }
  }

  const towerAfterDemirYemin = createWorldChunk(1).objects.find((object) => object.kind === "tower");
  assert.ok(towerAfterDemirYemin);
  assert.ok(Math.abs(towerAfterDemirYemin.lane * 9.3) >= 6.696);
});

test("visible world chunks stay bounded and reuse generated chunks", () => {
  const cache = new Map();
  const output = [];
  const first = getVisibleWorldChunks(44, 390, 99, cache, output);
  const second = getVisibleWorldChunks(44, 390, 99, cache, output);
  assert.deepEqual(second, first);
  assert.equal(first, output);
  assert.ok(first.length > 1 && first.length < 12);
  assert.ok(cache.size <= 32);
});

test("reused world buffers and chunk data stay bounded through a five-minute run", () => {
  const cache = new Map();
  const output = [];
  const frames = 5 * 60 * 60;
  let maxCacheSize = 0;
  for (let frame = 0; frame <= frames; frame += 1) {
    const distance = (frame / 60) * 5;
    const chunks = getVisibleWorldChunks(distance, 390, 99, cache, output);
    assert.equal(chunks, output);
    assert.ok(chunks.length > 0);
    maxCacheSize = Math.max(maxCacheSize, cache.size);
  }
  assert.ok(maxCacheSize <= 32);
  assert.ok(cache.size <= 32);
});

test("the next gate remains ahead and advances by chapter interval", () => {
  assert.equal(nextGateDistance(0), 144);
  assert.equal(nextGateDistance(143.9), 144);
  assert.equal(nextGateDistance(144), 288);
});

test("the rendered gate stays until the trailing camera has cleared it", () => {
  assert.equal(nextGateDistanceForCamera(292, 6.5), 288);
  assert.equal(nextGateDistanceForCamera(294.5, 6.5), 432);
  assert.equal(nextGateDistanceForCamera(298.1, 10.2), 288);
  assert.equal(nextGateDistanceForCamera(298.2, 10.2), 432);
});
