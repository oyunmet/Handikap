import assert from "node:assert/strict";
import test from "node:test";
import {
  clampWarRoomCameraToInterior,
  getWarRoomResponsiveCameraFov,
  getWarRoomRearCameraFrame,
  getWarRoomCameraBlockerIds,
  getWarRoomViewModelWallProximity,
  getWarRoomViewModelWallSafetyRetraction,
  getWarRoomCameraRaySafeDistance,
  isWarRoomCameraPointClear,
  getWarRoomCameraRig,
  getWarRoomEyeClearancePush,
  isWarRoomEyeClearAbove,
  resolveWarRoomInteriorCameraPlacement,
  resolveWarRoomCameraPlacement,
  resolveWarRoomCameraSweep,
  stepWarRoomCameraFollowPosition,
  stepWarRoomCameraFloorHeight,
} from "./war-room-camera.ts";
import {
  getWarRoomFacingYawFromRootYaw,
  getWarRoomPlayerRootYaw,
} from "./war-room-orientation.ts";

const wall = {
  id: "wall",
  minX: -0.6,
  minY: 0.4,
  minZ: -2.3,
  maxX: 1.2,
  maxY: 4.2,
  maxZ: -1.3,
};

test("portrait camera FOV keeps at least 75 degrees of horizontal view", () => {
  for (const { width, height } of [
    { width: 360, height: 640 },
    { width: 360, height: 740 },
    { width: 390, height: 664 },
    { width: 412, height: 780 },
    { width: 430, height: 800 },
  ]) {
    const aspect = width / height;
    const verticalFov = getWarRoomResponsiveCameraFov(75, aspect);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov * Math.PI / 360) * aspect) * 180 / Math.PI;
    assert.ok(horizontalFov >= 74.999, `${width}x${height} horizontal FOV was ${horizontalFov}`);
  }

  assert.equal(getWarRoomResponsiveCameraFov(75, 844 / 390), 75);
  assert.equal(getWarRoomResponsiveCameraFov(50, 360 / 640, 0), 50);
});

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

test("first-person weapon moves back and down near a forward wall only", () => {
  const nearWall = {
    id: "near-wall",
    minX: -1,
    maxX: 1,
    minY: 0,
    maxY: 3,
    minZ: -0.7,
    maxZ: -0.45,
  };
  const proximity = getWarRoomViewModelWallProximity(
    { x: 0, y: 1.5, z: 0 },
    { x: 0, y: 0, z: -1 },
    [nearWall],
  );
  assert.ok(proximity > 0.7 && proximity <= 1);
  assert.equal(
    getWarRoomViewModelWallProximity(
      { x: 0, y: 1.5, z: 0 },
      { x: 0, y: 0, z: -1 },
      [],
    ),
    0,
  );
});

test("viewmodel wall scan reaches weapon range and computes a safe pullback", () => {
  const farWall = {
    id: "far-viewmodel-wall",
    minX: -1,
    maxX: 1,
    minY: 0,
    maxY: 3,
    minZ: -1.2,
    maxZ: -1,
  };
  const proximity = getWarRoomViewModelWallProximity(
    { x: 0, y: 1.5, z: 0 },
    { x: 0, y: 0, z: -1 },
    [farWall],
  );
  assert.ok(proximity > 0 && proximity < 0.5, "the extended probe should detect a wall beyond 0.9 m");
  assert.equal(getWarRoomViewModelWallSafetyRetraction(0, 0.8), 0);
  assert.ok(getWarRoomViewModelWallSafetyRetraction(proximity, 0.95) > 0);
  assert.ok(getWarRoomViewModelWallSafetyRetraction(1, 0.8) > 0.5);
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

test("camera floor transitions ease toward the stair landing without changing direction", () => {
  const halfway = stepWarRoomCameraFloorHeight(0, 3.05, 0.05);
  assert.ok(halfway > 0 && halfway < 3.05);
  assert.ok(stepWarRoomCameraFloorHeight(halfway, 3.05, 0.05) > halfway);
  assert.equal(stepWarRoomCameraFloorHeight(0, 3.05, 0), 0);
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

test("third-person placement stays on the rear line and shortens before a nearby wall", () => {
  const result = resolveWarRoomCameraPlacement(
    { x: 0, y: 1.5, z: 0 },
    { x: 0, y: 1.85, z: -4.8 },
    [wall],
  );

  assert.equal(result.blocked, true);
  assert.equal(result.usedAlternate, false);
  assert.equal(result.position.x, 0);
  assert.ok(result.position.z > wall.maxZ + 0.28);
  assert.equal(isWarRoomCameraPointClear(result.position, [wall], 0.28), true);
  assert.ok(result.position.z < 0, "the camera remains behind the player");
});

test("camera stays directly behind the player when its rear path is blocked", () => {
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
  assert.equal(result.blocked, true);
  assert.equal(result.usedAlternate, false);
  assert.equal(result.position.x, start.x);
  assert.equal(result.position.y, end.y);
  assert.ok(result.position.z < start.z, "camera must stay directly behind the player");
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

test("rear camera stays behind the rendered hero after a lateral turn", () => {
  const facingYaw = Math.PI / 2;
  const rootYaw = getWarRoomPlayerRootYaw(facingYaw);
  const cameraYaw = getWarRoomFacingYawFromRootYaw(rootYaw);
  const frame = getWarRoomRearCameraFrame(
    { x: 2, y: 0, z: -3 },
    cameraYaw,
    0,
    2.8,
    0.6,
    1.55,
    0,
    1.24,
  );
  const renderedForwardX = -Math.sin(rootYaw);
  const renderedForwardZ = -Math.cos(rootYaw);
  const cameraOffsetX = frame.position.x - 2;
  const cameraOffsetZ = frame.position.z + 3;

  assert.ok(
    cameraOffsetX * renderedForwardX + cameraOffsetZ * renderedForwardZ < 0,
    "camera must stay behind the hero's visible forward direction",
  );
});

test("rear camera follows a turn without lagging around the player's front", () => {
  const start = { x: 0, y: 1.55, z: 0 };
  const yaw = Math.PI / 2;
  const desired = getWarRoomRearCameraFrame(
    { x: 0, y: 0, z: 0 },
    yaw,
    0,
    4,
    0,
    1.55,
    1,
    1.2,
  ).position;
  const current = { x: 0, y: 1.9, z: 5 };
  const followed = stepWarRoomCameraFollowPosition(start, current, desired, 1 / 60);
  const desiredOffset = {
    x: desired.x - start.x,
    y: desired.y - start.y,
    z: desired.z - start.z,
  };
  const followedOffset = {
    x: followed.x - start.x,
    y: followed.y - start.y,
    z: followed.z - start.z,
  };
  const dot = desiredOffset.x * followedOffset.x
    + desiredOffset.y * followedOffset.y
    + desiredOffset.z * followedOffset.z;
  const lengths = Math.hypot(desiredOffset.x, desiredOffset.y, desiredOffset.z)
    * Math.hypot(followedOffset.x, followedOffset.y, followedOffset.z);

  assert.ok(dot / lengths > 0.999999, "camera direction should immediately align behind the hero");
  assert.ok(followed.x < 0, "for a right-facing hero, the camera must move to the left/rear side");
});

test("rear camera snaps inward for interior clearance and eases outward", () => {
  const start = { x: 0, y: 1.5, z: 0 };
  const indoors = stepWarRoomCameraFollowPosition(
    start,
    { x: 0, y: 1.5, z: 5 },
    { x: 0, y: 1.5, z: 2 },
    1 / 60,
  );
  assert.equal(indoors.z, 2, "camera should not linger outside the closer interior target");

  const outdoors = stepWarRoomCameraFollowPosition(
    start,
    { x: 0, y: 1.5, z: 2 },
    { x: 0, y: 1.5, z: 5 },
    1 / 60,
  );
  assert.ok(outdoors.z > 2 && outdoors.z < 5, "outward distance changes should remain smooth");
});

test("eye clearance checks all eight directions and caps correction distance", () => {
  const bounds = [{
    id: "near-wall",
    minX: 0.32,
    maxX: 0.5,
    minY: 0,
    maxY: 2.5,
    minZ: -1,
    maxZ: 1,
  }];
  const push = getWarRoomEyeClearancePush({ x: 0, y: 1.4, z: 0 }, bounds);
  assert.ok(push.x < 0);
  assert.ok(Math.hypot(push.x, push.z) <= 0.3);
  assert.equal(isWarRoomEyeClearAbove(
    { x: 0, y: 1, z: 0 },
    [{ id: "ceiling", minX: -1, maxX: 1, minY: 1.3, maxY: 1.6, minZ: -1, maxZ: 1 }],
    0.35,
  ), false);
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

test("first-person camera removes the shoulder and rear offset", () => {
  assert.deepEqual(getWarRoomCameraRig({
    mode: "first-person",
    aiming: false,
    shoulderOffset: 0.7,
    shoulderSide: "right",
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
  assert.deepEqual(right, { back: 3.5, shoulder: 0.7 });
  assert.deepEqual(left, { back: 3.5, shoulder: -0.7 });
  assert.deepEqual(getWarRoomCameraRig({
    mode: "third-person",
    aiming: false,
    shoulderOffset: 0.6,
    shoulderSide: "right",
  }), { back: 3.5, shoulder: 0.6 });
});

test("indoor camera keeps a wider rear view while staying closer than outdoors", () => {
  const right = getWarRoomCameraRig({
    mode: "third-person",
    aiming: false,
    shoulderOffset: 0.6,
    shoulderSide: "right",
    indoors: true,
  });
  const aiming = getWarRoomCameraRig({
    mode: "third-person",
    aiming: true,
    shoulderOffset: 0.6,
    shoulderSide: "right",
    indoors: true,
  });
  assert.equal(right.back, 2);
  assert.ok(Math.abs(right.shoulder - 0.24) < 1e-10);
  assert.equal(aiming.back, 2.4);
  assert.ok(Math.abs(aiming.shoulder - 0.28) < 1e-10);
});

test("third-person aiming tightens the camera, and offsets remain bounded", () => {
  assert.deepEqual(getWarRoomCameraRig({
    mode: "third-person",
    aiming: true,
    shoulderOffset: 4,
    shoulderSide: "right",
  }), { back: 3.5, shoulder: 1.6 });
  const victoryZoom = getWarRoomCameraRig({
    mode: "third-person",
    aiming: false,
    shoulderOffset: -5,
    shoulderSide: "right",
    victoryZoom: 1,
  });
  assert.ok(Math.abs(victoryZoom.back - 3.5 * 0.82) < 1e-12);
  assert.equal(victoryZoom.shoulder, 0);
});

test("camera ray stops before tagged world geometry but never places the camera inside it", () => {
  assert.equal(getWarRoomCameraRaySafeDistance(3.5, null), 3.5);
  assert.equal(getWarRoomCameraRaySafeDistance(3.5, 2), 1.8);
  assert.ok(Math.abs(getWarRoomCameraRaySafeDistance(3.5, 0.6) - 0.4) < 1e-10);
  assert.equal(getWarRoomCameraRaySafeDistance(3.5, 8), 3.5);
});
