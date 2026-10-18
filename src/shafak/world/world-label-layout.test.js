import assert from "node:assert/strict";
import test from "node:test";
import {
  getWorldLabelOpacity,
  getNearestWorldLabelIds,
  WORLD_LABEL_LIMIT,
  WORLD_LABEL_RANGE_METERS,
} from "./world-label-layout.ts";

test("world labels fade near the player and are limited to five candidates within 25 metres", () => {
  const candidates = Array.from({ length: 9 }, (_, index) => ({
    id: `tag-${index}`,
    x: index * 4,
    distance: 4,
  }));
  candidates.push(
    { id: "too-far-laterally", x: 25.01, distance: 4 },
    { id: "too-far-forward", x: 0, distance: 25.01 },
    { id: "too-close", x: 0, distance: 2 },
  );

  assert.equal(WORLD_LABEL_LIMIT, 5);
  assert.equal(WORLD_LABEL_RANGE_METERS, 25);
  assert.equal(getWorldLabelOpacity(2.99), 0);
  assert.ok(getWorldLabelOpacity(3.75) > 0 && getWorldLabelOpacity(3.75) < 1);
  assert.equal(getWorldLabelOpacity(4.5), 1);
  assert.deepEqual(
    getNearestWorldLabelIds(candidates, 0, 0),
    ["tag-0", "tag-1", "tag-2", "tag-3", "tag-4"],
  );
});

test("world label selection deduplicates IDs and is stable for equal distances", () => {
  assert.deepEqual(
    getNearestWorldLabelIds([
      { id: "b", x: 4, distance: 4 },
      { id: "a", x: -4, distance: 4 },
      { id: "a", x: -4, distance: 5 },
      { id: "invalid", x: Number.NaN, distance: 0 },
    ], 0, 0),
    ["a", "b"],
  );
});

test("nearby world labels that would overlap each other are culled", () => {
  assert.deepEqual(
    getNearestWorldLabelIds([
      { id: "closest", x: 0, distance: 5 },
      { id: "crowded", x: 1, distance: 5 },
      { id: "separate", x: 0, distance: 10 },
    ], 0, 0),
    ["closest", "separate"],
  );
});
