import assert from "node:assert/strict";
import test from "node:test";
import {
  CITY_CAMERA_MAX_PITCH,
  CITY_CAMERA_MIN_PITCH,
  getCityMovementInput,
  stepCityCameraLook,
} from "./city-hub-controls.ts";

test("city camera drag rotates and adjusts its vertical angle within safe limits", () => {
  const turned = stepCityCameraLook({ yaw: 0, pitch: 0 }, 80, -40);
  assert.ok(turned.yaw > 0);
  assert.ok(turned.pitch > 0);
  assert.equal(stepCityCameraLook(turned, 0, -10_000).pitch, CITY_CAMERA_MAX_PITCH);
  assert.equal(stepCityCameraLook(turned, 0, 10_000).pitch, CITY_CAMERA_MIN_PITCH);
});

test("city camera heading rotates joystick movement with a normalized diagonal", () => {
  const forward = getCityMovementInput({ x: 0, z: -1 }, 0);
  assert.ok(Math.abs(forward.x) < 1e-9);
  assert.equal(forward.z, -1);

  const turnedForward = getCityMovementInput({ x: 0, z: -1 }, Math.PI / 2);
  assert.ok(turnedForward.x > 0.999);
  assert.ok(Math.abs(turnedForward.z) < 1e-9);

  const diagonal = getCityMovementInput({ x: 1, z: -1 }, 0);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 1e-9);
});

test("a 180-degree turn keeps joystick forward and backward relative to the new facing", () => {
  const forward = getCityMovementInput({ x: 0, z: -1 }, Math.PI);
  const backward = getCityMovementInput({ x: 0, z: 1 }, Math.PI);
  assert.ok(forward.z > 0.999);
  assert.ok(backward.z < -0.999);
});

test("invalid city camera gestures never poison camera or movement state", () => {
  assert.deepEqual(
    stepCityCameraLook({ yaw: 0, pitch: 0 }, Number.NaN, Number.POSITIVE_INFINITY),
    { yaw: 0, pitch: 0 },
  );
  assert.deepEqual(getCityMovementInput({ x: Number.NaN, z: Number.NaN }, 0), { x: 0, z: 0 });
});
