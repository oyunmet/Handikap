import test from "node:test";
import assert from "node:assert/strict";
import {
  getGameplayJoystickVector,
  getGameplayTouchSide,
} from "./gameplay-touch-controls.ts";

test("gameplay touch sides split at the exact center of the active stage", () => {
  assert.equal(getGameplayTouchSide(99, 100, 400), "movement");
  assert.equal(getGameplayTouchSide(100, 100, 400), "movement");
  assert.equal(getGameplayTouchSide(299, 100, 400), "movement");
  assert.equal(getGameplayTouchSide(300, 100, 400), "look");
  assert.equal(getGameplayTouchSide(300, 100, 400, true), "movement");
  assert.equal(getGameplayTouchSide(Number.NaN, 0, 400), null);
});

test("all modes share a circular joystick dead zone and capped diagonal", () => {
  assert.deepEqual(getGameplayJoystickVector(3, 2, 50), { x: 0, y: 0 });
  const forward = getGameplayJoystickVector(0, -50, 50);
  const backward = getGameplayJoystickVector(0, 50, 50);
  assert.equal(forward.x, 0);
  assert.ok(forward.y > 0.99);
  assert.equal(backward.x, 0);
  assert.ok(backward.y < -0.99);
  const diagonal = getGameplayJoystickVector(50, -50, 50);
  assert.ok(Math.hypot(diagonal.x, diagonal.y) <= 1);
  assert.ok(Math.abs(diagonal.x - diagonal.y) < 1e-10);
});
