import assert from "node:assert/strict";
import test from "node:test";
import { selectWorldV2Labels } from "./world-v2-label-layout.ts";

function label(id, distance, left, top, visibleInCamera = true, maxDistance = 60) {
  return {
    id,
    distance,
    maxDistance,
    visibleInCamera,
    rect: { left, top, right: left + 90, bottom: top + 20 },
  };
}

test("world labels keep only the nearest three labels in view and in range", () => {
  const selected = selectWorldV2Labels([
    label(4, 18, 20, 20),
    label(3, 12, 120, 20),
    label(2, 5, 220, 20),
    label(1, 3, 320, 20),
    label(5, 1, 420, 20, false),
    label(6, 2, 520, 20, true, 1),
  ]);

  assert.deepEqual(selected.map((item) => item.id), [1, 2, 3]);
});

test("world labels skip UI keep-out areas and screen-space collisions", () => {
  const selected = selectWorldV2Labels(
    [
      label(1, 4, 30, 30),
      label(2, 5, 34, 32),
      label(3, 7, 150, 30),
    ],
    [{ left: 20, top: 20, right: 125, bottom: 75 }],
  );

  assert.deepEqual(selected.map((item) => item.id), [3]);
});
