import assert from "node:assert/strict";
import test from "node:test";
import { resolveCharacterTargetYaw } from "./character-facing.ts";

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
