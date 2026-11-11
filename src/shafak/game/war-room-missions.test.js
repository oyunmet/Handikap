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
  applyWarRoomDamage,
  applyWarRoomLootChest,
  advanceWarRoomSurvivalWave,
  createWarRoomRuntime,
  getNearbyWarRoomLootChest,
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

test("daily mode resolves all three seeded objective types to their real mission rules", () => {
  for (const dailyObjective of ["raid", "treasure", "defense"]) {
    const mission = createWarRoomMissionState({
      mode: "daily",
      dailyObjective,
      difficulty: "hard",
      modifiers: ["fog"],
      mapId: "ember-gate",
    }, { x: 0, z: 20 });
    assert.equal(mission.mode, "daily");
    assert.equal(mission.dailyObjective, dailyObjective);
    assert.equal(mission.timeLimitSeconds, dailyObjective === "treasure" ? 180 : dailyObjective === "defense" ? 240 : null);
    assert.equal(mission.targetChests, dailyObjective === "treasure" ? 5 : 0);
    assert.equal(mission.defenseMaxHp, dailyObjective === "defense" ? 100 : 0);
  }
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
    assert.ok(
      runtime.enemies.filter((enemy) => !enemy.commander).every((enemy) => enemy.mode === "patrol"),
      `${map.name}: guards should begin on patrol rather than immediately pursuing the player`,
    );
  }
});

test("bot simulations travel, complete each objective, advance survival waves, and reach results", () => {
  const modes = ["raid", "survival", "treasure", "defense", "daily"];
  const dailyObjectives = ["raid", "treasure", "defense"];
  const walkToPoint = (runtime, target, message) => {
    const actor = runtime.player;
    let stalledFrames = 0;
    for (let frame = 0; frame < 2_400; frame += 1) {
      const distance = Math.hypot(target.x - actor.x, target.z - actor.z);
      if (distance <= 2.2 && Math.abs((target.floorHeight ?? 0) - actor.floorHeight) <= 0.9) return frame;
      const waypoint = getWarRoomObstacleWaypoint(actor, target, runtime.room.blockers, 0.35);
      const dx = waypoint.x - actor.x;
      const dz = waypoint.z - actor.z;
      const length = Math.hypot(dx, dz);
      const step = Math.min(length, 0.15);
      const moved = moveWarRoomEntity(
        actor.x,
        actor.z,
        length > 0 ? (dx / length) * step : 0,
        length > 0 ? (dz / length) * step : 0,
        0.35,
        runtime.room.blockers,
        actor.floorHeight,
      );
      const traveled = Math.hypot(moved.x - actor.x, moved.z - actor.z);
      stalledFrames = traveled < 0.002 ? stalledFrames + 1 : 0;
      actor.x = moved.x;
      actor.z = moved.z;
      assert.ok(stalledFrames < 100, `${message}: bot got stuck`);
    }
    assert.fail(`${message}: bot did not reach its target`);
  };
  const killAllEnemies = (runtime) => {
    for (const enemy of runtime.enemies) {
      if (!enemy.alive) continue;
      applyWarRoomDamage(enemy, enemy.hp);
      enemy.alive = false;
      runtime.player.kills += 1;
      enemy.score += 100;
    }
  };

  for (const [mapIndex, map] of WAR_ROOM_MAPS.entries()) {
    for (const mode of modes) {
      const dailyObjective = mode === "daily"
        ? dailyObjectives[mapIndex % dailyObjectives.length]
        : undefined;
      const missionOptions = {
        mode,
        difficulty: "normal",
        modifiers: [],
        mapId: map.id,
        ...(dailyObjective ? { dailyObjective } : {}),
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

      const objectiveMode = mode === "daily" ? dailyObjective : mode;
      let elapsedSeconds = 1;
      if (objectiveMode === "treasure") {
        const groundChests = runtime.lootChests
          .filter((chest) => chest.floorHeight === 0 && !chest.opened)
          .slice(0, runtime.mission.targetChests);
        assert.equal(groundChests.length, runtime.mission.targetChests, `${map.name}: seeded chest supply`);
        for (const chest of groundChests) {
          const frames = walkToPoint(runtime, chest, `${map.name} / ${mode} / ${chest.id}`);
          elapsedSeconds += frames / 20;
          const nearby = getNearbyWarRoomLootChest(runtime);
          assert.equal(nearby?.chest.id, chest.id, `${map.name}: bot reaches the intended chest`);
          applyWarRoomLootChest(runtime.player, chest);
          chest.opened = true;
        }
      }

      const snapshot = () => ({
        remaining: getWarRoomRemaining(runtime),
        openedChests: runtime.lootChests.filter((chest) => chest.opened).length,
        elapsedSeconds,
        playerHp: runtime.player.hp,
        defenseHp: runtime.mission.defenseHp,
      });

      if (objectiveMode === "treasure") {
        assert.equal(getWarRoomMissionOutcome(mode, snapshot(), runtime.mission), "victory");
        assert.ok(elapsedSeconds < (runtime.mission.timeLimitSeconds ?? 0), `${map.name}: chest run stays in time`);
      } else if (mode === "survival") {
        killAllEnemies(runtime);
        assert.equal(getWarRoomMissionOutcome(mode, snapshot(), runtime.mission), "wave-complete");
        const nextWave = createWarRoomRuntime(
          ["powder_rifle", "crossbow"],
          10,
          2,
          20261111,
          missionOptions,
        );
        const waveTwo = advanceWarRoomSurvivalWave(runtime, nextWave);
        assert.equal(waveTwo.mission.wave, 2);
        killAllEnemies(waveTwo);
        assert.equal(getWarRoomMissionOutcome(mode, {
          remaining: getWarRoomRemaining(waveTwo),
          openedChests: 0,
          elapsedSeconds: 75,
          playerHp: waveTwo.player.hp,
          defenseHp: waveTwo.mission.defenseHp,
        }, waveTwo.mission), "wave-complete");
        waveTwo.player.hp = 0;
        assert.equal(getWarRoomMissionOutcome(mode, {
          remaining: 0,
          openedChests: 0,
          elapsedSeconds: 90,
          playerHp: waveTwo.player.hp,
          defenseHp: waveTwo.mission.defenseHp,
        }, waveTwo.mission), "defeat");
      } else {
        killAllEnemies(runtime);
        assert.equal(getWarRoomMissionOutcome(mode, snapshot(), runtime.mission), "victory");
      }

      const reward = getWarRoomMissionReward({
        mode,
        victory: true,
        kills: runtime.player.kills,
        headshots: runtime.player.headshots,
        contractBonus: 0,
        wave: runtime.mission.wave,
      });
      assert.ok(Number.isFinite(reward) && reward >= 0, `${map.name} / ${mode}: result payout is valid`);
      if (mode === "daily") assert.ok(reward <= 180, `${map.name}: daily payout cap`);
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
