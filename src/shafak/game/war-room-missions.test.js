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
import {
  advanceWarRoomSurvivalWave,
  createWarRoomRuntime,
  getWarRoomRemaining,
  moveWarRoomEntity,
} from "./war-room-engine.ts";
import { getWarRoomObstacleWaypoint } from "./war-room-ai.ts";

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

test("bot simulations finish objectives on all maps and traverse blockers without sticking", () => {
  const modes = ["raid", "survival", "treasure", "defense", "daily"];
  for (const map of WAR_ROOM_MAPS) {
    for (const mode of modes) {
      const missionOptions = {
        mode,
        difficulty: "normal",
        modifiers: [],
        mapId: map.id,
        ...(mode === "daily" ? { dailyObjective: "raid" } : {}),
      };
      const runtime = createWarRoomRuntime(
        ["powder_rifle", "crossbow"],
        0,
        1,
        20261111,
        missionOptions,
      );
      const target = { x: runtime.player.x, z: runtime.player.z, floorHeight: 0 };
      const bot = runtime.enemies
        .filter((enemy) => !enemy.commander)
        .sort((left, right) => (
          Math.hypot(right.x - target.x, right.z - target.z)
          - Math.hypot(left.x - target.x, left.z - target.z)
        ))[0];
      let distance = Math.hypot(bot.x - target.x, bot.z - target.z);
      let stalledFrames = 0;
      let reached = distance <= 10.5;

      for (let frame = 0; frame < 1200 && !reached; frame += 1) {
        const waypoint = getWarRoomObstacleWaypoint(bot, target, runtime.room.blockers, 0.35);
        const dx = waypoint.x - bot.x;
        const dz = waypoint.z - bot.z;
        const length = Math.hypot(dx, dz);
        const step = Math.min(length, 3.7 / 20);
        const previousX = bot.x;
        const previousZ = bot.z;
        const moved = moveWarRoomEntity(
          bot.x,
          bot.z,
          length > 0 ? (dx / length) * step : 0,
          length > 0 ? (dz / length) * step : 0,
          0.35,
          runtime.room.blockers,
        );
        bot.x = moved.x;
        bot.z = moved.z;
        const stepDistance = Math.hypot(bot.x - previousX, bot.z - previousZ);
        const nextDistance = Math.hypot(bot.x - target.x, bot.z - target.z);
        stalledFrames = stepDistance < 0.005 ? stalledFrames + 1 : 0;
        distance = nextDistance;
        reached = distance <= 10.5;
        assert.ok(stalledFrames < 160, `${map.name} / ${mode}: bot stopped progressing`);
      }
      assert.ok(reached, `${map.name} / ${mode}: bot did not reach its objective`);

      const snapshot = {
        remaining: 0,
        openedChests: runtime.mission.targetChests,
        elapsedSeconds: 1,
        playerHp: 100,
        defenseHp: runtime.mission.defenseMaxHp,
      };
      if (mode === "treasure") {
        assert.ok(runtime.lootChests.length >= runtime.mission.targetChests);
        assert.equal(getWarRoomMissionOutcome(mode, snapshot, runtime.mission), "victory");
      } else if (mode === "survival") {
        assert.equal(getWarRoomMissionOutcome(mode, snapshot, runtime.mission), "wave-complete");
        const nextWave = createWarRoomRuntime(
          ["powder_rifle", "crossbow"],
          10,
          2,
          20261111,
          missionOptions,
        );
        assert.equal(advanceWarRoomSurvivalWave(runtime, nextWave).mission.wave, 2);
        assert.equal(getWarRoomMissionOutcome(mode, { ...snapshot, playerHp: 0 }, nextWave.mission), "defeat");
      } else {
        assert.equal(getWarRoomMissionOutcome(mode, snapshot, runtime.mission), "victory");
      }
    }
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
