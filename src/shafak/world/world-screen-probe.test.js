import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeWorldProbePixels,
  isLikelyBlackWorldFrame,
  shouldRecoverWorldFrame,
} from "./world-screen-probe.ts";

test("detects a genuinely black WebGL frame", () => {
  const pixels = new Uint8Array(8 * 4 * 4);
  for (let index = 3; index < pixels.length; index += 4) pixels[index] = 255;

  const metrics = analyzeWorldProbePixels(pixels);
  assert.equal(metrics.averageLuminance, 0);
  assert.equal(isLikelyBlackWorldFrame(metrics), true);
});

test("does not mistake the dark world background for a black frame", () => {
  const pixels = new Uint8Array(8 * 4 * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 37;
    pixels[index + 1] = 35;
    pixels[index + 2] = 48;
    pixels[index + 3] = 255;
  }

  const metrics = analyzeWorldProbePixels(pixels);
  assert.ok(metrics.averageLuminance > 0.018);
  assert.equal(isLikelyBlackWorldFrame(metrics), false);
});

test("recovers from a uniform near-black frame that is darker than the world sky", () => {
  const pixels = new Uint8Array(8 * 4 * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 16;
    pixels[index + 1] = 12;
    pixels[index + 2] = 10;
    pixels[index + 3] = 255;
  }

  const metrics = analyzeWorldProbePixels(pixels);
  assert.ok(metrics.averageLuminance > 0.018);
  assert.ok(metrics.averageLuminance < 0.07);
  assert.equal(isLikelyBlackWorldFrame(metrics), true);
});

test("rejects malformed pixel buffers", () => {
  const metrics = analyzeWorldProbePixels(new Uint8Array([0, 0, 0]));
  assert.deepEqual(metrics, { averageLuminance: 0, uniqueColors: 0 });
  assert.equal(isLikelyBlackWorldFrame(metrics), false);
});

test("recovers when the scene has no draw calls even if its clear color is visible", () => {
  const metrics = { averageLuminance: 0.14, uniqueColors: 1 };
  assert.equal(shouldRecoverWorldFrame(metrics, 0), true);
  assert.equal(shouldRecoverWorldFrame(metrics, 12), false);
});

test("recovers near-black output even when draw calls are present", () => {
  const metrics = { averageLuminance: 0.05, uniqueColors: 2 };
  assert.equal(shouldRecoverWorldFrame(metrics, 12), true);
});
