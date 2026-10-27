import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomImpactFxProfile,
  WAR_ROOM_CRACK_DECAL_LIFETIME_SECONDS,
  WAR_ROOM_DECAL_POOL_SIZE,
  WAR_ROOM_EFFECT_POOL_LIMIT,
  WAR_ROOM_EFFECT_POOL_SIZE,
  WAR_ROOM_SLASH_TRAIL_SEGMENTS,
} from "./war-room-fx.ts";

test("War Room visual effects stay inside the shared pool budgets", () => {
  assert.ok(WAR_ROOM_EFFECT_POOL_SIZE <= WAR_ROOM_EFFECT_POOL_LIMIT);
  assert.equal(WAR_ROOM_DECAL_POOL_SIZE, 30);
  assert.ok(WAR_ROOM_SLASH_TRAIL_SEGMENTS >= 8 && WAR_ROOM_SLASH_TRAIL_SEGMENTS <= 12);
  assert.ok(WAR_ROOM_CRACK_DECAL_LIFETIME_SECONDS > 0 && WAR_ROOM_CRACK_DECAL_LIFETIME_SECONDS <= 3);
});

test("weapon impact profiles retain visible effects while blood is disabled", () => {
  assert.deepEqual(getWarRoomImpactFxProfile(true, false), {
    impactType: "BIÇAK KESİĞİ",
    trailStyle: "slash",
    trailColor: "#d6f5ff",
    trailIntensity: 1,
    bloodParticles: 2,
    sparkParticles: 4,
    dustParticles: 1,
    flashParticles: 3,
    exitSplashParticles: 0,
    sparkColor: "#d6f5ff",
    dustColor: "#b8a997",
    flashColor: "#ff936e",
    dustRing: false,
    shockwave: false,
    crackDecal: false,
  });
  assert.deepEqual(getWarRoomImpactFxProfile(false, true), {
    impactType: "BIÇAK KESİĞİ",
    trailStyle: "slash",
    trailColor: "#d6f5ff",
    trailIntensity: 1,
    bloodParticles: 0,
    sparkParticles: 5,
    dustParticles: 2,
    flashParticles: 4,
    exitSplashParticles: 0,
    sparkColor: "#d6f5ff",
    dustColor: "#b8a997",
    flashColor: "#ff936e",
    dustRing: false,
    shockwave: false,
    crackDecal: false,
  });
  assert.deepEqual(getWarRoomImpactFxProfile(true, false, "metal"), {
    impactType: "BIÇAK KESİĞİ",
    trailStyle: "slash",
    trailColor: "#d6f5ff",
    trailIntensity: 1,
    bloodParticles: 0,
    sparkParticles: 6,
    dustParticles: 1,
    flashParticles: 3,
    exitSplashParticles: 0,
    sparkColor: "#ffe3a0",
    dustColor: "#b8a997",
    flashColor: "#ff936e",
    dustRing: false,
    shockwave: false,
    crackDecal: false,
  });
  assert.deepEqual(getWarRoomImpactFxProfile(true, false, "stone"), {
    impactType: "BIÇAK KESİĞİ",
    trailStyle: "slash",
    trailColor: "#d6f5ff",
    trailIntensity: 1,
    bloodParticles: 0,
    sparkParticles: 0,
    dustParticles: 6,
    flashParticles: 3,
    exitSplashParticles: 0,
    sparkColor: "#d6f5ff",
    dustColor: "#bfb6a5",
    flashColor: "#ff936e",
    dustRing: true,
    shockwave: false,
    crackDecal: false,
  });
});

test("blunt weapons use dust and impact rings without cuts or blood", () => {
  for (const weaponId of ["melee_cudgel", "melee_staff"]) {
    const impact = getWarRoomImpactFxProfile(true, true, "flesh", weaponId);
    assert.equal(impact.bloodParticles, 0);
    assert.equal(impact.sparkParticles, 0);
    assert.ok(impact.dustParticles > 0);
    assert.equal(impact.dustRing, true);
    assert.equal(impact.shockwave, true);
    assert.equal(impact.crackDecal, false);
    assert.equal(impact.trailStyle, "sweep");
  }
});

test("weapon classes select distinct trails, impact effects, and heavy decals", () => {
  const spear = getWarRoomImpactFxProfile(false, false, "flesh", "melee_war_spear");
  const axe = getWarRoomImpactFxProfile(false, true, "flesh", "melee_axe");
  const shovel = getWarRoomImpactFxProfile(true, false, "flesh", "melee_shovel");
  const pickaxe = getWarRoomImpactFxProfile(false, true, "metal", "melee_pickaxe");

  assert.equal(spear.trailStyle, "thrust");
  assert.ok(spear.flashParticles >= 5);
  assert.ok(spear.exitSplashParticles >= 3);
  assert.equal(spear.bloodParticles, 0);
  assert.equal(axe.crackDecal, true);
  assert.equal(shovel.dustRing, true);
  assert.equal(shovel.bloodParticles, 0);
  assert.equal(pickaxe.sparkColor, "#ffe3a0");
  assert.equal(pickaxe.crackDecal, true);
});
