import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomImpactFxProfile,
  WAR_ROOM_DECAL_POOL_SIZE,
  WAR_ROOM_EFFECT_POOL_LIMIT,
  WAR_ROOM_EFFECT_POOL_SIZE,
  WAR_ROOM_SLASH_TRAIL_SEGMENTS,
} from "./war-room-fx.ts";

test("War Room visual effects stay inside the shared pool budgets", () => {
  assert.ok(WAR_ROOM_EFFECT_POOL_SIZE <= WAR_ROOM_EFFECT_POOL_LIMIT);
  assert.equal(WAR_ROOM_DECAL_POOL_SIZE, 30);
  assert.ok(WAR_ROOM_SLASH_TRAIL_SEGMENTS >= 8 && WAR_ROOM_SLASH_TRAIL_SEGMENTS <= 12);
});

test("impact feedback uses restrained blood by default and substitutes sparks when disabled", () => {
  assert.deepEqual(getWarRoomImpactFxProfile(true, false), {
    bloodParticles: 2,
    sparkParticles: 3,
    dustParticles: 3,
    shockwave: false,
    crackDecal: false,
  });
  assert.deepEqual(getWarRoomImpactFxProfile(false, true), {
    bloodParticles: 0,
    sparkParticles: 5,
    dustParticles: 3,
    shockwave: true,
    crackDecal: true,
  });
});
