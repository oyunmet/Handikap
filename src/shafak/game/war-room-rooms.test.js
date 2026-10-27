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

function overlapsBlocker(point, blocker, radius = 1.1) {
  return Math.abs(point.x - blocker.x) < blocker.width / 2 + radius
    && Math.abs(point.z - blocker.z) < blocker.depth / 2 + radius;
}

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
