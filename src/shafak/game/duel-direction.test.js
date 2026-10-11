import assert from "node:assert/strict";
import test from "node:test";
import {
  duel360EnabledFromSearch,
  getDirectionalDamageMultiplier,
  getDirectionZone,
  isWithinFacingCone,
  normalizeYaw,
  signedYawDifference,
  turnYawToward,
  yawToward,
} from "./duel-direction.ts";

test("the 360 duel is enabled by default and can be disabled for a safe rollback", () => {
  assert.equal(duel360EnabledFromSearch(""), true);
  assert.equal(duel360EnabledFromSearch("?duel360=1"), true);
  assert.equal(duel360EnabledFromSearch("?duel360=0"), false);
});

test("yaw wrapping and turning use the shortest circular direction", () => {
  assert.equal(normalizeYaw(3 * Math.PI), Math.PI);
  assert.ok(Math.abs(signedYawDifference(Math.PI - 0.1, -Math.PI + 0.1) - 0.2) < 1e-9);
  assert.ok(Math.abs(turnYawToward(0, Math.PI, 0.2) - 0.2) < 1e-9);
  assert.equal(normalizeYaw(Number.NaN), 0);
});

test("attack cones and front, side, and rear zones are measured relative to facing", () => {
  const defender = { x: 0, z: 0, yaw: 0 };
  assert.equal(yawToward(defender, { x: 0, z: 1 }), 0);
  assert.equal(isWithinFacingCone(defender, { x: 0, z: 1 }, 0), true);
  assert.equal(isWithinFacingCone(defender, { x: 1, z: 0 }, 0), false);
  assert.equal(getDirectionZone(defender, { x: 0, z: 1 }), "front");
  assert.equal(getDirectionZone(defender, { x: 1, z: 0 }), "right");
  assert.equal(getDirectionZone(defender, { x: -1, z: 0 }), "left");
  assert.equal(getDirectionZone(defender, { x: 0, z: -1 }), "rear");
  assert.equal(getDirectionalDamageMultiplier("front"), 1);
  assert.equal(getDirectionalDamageMultiplier("left"), 1.15);
  assert.equal(getDirectionalDamageMultiplier("right"), 1.15);
  assert.equal(getDirectionalDamageMultiplier("rear"), 1.35);
});
