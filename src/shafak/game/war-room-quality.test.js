import assert from "node:assert/strict";
import test from "node:test";
import {
  countOccupiedWarRoomDecals,
  countActiveWarRoomParticles,
  createWarRoomAdaptiveDprState,
  getWarRoomEffectCount,
  getWarRoomFrameStats,
  isWithinWarRoomDrawCallBudget,
  getWarRoomPoolLimits,
  getWarRoomPixelRatio,
  getWarRoomQualityProfile,
  isWarRoomAttackRunContinuous,
  sampleWarRoomAdaptiveDpr,
  WAR_ROOM_CONTINUOUS_ATTACK_MAX_GAP_MS,
  WAR_ROOM_PERFORMANCE_SAMPLE_MS,
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
  assert.ok(low.touchPixelRatioCap < medium.touchPixelRatioCap);
  assert.ok(medium.touchPixelRatioCap < high.touchPixelRatioCap);
  assert.equal(high.slashTrailSegments, WAR_ROOM_SLASH_TRAIL_SEGMENTS);
});

test("adaptive quality can lower touch-device DPR as well as desktop DPR", () => {
  assert.equal(getWarRoomPixelRatio("high", 3, true), 1);
  assert.equal(getWarRoomPixelRatio("balanced", 3, true), 0.9);
  assert.equal(getWarRoomPixelRatio("low", 3, true), 0.75);
  assert.equal(getWarRoomPixelRatio("low", 3, false), 1);
  assert.equal(getWarRoomPixelRatio("high", 1.25, false), 1.25);
});

test("the phase flag restores the unscaled quality profile when disabled", () => {
  assert.equal(getWarRoomQualityProfile("low", false).maxActiveParticles, getWarRoomQualityProfile("high").maxActiveParticles);
  assert.equal(getWarRoomEffectCount(6, "low", false), 6);
  assert.equal(getWarRoomPixelRatio("low", 3, true, false), 1);
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

test("War Room performance and pooled geometry stay within the requested fixed limits", () => {
  const limits = getWarRoomPoolLimits();
  assert.equal(WAR_ROOM_PERFORMANCE_SAMPLE_MS, 60_000);
  assert.ok(limits.particles <= 150);
  assert.ok(limits.decals <= 30);
  assert.ok(limits.slashTrailSegments <= 12);
});

test("continuous attack reporting rejects sparse or interrupted runs", () => {
  assert.equal(isWarRoomAttackRunContinuous(60, 900, 1_000), true);
  assert.equal(isWarRoomAttackRunContinuous(59, 900, 900), false);
  assert.equal(isWarRoomAttackRunContinuous(90, WAR_ROOM_CONTINUOUS_ATTACK_MAX_GAP_MS + 1, 900), false);
  assert.equal(isWarRoomAttackRunContinuous(90, 900, WAR_ROOM_CONTINUOUS_ATTACK_MAX_GAP_MS + 1), false);
  assert.equal(isWarRoomAttackRunContinuous(90, Number.NaN, 900), false);
});

test("debug frame stats report draw calls and unclamped frame rate safely", () => {
  assert.deepEqual(getWarRoomFrameStats(143, 1 / 60, 12_400), {
    drawCalls: 143,
    fps: 60,
    frameTimeMs: 1_000 / 60,
    triangles: 12_400,
  });
  assert.deepEqual(getWarRoomFrameStats(Number.NaN, 0), {
    drawCalls: 0,
    fps: 0,
    frameTimeMs: 0,
    triangles: 0,
  });
  assert.deepEqual(getWarRoomFrameStats(-4, -1, -1), {
    drawCalls: 0,
    fps: 0,
    frameTimeMs: 0,
    triangles: 0,
  });
  assert.equal(isWithinWarRoomDrawCallBudget(150), true);
  assert.equal(isWithinWarRoomDrawCallBudget(151), false);
  assert.equal(isWithinWarRoomDrawCallBudget(Number.NaN), false);
});

test("adaptive War Room DPR lowers after sustained slow frames and recovers gradually", () => {
  const state = createWarRoomAdaptiveDprState(1);
  assert.equal(sampleWarRoomAdaptiveDpr(state, 1, 24), 1);
  assert.equal(sampleWarRoomAdaptiveDpr(state, 1, 24), 0.9);
  assert.equal(sampleWarRoomAdaptiveDpr(state, 1, 24), 0.9);
  assert.equal(sampleWarRoomAdaptiveDpr(state, 1, 24), 0.8);
  assert.equal(sampleWarRoomAdaptiveDpr(state, 1, 16), 0.8);
  assert.equal(sampleWarRoomAdaptiveDpr(state, 1, 16), 0.8);
  assert.equal(sampleWarRoomAdaptiveDpr(state, 1, 16), 0.8);
  assert.equal(sampleWarRoomAdaptiveDpr(state, 1, 16), 0.85);
  assert.equal(sampleWarRoomAdaptiveDpr(state, 0.82, 10), 0.85);
  assert.equal(sampleWarRoomAdaptiveDpr(state, 0.82, 10), 0.85);
  assert.equal(sampleWarRoomAdaptiveDpr(state, 0.82, 10), 0.85);
  assert.equal(sampleWarRoomAdaptiveDpr(state, 0.82, 10), 0.82);
});

test("adaptive War Room DPR rejects invalid frame samples and respects its floor", () => {
  const state = createWarRoomAdaptiveDprState(0.75);
  assert.equal(sampleWarRoomAdaptiveDpr(state, 0.75, Number.NaN), 0.75);
  for (let index = 0; index < 80; index += 1) {
    sampleWarRoomAdaptiveDpr(state, 0.75, 40);
  }
  assert.equal(state.pixelRatio, 0.6);
  assert.equal(sampleWarRoomAdaptiveDpr(state, 0.75, 0), 0.6);
});

test("decal pool usage counts only occupied slots", () => {
  assert.equal(countOccupiedWarRoomDecals([
    { kind: null },
    { kind: "bullet" },
    { kind: "crack" },
  ]), 2);
});
