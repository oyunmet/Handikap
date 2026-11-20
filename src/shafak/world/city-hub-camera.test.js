import assert from "node:assert/strict";
import test from "node:test";
import {
  getCityCameraFrame,
  isCityCameraPointClear,
  isCityCameraPathClear,
} from "./city-hub-camera.ts";
import { CITY_COLLISION_MARGIN, CITY_DOORS } from "./city-hub-layout.ts";

const cityObstacles = CITY_DOORS.map((door) => ({
  x: door.building.x,
  z: door.building.z,
  width: door.width + 0.28,
  depth: door.depth + 0.48,
  height: door.height + 2.8,
}));

test("the city camera stays behind the hero and looks into the street", () => {
  const frame = getCityCameraFrame({ x: 0, z: 0 }, { yaw: 0, pitch: 0 });

  assert.ok(frame.position.z > 0, "north-facing hero should have a camera behind them");
  assert.ok(frame.position.x > 0, "camera keeps the familiar over-the-shoulder angle");
  assert.ok(frame.position.y > frame.target.y + 3.5, "camera stays high enough to see the street");
  assert.ok(frame.target.z < 0, "camera looks ahead along the street");
  assert.equal(frame.occluded, false);
});

test("the city camera never switches to a bird's-eye view when all default shoulders are blocked", () => {
  const wallRing = Array.from({ length: 12 }, (_, index) => {
    const angle = (index * Math.PI) / 6;
    return {
      x: Math.cos(angle) * 4,
      z: Math.sin(angle) * 4,
      width: 3,
      depth: 3,
      height: 9,
    };
  });
  const frame = getCityCameraFrame({ x: 0, z: 0 }, { yaw: 0, pitch: 0 }, wallRing);

  assert.ok(frame.position.y < 8, `camera rose to overhead height ${frame.position.y}`);
  assert.ok(
    Math.hypot(frame.position.x - frame.target.x, frame.position.z - frame.target.z) > 1,
    "camera stays behind or beside the hero instead of directly above",
  );
});

test("the city camera orbits independently when the camera look changes", () => {
  const player = { x: 3, z: -2 };
  const north = getCityCameraFrame(player, { yaw: 0, pitch: 0 });
  const east = getCityCameraFrame(player, { yaw: Math.PI / 2, pitch: 0 });

  assert.ok(north.position.z > player.z);
  assert.ok(east.position.x < player.x);
  assert.ok(east.target.x > player.x);
});

test("camera framing follows the player without changing the camera offset", () => {
  const camera = { yaw: 0, pitch: 0 };
  const first = getCityCameraFrame({ x: 0, z: 0 }, camera);
  const second = getCityCameraFrame({ x: 5, z: 7 }, camera);

  assert.ok(Math.abs(second.position.x - first.position.x - 5) < 1e-9);
  assert.ok(Math.abs(second.position.z - first.position.z - 7) < 1e-9);
  assert.ok(Math.abs(second.target.x - first.target.x - 5) < 1e-9);
  assert.ok(Math.abs(second.target.z - first.target.z - 7) < 1e-9);
});

test("the city camera moves to the clear shoulder when a roof blocks its usual view", () => {
  const obstacle = { x: 2.5, z: 4, width: 2, depth: 3, height: 7.4 };
  const frame = getCityCameraFrame(
    { x: 0, z: 0 },
    { yaw: 0, pitch: 0 },
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
  for (const door of CITY_DOORS) {
    const facing = {
      x: door.building.x - door.entrance.x,
      z: door.building.z - door.entrance.z,
    };
    const yaw = Math.atan2(facing.x, -facing.z);
    const frame = getCityCameraFrame(door.entrance, { yaw, pitch: 0 }, cityObstacles);
    assert.equal(frame.occluded, true, `${door.id} doorway should use a safe snapped camera frame`);
    assert.equal(isCityCameraPointClear(frame.target, cityObstacles), true, `${door.id} camera target should stay outside walls`);
    assert.equal(isCityCameraPointClear(frame.position, cityObstacles), true, `${door.id} camera should stay outside roofs`);
    assert.equal(isCityCameraPathClear(frame.target, frame.position, cityObstacles), true, `${door.id} camera path should be clear`);
  }
});

test("the camera keeps safe distance at legal building-edge positions", () => {
  const player = { x: -15.25, z: -3 };
  const frame = getCityCameraFrame(player, { yaw: Math.PI / 3, pitch: 0 }, cityObstacles);
  const distance = Math.hypot(
    frame.position.x - frame.target.x,
    frame.position.y - frame.target.y,
    frame.position.z - frame.target.z,
  );

  assert.ok(Math.abs(player.x - CITY_DOORS[0].building.x) > CITY_DOORS[0].width / 2 + CITY_COLLISION_MARGIN);
  assert.ok(distance >= 2.5, `camera collapsed to ${distance.toFixed(2)}m`);
  assert.equal(isCityCameraPointClear(frame.target, cityObstacles), true);
  assert.equal(isCityCameraPointClear(frame.position, cityObstacles), true);
  assert.equal(isCityCameraPathClear(frame.target, frame.position, cityObstacles), true);
});

test("camera targets and paths stay outside every building from reachable wall edges", () => {
  const cameraAngles = Array.from({ length: 8 }, (_, index) => (index * Math.PI) / 4);

  for (const door of CITY_DOORS) {
    const xOffset = door.width / 2 + CITY_COLLISION_MARGIN + 0.02;
    const zOffset = door.depth / 2 + CITY_COLLISION_MARGIN + 0.02;
    const positions = [
      { x: door.building.x - xOffset, z: door.building.z },
      { x: door.building.x + xOffset, z: door.building.z },
      { x: door.building.x, z: door.building.z - zOffset },
      { x: door.building.x, z: door.building.z + zOffset },
    ];

    for (const position of positions) {
      for (const yaw of cameraAngles) {
        const frame = getCityCameraFrame(position, { yaw, pitch: 0 }, cityObstacles);
        const distance = Math.hypot(
          frame.position.x - frame.target.x,
          frame.position.y - frame.target.y,
          frame.position.z - frame.target.z,
        );
        assert.ok(distance >= 2.5, `${door.id} camera collapsed near a wall`);
        assert.equal(isCityCameraPointClear(frame.target, cityObstacles), true, `${door.id} target entered a wall`);
        assert.equal(isCityCameraPointClear(frame.position, cityObstacles), true, `${door.id} camera entered a roof`);
        assert.equal(isCityCameraPathClear(frame.target, frame.position, cityObstacles), true, `${door.id} camera crossed a wall`);
      }
    }
  }
});
