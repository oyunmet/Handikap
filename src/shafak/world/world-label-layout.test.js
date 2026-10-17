import assert from "node:assert/strict";
import test from "node:test";
import {
  getNearestWorldLabelIds,
  WORLD_LABEL_LIMIT,
  WORLD_LABEL_RANGE_METERS,
} from "./world-label-layout.ts";

test("world labels are limited to the six closest candidates within 20 metres", () => {
  const candidates = Array.from({ length: 9 }, (_, index) => ({
    id: `tag-${index}`,
    x: index,
    distance: 0,
  }));
  candidates.push(
    { id: "too-far-laterally", x: 20.01, distance: 0 },
    { id: "too-far-forward", x: 0, distance: 20.01 },
  );

  assert.equal(WORLD_LABEL_LIMIT, 6);
  assert.equal(WORLD_LABEL_RANGE_METERS, 20);
  assert.deepEqual(
    getNearestWorldLabelIds(candidates, 0, 0),
    ["tag-0", "tag-1", "tag-2", "tag-3", "tag-4", "tag-5"],
  );
});

test("world label selection deduplicates IDs and is stable for equal distances", () => {
  assert.deepEqual(
    getNearestWorldLabelIds([
      { id: "b", x: 1, distance: 0 },
      { id: "a", x: -1, distance: 0 },
      { id: "a", x: 0, distance: 2 },
      { id: "invalid", x: Number.NaN, distance: 0 },
    ], 0, 0),
    ["a", "b"],
  );
});
