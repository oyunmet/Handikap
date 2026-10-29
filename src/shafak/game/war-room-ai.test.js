import assert from "node:assert/strict";
import test from "node:test";
import { getWarRoomLootPursuitPoint } from "./war-room-ai.ts";
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
