import assert from "node:assert/strict";
import test from "node:test";
import {
  getCityCameraFrame,
  isCityCameraPathClear,
} from "./city-hub-camera.ts";

test("the city camera stays behind the hero and looks into the street", () => {
  const frame = getCityCameraFrame({ x: 0, z: 0 }, { x: 0, z: -1 });

  assert.ok(frame.position.z > 0, "north-facing hero should have a camera behind them");
  assert.ok(frame.position.x > 0, "camera keeps the familiar over-the-shoulder angle");
  assert.ok(frame.position.y > frame.target.y + 3.5, "camera stays high enough to see the street");
  assert.ok(frame.target.z < 0, "camera looks ahead along the street");
  assert.equal(frame.occluded, false);
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

  assert.ok(Math.abs(second.position.x - first.position.x - 5) < 1e-9);
  assert.ok(Math.abs(second.position.z - first.position.z - 7) < 1e-9);
  assert.ok(Math.abs(second.target.x - first.target.x - 5) < 1e-9);
  assert.ok(Math.abs(second.target.z - first.target.z - 7) < 1e-9);
});

test("the city camera moves to the clear shoulder when a roof blocks its usual view", () => {
  const obstacle = { x: 2.5, z: 4, width: 2, depth: 3, height: 7.4 };
  const frame = getCityCameraFrame(
    { x: 0, z: 0 },
    { x: 0, z: -1 },
    [obstacle],
  );

  assert.equal(frame.occluded, true);
  assert.ok(frame.position.x < 0, "camera should use the unobstructed shoulder");
  assert.equal(
    isCityCameraPathClear({ x: 0, y: 1.28, z: 0 }, frame.position, [obstacle]),
    true,
  );
});
