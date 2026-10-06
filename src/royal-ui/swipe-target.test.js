import test from "node:test";
import assert from "node:assert/strict";
import { getAdjacentSwipeTarget } from "./swipe-target.js";

const start = { row: 4, col: 3, startX: 100, startY: 100 };

test("a long swipe in any cardinal direction moves only to the adjacent cell", () => {
  const cases = [
    { endX: 420, endY: 112, expected: { row: 4, col: 4 } },
    { endX: -180, endY: 94, expected: { row: 4, col: 2 } },
    { endX: 106, endY: -320, expected: { row: 3, col: 3 } },
    { endX: 108, endY: 540, expected: { row: 5, col: 3 } },
  ];

  for (const { endX, endY, expected } of cases) {
    assert.deepEqual(
      getAdjacentSwipeTarget({ ...start, endX, endY }),
      expected,
    );
  }
});

test("diagonal drags follow their dominant axis", () => {
  assert.deepEqual(
    getAdjacentSwipeTarget({ ...start, endX: 280, endY: 150 }),
    { row: 4, col: 4 },
  );
  assert.deepEqual(
    getAdjacentSwipeTarget({ ...start, endX: 150, endY: 280 }),
    { row: 5, col: 3 },
  );
});

test("a swipe prefers the adjacent tile under the release point", () => {
  assert.deepEqual(
    getAdjacentSwipeTarget({
      ...start,
      endX: 180,
      endY: 115,
      releaseRow: 5,
      releaseCol: 3,
    }),
    { row: 5, col: 3 },
  );
});

test("the marked swipe targets the red tile immediately left of the yellow crown", () => {
  assert.deepEqual(
    getAdjacentSwipeTarget({
      row: 2,
      col: 7,
      startX: 350,
      startY: 220,
      endX: 300,
      endY: 220,
      releaseRow: 2,
      releaseCol: 6,
    }),
    { row: 2, col: 6 },
  );
});

test("a tap-sized movement and invalid coordinates are not treated as a swipe", () => {
  assert.equal(
    getAdjacentSwipeTarget({ ...start, endX: 109, endY: 112 }),
    null,
  );
  assert.equal(
    getAdjacentSwipeTarget({ ...start, endX: Number.NaN, endY: 120 }),
    null,
  );
});
