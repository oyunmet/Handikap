import assert from "node:assert/strict";
import test from "node:test";
import {
  ATTACK_HALF_ANGLE_RADIANS,
  getDirectionalDamageMultiplier,
  getDirectionZone,
  isWithinFacingCone,
  normalizeYaw,
  signedYawDifference,
  turnYawToward,
  yawToward,
} from "./duel-direction.ts";

const defender = { x: 0, z: 0, yaw: 0 };

test("direction zones resolve front, both flanks, and rear for +Z facing", () => {
  assert.equal(getDirectionZone(defender, { x: 0, z: 2 }), "front");
  assert.equal(getDirectionZone(defender, { x: -2, z: 0 }), "left");
  assert.equal(getDirectionZone(defender, { x: 2, z: 0 }), "right");
  assert.equal(getDirectionZone(defender, { x: 0, z: -2 }), "rear");
});

test("attack cone accepts the facing arc and rejects targets to either side", () => {
  assert.ok(isWithinFacingCone(defender, { x: 0, z: 2 }, 0));
  const inside = Math.sin(ATTACK_HALF_ANGLE_RADIANS - 0.01);
  const forward = Math.cos(ATTACK_HALF_ANGLE_RADIANS - 0.01);
  assert.ok(isWithinFacingCone(defender, { x: inside, z: forward }, 0));
  assert.equal(isWithinFacingCone(defender, { x: 1, z: 0 }, 0), false);
});

test("flank damage multipliers are stronger than front defense", () => {
  assert.equal(getDirectionalDamageMultiplier("front"), 1);
  assert.equal(getDirectionalDamageMultiplier("left"), 1.15);
  assert.equal(getDirectionalDamageMultiplier("right"), 1.15);
  assert.equal(getDirectionalDamageMultiplier("rear"), 1.35);
});

test("yaw wraps and turn-rate clamping takes the shortest path across ±pi", () => {
  assert.equal(normalizeYaw(4 * Math.PI), 0);
  assert.ok(Math.abs(Math.abs(signedYawDifference(Math.PI - 0.1, -Math.PI + 0.1)) - 0.2) < 1e-9);
  const turned = turnYawToward(Math.PI - 0.1, -Math.PI + 0.1, 0.05);
  assert.ok(Math.abs(Math.abs(signedYawDifference(Math.PI - 0.1, turned)) - 0.05) < 1e-9);
  assert.ok(Math.abs(yawToward({ x: 0, z: 0 }, { x: 1, z: 0 }) - Math.PI / 2) < 1e-9);
});
