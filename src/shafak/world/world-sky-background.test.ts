import assert from "node:assert/strict";
import { test } from "node:test";
import {
  paintWorldSkyGradient,
  WORLD_SKY_BACKGROUND_HEIGHT,
  WORLD_SKY_BACKGROUND_WIDTH,
} from "./world-sky-background.ts";

test("the sky background is a smooth, opaque equirectangular gradient", () => {
  const width = WORLD_SKY_BACKGROUND_WIDTH;
  const height = WORLD_SKY_BACKGROUND_HEIGHT;
  const pixels = new Uint8Array(width * height * 4);
  paintWorldSkyGradient(pixels, width, height, 0);

  const colorAt = (x: number, y: number) => Array.from(
    pixels.subarray((y * width + x) * 4, (y * width + x) * 4 + 4),
  );
  const zenith = colorAt(0, 0);
  const horizon = colorAt(0, Math.floor((height - 1) / 2));

  assert.notDeepEqual(zenith, horizon, "the sky retains a vertical gradient");
  assert.deepEqual(zenith, colorAt(0, height - 1), "the equirectangular poles match");
  assert.deepEqual(colorAt(0, 36), colorAt(width - 1, 36), "the gradient is seamless around the horizon");
  assert.ok(pixels.every((_, index) => index % 4 !== 3 || pixels[index] === 255), "every pixel is opaque");
  const sunX = Math.round(width * 0.24);
  const sunY = Math.round(height * 0.4);
  const sunBrightness = colorAt(sunX, sunY).slice(0, 3).reduce((sum, channel) => sum + channel, 0);
  const nearbyBrightness = colorAt(0, sunY).slice(0, 3).reduce((sum, channel) => sum + channel, 0);
  assert.ok(sunBrightness > nearbyBrightness, "the horizon glow creates a visible focal point in the sky");

  for (let y = 1; y < height; y += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      const delta = Math.abs(colorAt(0, y)[channel] - colorAt(0, y - 1)[channel]);
      assert.ok(delta < 16, `sky color jumps by ${delta} at row ${y}`);
    }
  }
});

test("invalid sky texture dimensions and undersized buffers fail explicitly", () => {
  assert.throws(() => paintWorldSkyGradient(new Uint8Array(4), 1, 1, 0), RangeError);
  assert.throws(() => paintWorldSkyGradient(new Uint8Array(4), 2, 2, 0), RangeError);
});
