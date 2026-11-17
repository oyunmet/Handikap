import assert from "node:assert/strict";
import test from "node:test";
import { getCityCameraFrame } from "./city-hub-camera.ts";

test("the city camera stays behind the hero and looks into the street", () => {
  const frame = getCityCameraFrame({ x: 0, z: 0 }, { x: 0, z: -1 });

  assert.ok(frame.position.z > 0, "north-facing hero should have a camera behind them");
  assert.ok(frame.position.x > 0, "camera keeps the familiar over-the-shoulder angle");
  assert.ok(frame.position.y > frame.target.y + 6, "camera clears the house roofline");
  assert.ok(frame.target.z < 0, "camera looks ahead along the street");
});

test("the city camera follows the rear when the hero turns", () => {
  const player = { x: 3, z: -2 };
  const north = getCityCameraFrame(player, { x: 0, z: -1 });
  const east = getCityCameraFrame(player, { x: 1, z: 0 });

  assert.ok(north.position.z > player.z);
  assert.ok(east.position.x < player.x);
  assert.ok(east.target.x > player.x);
});

test("camera framing follows the player without changing the camera offset", () => {
  const first = getCityCameraFrame({ x: 0, z: 0 }, { x: 0, z: -1 });
  const second = getCityCameraFrame({ x: 5, z: 7 }, { x: 0, z: -1 });

  assert.equal(second.position.x - first.position.x, 5);
  assert.equal(second.position.z - first.position.z, 7);
  assert.equal(second.target.x - first.target.x, 5);
  assert.equal(second.target.z - first.target.z, 7);
});
