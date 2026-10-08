import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorldChunk,
  getVisibleWorldChunks,
  nextGateDistance,
} from "./world-generation.ts";

test("world chunks are deterministic for a seed and vary between seeds", () => {
  const first = createWorldChunk(4, 1234);
  assert.deepEqual(createWorldChunk(4, 1234), first);
  assert.notDeepEqual(createWorldChunk(4, 4321), first);
  assert.equal(first.objects.length, 7);
  assert.ok(first.objects.some((object) => ["torch", "crystal", "firepit"].includes(object.kind)));
  assert.ok(first.objects.every((object) => object.worldX >= first.start && object.worldX < first.end));
});

test("visible world chunks stay bounded and reuse generated chunks", () => {
  const cache = new Map();
  const first = getVisibleWorldChunks(44, 390, 99, cache);
  const second = getVisibleWorldChunks(44, 390, 99, cache);
  assert.deepEqual(second, first);
  assert.ok(first.length > 1 && first.length < 12);
  assert.ok(cache.size <= 32);
});

test("the next gate remains ahead and advances by chapter interval", () => {
  assert.equal(nextGateDistance(0), 144);
  assert.equal(nextGateDistance(143.9), 144);
  assert.equal(nextGateDistance(144), 288);
});
