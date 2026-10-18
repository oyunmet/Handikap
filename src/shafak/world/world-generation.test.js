import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorldChunk,
  getVisibleWorldChunks,
  getMinimumWorldSceneryAxisOffset,
  normalizeWorldObjectPlacement,
  nextGateDistance,
  nextGateDistanceForCamera,
  WORLD_SCENERY_LATERAL_SCALE,
} from "./world-generation.ts";

test("world chunks are deterministic for a seed and vary between seeds", () => {
  const first = createWorldChunk(4, 1234);
  assert.deepEqual(createWorldChunk(4, 1234), first);
  assert.notDeepEqual(createWorldChunk(4, 4321), first);
  assert.equal(first.objects.length, 8);
  assert.ok(first.objects.some((object) => ["torch", "firepit"].includes(object.kind)));
  for (let index = 0; index < 120; index += 1) {
    const chunk = createWorldChunk(index);
    assert.ok(
      chunk.objects.filter((object) =>
        ["fern", "moss-bush", "mangrove", "reed", "tree", "pine-tree"].includes(object.kind),
      ).length >= 2,
      `chapter chunk ${index} should include visible roadside greenery in more than one place`,
    );
    assert.ok(
      chunk.objects.every((object) =>
        object.kind !== "crystal" && object.kind !== "ice-crystal" && object.kind !== "bones",
      ),
      "roadside scenery must not contain invisible props or resemble collectible road rewards",
    );
    assert.ok(chunk.objects.every((object) => Math.abs(object.lane * 9.3) >= 6.8));
  }
  const treeVariants = new Set(
    Array.from({ length: 120 }, (_, index) => createWorldChunk(index).objects)
      .flat()
      .map((object) => object.kind)
      .filter((kind) => ["tree", "pine-tree", "skeletal-tree"].includes(kind)),
  );
  assert.deepEqual(treeVariants, new Set(["tree", "pine-tree", "skeletal-tree"]));
  assert.ok(first.objects.every((object) => object.worldX >= first.start && object.worldX < first.end));
});

test("large architecture stays outside the player's camera corridor", () => {
  for (let index = 0; index < 100; index += 1) {
    const chunk = createWorldChunk(index);
    for (const object of chunk.objects) {
      if (!["tower", "column", "ruin", "arch"].includes(object.kind)) continue;
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

test("carved landmarks sit farther out than foliage while roadside props stay off the road", () => {
  const landmarkKinds = new Set(["tower", "column", "ruin", "arch"]);
  let columnsSeen = 0;
  for (let index = 0; index < 120; index += 1) {
    for (const object of createWorldChunk(index).objects) {
      const lane = Math.abs(object.lane);
      assert.ok(lane >= 0.84, `${object.kind} ${object.id} must stay beyond the road shoulder`);
      if (landmarkKinds.has(object.kind)) {
        assert.ok(lane >= 1, `${object.kind} ${object.id} should leave room beside the road`);
      }
      if (object.kind === "column") columnsSeen += 1;
    }
  }
  assert.ok(columnsSeen > 0, "world chunks should include the new carved column landmark");
});

test("the shared scenery validator shifts objects beyond their scaled camera clearance", () => {
  const tooCloseArch = normalizeWorldObjectPlacement({ kind: "arch", lane: 0.2, scale: 1.2 });
  const tooCloseRock = normalizeWorldObjectPlacement({ kind: "rock", lane: -0.1, scale: 0.8 });
  const alreadySafe = { kind: "torch", lane: -1, scale: 1 };

  assert.ok(Math.abs(tooCloseArch.lane * WORLD_SCENERY_LATERAL_SCALE) >= getMinimumWorldSceneryAxisOffset("arch", 1.2));
  assert.ok(Math.abs(tooCloseRock.lane * WORLD_SCENERY_LATERAL_SCALE) >= getMinimumWorldSceneryAxisOffset("rock", 0.8));
  assert.ok(tooCloseArch.lane > 0, "positive-side props remain on their original side");
  assert.ok(tooCloseRock.lane < 0, "negative-side props remain on their original side");
  assert.equal(normalizeWorldObjectPlacement(alreadySafe), alreadySafe);
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
