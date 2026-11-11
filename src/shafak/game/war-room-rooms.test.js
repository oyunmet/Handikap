import assert from "node:assert/strict";
import test from "node:test";
import {
  WAR_ROOM_BLOCKERS,
  WAR_ROOM_HOUSE_PLAN,
  WAR_ROOM_WEAPONS,
  getWarRoomHousePlan,
  isWarRoomPointClear,
} from "./war-room-data.ts";
import {
  addWarRoomRoomReward,
  getWarRoomBuildingWorldPoint,
  getWarRoomFloorHeight,
  getWarRoomProgressAfterVictory,
  getWarRoomRoom,
  getWarRoomRoomCarryHp,
  getWarRoomRoomRewardMultiplier,
  getWarRoomStairProgress,
  getWarRoomStairProfile,
  normalizeWarRoomSavedProgress,
  WAR_ROOM_MAX_ROOM_ENEMIES,
} from "./war-room-rooms.ts";
import { GAME_BUILD_MARKER } from "../build-info.ts";
import {
  createWarRoomRuntime,
  createWarRoomTrainingRuntime,
  moveWarRoomEntity,
  segmentBlockFraction,
  WAR_ROOM_PLAYER_COLLISION_RADIUS,
} from "./war-room-engine.ts";
import {
  WAR_ROOM_BUILD_VERSION,
  WAR_ROOM_ROOM_BUFFS_ENABLED,
  WAR_ROOM_ROOM_CHAIN_ENABLED,
} from "./war-room-features.ts";

test("room-chain rollout is enabled with optional buffs disabled", () => {
  assert.equal(WAR_ROOM_ROOM_CHAIN_ENABLED, true);
  assert.equal(WAR_ROOM_ROOM_BUFFS_ENABLED, false);
  assert.equal(WAR_ROOM_BUILD_VERSION, GAME_BUILD_MARKER);
});

test("the first six rooms have distinct names, layouts, themes, rosters and enemy counts", () => {
  const rooms = Array.from({ length: 6 }, (_, index) => getWarRoomRoom(index + 1));
  assert.equal(new Set(rooms.map((room) => room.name)).size, 6);
  assert.equal(new Set(rooms.map((room) => room.layoutName)).size, 6);
  assert.equal(new Set(rooms.map((room) => room.theme.sky)).size, 6);
  assert.deepEqual(rooms.map((room) => room.enemyCount), [9, 10, 11, 12, 13, 14]);
  for (const room of rooms) {
    assert.equal(room.enemySpawns.length, WAR_ROOM_MAX_ROOM_ENEMIES - 1);
    assert.ok(room.enemyWeapons.every((id) => WAR_ROOM_WEAPONS.some((weapon) => weapon.id === id)));
    assert.ok(room.enemySpawns.slice(0, room.enemyCount - 1).every((spawn) => (
      isWarRoomPointClear(spawn.x, spawn.z, room.blockers, 0.48)
    )));
    assert.ok(isWarRoomPointClear(room.playerSpawn.x, room.playerSpawn.z, room.blockers, 0.38));
    assert.ok(isWarRoomPointClear(
      room.commanderPosition.x,
      room.commanderPosition.z,
      room.blockers,
      0.65,
    ));
    assert.ok(room.lootChests.every((chest) => (
      isWarRoomPointClear(chest.x, chest.z, room.blockers, 0.35, chest.floorHeight)
    )));
    assert.ok(room.blockers.length === WAR_ROOM_BLOCKERS.length);
  }
});

test("house rooms, corridor, doors, stairs and landings meet the visible dimensions", () => {
  for (const building of getWarRoomRoom(1).buildings) {
    const plan = getWarRoomHousePlan(building);
    const clearWingWidth = building.width / 2 - plan.corridorWallX - plan.wallThickness / 2;
    const frontWallInside = -building.depth / 2 + plan.wallThickness / 2;
    const frontRoomDepth = plan.roomDividerZ - plan.wallThickness / 2 - frontWallInside;
    const stairRun = plan.stairEndZ - plan.stairStartZ;
    const stairAngle = Math.atan2(building.storyHeight, stairRun) * 180 / Math.PI;
    const stairSteps = Math.ceil(Math.max(building.storyHeight / 0.18, stairRun / 0.24));

    assert.ok(plan.corridorWidth >= 2.5);
    assert.ok(clearWingWidth >= 5);
    assert.ok(frontRoomDepth >= 5);
    assert.ok(building.storyHeight >= 3);
    assert.ok(plan.roomDoorWidth >= 1.6 && plan.roomDoorHeight >= 2.4);
    assert.ok(plan.stairWidth >= 2);
    assert.ok(plan.landingDepth >= 2);
    assert.ok(stairAngle >= 30 && stairAngle <= 35);
    assert.ok(building.storyHeight / stairSteps <= 0.4);
    assert.ok(WAR_ROOM_HOUSE_PLAN.railingHeight >= 0.9);
  }
});

test("all floorplan doorways and both stair landings remain traversable", () => {
  const room = getWarRoomRoom(2);
  for (const building of room.buildings) {
    const plan = getWarRoomHousePlan(building);
    for (const floorHeight of [0, building.storyHeight]) {
      for (const point of [
        getWarRoomBuildingWorldPoint(building, 0, plan.frontRoomDoorZ),
        getWarRoomBuildingWorldPoint(building, -4.15, plan.frontRoomDoorZ),
        getWarRoomBuildingWorldPoint(building, 4.15, plan.frontRoomDoorZ),
        getWarRoomBuildingWorldPoint(building, -4.15, plan.roomDividerZ),
        getWarRoomBuildingWorldPoint(building, 4.15, plan.roomDividerZ),
        getWarRoomBuildingWorldPoint(building, 0, plan.rearRoomDoorZ),
        getWarRoomBuildingWorldPoint(building, plan.stairX, plan.stairStartZ),
        getWarRoomBuildingWorldPoint(building, plan.stairX, plan.stairEndZ),
      ]) {
        assert.ok(isWarRoomPointClear(point.x, point.z, room.blockers, 0.35, floorHeight));
      }
    }
    assert.ok(room.blockers.some((blocker) => (
      blocker.id === `${building.id}-stair-rail--1` && blocker.kind === "rail"
    )));
    assert.ok(room.blockers.some((blocker) => (
      blocker.id === `${building.id}-stair-rail-1` && blocker.kind === "rail"
    )));
  }
});

test("all eight houses have traversable doors, matching stairs, floors, and upper-floor shot blocking", () => {
  for (let roomNumber = 1; roomNumber <= 4; roomNumber += 1) {
    const room = getWarRoomRoom(roomNumber);
    assert.equal(room.buildings.length, 8);
    for (const building of room.buildings) {
      const upperBalcony = getWarRoomBuildingWorldPoint(
        building,
        0,
        -building.depth / 2 - 0.84,
      );
      assert.equal(
        getWarRoomFloorHeight(
          upperBalcony.x,
          upperBalcony.z,
          building.storyHeight,
          room.buildings,
        ),
        building.storyHeight,
      );
      assert.equal(
        getWarRoomFloorHeight(upperBalcony.x, upperBalcony.z, 0, room.buildings),
        0,
      );

      const frontDistance = building.depth / 2 + 1.4;
      const front = getWarRoomBuildingWorldPoint(building, 0, -frontDistance);
      const forwardX = -Math.sin(building.rotationY);
      const forwardZ = -Math.cos(building.rotationY);
      let position = front;
      const steps = Math.ceil(frontDistance / 0.3) + 1;
      for (let index = 0; index < steps; index += 1) {
        position = moveWarRoomEntity(
          position.x,
          position.z,
          -forwardX * 0.3,
          -forwardZ * 0.3,
          WAR_ROOM_PLAYER_COLLISION_RADIUS,
          room.blockers,
        );
      }
      assert.ok(Math.hypot(position.x - building.x, position.z - building.z) < 0.8);

      const center = getWarRoomBuildingWorldPoint(building, 0, 0);
      for (const direction of [
        { x: 0, z: -1 },
        { x: 0, z: 1 },
        { x: -1, z: 0 },
        { x: 1, z: 0 },
      ]) {
        const moved = moveWarRoomEntity(
          center.x,
          center.z,
          direction.x * 0.75,
          direction.z * 0.75,
          WAR_ROOM_PLAYER_COLLISION_RADIUS,
          room.blockers,
        );
        assert.ok(
          Math.hypot(moved.x - center.x, moved.z - center.z) > 0.7,
          `room ${roomNumber} ${building.id} should allow movement in every direction`,
        );
        const returned = moveWarRoomEntity(
          moved.x,
          moved.z,
          -direction.x * 0.75,
          -direction.z * 0.75,
          WAR_ROOM_PLAYER_COLLISION_RADIUS,
          room.blockers,
        );
        assert.ok(Math.hypot(returned.x - center.x, returned.z - center.z) < 0.02);
      }

      let exitPosition = position;
      for (let index = 0; index < steps; index += 1) {
        exitPosition = moveWarRoomEntity(
          exitPosition.x,
          exitPosition.z,
          forwardX * 0.3,
          forwardZ * 0.3,
          WAR_ROOM_PLAYER_COLLISION_RADIUS,
          room.blockers,
        );
      }
      assert.ok(
        Math.hypot(exitPosition.x - front.x, exitPosition.z - front.z) < 0.8,
        `room ${roomNumber} ${building.id} should allow leaving through its doorway`,
      );

      const stairs = getWarRoomStairProfile(building);
      const stairMidpoint = getWarRoomBuildingWorldPoint(
        building,
        stairs.x,
        (stairs.startZ + stairs.endZ) / 2,
      );
      assert.ok(Math.abs(getWarRoomStairProgress(building, stairMidpoint.x, stairMidpoint.z) - 0.5) < 1e-8);
      assert.equal(
        getWarRoomStairProgress(
          building,
          getWarRoomBuildingWorldPoint(building, 0, -building.depth).x,
          getWarRoomBuildingWorldPoint(building, 0, -building.depth).z,
        ),
        null,
      );
      let stairPosition = getWarRoomBuildingWorldPoint(building, stairs.x, stairs.startZ + 0.05);
      let floorHeight = 0;
      for (let index = 1; index <= 16; index += 1) {
        const nextLocal = getWarRoomBuildingWorldPoint(
          building,
          stairs.x,
          stairs.startZ + 0.05 + (stairs.endZ - stairs.startZ - 0.1) * index / 16,
        );
        stairPosition = moveWarRoomEntity(
          stairPosition.x,
          stairPosition.z,
          nextLocal.x - stairPosition.x,
          nextLocal.z - stairPosition.z,
          WAR_ROOM_PLAYER_COLLISION_RADIUS,
          room.blockers,
          floorHeight,
        );
        const nextFloorHeight = getWarRoomFloorHeight(
          stairPosition.x,
          stairPosition.z,
          floorHeight,
          room.buildings,
        );
        assert.ok(nextFloorHeight >= floorHeight - 0.001);
        floorHeight = nextFloorHeight;
      }
      assert.ok(Math.abs(floorHeight - building.storyHeight) < 0.06);
    }
  }

  const room = getWarRoomRoom(1);
  const building = room.buildings[0];
  assert.ok(building);
  const shotStart = getWarRoomBuildingWorldPoint(building, 0, 0);
  assert.notEqual(
    segmentBlockFraction(
      { ...shotStart, y: 0.9 },
      { ...shotStart, y: building.storyHeight + 1.1 },
      0,
      room.blockers,
    ),
    null,
  );
});

test("room difficulty keeps increasing after the map cycle instead of dropping back", () => {
  const first = getWarRoomRoom(1);
  const seventh = getWarRoomRoom(7);
  const thirteenth = getWarRoomRoom(13);
  assert.equal(seventh.id, first.id);
  assert.equal(seventh.number, 7);
  assert.equal(seventh.enemyCount, WAR_ROOM_MAX_ROOM_ENEMIES);
  assert.equal(seventh.enemyHpMultiplier, 1.27);
  assert.equal(seventh.enemyDamageMultiplier, 1.15);
  assert.equal(thirteenth.enemyCount, WAR_ROOM_MAX_ROOM_ENEMIES);
  assert.equal(thirteenth.enemyHpMultiplier, 1.54);
  assert.ok(thirteenth.enemyDamageMultiplier > seventh.enemyDamageMultiplier);
  assert.ok(getWarRoomRoom(100).enemyHpMultiplier > thirteenth.enemyHpMultiplier);
});

test("each run seed produces repeatable enemy, house, and treasure variations", () => {
  const first = getWarRoomRoom(2, 1234);
  const sameRun = getWarRoomRoom(2, 1234);
  const otherRun = getWarRoomRoom(2, 9876);
  const signature = (room) => JSON.stringify({
    enemySpawns: room.enemySpawns,
    houseStyles: room.buildings.map((building) => building.style),
    loot: room.lootChests.map(({ x, z, floor, kind }) => ({ x, z, floor, kind })),
  });

  assert.equal(first.runSeed, 1234);
  assert.equal(signature(first), signature(sameRun));
  assert.notEqual(signature(first), signature(otherRun));
});

test("optional room contracts are seeded, varied, and ramp their goals and bonus", () => {
  const first = getWarRoomRoom(1, 1);
  const sameRun = getWarRoomRoom(1, 1);
  const otherRun = getWarRoomRoom(1, 2);
  const later = getWarRoomRoom(13, 1);

  assert.deepEqual(first.contract, sameRun.contract);
  assert.notDeepEqual(first.contract, otherRun.contract);
  assert.ok(later.contract.target >= first.contract.target);
  assert.ok(later.contract.bonusGold > first.contract.bonusGold);
});

test("room runtime uses its randomized roster and applies the escalating enemy stats", () => {
  const room = getWarRoomRoom(2);
  const runtime = createWarRoomRuntime(
    ["powder_rifle", "crossbow"],
    0,
    room.number,
    0,
    { mode: "raid", difficulty: "normal", modifiers: [], mapId: room.id },
  );
  const commander = runtime.enemies.find((enemy) => enemy.commander);
  const guards = runtime.enemies.filter((enemy) => !enemy.commander);
  const movedWall = room.blockers.find((blocker) => blocker.id === "central-wall-west");

  assert.equal(runtime.room.id, room.id);
  assert.deepEqual(runtime.player, {
    ...runtime.player,
    x: room.playerSpawn.x,
    z: room.playerSpawn.z,
  });
  assert.equal(runtime.enemies.length, room.enemyCount);
  assert.equal(guards.length, room.enemyCount - 1);
  assert.equal(commander?.name, room.commanderName);
  assert.equal(commander?.weaponId, room.commanderWeapon);
  assert.equal(commander?.damage, 13);
  assert.ok(commander?.x === room.commanderPosition.x && commander.z === room.commanderPosition.z);
  assert.ok(guards.every((enemy) => enemy.color === room.enemyColor));
  assert.ok(guards.every((enemy) => room.enemyWeapons.includes(enemy.weaponId)));
  assert.ok(guards.every((enemy) => room.enemyNames.includes(enemy.name)));
  assert.ok(guards.every((enemy) => room.enemySpawns.some((spawn) => spawn.id === enemy.id)));
  assert.ok(guards.every((enemy) => {
    const archetypeHealth = enemy.archetype === "heavy" ? 1.55
      : enemy.archetype === "shield" ? 1.28
        : enemy.archetype === "assault" ? 0.82 : 1;
    const archetypeDamage = enemy.archetype === "marksman" ? 1.2
      : enemy.archetype === "heavy" ? 1.35
        : enemy.archetype === "summoner" ? 0.9 : 1;
    return enemy.hp === 90 * room.enemyHpMultiplier * archetypeHealth
      && enemy.damage === Math.round(9 * room.enemyDamageMultiplier * archetypeDamage);
  }));
  assert.ok(movedWall);
  assert.notEqual(
    segmentBlockFraction(
      { x: -17, y: 1, z: 7 },
      { x: -5, y: 1, z: 7 },
      0,
      room.blockers,
    ),
    null,
  );
  assert.equal(
    segmentBlockFraction({ x: -17, y: 1, z: 7 }, { x: -5, y: 1, z: 7 }),
    null,
  );
});

test("training dummy starts in clear space rather than inside house geometry", () => {
  const runtime = createWarRoomTrainingRuntime(["powder_rifle", "crossbow"]);
  const dummy = runtime.enemies[0];
  assert.equal(dummy?.id, "training-dummy");
  assert.ok(dummy);
  assert.ok(isWarRoomPointClear(
    dummy.x,
    dummy.z,
    runtime.room.blockers,
    0.65,
    dummy.floorHeight ?? 0,
  ));
});

test("room rewards apply the requested multiplier cap and carry forty percent health", () => {
  assert.equal(getWarRoomRoomRewardMultiplier(1), 1);
  assert.equal(getWarRoomRoomRewardMultiplier(2), 1.15);
  assert.equal(getWarRoomRoomRewardMultiplier(11), 2.5);
  assert.equal(getWarRoomRoomRewardMultiplier(100), 2.5);
  assert.equal(getWarRoomRoomCarryHp(80, 220), 168);
  assert.equal(getWarRoomRoomCarryHp(220, 220), 220);
});

test("separate room progress tracks highest room and lifetime room rewards", () => {
  const empty = normalizeWarRoomSavedProgress(null);
  const afterFirst = getWarRoomProgressAfterVictory(empty, 3, 140);
  assert.deepEqual(afterFirst, { highestRoom: 3, totalRoomRewards: 140 });
  const afterReplay = addWarRoomRoomReward(afterFirst, 2, 125);
  assert.deepEqual(afterReplay, { highestRoom: 3, totalRoomRewards: 265 });
  assert.deepEqual(normalizeWarRoomSavedProgress({ highestRoom: 4.8, totalRoomRewards: -2 }), {
    highestRoom: 4,
    totalRoomRewards: 0,
  });
});
