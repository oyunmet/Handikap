import assert from "node:assert/strict";
import test from "node:test";
import {
  countActiveWarRoomParticles,
  getWarRoomEffectCount,
  getWarRoomQualityProfile,
} from "./war-room-quality.ts";
import {
  WAR_ROOM_EFFECT_POOL_LIMIT,
  WAR_ROOM_EFFECT_POOL_SIZE,
  WAR_ROOM_SLASH_TRAIL_SEGMENTS,
} from "./war-room-fx.ts";

test("quality tiers reduce emissions, live particle cap, trail length, and DPR", () => {
  const low = getWarRoomQualityProfile("low");
  const medium = getWarRoomQualityProfile("balanced");
  const high = getWarRoomQualityProfile("high");

  assert.ok(low.particleMultiplier < medium.particleMultiplier);
  assert.ok(medium.particleMultiplier < high.particleMultiplier);
  assert.ok(low.maxActiveParticles < medium.maxActiveParticles);
  assert.ok(medium.maxActiveParticles < high.maxActiveParticles);
  assert.ok(low.slashTrailSegments < medium.slashTrailSegments);
  assert.ok(medium.slashTrailSegments < high.slashTrailSegments);
  assert.ok(low.pixelRatioCap < medium.pixelRatioCap);
  assert.ok(medium.pixelRatioCap < high.pixelRatioCap);
  assert.equal(high.slashTrailSegments, WAR_ROOM_SLASH_TRAIL_SEGMENTS);
});

test("quality-scaled particles remain within the fixed shared pool budget", () => {
  for (const quality of ["low", "balanced", "high"]) {
    const profile = getWarRoomQualityProfile(quality);
    assert.ok(profile.maxActiveParticles <= WAR_ROOM_EFFECT_POOL_SIZE);
    assert.ok(profile.maxActiveParticles <= WAR_ROOM_EFFECT_POOL_LIMIT);
    assert.ok(getWarRoomEffectCount(20, quality) <= profile.maxActiveParticles);
  }
  assert.equal(WAR_ROOM_EFFECT_POOL_SIZE, 72);
  assert.equal(WAR_ROOM_EFFECT_POOL_LIMIT, 150);
});

test("low quality can suppress small effects without creating negative counts", () => {
  assert.equal(getWarRoomEffectCount(1, "low"), 0);
  assert.equal(getWarRoomEffectCount(1, "balanced"), 1);
  assert.equal(getWarRoomEffectCount(3, "high"), 3);
  assert.equal(getWarRoomEffectCount(-1, "high"), 0);
  assert.equal(getWarRoomEffectCount(Number.NaN, "high"), 0);
});

test("particle pool usage counts only live fixed-pool entries", () => {
  const particles = [
    { born: 9.8, lifetime: 0.5 },
    { born: 9.2, lifetime: 0.5 },
    { born: -1, lifetime: 1 },
  ];

  assert.equal(countActiveWarRoomParticles(particles, 10), 1);
  assert.equal(countActiveWarRoomParticles(particles, 11), 0);
});
