import assert from "node:assert/strict";
import test from "node:test";
import {
  dampCharacterYaw,
  getCharacterRootYawForModel,
  resolveCharacterTargetYaw,
} from "./character-facing.ts";
import { signedYawDifference, yawToward } from "../game/duel-direction.ts";

test("an explicit combat facing angle stays aimed at the rival while the player is idle", () => {
  const targetYaw = -2.35;
  assert.equal(resolveCharacterTargetYaw(targetYaw, 0, 0, false, false), targetYaw);
});

test("travel orientation still follows movement and resets when stopped", () => {
  assert.equal(resolveCharacterTargetYaw(undefined, 0, 0, false, false), 0);
  assert.ok(Math.abs(resolveCharacterTargetYaw(undefined, 0, 1, true, false)) < 0.001);
  assert.ok(Math.abs(resolveCharacterTargetYaw(undefined, 0, -1, true, false) - Math.PI) < 0.001);
});

test("non-finite explicit angles fall back to movement orientation", () => {
  assert.equal(resolveCharacterTargetYaw(Number.NaN, 0, 0, false, false), 0);
});

test("combat model offsets make the model's +Z forward axis face known targets", () => {
  const cases = [
    { source: { x: 0, z: 0 }, target: { x: 8, z: 0 }, modelOffset: Math.PI },
    { source: { x: 2, z: 4 }, target: { x: -3, z: -7 }, modelOffset: 0 },
  ];
  for (const { source, target, modelOffset } of cases) {
    const desired = yawToward(source, target);
    const rootYaw = getCharacterRootYawForModel(desired, modelOffset);
    const actualModelForwardYaw = rootYaw + modelOffset;
    assert.ok(Math.abs(signedYawDifference(actualModelForwardYaw, desired)) < Math.PI / 36);
  }
});

test("combat yaw damping takes the shortest path across the angle wrap", () => {
  const current = 3.13;
  const target = -3.13;
  const next = dampCharacterYaw(current, target, 7, 1 / 60);
  assert.ok(Math.abs(signedYawDifference(current, next)) < 0.1);
  assert.ok(Math.abs(signedYawDifference(next, target)) < Math.abs(signedYawDifference(current, target)));
});
