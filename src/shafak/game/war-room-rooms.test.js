import assert from "node:assert/strict";
import test from "node:test";
import { WAR_ROOM_BLOCKERS, WAR_ROOM_WEAPONS } from "./war-room-data.ts";
import {
  addWarRoomRoomReward,
  getWarRoomProgressAfterVictory,
  getWarRoomRoom,
  getWarRoomRoomCarryHp,
  getWarRoomRoomRewardMultiplier,
  normalizeWarRoomSavedProgress,
  WAR_ROOM_MAX_ROOM_ENEMIES,
} from "./war-room-rooms.ts";
import { GAME_BUILD_MARKER } from "../build-info.ts";
import { createWarRoomRuntime, moveWarRoomEntity, segmentBlockFraction } from "./war-room-engine.ts";
import {
  WAR_ROOM_BUILD_VERSION,
  WAR_ROOM_ROOM_BUFFS_ENABLED,
  WAR_ROOM_ROOM_CHAIN_ENABLED,
} from "./war-room-features.ts";

function overlapsBlocker(point, blocker, radius = 1.1) {
  return Math.abs(point.x - blocker.x) < blocker.width / 2 + radius
    && Math.abs(point.z - blocker.z) < blocker.depth / 2 + radius;
}

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
      room.blockers.every((blocker) => !overlapsBlocker(spawn, blocker))
    )));
    assert.ok(room.blockers.length === WAR_ROOM_BLOCKERS.length);
  }
});

test("each rotated barracks has a traversable doorway and interior crates stop shots", () => {
  const toWorld = (building, localX, localZ) => {
    const cosine = Math.cos(building.rotationY);
    const sine = Math.sin(building.rotationY);
    return {
      x: building.x + cosine * localX + sine * localZ,
      z: building.z - sine * localX + cosine * localZ,
    };
  };

  for (let roomNumber = 1; roomNumber <= 6; roomNumber += 1) {
    const room = getWarRoomRoom(roomNumber);
    assert.equal(room.buildings.length, 2);
    for (const building of room.buildings) {
      const frontDistance = building.depth / 2 + 1.4;
      const front = toWorld(building, 0, -frontDistance);
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
          0.38,
          room.blockers,
        );
      }
      assert.ok(Math.hypot(position.x - building.x, position.z - building.z) < 0.8);

      const side = building.id.startsWith("west-") ? "west" : "east";
      const houseCrates = room.blockers.filter(({ id }) => id.startsWith(`hideout-crate-${side}-`));
      assert.equal(houseCrates.length, 2);
      for (const crate of houseCrates) {
        const dx = crate.x - building.x;
        const dz = crate.z - building.z;
        const localX = Math.cos(building.rotationY) * dx - Math.sin(building.rotationY) * dz;
        const localZ = Math.sin(building.rotationY) * dx + Math.cos(building.rotationY) * dz;
        assert.ok(Math.abs(localX) + crate.width / 2 < building.width / 2 - 0.4);
        assert.ok(Math.abs(localZ) + crate.depth / 2 < building.depth / 2 - 0.4);
      }
    }
  }

  const room = getWarRoomRoom(1);
  const building = room.buildings.find(({ id }) => id === "west-barracks");
  const crate = room.blockers.find(({ id }) => id === "hideout-crate-west-one");
  assert.ok(building);
  assert.ok(crate);
  const shotStart = toWorld(building, -0.55, -(building.depth / 2 + 3));
  assert.notEqual(
    segmentBlockFraction(
      { ...shotStart, y: 1.3 },
      { x: crate.x, y: 1.3, z: crate.z },
      0,
      room.blockers,
    ),
    null,
  );
});

test("rooms beyond six cycle themes, add enemies, and scale health without changing damage data", () => {
  const first = getWarRoomRoom(1);
  const seventh = getWarRoomRoom(7);
  const thirteenth = getWarRoomRoom(13);
  assert.equal(seventh.id, first.id);
  assert.equal(seventh.number, 7);
  assert.equal(seventh.enemyCount, 10);
  assert.equal(seventh.enemyHpMultiplier, 1.1);
  assert.equal(thirteenth.enemyCount, 11);
  assert.equal(thirteenth.enemyHpMultiplier, 1.2);
});

test("room runtime uses the selected roster, visuals, spawn map, and existing damage values", () => {
  const room = getWarRoomRoom(2);
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"], 0, room.number);
  const commander = runtime.enemies.find((enemy) => enemy.commander);
  const guards = runtime.enemies.filter((enemy) => !enemy.commander);
  const movedWall = room.blockers.find((blocker) => blocker.id === "central-wall-west");

  assert.equal(runtime.room.id, room.id);
  assert.equal(runtime.enemies.length, room.enemyCount);
  assert.equal(guards.length, room.enemyCount - 1);
  assert.equal(commander?.name, room.commanderName);
  assert.equal(commander?.weaponId, room.commanderWeapon);
  assert.equal(commander?.damage, 13);
  assert.ok(commander?.x === room.commanderPosition.x && commander.z === room.commanderPosition.z);
  assert.ok(guards.every((enemy) => enemy.damage === 9));
  assert.ok(guards.every((enemy) => enemy.color === room.enemyColor));
  assert.ok(guards.every((enemy) => room.enemyWeapons.includes(enemy.weaponId)));
  assert.ok(guards.every((enemy) => room.enemyNames.includes(enemy.name)));
  assert.ok(guards.every((enemy) => room.enemySpawns.some((spawn) => spawn.id === enemy.id)));
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
