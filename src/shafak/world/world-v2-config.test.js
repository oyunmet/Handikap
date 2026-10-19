import assert from "node:assert/strict";
import test from "node:test";
import { getWorldV2Heading, WORLD_V2_CONFIG } from "./world-v2-config.ts";

test("world-v2 headings follow camera-relative joystick directions", () => {
  const forwardYaw = getWorldV2Heading(0, 1);
  assert.ok(Math.abs(forwardYaw - Math.PI) < 0.001, "joystick up points down the road");

  const rightYaw = getWorldV2Heading(1, 0);
  const right = { x: Math.sin(rightYaw), z: Math.cos(rightYaw) };
  assert.ok(right.x > 0.99, "rightward movement turns the model toward the right lane");

  assert.ok(getWorldV2Heading(-1, 0) < 0, "leftward movement turns toward the left lane");
  assert.equal(getWorldV2Heading(0, 0, 0.75), 0.75, "idle input keeps the last heading");
  assert.equal(WORLD_V2_CONFIG.modelFacing, Math.PI, "the GLB's native forward-axis offset is corrected");
});
