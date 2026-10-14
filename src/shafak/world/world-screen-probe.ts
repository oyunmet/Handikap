export type WorldProbeMetrics = {
  averageLuminance: number;
  uniqueColors: number;
  darkPixelRatio: number;
};

export function analyzeWorldProbePixels(pixels: Uint8Array): WorldProbeMetrics {
  if (pixels.length < 4 || pixels.length % 4 !== 0) {
    return { averageLuminance: 0, uniqueColors: 0, darkPixelRatio: 0 };
  }

  const colors = new Set<number>();
  let luminanceSum = 0;
  let darkPixelCount = 0;
  let sampleCount = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    luminanceSum += luminance;
    if (luminance < 0.07) darkPixelCount += 1;
    colors.add(((red >> 4) << 8) | ((green >> 4) << 4) | (blue >> 4));
    sampleCount += 1;
  }

  return {
    averageLuminance: luminanceSum / sampleCount,
    uniqueColors: colors.size,
    darkPixelRatio: darkPixelCount / sampleCount,
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

export function shouldRecoverWorldFrame(metrics: WorldProbeMetrics, drawCalls: number) {
  return !Number.isFinite(drawCalls) || drawCalls <= 0 || isLikelyBlackWorldFrame(metrics);
}
