import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorldChunk,
  getVisibleWorldChunks,
  nextGateDistance,
  WORLD_PROP_LANE_SPACING,
  WORLD_PROP_MAX_HALF_WIDTH,
  WORLD_PROP_MIN_LANE,
  WORLD_ROAD_HALF_WIDTH,
} from "./world-generation.ts";

test("world chunks are deterministic for a seed and vary between seeds", () => {
  const first = createWorldChunk(4, 1234);
  assert.deepEqual(createWorldChunk(4, 1234), first);
  assert.notDeepEqual(createWorldChunk(4, 4321), first);
  assert.equal(first.objects.length, 8);
  assert.ok(first.objects.some((object) => ["torch", "crystal", "firepit"].includes(object.kind)));
  assert.ok(first.objects.every((object) => object.worldX >= first.start && object.worldX < first.end));
});

test("scenic structures stay outside the playable road and cannot block the camera", () => {
  for (let seed = 0; seed < 24; seed += 1) {
    for (let chunkIndex = 0; chunkIndex < 24; chunkIndex += 1) {
      const chunk = createWorldChunk(chunkIndex, seed + 1);
      for (const object of chunk.objects) {
        const lateralDistance = Math.abs(object.lane) * WORLD_PROP_LANE_SPACING;
        assert.ok(Math.abs(object.lane) >= WORLD_PROP_MIN_LANE);
        assert.ok(
          lateralDistance > WORLD_ROAD_HALF_WIDTH + WORLD_PROP_MAX_HALF_WIDTH,
          `${object.kind} in chunk ${chunkIndex} overlaps the road`,
        );
      }
    }
  }
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
