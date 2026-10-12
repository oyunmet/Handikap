import assert from "node:assert/strict";
import test from "node:test";
import { getTravelCameraSettings } from "./camera-settings.ts";

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
