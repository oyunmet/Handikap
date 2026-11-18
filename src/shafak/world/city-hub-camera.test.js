import assert from "node:assert/strict";
import test from "node:test";
import {
  getCityCameraFrame,
  isCityCameraPointClear,
  isCityCameraPathClear,
} from "./city-hub-camera.ts";
import { CITY_DOORS } from "./city-hub-layout.ts";

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

test("the camera looks back at the street instead of clipping through a doorway wall", () => {
  const obstacles = CITY_DOORS.map((door) => ({
    x: door.building.x,
    z: door.building.z,
    width: door.width + 0.6,
    depth: door.depth + 0.48,
    height: door.height + 2.8,
  }));

  for (const door of CITY_DOORS) {
    const facing = {
      x: door.building.x - door.entrance.x,
      z: door.building.z - door.entrance.z,
    };
    const frame = getCityCameraFrame(door.entrance, facing, obstacles);
    assert.equal(frame.occluded, true, `${door.id} doorway should use a safe snapped camera frame`);
    assert.equal(isCityCameraPointClear(frame.target, obstacles), true, `${door.id} camera target should stay outside walls`);
    assert.equal(isCityCameraPointClear(frame.position, obstacles), true, `${door.id} camera should stay outside roofs`);
    assert.equal(isCityCameraPathClear(frame.target, frame.position, obstacles), true, `${door.id} camera path should be clear`);
  }
});
