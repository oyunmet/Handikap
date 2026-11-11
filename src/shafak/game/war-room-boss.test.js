import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomBossAttackDamage,
  getWarRoomBossAttack,
  getWarRoomBossAttackLabel,
  getWarRoomBossChargeStep,
  getWarRoomBossPhase,
  getWarRoomBossShockwaveHits,
  getWarRoomBossTelegraphSeconds,
  updateWarRoomBossTelegraph,
  WAR_ROOM_BOSS_CHARGE_SECONDS,
  WAR_ROOM_BOSS_SUMMON_COUNT,
  WAR_ROOM_BOSS_SHOCKWAVE_RADIUS,
} from "./war-room-boss.ts";
import { createWarRoomRuntime, spawnWarRoomBossSummons } from "./war-room-engine.ts";
import { WAR_ROOM_MAPS } from "./war-room-rooms.ts";

test("commander health moves through three stable combat phases", () => {
  assert.equal(getWarRoomBossPhase(100, 100), 1);
  assert.equal(getWarRoomBossPhase(67, 100), 1);
  assert.equal(getWarRoomBossPhase(66, 100), 2);
  assert.equal(getWarRoomBossPhase(34, 100), 2);
  assert.equal(getWarRoomBossPhase(33, 100), 3);
  assert.equal(getWarRoomBossPhase(0, 100), 3);
});

test("all six map commanders use distinct phase-two and phase-three attacks", () => {
  const profiles = [
    ["stone-courtyard", "charge", "shockwave"],
    ["ember-gate", "summon", "charge"],
    ["frost-bastion", "shockwave", "summon"],
    ["black-rampart", "charge", "summon"],
    ["sunken-keep", "summon", "shockwave"],
    ["moonlit-citadel", "shockwave", "charge"],
  ];

  for (const [mapId, phaseTwo, phaseThree] of profiles) {
    assert.equal(getWarRoomBossAttack(mapId, 2), phaseTwo);
    assert.equal(getWarRoomBossAttack(mapId, 3), phaseThree);
  }
  assert.equal(new Set(profiles.map(([, phaseTwo, phaseThree]) => `${phaseTwo}:${phaseThree}`)).size, 6);
});

test("every special attack gives players a visible warning window", () => {
  for (const attack of ["charge", "summon", "shockwave"]) {
    assert.ok(getWarRoomBossTelegraphSeconds(attack) >= 0.8);
  }
});

test("boss attack labels and impact strength are explicit and bounded", () => {
  assert.equal(getWarRoomBossAttackLabel("charge"), "HÜCUM");
  assert.equal(getWarRoomBossAttackLabel("summon"), "TAKVİYE ÇAĞIRIYOR");
  assert.equal(getWarRoomBossAttackLabel("shockwave"), "ŞOK DALGASI");
  assert.equal(getWarRoomBossAttackDamage(13, "charge"), 17);
  assert.equal(getWarRoomBossAttackDamage(13, "shockwave"), 15);
  assert.equal(getWarRoomBossAttackDamage(13, "summon"), 0);
  assert.equal(getWarRoomBossAttackDamage(Number.NaN, "charge"), 0);
});

test("boss attack telegraphs start once, preserve their aim point, and follow cooldowns", () => {
  const boss = {
    hp: 66,
    maxHp: 100,
    nextShotAt: 1,
    bossAttack: null,
    bossAttackPhase: 1,
  };
  const first = updateWarRoomBossTelegraph(boss, "stone-courtyard", 5, { x: 2, z: 3 });
  assert.equal(first.phase, 2);
  assert.equal(first.attack, "charge");
  assert.equal(first.telegraphing, true);
  assert.equal(boss.nextShotAt, 6);

  const continued = updateWarRoomBossTelegraph(boss, "stone-courtyard", 5.4, { x: 20, z: 20 });
  assert.equal(continued.attack, "charge");
  assert.equal(boss.bossAttackStartedAt, 5);
  assert.equal(boss.bossAttackTargetX, 2);
  assert.equal(continued.telegraphing, true);

  boss.bossAttack = null;
  boss.nextShotAt = 9.5;
  assert.equal(
    updateWarRoomBossTelegraph(boss, "stone-courtyard", 8.49, { x: 4, z: 5 }).attack,
    null,
  );
  assert.equal(
    updateWarRoomBossTelegraph(boss, "stone-courtyard", 8.5, { x: 4, z: 5 }).attack,
    "charge",
  );
  assert.equal(boss.bossAttackTargetX, 4);

  boss.hp = 33;
  const finalPhase = updateWarRoomBossTelegraph(boss, "stone-courtyard", 9, { x: 7, z: 8 });
  assert.equal(finalPhase.phase, 3);
  assert.equal(finalPhase.attack, "shockwave");
  assert.equal(boss.nextShotAt, 10.25);
});

test("charge movement is delta-bounded and shockwaves are dodgeable", () => {
  assert.ok(Math.abs(getWarRoomBossChargeStep(1) - 1.008) < 1e-9);
  assert.equal(getWarRoomBossChargeStep(-1), 0);
  assert.equal(getWarRoomBossChargeStep(Number.NaN), 0);
  assert.ok(WAR_ROOM_BOSS_CHARGE_SECONDS >= 0.5);
  assert.equal(WAR_ROOM_BOSS_SUMMON_COUNT, 2);
  assert.equal(getWarRoomBossShockwaveHits(WAR_ROOM_BOSS_SHOCKWAVE_RADIUS, 0.5, false), true);
  assert.equal(getWarRoomBossShockwaveHits(WAR_ROOM_BOSS_SHOCKWAVE_RADIUS + 0.01, 0.5, false), false);
  assert.equal(getWarRoomBossShockwaveHits(2, 1.2, false), false);
  assert.equal(getWarRoomBossShockwaveHits(2, 0.5, true), false);
});

test("boss reinforcements spawn clear, weak, and within a strict match-only cap", () => {
  for (const map of WAR_ROOM_MAPS) {
    const runtime = createWarRoomRuntime(
      ["powder_rifle", "crossbow"],
      0,
      1,
      20261111,
      { mode: "raid", difficulty: "normal", modifiers: [], mapId: map.id },
    );
    const commander = runtime.enemies.find((enemy) => enemy.commander);
    assert.ok(commander);
    const startingProfile = runtime.player.hp;
    const startingCount = runtime.enemies.length;

    const firstWave = spawnWarRoomBossSummons(runtime, commander, 4);
    assert.equal(firstWave.length, 2, map.name);
    assert.ok(firstWave.every((enemy) => enemy.alive && enemy.hp < enemy.maxHp + 1));
    assert.ok(firstWave.every((enemy) => enemy.id.startsWith("commander-summon-")));
    assert.equal(runtime.player.hp, startingProfile);
    assert.equal(runtime.enemies.length, startingCount + 2);

    const secondWave = spawnWarRoomBossSummons(runtime, commander, 8);
    assert.equal(secondWave.length, 2, map.name);
    assert.equal(spawnWarRoomBossSummons(runtime, commander, 12).length, 0);
    assert.equal(runtime.bossSummonsUsed, 4);
  }
});
