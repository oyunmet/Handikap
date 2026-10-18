import assert from "node:assert/strict";
import test from "node:test";
import {
  getCameraClearanceDistance,
  getTravelCameraSettings,
  WORLD_CAMERA_COLLISION_MARGIN,
  WORLD_CAMERA_FAR,
  WORLD_CAMERA_MIN_COLLISION_DISTANCE,
  WORLD_CAMERA_NEAR,
  WORLD_SKY_RADIUS,
} from "./camera-settings.ts";

test("world camera clipping range contains the sky and the procedural star field", () => {
  const farthestStarDistance = Math.hypot(230 + 40 + 10.2, 0.96 * 165 - 4.15);

  assert.ok(WORLD_CAMERA_FAR > WORLD_SKY_RADIUS);
  assert.ok(WORLD_CAMERA_FAR > farthestStarDistance);
});

test("camera clearance keeps the lens ahead of real scene occluders", () => {
  assert.equal(WORLD_CAMERA_NEAR, 0.35);
  assert.equal(getCameraClearanceDistance(4.5), 4.5);
  assert.equal(getCameraClearanceDistance(4.5, 5), 4.5);
  assert.equal(
    getCameraClearanceDistance(4.5, 2.8),
    2.8 - WORLD_CAMERA_COLLISION_MARGIN,
  );
  assert.equal(
    getCameraClearanceDistance(4.5, 0.2),
    WORLD_CAMERA_MIN_COLLISION_DISTANCE,
  );
});

test("mobile travel camera keeps the same framing while stopped and running", () => {
  const stopped = getTravelCameraSettings(0, true);
  const running = getTravelCameraSettings(7, true);
  assert.deepEqual(stopped, running);
  assert.equal(stopped.height, 2.2);
  assert.equal(stopped.distanceBehind, 4.5);
  assert.equal(stopped.targetHeight, 1.15);
  assert.equal(stopped.fieldOfView, 74);
});

test("mobile travel camera clears the central spike trap around 60% progress", () => {
  const playerDistance = 86.4;
  const maximumCameraLag = 1;
  const camera = getTravelCameraSettings(7, true);
  const cameraWorldDistance = playerDistance - maximumCameraLag - camera.distanceBehind;
  const spikeTrapBackEdge = 77 + 1.8 / 2;

  assert.equal(camera.distanceBehind, 4.5);
  assert.ok(cameraWorldDistance > spikeTrapBackEdge + 0.9);
});

test("desktop travel camera retains its speed-responsive framing", () => {
  const idle = getTravelCameraSettings(0, false);
  const running = getTravelCameraSettings(7, false);

  assert.ok(running.distanceBehind > idle.distanceBehind);
  assert.ok(running.fieldOfView > idle.fieldOfView);
  assert.ok(running.runShake > idle.runShake);
});
