import assert from "node:assert/strict";
import test from "node:test";
import {
  isWarRoomCameraPointClear,
  getWarRoomCameraRig,
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

test("camera preserves its shoulder distance when the sweep starts inside a nearby wall", () => {
  const nearbyWall = {
    id: "nearby-wall",
    minX: -0.3,
    minY: 1.2,
    minZ: -0.2,
    maxX: 0.3,
    maxY: 1.8,
    maxZ: 0.2,
  };
  const result = resolveWarRoomCameraSweep(
    { x: 0, y: 1.5, z: 0 },
    { x: 0, y: 1.5, z: -5 },
    [nearbyWall],
  );
  assert.equal(result.blocked, true);
  assert.equal(result.blockerId, "nearby-wall");
  assert.equal(result.hitDistance, 0);
  assert.equal(result.safeDistance, 5);
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

test("first person camera stays at the eye without a third-person shoulder", () => {
  assert.deepEqual(getWarRoomCameraRig({
    mode: "first-person",
    aiming: false,
    shoulderOffset: 1.2,
    shoulderSide: "left",
  }), { back: 0, shoulder: 0 });
});

test("third-person shoulder offset is adjustable on either side", () => {
  const right = getWarRoomCameraRig({
    mode: "third-person",
    aiming: false,
    shoulderOffset: 0.7,
    shoulderSide: "right",
  });
  const left = getWarRoomCameraRig({
    mode: "third-person",
    aiming: false,
    shoulderOffset: 0.7,
    shoulderSide: "left",
  });
  assert.deepEqual(right, { back: 5.1, shoulder: 0.7 });
  assert.deepEqual(left, { back: 5.1, shoulder: -0.7 });
});

test("third-person aiming tightens the camera, and offsets remain bounded", () => {
  assert.deepEqual(getWarRoomCameraRig({
    mode: "third-person",
    aiming: true,
    shoulderOffset: 4,
    shoulderSide: "right",
  }), { back: 3.8, shoulder: 1.6 });
  const victoryZoom = getWarRoomCameraRig({
    mode: "third-person",
    aiming: false,
    shoulderOffset: -5,
    shoulderSide: "right",
    victoryZoom: 1,
  });
  assert.ok(Math.abs(victoryZoom.back - 5.1 * 0.82) < 1e-12);
  assert.equal(victoryZoom.shoulder, 0);
});
