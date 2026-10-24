import assert from "node:assert/strict";
import test from "node:test";
import { getWorldV2Heading, WORLD_V2_CONFIG } from "./world-v2-config.ts";

test("world-v2 headings turn the hero's native -Z axis into camera-relative movement", () => {
  const forwardYaw = getWorldV2Heading(0, 1);
  assert.ok(Math.abs(forwardYaw - Math.PI) < 0.001, "joystick up points down the road in world coordinates");
  const heroForward = (heading) => {
    const modelYaw = heading + WORLD_V2_CONFIG.modelFacing;
    return { x: -Math.sin(modelYaw), z: -Math.cos(modelYaw) };
  };
  const forward = heroForward(forwardYaw);
  assert.ok(forward.z < -0.99, "the hero's native -Z front points down the road");

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
