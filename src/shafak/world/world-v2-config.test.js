import assert from "node:assert/strict";
import test from "node:test";
import {
  getWorldV2CameraOffset,
  getWorldV2Heading,
  getWorldV2YawDelta,
  WORLD_V2_CONFIG,
} from "./world-v2-config.ts";

test("world-v2 headings keep the player's corrected GLB front aligned with movement", () => {
  const forwardYaw = getWorldV2Heading(0, 1);
  assert.ok(Math.abs(forwardYaw) < 0.001, "joystick up keeps the corrected GLB front aimed down the road");
  const heroForward = (heading) => {
    const modelYaw = heading + WORLD_V2_CONFIG.modelFacing;
    // The source GLB's face is on local +Z; the model-axis correction is applied at runtime.
    return { x: Math.sin(modelYaw), z: Math.cos(modelYaw) };
  };
  const forward = heroForward(forwardYaw);
  assert.ok(forward.z < -0.99, "the source GLB's +Z front points down the road after axis correction");

  const rightYaw = getWorldV2Heading(1, 0);
  const right = heroForward(rightYaw);
  assert.ok(right.x > 0.99, "rightward movement turns the hero toward the right lane");

  const left = heroForward(getWorldV2Heading(-1, 0));
  assert.ok(left.x < -0.99, "leftward movement turns the hero toward the left lane");
  assert.equal(getWorldV2Heading(0, 0, 0.75), 0.75, "idle input keeps the last heading");
  assert.equal(WORLD_V2_CONFIG.modelFacing, Math.PI, "the GLB's native forward-axis offset is corrected");

  const backward = heroForward(getWorldV2Heading(0, -1));
  assert.ok(backward.z > 0.99, "backward movement turns the hero toward the camera");
});

test("follow camera stays behind the corrected GLB front in all four movement directions", () => {
  const distance = WORLD_V2_CONFIG.camera.distanceBehind;
  for (const [velocityX, velocityY] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
    const rootYaw = getWorldV2Heading(velocityX, velocityY);
    const heroYaw = rootYaw + WORLD_V2_CONFIG.modelFacing;
    const front = { x: Math.sin(heroYaw), z: Math.cos(heroYaw) };
    const camera = getWorldV2CameraOffset(rootYaw, distance);
    assert.ok(front.x * camera.x + front.z * camera.z < -distance + 1e-6);
  }
});

test("actor yaw turns toward its movement heading without another half-turn", () => {
  assert.equal(getWorldV2YawDelta(0, 0), 0);
  assert.ok(Math.abs(getWorldV2YawDelta(0, 0.5) + 0.5) < 1e-9);
  assert.ok(Math.abs(getWorldV2YawDelta(Math.PI / 2, 0) - Math.PI / 2) < 1e-9);
});
