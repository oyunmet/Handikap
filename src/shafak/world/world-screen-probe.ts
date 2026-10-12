export type WorldProbeMetrics = {
  averageLuminance: number;
  uniqueColors: number;
};

export type WorldProbeRecoveryState = {
  firstFrameAt: number;
  blackSamples: number;
  recentRecoveryAt: number[];
  lastRecoveryAttemptAt?: number;
  detectionEmitted?: boolean;
  healthySamples?: number;
};

export function analyzeWorldProbePixels(pixels: Uint8Array): WorldProbeMetrics {
  if (pixels.length < 4 || pixels.length % 4 !== 0) {
    return { averageLuminance: 0, uniqueColors: 0 };
  }

  const colors = new Set<number>();
  let luminanceSum = 0;
  let sampleCount = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    luminanceSum += (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    colors.add(((red >> 4) << 8) | ((green >> 4) << 4) | (blue >> 4));
    sampleCount += 1;
  }

  return {
    averageLuminance: luminanceSum / sampleCount,
    uniqueColors: colors.size,
  };
}

export function isLikelyBlackWorldFrame(metrics: WorldProbeMetrics) {
  return Number.isFinite(metrics.averageLuminance)
    && metrics.averageLuminance < 0.018
    && metrics.uniqueColors <= 8;
}

export function shouldTriggerWorldBlackRecovery(
  state: WorldProbeRecoveryState,
  sample: {
    now: number;
    frameMs: number;
    hidden: boolean;
    black: boolean;
  },
) {
  if (!sample.black || sample.hidden || sample.frameMs > 250) return false;
  if (sample.now - state.firstFrameAt < 20_000 || state.blackSamples < 5) return false;
  const recent = state.recentRecoveryAt.filter((at) => sample.now - at < 60_000);
  state.recentRecoveryAt = recent;
  if (recent.length >= 2) return false;
  recent.push(sample.now);
  return true;
}
