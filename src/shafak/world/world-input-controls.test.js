import assert from "node:assert/strict";
import test from "node:test";
import {
  getDynamicJoystickVector,
  getWorldPointerControlSide,
} from "./world-input-controls.ts";

test("world touch controls split evenly into left movement and right camera regions", () => {
  assert.equal(getWorldPointerControlSide(49, 0, 100), "movement");
  assert.equal(getWorldPointerControlSide(50, 0, 100), "look");
  assert.equal(getWorldPointerControlSide(90, 0, 100), "look");
  assert.equal(getWorldPointerControlSide(10, 0, 0), null);
});

test("dynamic joystick starts neutral, clamps travel, and keeps backward input negative", () => {
  assert.deepEqual(getDynamicJoystickVector(0, 0, 50), { x: 0, y: 0 });
  assert.deepEqual(getDynamicJoystickVector(1, 1, 50), { x: 0, y: 0 });
  const forward = getDynamicJoystickVector(0, -50, 50);
  const backward = getDynamicJoystickVector(0, 50, 50);
  assert.equal(forward.x, 0);
  assert.equal(forward.y, 1);
  assert.equal(backward.x, 0);
  assert.equal(backward.y, -1);
  const diagonal = getDynamicJoystickVector(50, -50, 50);
  assert.ok(Math.hypot(diagonal.x, diagonal.y) <= 1);
});
