import assert from "node:assert/strict";
import test from "node:test";
import {
  isWarRoomCameraPointClear,
  resolveWarRoomCameraSweep,
} from "./war-room-camera.ts";

const wall = {
  id: "wall",
  minX: -0.6,
  minY: 0.4,
  minZ: -2.3,
  maxX: 1.2,
  maxY: 4.2,
  maxZ: -1.3,
};

test("camera sweep stops outside a directly blocking wall even inside the preferred distance", () => {
  const result = resolveWarRoomCameraSweep(
    { x: 0, y: 1.5, z: 0 },
    { x: 0, y: 1.5, z: -4 },
    [wall],
  );
  assert.equal(result.blocked, true);
  assert.equal(result.blockerId, "wall");
  assert.ok(result.safeDistance < 1.2);
  assert.ok(result.safeDistance < result.hitDistance);
  assert.equal(
    isWarRoomCameraPointClear({ x: 0, y: 1.5, z: -result.safeDistance }, [wall]),
    true,
  );
});

test("camera keeps its preferred minimum distance when the blocker is farther away", () => {
  const farWall = { ...wall, minZ: -4.3, maxZ: -3.3 };
  const result = resolveWarRoomCameraSweep(
    { x: 0, y: 1.5, z: 0 },
    { x: 0, y: 1.5, z: -5 },
    [farWall],
  );
  assert.equal(result.blocked, true);
  assert.ok(result.safeDistance >= 1.2);
  assert.ok(result.safeDistance < result.hitDistance);
});

test("camera sphere clearance catches a prop just beside the center ray", () => {
  const sideWall = { ...wall, minX: 0.3, maxX: 0.8 };
  const result = resolveWarRoomCameraSweep(
    { x: 0, y: 1.5, z: 0 },
    { x: 0, y: 1.5, z: -4 },
    [sideWall],
    0.35,
  );
  assert.equal(result.blocked, true);
  assert.ok(result.safeDistance < 1.2);
});

test("camera stops before an obstacle closer than the minimum camera distance", () => {
  const nearWall = { ...wall, minZ: -0.8, maxZ: -0.5 };
  const result = resolveWarRoomCameraSweep(
    { x: 0, y: 1.5, z: 0 },
    { x: 0, y: 1.5, z: -4 },
    [nearWall],
  );
  assert.equal(result.blocked, true);
  assert.ok(result.safeDistance < 1.2);
  assert.ok(result.safeDistance < result.hitDistance);
});

test("camera point checks use the same swept-sphere clearance", () => {
  assert.equal(isWarRoomCameraPointClear({ x: 0, y: 1.5, z: 0 }, [wall]), true);
  assert.equal(isWarRoomCameraPointClear({ x: 0.1, y: 1.5, z: -1.8 }, [wall]), false);
});

test("camera sweep eases to the requested full distance when the path is clear", () => {
  const result = resolveWarRoomCameraSweep(
    { x: 0, y: 1.5, z: 0 },
    { x: 0, y: 1.5, z: -4 },
    [],
  );
  assert.equal(result.blocked, false);
  assert.equal(result.blockerId, null);
  assert.equal(result.safeDistance, 4);
});
