import assert from "node:assert/strict";
import test from "node:test";
import { WORLD_V2_CONFIG } from "./world-v2-config.ts";

test("world-v2 forward and lateral headings align the model with movement", () => {
  const forwardYaw = Math.PI - WORLD_V2_CONFIG.modelFacing;
  const forward = { x: Math.sin(forwardYaw), z: Math.cos(forwardYaw) };
  assert.ok(forward.z < -0.99, "forward movement points down the road away from the chase camera");

  const rightYaw = Math.PI / 2 - WORLD_V2_CONFIG.modelFacing;
  const right = { x: Math.sin(rightYaw), z: Math.cos(rightYaw) };
  assert.ok(right.x > 0.99, "rightward movement turns the model toward the right lane");
});
