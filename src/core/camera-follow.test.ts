import assert from "node:assert/strict";
import test from "node:test";
import { smoothFollow } from "./camera-follow";

test("smoothFollow moves a reusable camera vector toward its target", () => {
  const current = { x: 0, y: 0, z: 0 };
  const target = { x: 10, y: 5, z: -2 };

  const result = smoothFollow(current, target, 1 / 60, 9);

  assert.equal(result, current);
  assert.ok(current.x > 0 && current.x < target.x);
  assert.ok(current.y > 0 && current.y < target.y);
  assert.ok(current.z < 0 && current.z > target.z);
});

test("smoothFollow ignores invalid frame deltas", () => {
  const current = { x: 2, y: 3, z: 4 };
  smoothFollow(current, { x: 8, y: 9, z: 10 }, Number.NaN, 9);
  assert.deepEqual(current, { x: 2, y: 3, z: 4 });
});
