import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomLootPursuitPoint,
  getWarRoomObstacleWaypoint,
} from "./war-room-ai.ts";
import { isWarRoomPointClear } from "./war-room-data.ts";
import { moveWarRoomEntity } from "./war-room-engine.ts";
import {
  getWarRoomBuildingLocalPoint,
  getWarRoomBuildingWorldPoint,
  getWarRoomRoom,
  getWarRoomStairProfile,
} from "./war-room-rooms.ts";

function assertLocalPoint(building, point, expectedX, expectedZ) {
  const local = getWarRoomBuildingLocalPoint(building, point.x, point.z);
  assert.ok(Math.abs(local.x - expectedX) < 0.001, `local x ${local.x} did not match ${expectedX}`);
  assert.ok(Math.abs(local.z - expectedZ) < 0.001, `local z ${local.z} did not match ${expectedZ}`);
}

test("looting bots route around all room rotations and enter through the open front door", () => {
  for (let roomNumber = 1; roomNumber <= 4; roomNumber += 1) {
    const building = getWarRoomRoom(roomNumber).buildings[0];
    const player = { x: building.x, z: building.z, floorHeight: 0 };
    const enemy = getWarRoomBuildingWorldPoint(building, 0, building.depth / 2 + 3);

    let target = getWarRoomLootPursuitPoint({ ...enemy, floorHeight: 0 }, player, building);
    const sideX = building.width / 2 + 0.95;
    assertLocalPoint(building, target, sideX, building.depth / 2 + 0.95);

    target = getWarRoomLootPursuitPoint({ ...target, floorHeight: 0 }, player, building);
    const frontApproachZ = -building.depth / 2 - 0.95;
    assertLocalPoint(building, target, sideX, frontApproachZ);

    target = getWarRoomLootPursuitPoint({ ...target, floorHeight: 0 }, player, building);
    assertLocalPoint(building, target, 0, frontApproachZ);

    target = getWarRoomLootPursuitPoint({ ...target, floorHeight: 0 }, player, building);
    assertLocalPoint(building, target, 0, -building.depth / 2 + 0.8);
  }
});

test("looting bots follow the house stair lane to an upstairs player", () => {
  const building = getWarRoomRoom(1).buildings[0];
  const stairs = getWarRoomStairProfile(building);
  const player = getWarRoomBuildingWorldPoint(building, 1, 0.2);
  const upstairsPlayer = { ...player, floorHeight: building.storyHeight };
  const enemyAtDoor = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2 + 0.8);

  let target = getWarRoomLootPursuitPoint(
    { ...enemyAtDoor, floorHeight: 0 },
    upstairsPlayer,
    building,
  );
  assertLocalPoint(building, target, stairs.x, stairs.startZ + 0.25);

  const progress = 0.56;
  const enemyOnStairs = getWarRoomBuildingWorldPoint(
    building,
    stairs.x,
    stairs.startZ + (stairs.endZ - stairs.startZ) * progress,
  );
  target = getWarRoomLootPursuitPoint(
    { ...enemyOnStairs, floorHeight: building.storyHeight * progress },
    upstairsPlayer,
    building,
  );
  assertLocalPoint(building, target, stairs.x, stairs.endZ - 0.25);

  const enemyAtTop = getWarRoomBuildingWorldPoint(building, stairs.x, stairs.endZ - 0.25);
  target = getWarRoomLootPursuitPoint(
    { ...enemyAtTop, floorHeight: building.storyHeight },
    upstairsPlayer,
    building,
  );
  assert.deepEqual(target, { x: upstairsPlayer.x, z: upstairsPlayer.z });
});

test("combat bots follow stairs in both directions when players change floors", () => {
  const building = getWarRoomRoom(1).buildings[0];
  const stairs = getWarRoomStairProfile(building);
  const player = getWarRoomBuildingWorldPoint(building, 0, 0);
  const enemyAtTop = getWarRoomBuildingWorldPoint(building, stairs.x, stairs.endZ - 0.25);

  let target = getWarRoomLootPursuitPoint(
    { ...enemyAtTop, floorHeight: building.storyHeight },
    { ...player, floorHeight: 0 },
    building,
  );
  assertLocalPoint(building, target, stairs.x, stairs.endZ - 0.25);

  const enemyMidStairs = getWarRoomBuildingWorldPoint(
    building,
    stairs.x,
    (stairs.startZ + stairs.endZ) / 2,
  );
  target = getWarRoomLootPursuitPoint(
    { ...enemyMidStairs, floorHeight: building.storyHeight / 2 },
    { ...player, floorHeight: 0 },
    building,
  );
  assertLocalPoint(building, target, stairs.x, stairs.startZ + 0.25);
});

test("combat bots take collision-safe waypoints around blocked sight lines", () => {
  const blockers = [{
    id: "test-wall",
    kind: "wall",
    x: 0,
    z: 0,
    width: 2,
    depth: 2,
    height: 3,
    color: "#777",
  }];
  const target = { x: 4, z: 0, floorHeight: 0 };
  let actor = { x: -4, z: 0, floorHeight: 0 };

  for (let step = 0; step < 240 && Math.hypot(target.x - actor.x, target.z - actor.z) > 0.5; step += 1) {
    const waypoint = getWarRoomObstacleWaypoint(actor, target, blockers, 0.35);
    const dx = waypoint.x - actor.x;
    const dz = waypoint.z - actor.z;
    const distance = Math.hypot(dx, dz);
    const stride = Math.min(0.08, distance);
    actor = moveWarRoomEntity(
      actor.x,
      actor.z,
      distance > 0.001 ? dx / distance * stride : 0,
      distance > 0.001 ? dz / distance * stride : 0,
      0.35,
      blockers,
      0,
    );
    assert.ok(isWarRoomPointClear(actor.x, actor.z, blockers, 0.35, 0));
  }

  assert.ok(
    Math.hypot(target.x - actor.x, target.z - actor.z) <= 0.5,
    `bot should reach the target around the wall; stopped at ${actor.x},${actor.z}`,
  );
});
