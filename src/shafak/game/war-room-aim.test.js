import assert from "node:assert/strict";
import test from "node:test";
import { applyWarRoomDamage, createWarRoomRuntime } from "./war-room-engine.ts";
import {
  getWarRoomMeleeEffectiveReach,
  traceWarRoomMeleeCone,
  traceWarRoomMeleeRay,
  traceWarRoomRay,
} from "./war-room-aim.ts";
import { segmentBlockFraction } from "./war-room-engine.ts";

test("camera rays acquire all nine War Room enemy capsules and repeated hits kill them", () => {
  const targets = createWarRoomRuntime(["powder_rifle", "crossbow"]).enemies;
  assert.equal(targets.length, 9);

  for (const target of targets) {
    const height = 1.92 * (target.commander ? 1.3 : 1);
    const origin = { x: target.x, y: height * 0.55, z: target.z + 3 };
    const hit = traceWarRoomRay(origin, { x: 0, y: 0, z: -1 }, [target], 20);
    assert.equal(hit.target, target, `${target.name} should be hit by a centered camera ray`);
    assert.equal(hit.headshot, false);

    let hits = 0;
    while (target.hp > 0 && hits < 30) {
      applyWarRoomDamage(target, 19);
      hits += 1;
    }
    assert.equal(target.hp, 0, `${target.name} should die after repeated successful hits`);
    assert.ok(hits > 0);
  }
});

test("the upper twenty percent is the headshot region", () => {
  const target = { x: 0, z: 0, alive: true, commander: false };
  const head = traceWarRoomRay(
    { x: 0, y: 1.75, z: 3 },
    { x: 0, y: 0, z: -1 },
    [target],
    10,
  );
  const body = traceWarRoomRay(
    { x: 0, y: 1.25, z: 3 },
    { x: 0, y: 0, z: -1 },
    [target],
    10,
  );
  assert.equal(head.target, target);
  assert.equal(head.headshot, true);
  assert.equal(body.target, target);
  assert.equal(body.headshot, false);
});

test("aim traces an enemy at its elevated floor instead of the ground floor", () => {
  const target = { x: 0, z: 0, alive: true, commander: false, floorHeight: 3 };
  const groundRay = traceWarRoomRay(
    { x: 0, y: 1.2, z: 3 },
    { x: 0, y: 0, z: -1 },
    [target],
    10,
  );
  const upperFloorRay = traceWarRoomRay(
    { x: 0, y: 4.1, z: 3 },
    { x: 0, y: 0, z: -1 },
    [target],
    10,
  );
  assert.equal(groundRay.target, null);
  assert.equal(upperFloorRay.target, target);
  assert.equal(upperFloorRay.headshot, false);
});

test("a wall or cover hit before the capsule blocks damage", () => {
  const target = { x: 0, z: 0, alive: true, commander: false };
  const blocked = traceWarRoomRay(
    { x: 0, y: 1, z: 10 },
    { x: 0, y: 0, z: -1 },
    [target],
    20,
    0.25,
  );
  assert.equal(blocked.target, null);
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.point.z, 5);
});

test("a camera ray into the real central cover hits the cover before the enemy", () => {
  const target = { x: 1, z: -10, alive: true, commander: false };
  const origin = { x: 1, y: 1, z: 5 };
  const end = { x: 1, y: 1, z: -15 };
  const blockedAt = segmentBlockFraction(origin, end);
  assert.notEqual(blockedAt, null);
  const hit = traceWarRoomRay(origin, { x: 0, y: 0, z: -1 }, [target], 20, blockedAt);
  assert.equal(hit.target, null);
  assert.equal(hit.blocked, true);
  assert.ok(hit.point.z > target.z);
});

test("the player's own model is ignored because only enemy targets are traced", () => {
  const miss = traceWarRoomRay(
    { x: 0, y: 1.5, z: 3 },
    { x: 0, y: 0, z: -1 },
    [],
    20,
  );
  assert.equal(miss.target, null);
  assert.equal(miss.blocked, false);
});

test("melee uses a short forward sweep, respects its range, and is blocked by cover", () => {
  const target = { x: 0, z: -1.6, y: 1, hp: 43, maxHp: 43, alive: true, commander: false };
  const hit = traceWarRoomMeleeRay(
    { x: 0, y: 1.1, z: 0 },
    { x: 0, y: 0, z: -1 },
    [target],
    1.8,
  );
  assert.equal(hit.target, target);
  assert.deepEqual(applyWarRoomDamage(hit.target, 24), { damage: 24, killed: false });
  assert.equal(target.hp, 19);

  const outOfRange = traceWarRoomMeleeRay(
    { x: 0, y: 1.1, z: 0 },
    { x: 0, y: 0, z: -1 },
    [{ ...target, z: -3.5 }],
    1.8,
  );
  assert.equal(outOfRange.target, null);
  assert.equal(target.hp, 19, "a miss must not change enemy health");

  const blocked = traceWarRoomMeleeRay(
    { x: 0, y: 1.1, z: 5 },
    { x: 0, y: 0, z: -1 },
    [{ ...target, z: -3 }],
    3,
    0.5,
  );
  assert.equal(blocked.target, null);
  assert.equal(blocked.blocked, true);
});

test("character-facing melee cone hits the nearest target within range", () => {
  const near = { id: "near", x: 0, z: -1.45, alive: true, commander: false };
  const far = { id: "far", x: 0, z: -1.9, alive: true, commander: false };
  const result = traceWarRoomMeleeCone({ x: 0, z: 0 }, { x: 0, z: -1 }, [far, near], 1.8);
  assert.equal(result.target, near);
  assert.equal(result.targetIndex, 1);
  assert.equal(result.reason, "hit");
});

test("character-facing melee cone reports range and angle misses independently", () => {
  const outsideRange = traceWarRoomMeleeCone(
    { x: 0, z: 0 },
    { x: 0, z: -1 },
    [{ x: 0, z: -3.2, alive: true, commander: false }],
    1.8,
  );
  assert.equal(outsideRange.target, null);
  assert.equal(outsideRange.reason, "range");

  const outsideAngle = traceWarRoomMeleeCone(
    { x: 0, z: 0 },
    { x: 0, z: -1 },
    [{ x: 1.7, z: -0.8, alive: true, commander: false }],
    2,
  );
  assert.equal(outsideAngle.target, null);
  assert.equal(outsideAngle.reason, "angle");
});

test("melee targeting skips nearby corpses and does not invent a target when only dead enemies remain", () => {
  const corpse = { id: "corpse", x: 0, z: -0.65, alive: false, commander: false };
  const livingEnemy = { id: "living", x: 0, z: -1.45, alive: true, commander: false };
  const result = traceWarRoomMeleeCone(
    { x: 0, z: 0 },
    { x: 0, z: -1 },
    [corpse, livingEnemy],
    1.8,
  );
  assert.equal(result.target, livingEnemy);

  const noTarget = traceWarRoomMeleeCone(
    { x: 0, z: 0 },
    { x: 0, z: -1 },
    [corpse],
    1.8,
  );
  assert.equal(noTarget.target, null);
  assert.equal(noTarget.reason, "no-target");
});

test("character-facing melee cone ignores targets behind blockers", () => {
  const origin = { x: 1, y: 1.1, z: 5 };
  const target = { x: 1, z: -10, alive: true, commander: false };
  const blockedFraction = segmentBlockFraction(origin, { x: target.x, y: 1.05, z: target.z }, 0.08);
  assert.notEqual(blockedFraction, null);
  const blocked = traceWarRoomMeleeCone(
    { x: origin.x, z: origin.z },
    { x: 0, z: -1 },
    [target],
    20,
    50,
    () => segmentBlockFraction(origin, { x: target.x, y: 1.05, z: target.z }, 0.08) !== null,
  );
  assert.equal(blocked.target, null);
  assert.equal(blocked.reason, "blocked");
});

test("spear reach includes the 0.4 m tolerance without changing other weapon reach", () => {
  assert.ok(Math.abs(getWarRoomMeleeEffectiveReach("melee_spear", 2.6) - 3) < 1e-9);
  assert.ok(Math.abs(getWarRoomMeleeEffectiveReach("melee_war_spear", 3.05, 0.12) - 3.57) < 1e-9);
  assert.ok(Math.abs(getWarRoomMeleeEffectiveReach("melee_axe", 2, 0.12) - 2.12) < 1e-9);
});

test("melee cone misses report the nearest candidate's angle and surface distance", () => {
  const result = traceWarRoomMeleeCone(
    { x: 0, z: 0 },
    { x: 0, z: -1 },
    [{ x: 1, z: -0.8, alive: true, commander: false }],
    3,
    50,
  );
  assert.equal(result.reason, "angle");
  assert.ok(result.angleDegrees !== null && result.angleDegrees > 50 && result.angleDegrees < 52);
  assert.ok(result.distance > 0 && result.distance < 3);
});
