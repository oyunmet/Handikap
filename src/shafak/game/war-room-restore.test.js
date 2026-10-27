import assert from "node:assert/strict";
import test from "node:test";
import { WAR_ROOM_BLOCKERS, WAR_ROOM_HALF_SIZE } from "./war-room-data.ts";
import { getWarRoomSoundProfile } from "./war-room-audio.ts";
import {
  RESTORE_CONFIG,
  advanceWarRoomPassiveRegen,
  applyWarRoomKillHeal,
  collectWarRoomHealingPoint,
  createWarRoomHealingPoints,
} from "./war-room-restore.ts";

function player(overrides = {}) {
  return {
    hp: 40,
    maxHp: 220,
    lastDamageAt: 0,
    lastCombatAt: 0,
    ...overrides,
  };
}

test("restore config defaults on and defines the requested player-only rates", () => {
  assert.equal(RESTORE_CONFIG.enabled, true);
  assert.deepEqual(RESTORE_CONFIG.passive, {
    delaySeconds: 6,
    hpPerSecond: 2,
    maxHealthRatio: 0.6,
  });
  assert.equal(RESTORE_CONFIG.healingPoints.length, 4);
  assert.equal(RESTORE_CONFIG.pickup.respawnSeconds, 45);
});

test("the restore config switch disables passive, kill, and pickup healing", () => {
  const disabledConfig = { ...RESTORE_CONFIG, enabled: false };
  const target = player();
  const points = createWarRoomHealingPoints(0, disabledConfig);

  assert.equal(advanceWarRoomPassiveRegen(target, 10, 2, disabledConfig).active, false);
  assert.equal(target.hp, 40);
  assert.equal(applyWarRoomKillHeal(target, false, disabledConfig), 0);
  assert.equal(collectWarRoomHealingPoint(
    points,
    target,
    points[0].x,
    points[0].z,
    0,
    disabledConfig,
  ).point, null);
  assert.equal(target.hp, 40);
});

test("healing points are reachable and do not overlap the arena blockers", () => {
  for (const point of RESTORE_CONFIG.healingPoints) {
    assert.ok(Math.abs(point.x) < WAR_ROOM_HALF_SIZE - 2);
    assert.ok(Math.abs(point.z) < WAR_ROOM_HALF_SIZE - 2);
    for (const blocker of WAR_ROOM_BLOCKERS) {
      const closestX = Math.max(blocker.x - blocker.width / 2, Math.min(blocker.x + blocker.width / 2, point.x));
      const closestZ = Math.max(blocker.z - blocker.depth / 2, Math.min(blocker.z + blocker.depth / 2, point.z));
      assert.ok(Math.hypot(point.x - closestX, point.z - closestZ) > 0.45, `${point.id} overlaps a blocker`);
    }
  }
});

test("passive healing waits six seconds after damage and then restores two HP per second", () => {
  const target = player();
  const waiting = advanceWarRoomPassiveRegen(target, 5.75, 1);
  assert.equal(target.hp, 40);
  assert.equal(waiting.active, false);
  assert.ok(Math.abs(waiting.secondsUntilReady - 0.25) < 1e-9);

  const active = advanceWarRoomPassiveRegen(target, 6, 1);
  assert.equal(target.hp, 42);
  assert.equal(active.active, true);
});

test("passive healing stops at sixty percent of maximum HP", () => {
  const target = player({ hp: 131 });
  advanceWarRoomPassiveRegen(target, 6, 4);
  assert.equal(target.hp, 132);
});

test("recent outgoing combat and damage each hold passive healing for six seconds", () => {
  const target = player({ lastDamageAt: 4, lastCombatAt: 5 });
  const waiting = advanceWarRoomPassiveRegen(target, 10, 1);
  assert.equal(target.hp, 40);
  assert.equal(waiting.secondsUntilReady, 1);

  const active = advanceWarRoomPassiveRegen(target, 11, 1);
  assert.equal(target.hp, 42);
  assert.equal(active.active, true);
});

test("normal and commander kills heal the configured amount without exceeding maximum HP", () => {
  const target = player();
  assert.equal(applyWarRoomKillHeal(target, false), 11);
  assert.equal(applyWarRoomKillHeal(target, true), 33);
  target.hp = 215;
  assert.equal(applyWarRoomKillHeal(target, true), 5);
  assert.equal(target.hp, target.maxHp);

  const lowHealthCap = player({ hp: 10, maxHp: 80 });
  assert.equal(applyWarRoomKillHeal(lowHealthCap, false), 6);
});

test("healing points grant 25 percent HP, then become available again after 45 seconds", () => {
  const points = createWarRoomHealingPoints(0);
  const target = player({ hp: 20 });
  const point = points[0];
  assert.ok(point);

  const firstPickup = collectWarRoomHealingPoint(points, target, point.x, point.z, 0);
  assert.equal(firstPickup.healed, 55);
  assert.equal(target.hp, 75);
  assert.equal(point.availableAt, 45);

  target.hp = 20;
  assert.equal(collectWarRoomHealingPoint(points, target, point.x, point.z, 44.99).point, null);
  const respawnedPickup = collectWarRoomHealingPoint(points, target, point.x, point.z, 45);
  assert.equal(respawnedPickup.healed, 55);
  assert.equal(point.availableAt, 90);
});

test("a healing point is not consumed when the player is already at full health", () => {
  const points = createWarRoomHealingPoints(0);
  const target = player({ hp: 220 });
  const point = points[0];
  assert.ok(point);
  const pickup = collectWarRoomHealingPoint(points, target, point.x, point.z, 0);
  assert.equal(pickup.point, null);
  assert.equal(point.availableAt, 0);
});

test("the pickup cue has a distinct two-pulse healing sound", () => {
  const sound = getWarRoomSoundProfile("healing-pickup");
  assert.equal(sound.pulses, 2);
  assert.equal(sound.toneType, "sine");
});
