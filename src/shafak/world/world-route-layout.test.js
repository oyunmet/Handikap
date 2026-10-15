import assert from "node:assert/strict";
import test from "node:test";
import {
  getWorldForkCenterline,
  getWorldForkGateDistances,
} from "./world-route-layout.ts";

test("left and right road branches split before the gate and merge after it", () => {
  const left = getWorldForkCenterline("left");
  const right = getWorldForkCenterline("right");

  assert.deepEqual(left[0], [0, 30]);
  assert.deepEqual(right[0], [0, 30]);
  assert.deepEqual(left.at(-1), [0, -28]);
  assert.deepEqual(right.at(-1), [0, -28]);
  assert.equal(left.length, right.length);

  for (let index = 0; index < left.length; index += 1) {
    assert.ok(Math.abs(left[index][0] + right[index][0]) < 1e-9);
    assert.equal(left[index][1], right[index][1]);
    assert.ok(left[index][0] <= 0);
    assert.ok(right[index][0] >= 0);
  }

  const gateIndex = left.findIndex(([, z]) => z === 0);
  assert.ok(gateIndex > 0);
  assert.ok(left[gateIndex][0] <= -4.5, "left road must reach its own gate entrance");
  assert.ok(right[gateIndex][0] >= 4.5, "right road must reach its own gate entrance");
});

test("visible fork gates align to chapter boundaries and ignore invalid chunks", () => {
  assert.deepEqual(
    getWorldForkGateDistances([-1, 0, 1, 2, 3, 4, 6, 9, 9, Number.NaN]),
    [144, 288, 432],
  );
});
