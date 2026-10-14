import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeWorldProbePixels,
  getWorldProbeSamplePoints,
  getWorldProbeTargetSize,
  getWorldDrawCallsForFrame,
  isLikelyBlackWorldFrame,
  shouldRecoverCanvasFrame,
  shouldRecoverWorldFrame,
} from "./world-screen-probe.ts";

test("manual rendering checks draw calls after submitting the scene", () => {
  assert.equal(getWorldDrawCallsForFrame(true, 0, 440), 440);
});

test("automatic rendering keeps the completed previous-frame draw count", () => {
  assert.equal(getWorldDrawCallsForFrame(false, 440, 0), 440);
});

test("scene probe size preserves the canvas aspect ratio at a useful resolution", () => {
  const portrait = getWorldProbeTargetSize(390, 844);
  const landscape = getWorldProbeTargetSize(1024, 442);
  assert.equal(portrait.width, 22);
  assert.equal(portrait.height, 48);
  assert.ok(Math.abs((portrait.width / portrait.height) / (390 / 844) - 1) < 0.02);
  assert.ok(Math.abs((landscape.width / landscape.height) / (1024 / 442) - 1) < 0.02);
  assert.deepEqual(getWorldProbeTargetSize(0, 100), { width: 0, height: 0 });
});

test("final-output samples cover the full viewport instead of one dark center crop", () => {
  const points = getWorldProbeSamplePoints(400, 800, 4, 4);
  assert.equal(points.length, 16);
  assert.equal(Math.min(...points.map(({ x }) => x)), 50);
  assert.equal(Math.max(...points.map(({ x }) => x)), 350);
  assert.equal(Math.min(...points.map(({ y }) => y)), 100);
  assert.equal(Math.max(...points.map(({ y }) => y)), 700);
  assert.deepEqual(getWorldProbeSamplePoints(0, 800), []);
});

test("detects a genuinely black WebGL frame", () => {
  const pixels = new Uint8Array(8 * 4 * 4);
  for (let index = 3; index < pixels.length; index += 4) pixels[index] = 255;

  const metrics = analyzeWorldProbePixels(pixels);
  assert.equal(metrics.averageLuminance, 0);
  assert.equal(isLikelyBlackWorldFrame(metrics), true);
});

test("linear render-target colors are converted before black-frame thresholds", () => {
  const srgbPixels = new Uint8Array(16 * 4);
  const linearPixels = new Uint8Array(16 * 4);
  for (let index = 0; index < 16; index += 1) {
    const offset = index * 4;
    const color = index < 12 ? [37, 35, 48] : [64, 56, 59];
    srgbPixels.set([...color, 255], offset);
    for (let channel = 0; channel < 3; channel += 1) {
      const srgb = color[channel] / 255;
      const linear = srgb <= 0.04045
        ? srgb / 12.92
        : ((srgb + 0.055) / 1.055) ** 2.4;
      linearPixels[offset + channel] = Math.round(linear * 255);
    }
    linearPixels[offset + 3] = 255;
  }

  const screenMetrics = analyzeWorldProbePixels(srgbPixels);
  const targetMetrics = analyzeWorldProbePixels(linearPixels, "linear");
  assert.ok(Math.abs(targetMetrics.averageLuminance - screenMetrics.averageLuminance) < 0.005);
  assert.equal(isLikelyBlackWorldFrame(targetMetrics), false);
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

test("does not treat a small clear-color canvas crop as an empty whole scene", () => {
  const metrics = { averageLuminance: 0.14, uniqueColors: 1, darkPixelRatio: 0, dominantColorRatio: 1 };
  assert.equal(shouldRecoverCanvasFrame(metrics, 440), false);
  assert.equal(shouldRecoverWorldFrame(metrics, 440), true);
});

test("a dark center surrounded by a visible scene does not trigger recovery", () => {
  const pixels = new Uint8Array(4 * 4 * 4);
  for (let index = 0; index < 16; index += 1) {
    const pixel = index * 4;
    const darkCenter = [5, 6, 9, 10].includes(index);
    pixels[pixel] = darkCenter ? 16 : 128;
    pixels[pixel + 1] = darkCenter ? 12 : 112;
    pixels[pixel + 2] = darkCenter ? 10 : 96;
    pixels[pixel + 3] = 255;
  }

  assert.equal(shouldRecoverCanvasFrame(analyzeWorldProbePixels(pixels), 440), false);
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
