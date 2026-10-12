import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeWorldProbePixels,
  isLikelyBlackWorldFrame,
  shouldTriggerWorldBlackRecovery,
} from "./world-screen-probe.ts";

test("render-target probe distinguishes a uniform black frame from a visible scene", () => {
  const black = new Uint8Array(32 * 18 * 4);
  const scene = new Uint8Array(32 * 18 * 4);
  for (let index = 0; index < scene.length; index += 4) {
    scene[index] = index % 255;
    scene[index + 1] = (index * 3) % 255;
    scene[index + 2] = (index * 7) % 255;
    scene[index + 3] = 255;
  }
  assert.equal(isLikelyBlackWorldFrame(analyzeWorldProbePixels(black)), true);
  assert.equal(isLikelyBlackWorldFrame(analyzeWorldProbePixels(scene)), false);
});

test("black recovery requires five samples, a 20 second warm-up, and a visible short frame", () => {
  const state = { firstFrameAt: 1_000, blackSamples: 5, recentRecoveryAt: [] };
  const sample = { now: 20_999, frameMs: 16, hidden: false, black: true };
  assert.equal(shouldTriggerWorldBlackRecovery(state, sample), false);
  assert.equal(shouldTriggerWorldBlackRecovery(state, { ...sample, now: 21_000 }), true);
  assert.equal(shouldTriggerWorldBlackRecovery(state, { ...sample, now: 22_000, hidden: true }), false);
  assert.equal(shouldTriggerWorldBlackRecovery(state, { ...sample, now: 22_000, frameMs: 251 }), false);
});

test("automatic black recovery is limited to two stages per minute", () => {
  const state = { firstFrameAt: 0, blackSamples: 5, recentRecoveryAt: [] };
  assert.equal(shouldTriggerWorldBlackRecovery(state, { now: 20_000, frameMs: 16, hidden: false, black: true }), true);
  assert.equal(shouldTriggerWorldBlackRecovery(state, { now: 30_000, frameMs: 16, hidden: false, black: true }), true);
  assert.equal(shouldTriggerWorldBlackRecovery(state, { now: 40_000, frameMs: 16, hidden: false, black: true }), false);
  assert.equal(shouldTriggerWorldBlackRecovery(state, { now: 80_001, frameMs: 16, hidden: false, black: true }), true);
});
