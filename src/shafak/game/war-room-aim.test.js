import assert from "node:assert/strict";
import test from "node:test";
import { applyWarRoomDamage, createWarRoomRuntime } from "./war-room-engine.ts";
import { traceWarRoomRay } from "./war-room-aim.ts";
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
