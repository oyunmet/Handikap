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

test("does not mistake a varied dark world scene for an empty frame", () => {
  const pixels = new Uint8Array(8 * 4 * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    const sample = index / 4;
    pixels[index] = 28 + sample * 2;
    pixels[index + 1] = 26 + sample;
    pixels[index + 2] = 38 + sample * 2;
    pixels[index + 3] = 255;
  }

  const metrics = analyzeWorldProbePixels(pixels);
  assert.ok(metrics.averageLuminance > 0.018);
  assert.equal(isLikelyBlackWorldFrame(metrics), false);
  assert.equal(shouldRecoverWorldFrame(metrics, 12), false);
});

test("recovers a clear-color-only scene with a few visible details", () => {
  const pixels = new Uint8Array(8 * 4 * 4);
  for (let index = 0; index < 32; index += 1) {
    const pixel = index * 4;
    if (index < 27) {
      pixels[pixel] = 37;
      pixels[pixel + 1] = 35;
      pixels[pixel + 2] = 48;
    } else {
      pixels[pixel] = 160 + (index - 27) * 12;
      pixels[pixel + 1] = 100;
      pixels[pixel + 2] = 70;
    }
    pixels[pixel + 3] = 255;
  }

  const metrics = analyzeWorldProbePixels(pixels);
  assert.ok(metrics.averageLuminance > 0.07);
  assert.ok(metrics.dominantColorRatio >= 0.75);
  assert.equal(shouldRecoverWorldFrame(metrics, 440), true);
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

test("recovers a mostly black frame even when a few visible details add color variation", () => {
  const pixels = new Uint8Array(8 * 4 * 4);
  for (let index = 0; index < 32; index += 1) {
    const pixel = index * 4;
    if (index < 24) {
      pixels[pixel] = 16;
      pixels[pixel + 1] = 12;
      pixels[pixel + 2] = 10;
    } else {
      const detail = index - 23;
      pixels[pixel] = 32 + detail * 16;
    }
    pixels[pixel + 3] = 255;
  }

  const metrics = analyzeWorldProbePixels(pixels);
  assert.ok(metrics.uniqueColors > 8);
  assert.ok(metrics.darkPixelRatio >= 0.75);
  assert.ok(metrics.averageLuminance < 0.12);
  assert.equal(isLikelyBlackWorldFrame(metrics), true);
  assert.equal(shouldRecoverWorldFrame(metrics, 12), true);
});

test("rejects malformed pixel buffers", () => {
  const metrics = analyzeWorldProbePixels(new Uint8Array([0, 0, 0]));
  assert.deepEqual(metrics, { averageLuminance: 0, uniqueColors: 0, darkPixelRatio: 0, dominantColorRatio: 0 });
  assert.equal(isLikelyBlackWorldFrame(metrics), false);
});

test("recovers a uniform clear-color frame even when draw calls are reported", () => {
  const metrics = { averageLuminance: 0.14, uniqueColors: 1, darkPixelRatio: 0, dominantColorRatio: 1 };
  assert.equal(shouldRecoverWorldFrame(metrics, 0), true);
  assert.equal(shouldRecoverWorldFrame(metrics, 12), true);
});

test("recovers near-black output even when draw calls are present", () => {
  const metrics = { averageLuminance: 0.05, uniqueColors: 2, darkPixelRatio: 1, dominantColorRatio: 0.94 };
  assert.equal(shouldRecoverWorldFrame(metrics, 12), true);
});
