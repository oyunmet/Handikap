import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomMeleeAssistYaw,
  getWarRoomMeleeAttackPlan,
  WAR_ROOM_HEAVY_ATTACK_HOLD_SECONDS,
  WAR_ROOM_MELEE_ASSIST_RADIANS,
} from "./war-room-combat-feel.ts";

test("a short press advances the three distinct light-combo swings", () => {
  const first = getWarRoomMeleeAttackPlan(0.1, 0);
  const second = getWarRoomMeleeAttackPlan(0.1, first.nextComboIndex);
  const third = getWarRoomMeleeAttackPlan(0.1, second.nextComboIndex);
  const fourth = getWarRoomMeleeAttackPlan(0.1, third.nextComboIndex);

  assert.deepEqual([first.comboIndex, second.comboIndex, third.comboIndex, fourth.comboIndex], [0, 1, 2, 0]);
  assert.deepEqual([first.heavy, second.heavy, third.heavy], [false, false, false]);
  assert.deepEqual([first.hitStopSeconds, second.hitStopSeconds, third.hitStopSeconds], [0.05, 0.05, 0.05]);
});

test("holding for 350 ms selects the heavy wind-up without exceeding the melee tuning envelope", () => {
  const justShort = getWarRoomMeleeAttackPlan(WAR_ROOM_HEAVY_ATTACK_HOLD_SECONDS - 0.001, 1);
  const heavy = getWarRoomMeleeAttackPlan(WAR_ROOM_HEAVY_ATTACK_HOLD_SECONDS, 1);

  assert.equal(justShort.heavy, false);
  assert.equal(heavy.heavy, true);
  assert.equal(heavy.hitStopSeconds, 0.09);
  assert.equal(heavy.staggerSeconds, 0.24);
  assert.ok(heavy.damageMultiplier <= 1.12);
  assert.ok(heavy.lungeMeters <= 0.6);
  assert.equal(heavy.nextComboIndex, 0);
});

test("combat-feel flag disables heavy attacks and aim assist without changing hit control", () => {
  const disabled = getWarRoomMeleeAttackPlan(1, 0, false);
  assert.equal(disabled.heavy, false);

  const target = { x: 0.2, z: -1, alive: true };
  const yaw = getWarRoomMeleeAssistYaw(0, 0, 0, [target], 2, () => false);
  assert.ok(Math.abs(yaw) <= WAR_ROOM_MELEE_ASSIST_RADIANS);
});

test("aim assist ignores dead, blocked, distant, and out-of-angle targets", () => {
  const yaw = getWarRoomMeleeAssistYaw(
    0,
    0,
    0,
    [
      { x: 0, z: -0.5, alive: true },
      { x: 0.1, z: -0.6, alive: true },
      { x: 0, z: -0.4, alive: false },
      { x: 4, z: -0.2, alive: true },
      { x: 1.5, z: -0.2, alive: true },
    ],
    1.5,
    (enemy) => enemy.z === -0.5,
  );

  assert.ok(yaw > 0);
  assert.ok(yaw <= WAR_ROOM_MELEE_ASSIST_RADIANS);
});

test("melee aim assist selects the nearest visible target inside its reach and 65-degree cone", () => {
  const blocked = { x: 0.1, z: -0.7, alive: true };
  const outOfRange = { x: 0, z: -1.8, alive: true };
  const valid = { x: 1.4, z: -0.8, alive: true };
  const yaw = getWarRoomMeleeAssistYaw(
    0,
    0,
    0,
    [
      blocked,
      { x: 0, z: -0.4, alive: false },
      outOfRange,
      { x: 1.8, z: -0.1, alive: true },
      valid,
    ],
    1.4,
    (enemy) => enemy === blocked,
  );

  assert.ok(Math.abs(yaw - Math.atan2(valid.x, -valid.z)) < 1e-9);
});
