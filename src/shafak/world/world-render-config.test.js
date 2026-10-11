import assert from "node:assert/strict";
import test from "node:test";
import { WORLD_CAMERA_FAR, WORLD_SKY_SPHERE_RADIUS } from "./world-render-config.ts";

test("camera far plane includes the sky dome and outer star layer", () => {
  assert.ok(WORLD_CAMERA_FAR > WORLD_SKY_SPHERE_RADIUS + 30);
  assert.ok(WORLD_CAMERA_FAR > 300);
});
