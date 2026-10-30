import assert from "node:assert/strict";
import test from "node:test";
import {
  clampWarRoomCameraToInterior,
  getWarRoomRearCameraFrame,
  getWarRoomCameraBlockerIds,
  isWarRoomCameraPointClear,
  getWarRoomCameraRig,
  resolveWarRoomInteriorCameraPlacement,
  resolveWarRoomCameraPlacement,
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

test("camera fades every wall crossed between the player and its rear position", () => {
  const blockers = getWarRoomCameraBlockerIds(
    { x: 0, y: 1.5, z: 0 },
    { x: 0, y: 1.5, z: -5 },
    [
      { id: "near-wall", minX: -1, minY: 0, minZ: -1.8, maxX: 1, maxY: 3, maxZ: -1.4 },
      { id: "far-wall", minX: -1, minY: 0, minZ: -3.8, maxX: 1, maxY: 3, maxZ: -3.4 },
      { id: "off-camera", minX: 2, minY: 0, minZ: -3, maxX: 3, maxY: 3, maxZ: -2 },
    ],
  );

  assert.deepEqual([...blockers], ["near-wall", "far-wall"]);
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

test("third-person placement shifts around a nearby wall before shortening the camera", () => {
  const result = resolveWarRoomCameraPlacement(
    { x: 0, y: 1.5, z: 0 },
    { x: 0, y: 1.85, z: -4.8 },
    [wall],
  );

  assert.equal(result.blocked, false);
  assert.equal(result.usedAlternate, true);
  assert.ok(Math.hypot(result.position.x, result.position.y - 1.5, result.position.z) >= 2.5);
  assert.equal(isWarRoomCameraPointClear(result.position, [wall], 0.28), true);
  const rearX = 0;
  const rearZ = -4.8;
  const cameraX = result.position.x;
  const cameraZ = result.position.z;
  assert.ok(cameraX * rearX + cameraZ * rearZ > 0, "camera alternatives must remain behind the player");
});

test("camera never moves to the side or front when the whole rear path is blocked", () => {
  const start = { x: 0, y: 1.5, z: 0 };
  const end = { x: 0, y: 1.5, z: -4.8 };
  const rearWall = {
    id: "rear-wall",
    minX: -5,
    minY: 0,
    minZ: -5,
    maxX: 5,
    maxY: 4,
    maxZ: -1,
  };
  const result = resolveWarRoomCameraPlacement(start, end, [rearWall]);
  const rearProjection = (result.position.x - start.x) * (end.x - start.x)
    + (result.position.z - start.z) * (end.z - start.z);

  assert.equal(result.blocked, true);
  assert.ok(rearProjection > 0, "camera must stay in the player's rear hemisphere");
});

test("rear camera stays behind the player's facing direction at every quarter turn", () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const frame = getWarRoomRearCameraFrame(
      { x: 2, y: 0, z: -3 },
      yaw,
      0,
      2.8,
      0.6,
      1.55,
      1.1,
      1.24,
    );
    const forwardX = Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const cameraOffsetX = frame.position.x - 2;
    const cameraOffsetZ = frame.position.z + 3;
    assert.ok(
      cameraOffsetX * forwardX + cameraOffsetZ * forwardZ < 0,
      `camera must remain behind the player at yaw ${yaw}`,
    );
  }
});

test("indoor camera targets remain within the rotated house and do not route around its walls", () => {
  const interior = { x: 4, z: -3, width: 8, depth: 6, rotationY: Math.PI / 2 };
  const clamped = clampWarRoomCameraToInterior(
    { x: 14, y: 1.8, z: -4 },
    interior,
  );
  const localX = Math.cos(interior.rotationY) * (clamped.x - interior.x)
    - Math.sin(interior.rotationY) * (clamped.z - interior.z);
  const localZ = Math.sin(interior.rotationY) * (clamped.x - interior.x)
    + Math.cos(interior.rotationY) * (clamped.z - interior.z);
  assert.ok(Math.abs(localX) <= interior.width / 2 - 0.62 + 1e-8);
  assert.ok(Math.abs(localZ) <= interior.depth / 2 - 0.62 + 1e-8);
  assert.equal(clamped.y, 1.8);

  const houseWall = { ...wall, id: "house-wall", minZ: -2.4, maxZ: -1.7 };
  const cameraInterior = { x: 0, z: 0, width: 8, depth: 8, rotationY: 0 };
  const start = { x: 0, y: 1.5, z: 0 };
  const end = { x: 0, y: 1.5, z: -3 };
  const result = resolveWarRoomInteriorCameraPlacement(
    start,
    end,
    [houseWall],
    cameraInterior,
    0.28,
    0.08,
  );
  assert.equal(result.blockerId, "house-wall");
  assert.ok(result.safeDistance < 1.42, "camera must stop before the expanded wall");
  assert.equal(result.usedAlternate, false);
  assert.ok(result.position.z > houseWall.maxZ + 0.28);
  assert.ok(result.safeDistance < 1.5);
  assert.equal(isWarRoomCameraPointClear(result.position, [houseWall], 0.28), true);
});

test("indoor camera stays inside when the room edge cannot fit the full rear distance", () => {
  const interior = { x: 0, z: 0, width: 8, depth: 8, rotationY: 0 };
  const start = { x: 0, y: 1.5, z: -2 };
  const end = { x: 0, y: 1.5, z: -4 };
  const result = resolveWarRoomInteriorCameraPlacement(
    start,
    end,
    [],
    interior,
    0.28,
    0.08,
  );

  assert.equal(result.blocked, false);
  assert.ok(result.safeDistance > 1.4 && result.safeDistance < 1.5);
  assert.ok(result.position.z > -3.52, "camera stays inside the room boundary");
  assert.equal(result.usedAlternate, false);
});

test("first person camera stays at the eye without a third-person shoulder", () => {
  assert.deepEqual(getWarRoomCameraRig({
    mode: "first-person",
    aiming: false,
    shoulderOffset: 1.2,
    shoulderSide: "left",
  }), { back: 0, shoulder: 0 });
});

test("third-person camera defaults to a five-meter shoulder view and supports either side", () => {
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
  assert.deepEqual(right, { back: 4.8, shoulder: 0.7 });
  assert.deepEqual(left, { back: 4.8, shoulder: -0.7 });
  assert.deepEqual(getWarRoomCameraRig({
    mode: "third-person",
    aiming: false,
    shoulderOffset: 0.6,
    shoulderSide: "right",
  }), { back: 4.8, shoulder: 0.6 });
});

test("indoor camera keeps a wider rear view while staying closer than outdoors", () => {
  assert.deepEqual(getWarRoomCameraRig({
    mode: "third-person",
    aiming: false,
    shoulderOffset: 0.6,
    shoulderSide: "right",
    indoors: true,
  }), { back: 2.8, shoulder: 0.6 });
  assert.deepEqual(getWarRoomCameraRig({
    mode: "third-person",
    aiming: true,
    shoulderOffset: 0.6,
    shoulderSide: "right",
    indoors: true,
  }), { back: 2.4, shoulder: 0.7 });
});

test("third-person aiming tightens the camera, and offsets remain bounded", () => {
  assert.deepEqual(getWarRoomCameraRig({
    mode: "third-person",
    aiming: true,
    shoulderOffset: 4,
    shoulderSide: "right",
  }), { back: 3.65, shoulder: 1.6 });
  const victoryZoom = getWarRoomCameraRig({
    mode: "third-person",
    aiming: false,
    shoulderOffset: -5,
    shoulderSide: "right",
    victoryZoom: 1,
  });
  assert.ok(Math.abs(victoryZoom.back - 4.8 * 0.82) < 1e-12);
  assert.equal(victoryZoom.shoulder, 0);
});
