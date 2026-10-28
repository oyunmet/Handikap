import assert from "node:assert/strict";
import test from "node:test";
import {
  DUEL_DEATH_PARTICLE_COUNT,
  DUEL_ARENA_AMBIENT_PARTICLE_COUNT,
  DUEL_HIT_SPARK_COUNT,
  LIGHTNING_BOLT_COUNT,
  LIGHTNING_SEGMENT_COUNT,
  MAX_DUEL_BURN_DECALS,
  MAX_ACTIVE_DUEL_PARTICLES,
  MAX_ACTIVE_DUEL_VFX,
  MAX_DUEL_VFX_EVENT_PARTICLES,
  getDuelVfxKind,
} from "./duel-vfx.ts";

test("each combat event selects its matching readable arena effect", () => {
  assert.equal(getDuelVfxKind({ type: "skill", attack: "skillOne" }), "fireball");
  assert.equal(getDuelVfxKind({ type: "skill", attack: "skillTwo" }), "lightning");
  assert.equal(getDuelVfxKind({ type: "plungeLand" }), "plungeLanding");
  assert.equal(getDuelVfxKind({ type: "block" }), "shield");
  assert.equal(getDuelVfxKind({ type: "parry" }), "shield");
  assert.equal(getDuelVfxKind({ type: "dodge" }), "afterimage");
  assert.equal(getDuelVfxKind({ type: "backflip" }), "afterimage");
  assert.equal(getDuelVfxKind({ type: "hit" }), "shockwave");
  assert.equal(getDuelVfxKind({ type: "hit", plunge: true }), "plunge");
  assert.equal(getDuelVfxKind({ type: "weaponTrail" }), "weaponTrail");
  assert.equal(getDuelVfxKind({ type: "projectile" }), "arrow");
  assert.equal(getDuelVfxKind({ type: "coverBlock" }), "coverBlock");
  assert.equal(getDuelVfxKind({ type: "knockout" }), "shockwave");
});

test("bounded duel effects, arena ash, hit sparks, and finisher ash stay below 150 mobile particles", () => {
  assert.equal(MAX_DUEL_BURN_DECALS, 30);
  assert.equal(
    MAX_DUEL_VFX_EVENT_PARTICLES,
    Math.max(LIGHTNING_BOLT_COUNT * LIGHTNING_SEGMENT_COUNT, DUEL_HIT_SPARK_COUNT),
  );
  assert.equal(
    MAX_ACTIVE_DUEL_PARTICLES,
    MAX_ACTIVE_DUEL_VFX * MAX_DUEL_VFX_EVENT_PARTICLES
      + DUEL_DEATH_PARTICLE_COUNT
      + DUEL_ARENA_AMBIENT_PARTICLE_COUNT,
  );
  assert.ok(MAX_ACTIVE_DUEL_PARTICLES <= 150);
});
