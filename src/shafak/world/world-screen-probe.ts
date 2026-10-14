export type WorldProbeMetrics = {
  averageLuminance: number;
  uniqueColors: number;
  darkPixelRatio: number;
  dominantColorRatio: number;
};

export type WorldProbePoint = { x: number; y: number };

export function getWorldProbeTargetSize(width: number, height: number, maxDimension = 48) {
  if (
    !Number.isFinite(width)
    || !Number.isFinite(height)
    || width <= 0
    || height <= 0
    || !Number.isFinite(maxDimension)
    || maxDimension <= 0
  ) return { width: 0, height: 0 };

  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function getWorldProbeSamplePoints(
  width: number,
  height: number,
  columns = 4,
  rows = 4,
): WorldProbePoint[] {
  if (
    !Number.isInteger(width)
    || !Number.isInteger(height)
    || !Number.isInteger(columns)
    || !Number.isInteger(rows)
    || width <= 0
    || height <= 0
    || columns <= 0
    || rows <= 0
  ) return [];

  return Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: Math.min(width - 1, Math.floor(((column + 0.5) * width) / columns)),
      y: Math.min(height - 1, Math.floor(((row + 0.5) * height) / rows)),
    };
  });
}

export function getWorldDrawCallsForFrame(
  manualRender: boolean,
  callsBeforeRender: number,
  callsAfterRender: number,
) {
  return manualRender ? callsAfterRender : callsBeforeRender;
}

export function analyzeWorldProbePixels(pixels: Uint8Array): WorldProbeMetrics {
  if (pixels.length < 4 || pixels.length % 4 !== 0) {
    return { averageLuminance: 0, uniqueColors: 0, darkPixelRatio: 0, dominantColorRatio: 0 };
  }

  const colors = new Map<number, number>();
  let luminanceSum = 0;
  let darkPixelCount = 0;
  let dominantColorCount = 0;
  let sampleCount = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    luminanceSum += luminance;
    if (luminance < 0.07) darkPixelCount += 1;
    const color = ((red >> 4) << 8) | ((green >> 4) << 4) | (blue >> 4);
    const colorCount = (colors.get(color) ?? 0) + 1;
    colors.set(color, colorCount);
    dominantColorCount = Math.max(dominantColorCount, colorCount);
    sampleCount += 1;
  }

  return {
    averageLuminance: luminanceSum / sampleCount,
    uniqueColors: colors.size,
    darkPixelRatio: darkPixelCount / sampleCount,
    dominantColorRatio: dominantColorCount / sampleCount,
  };
}

export function isLikelyBlackWorldFrame(metrics: WorldProbeMetrics) {
  if (
    metrics.uniqueColors === 0
    || !Number.isFinite(metrics.averageLuminance)
    || !Number.isFinite(metrics.darkPixelRatio)
  ) return false;

  // A few visible props or gate lights can make a mostly black frame look
  // colorful to the sampler. Keep detecting a uniformly black frame, and
  // also recover when at least three quarters of the sampled scene is near-black.
  return metrics.averageLuminance < 0.07
    || (metrics.averageLuminance < 0.12 && metrics.darkPixelRatio >= 0.75);
}

export function shouldRecoverCanvasFrame(metrics: WorldProbeMetrics, drawCalls: number) {
  return !Number.isFinite(drawCalls) || drawCalls <= 0 || isLikelyBlackWorldFrame(metrics);
}

export function shouldRecoverWorldFrame(metrics: WorldProbeMetrics, drawCalls: number) {
  if (shouldRecoverCanvasFrame(metrics, drawCalls)) return true;

  // The world always contains a sky, road, and scenery. A nearly uniform
  // full-scene sample with only a handful of lit pixels is therefore an empty
  // 3D view, even when the clear color itself is brighter than the black-frame
  // limit. Do not apply this test to a small center crop of the canvas.
  return metrics.uniqueColors <= 8 && metrics.dominantColorRatio >= 0.75;
}
