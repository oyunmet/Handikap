import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomActiveBlockers,
  getWarRoomDoorOpenProgress,
  getWarRoomDoorBlocker,
  getNearestWarRoomDoor,
  updateWarRoomDoors,
} from "./war-room-doors.ts";
import { createWarRoomRuntime } from "./war-room-engine.ts";
import { getWarRoomBuildingWorldPoint } from "./war-room-rooms.ts";

test("War Room house entrances start blocked by properly rotated doors", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const doors = getWarRoomActiveBlockers(runtime, 0)
    .filter((blocker) => blocker.id.endsWith("-entrance-door-blocker"));
  assert.equal(doors.length, runtime.room.buildings.length);
  for (const building of runtime.room.buildings) {
    const blocker = getWarRoomDoorBlocker(building);
    const isQuarterTurn = Math.abs(Math.sin(building.rotationY)) > 0.5;
    assert.equal(blocker.width, isQuarterTurn ? 0.18 : building.doorWidth);
    assert.equal(blocker.depth, isQuarterTurn ? building.doorWidth : 0.18);
  }
});

test("the nearby door opens for five seconds and then closes", () => {
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
  assert.equal(runtime.doorStates[building.id].openUntil, 15);
  assert.ok(Math.abs(getWarRoomDoorOpenProgress(runtime.doorStates[building.id], 10.14) - 0.5) < 1e-10);
  assert.equal(getWarRoomActiveBlockers(runtime, 10).some((blocker) => (
    blocker.id === `${building.id}-entrance-door-blocker`
  )), true, "collision stays in place during the opening animation");
  assert.equal(getWarRoomActiveBlockers(runtime, 10.25).some((blocker) => (
    blocker.id === `${building.id}-entrance-door-blocker`
  )), false);
  assert.equal(getWarRoomActiveBlockers(runtime, 15.3).some((blocker) => (
    blocker.id === `${building.id}-entrance-door-blocker`
  )), true);
});

test("a door stays open while the player occupies its threshold", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const threshold = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2 + 0.45);
  runtime.player.x = threshold.x;
  runtime.player.z = threshold.z;
  runtime.doorStates[building.id] = { openedAt: 0, openUntil: 5 };

  updateWarRoomDoors(runtime, 5.02, false);
  assert.ok(runtime.doorStates[building.id].openUntil > 5.02);
  assert.equal(getWarRoomActiveBlockers(runtime, 5.02).some((blocker) => (
    blocker.id === `${building.id}-entrance-door-blocker`
  )), false);

  runtime.player.x += 4;
  updateWarRoomDoors(runtime, 5.4, false);
  assert.equal(getWarRoomActiveBlockers(runtime, 5.5).some((blocker) => (
    blocker.id === `${building.id}-entrance-door-blocker`
  )), true);
});

test("the door prompt is limited to ground-floor entrance distance", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const front = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2);
  assert.equal(getNearestWarRoomDoor(runtime.room.buildings, front.x, front.z, 0)?.building.id, building.id);
  assert.equal(getNearestWarRoomDoor(runtime.room.buildings, front.x, front.z, building.storyHeight), null);
  assert.equal(getNearestWarRoomDoor(runtime.room.buildings, 0, 0, 0), null);
});
