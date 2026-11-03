import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomActiveBlockers,
  WAR_ROOM_DOOR_ANIMATION_SECONDS,
  WAR_ROOM_DOOR_CLEAR_PROGRESS,
  getWarRoomDoorOpenProgress,
  getWarRoomDoorBlocker,
  getNearestWarRoomDoor,
  updateWarRoomDoors,
} from "./war-room-doors.ts";
import { createWarRoomRuntime, moveWarRoomEntity, WAR_ROOM_PLAYER_COLLISION_RADIUS } from "./war-room-engine.ts";
import {
  getWarRoomBuildingLocalPoint,
  getWarRoomBuildingWorldPoint,
} from "./war-room-rooms.ts";

test("War Room house entrances start blocked by properly rotated doors", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const doors = getWarRoomActiveBlockers(runtime, 0)
    .filter((blocker) => blocker.id.endsWith("-floor-0-entrance-door-blocker"));
  assert.equal(doors.length, runtime.room.buildings.length);
  for (const building of runtime.room.buildings) {
    const blocker = getWarRoomDoorBlocker(building);
    const isQuarterTurn = Math.abs(Math.sin(building.rotationY)) > 0.5;
    assert.equal(blocker.width, isQuarterTurn ? 0.18 : building.doorWidth);
    assert.equal(blocker.depth, isQuarterTurn ? building.doorWidth : 0.18);
  }
});

test("the nearby door opens for six seconds and then closes", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const front = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2);
  runtime.player.x = front.x;
  runtime.player.z = front.z;

  assert.equal(getNearestWarRoomDoor(
    runtime.room.buildings,
    front.x,
    front.z,
    runtime.player.floorHeight,
  )?.building.id, building.id);
  assert.equal(updateWarRoomDoors(runtime, 10, true), building.id);
  assert.equal(runtime.doorStates[building.id].openUntil, 16);
  assert.ok(Math.abs(getWarRoomDoorOpenProgress(runtime.doorStates[building.id], 10.14) - 0.5) < 1e-10);
  assert.equal(getWarRoomActiveBlockers(runtime, 10).some((blocker) => (
    blocker.id === `${building.id}-floor-0-entrance-door-blocker`
  )), true, "collision stays in place during the opening animation");
  const clearanceAt = 10 + WAR_ROOM_DOOR_ANIMATION_SECONDS * WAR_ROOM_DOOR_CLEAR_PROGRESS;
  assert.equal(getWarRoomActiveBlockers(runtime, clearanceAt).some((blocker) => (
    blocker.id === `${building.id}-floor-0-entrance-door-blocker`
  )), false, "the doorway clears as soon as the moving door leaves enough room");
  assert.equal(getWarRoomActiveBlockers(runtime, 10.25).some((blocker) => (
    blocker.id === `${building.id}-floor-0-entrance-door-blocker`
  )), false);
  assert.equal(getWarRoomActiveBlockers(runtime, 16.3).some((blocker) => (
    blocker.id === `${building.id}-floor-0-entrance-door-blocker`
  )), true);
});

test("a door resets its close timer every frame while the player occupies its threshold", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const threshold = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2 + 0.45);
  runtime.player.x = threshold.x;
  runtime.player.z = threshold.z;
  runtime.doorStates[building.id] = { openedAt: 0, openUntil: 5 };

  updateWarRoomDoors(runtime, 4.9, false);
  assert.ok(runtime.doorStates[building.id].openUntil >= 10.9);
  assert.equal(getWarRoomActiveBlockers(runtime, 4.9).some((blocker) => (
    blocker.id === `${building.id}-floor-0-entrance-door-blocker`
  )), false);

  runtime.player.x += 4;
  updateWarRoomDoors(runtime, 11.1, false);
  assert.equal(getWarRoomActiveBlockers(runtime, 17.2).some((blocker) => (
    blocker.id === `${building.id}-floor-0-entrance-door-blocker`
  )), true);
});

test("a living enemy in the doorway also resets the automatic close timer", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const doorway = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2 + 0.5);
  runtime.doorStates[building.id] = { openedAt: 0, openUntil: 6 };
  runtime.player.x = 40;
  runtime.player.z = 40;
  runtime.enemies[0].x = doorway.x;
  runtime.enemies[0].z = doorway.z;

  updateWarRoomDoors(runtime, 6.1, false);

  assert.equal(runtime.doorStates[building.id].openUntil, 12.1);
  assert.equal(getWarRoomActiveBlockers(runtime, 6.1).some((blocker) => (
    blocker.id === `${building.id}-floor-0-entrance-door-blocker`
  )), false);
});

test("door interaction requires facing the doorway when a view direction is supplied", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const outside = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2 - 1);
  const door = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2);
  const towardDoor = Math.atan2(door.x - outside.x, -(door.z - outside.z));
  assert.equal(
    getNearestWarRoomDoor(runtime.room.buildings, outside.x, outside.z, 0, towardDoor)?.building.id,
    building.id,
  );
  assert.equal(
    getNearestWarRoomDoor(runtime.room.buildings, outside.x, outside.z, 0, towardDoor + Math.PI),
    null,
  );
});

test("door interaction range includes a comfortable approach distance", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const outside = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2 - 3);
  const door = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2);
  const towardDoor = Math.atan2(door.x - outside.x, -(door.z - outside.z));
  assert.equal(
    getNearestWarRoomDoor(runtime.room.buildings, outside.x, outside.z, 0, towardDoor)?.building.id,
    building.id,
  );
});

test("entering or leaving a house auto-opens the entrance from every room rotation", () => {
  for (let roomNumber = 1; roomNumber <= 4; roomNumber += 1) {
    for (const direction of [1, -1]) {
      const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"], 0, roomNumber);
      const building = runtime.room.buildings[0];
      const frontZ = -building.depth / 2;
      const start = getWarRoomBuildingWorldPoint(
        building,
        0,
        frontZ + direction * 1.1,
      );
      const target = getWarRoomBuildingWorldPoint(
        building,
        0,
        frontZ - direction * 2.5,
      );
      runtime.player.x = start.x;
      runtime.player.z = start.z;

      updateWarRoomDoors(runtime, 10, false, Math.PI);
      assert.ok(runtime.doorStates[building.id], "the door opens without an interaction button");

      const result = moveWarRoomEntity(
        start.x,
        start.z,
        target.x - start.x,
        target.z - start.z,
        WAR_ROOM_PLAYER_COLLISION_RADIUS,
        getWarRoomActiveBlockers(runtime, 10 + WAR_ROOM_DOOR_ANIMATION_SECONDS * 0.7),
      );
      const localResult = getWarRoomBuildingLocalPoint(building, result.x, result.z);
      assert.ok(
        direction > 0
          ? localResult.z < frontZ - 1.4
          : localResult.z > frontZ + 1.4,
        `room ${roomNumber} ${direction > 0 ? "exit" : "entry"} should pass through the doorway`,
      );
    }
  }
});

test("all entrance doors retain at least 1.6m clear width and 2.4m height", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  for (const building of runtime.room.buildings) {
    const blocker = getWarRoomDoorBlocker(building);
    assert.ok(Math.max(blocker.width, blocker.depth) >= 1.6);
    assert.ok(blocker.height >= 2.4);
  }
});

test("both ground- and upper-floor door prompts stay limited to their floor and distance", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const front = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2);
  assert.equal(getNearestWarRoomDoor(runtime.room.buildings, front.x, front.z, 0)?.building.id, building.id);
  assert.equal(
    getNearestWarRoomDoor(runtime.room.buildings, front.x, front.z, building.storyHeight)?.floor,
    1,
  );
  assert.equal(getNearestWarRoomDoor(runtime.room.buildings, front.x, front.z, 1.5), null);
  assert.equal(getNearestWarRoomDoor(runtime.room.buildings, 0, 0, 0), null);
});

test("the upper entrance has a matching openable blocker and preserves the ground door", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const front = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2);
  const upperKey = `${building.id}-upper`;
  runtime.player.x = front.x;
  runtime.player.z = front.z;
  runtime.player.floorHeight = building.storyHeight;

  assert.equal(updateWarRoomDoors(runtime, 20, true), upperKey);
  const upperBlockerId = `${building.id}-floor-1-entrance-door-blocker`;
  const groundBlockerId = `${building.id}-floor-0-entrance-door-blocker`;
  assert.equal(getWarRoomActiveBlockers(runtime, 20.25).some((blocker) => (
    blocker.id === upperBlockerId
  )), false);
  assert.equal(getWarRoomActiveBlockers(runtime, 20.25).some((blocker) => (
    blocker.id === groundBlockerId
  )), true);
  assert.equal(getWarRoomDoorBlocker(building, 1).baseY, building.storyHeight);
});
