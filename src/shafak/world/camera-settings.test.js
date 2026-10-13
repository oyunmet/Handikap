import assert from "node:assert/strict";
import test from "node:test";
import {
  getTravelCameraSettings,
  WORLD_CAMERA_FAR,
  WORLD_SKY_RADIUS,
} from "./camera-settings.ts";

test("world camera clipping range contains the sky and the procedural star field", () => {
  const farthestStarDistance = Math.hypot(230 + 40 + 10.2, 0.96 * 165 - 4.15);

  assert.ok(WORLD_CAMERA_FAR > WORLD_SKY_RADIUS);
  assert.ok(WORLD_CAMERA_FAR > farthestStarDistance);
});

test("mobile travel camera keeps the same framing while stopped and running", () => {
  assert.deepEqual(
    getTravelCameraSettings(0, true),
    getTravelCameraSettings(7, true),
  );
});

test("mobile travel camera clears the central spike trap around 60% progress", () => {
  const playerDistance = 86.4;
  const maximumCameraLag = 1;
  const camera = getTravelCameraSettings(7, true);
  const cameraWorldDistance = playerDistance - maximumCameraLag - camera.distanceBehind;
  const spikeTrapBackEdge = 77 + 1.8 / 2;

  assert.ok(cameraWorldDistance > spikeTrapBackEdge + 0.9);
});

test("desktop travel camera retains its speed-responsive framing", () => {
  const idle = getTravelCameraSettings(0, false);
  const running = getTravelCameraSettings(7, false);

  assert.ok(running.distanceBehind > idle.distanceBehind);
  assert.ok(running.fieldOfView > idle.fieldOfView);
  assert.ok(running.runShake > idle.runShake);
});
