import assert from "node:assert/strict";
import test from "node:test";
import {
  createWarRoomMissionState,
  getWarRoomAmmoMultiplier,
  getWarRoomDailyPreset,
  getWarRoomEnemyDamageMultiplier,
  getWarRoomEnemyHealthMultiplier,
  getWarRoomEnemySpeedMultiplier,
  getWarRoomMissionOutcome,
  getWarRoomMissionReward,
  getWarRoomResultGrade,
} from "./war-room-missions.ts";
import { WAR_ROOM_MAPS, getWarRoomRoom } from "./war-room-rooms.ts";
import { createWarRoomRuntime, getWarRoomRemaining } from "./war-room-engine.ts";

test("daily challenge parameters are deterministic and rotate maps and modifiers", () => {
  const maps = WAR_ROOM_MAPS.map((map) => map.id);
  const first = getWarRoomDailyPreset(12345, maps);
  assert.deepEqual(getWarRoomDailyPreset(12345, maps), first);
  assert.ok(maps.includes(first.mapId));
  assert.ok(first.modifiers.length === 1);
  assert.notDeepEqual(getWarRoomDailyPreset(12346, maps), first);
});

test("mission mode objectives have explicit success and timeout rules", () => {
  const treasure = createWarRoomMissionState({
    mode: "treasure", difficulty: "normal", modifiers: [], mapId: "stone-courtyard",
  }, { x: 0, z: 20 });
  assert.equal(treasure.targetChests, 5);
  assert.equal(getWarRoomMissionOutcome("treasure", {
    remaining: 9, openedChests: 4, elapsedSeconds: 180, playerHp: 100, defenseHp: 0,
  }, treasure), "defeat");
  assert.equal(getWarRoomMissionOutcome("treasure", {
    remaining: 9, openedChests: 5, elapsedSeconds: 20, playerHp: 100, defenseHp: 0,
  }, treasure), "victory");

  const defense = createWarRoomMissionState({
    mode: "defense", difficulty: "normal", modifiers: [], mapId: "stone-courtyard",
  }, { x: 0, z: 20 });
  assert.equal(defense.defenseHp, defense.defenseMaxHp);
  assert.equal(getWarRoomMissionOutcome("defense", {
    remaining: 0, openedChests: 0, elapsedSeconds: 10, playerHp: 100, defenseHp: 100,
  }, defense), "victory");
  assert.equal(getWarRoomMissionOutcome("defense", {
    remaining: 2, openedChests: 0, elapsedSeconds: 10, playerHp: 100, defenseHp: 0,
  }, defense), "defeat");
});

test("survival emits a wave transition rather than a final victory", () => {
  const result = getWarRoomMissionOutcome("survival", {
    remaining: 0, openedChests: 0, elapsedSeconds: 75, playerHp: 100, defenseHp: 0,
  }, { timeLimitSeconds: null, targetChests: 0, defenseHp: 0 });
  assert.equal(result, "wave-complete");
});

test("all six map presets start a seeded mode runtime with reachable enemies", () => {
  for (const map of WAR_ROOM_MAPS) {
    const room = getWarRoomRoom(1, 20261111, map.id);
    const runtime = createWarRoomRuntime(
      ["powder_rifle", "crossbow"],
      0,
      1,
      20261111,
      { mode: "raid", difficulty: "normal", modifiers: [], mapId: map.id },
    );
    assert.equal(runtime.room.id, room.id);
    assert.ok(getWarRoomRemaining(runtime) > 0);
    assert.equal(runtime.mission.mapId, map.id);
    assert.ok(runtime.enemies.every((enemy) => Number.isFinite(enemy.hp) && enemy.hp > 0));
  }
});

test("difficulty and modifiers change combat values without altering unrelated modes", () => {
  assert.equal(getWarRoomEnemyHealthMultiplier("normal"), 1);
  assert.ok(getWarRoomEnemyHealthMultiplier("nightmare") > getWarRoomEnemyHealthMultiplier("hard"));
  assert.equal(getWarRoomEnemyDamageMultiplier("normal", []), 1);
  assert.equal(getWarRoomEnemyDamageMultiplier("normal", ["double-damage"]), 2);
  assert.equal(getWarRoomEnemySpeedMultiplier(["fast-enemies"]), 1.35);
  assert.equal(getWarRoomAmmoMultiplier(["low-ammo"]), 0.45);
});

test("daily payouts stop after one claim and result grades use performance", () => {
  const dailyReward = getWarRoomMissionReward({
    mode: "daily", victory: true, kills: 20, headshots: 5, contractBonus: 100,
  });
  assert.ok(dailyReward <= 180);
  assert.equal(getWarRoomMissionReward({
    mode: "daily", victory: true, alreadyClaimedToday: true, kills: 20, headshots: 5, contractBonus: 100,
  }), 0);
  assert.equal(getWarRoomMissionReward({
    mode: "survival", victory: false, wave: 20, kills: 10, headshots: 0, contractBonus: 0,
  }), 310 > 300 ? 300 : 132);
  assert.equal(getWarRoomResultGrade({ accuracy: 90, healthRatio: 0.85, seconds: 100 }), "S");
  assert.equal(getWarRoomResultGrade({ accuracy: 60, healthRatio: 0.4, seconds: 300 }), "A");
});
