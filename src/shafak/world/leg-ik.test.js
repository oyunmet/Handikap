import assert from "node:assert/strict";
import test from "node:test";
import { solveTwoBoneLeg } from "./leg-ik.ts";

test("two-bone leg IK returns finite joint angles for reachable and clamped targets", () => {
  for (const [y, z] of [[-0.84, 0.14], [-0.2, 0.3], [-1.7, 0.4], [-0.05, 0.02]]) {
    const result = solveTwoBoneLeg(y, z, 0.51, 0.47);
    assert.ok(Number.isFinite(result.hip));
    assert.ok(Number.isFinite(result.knee));
    assert.ok(Number.isFinite(result.ankle));
    assert.ok(result.reach >= 0.041);
    assert.ok(result.reach <= 0.979 + 1e-10);
    assert.ok(Math.abs(result.hip + result.knee + result.ankle) < 1e-10);
  }
});

test("two-bone leg IK keeps the foot target inside the leg's reachable radius", () => {
  const result = solveTwoBoneLeg(-0.84, 0.14, 0.51, 0.47);
  assert.ok(Math.abs(result.reach - Math.hypot(-0.84, 0.14)) < 1e-10);
});
