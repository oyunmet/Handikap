export type CanaryPixel = readonly [red: number, green: number, blue: number, alpha: number];

export type WorldCanarySnapshot = {
  samples: number;
  passed: number;
  failed: number;
  consecutiveBlack: number;
  consecutiveDim: number;
  lastPixel: CanaryPixel | null;
  lastSceneLuminance: number | null;
  state: "waiting" | "healthy" | "black" | "unavailable";
};

export type WorldCanaryResult = {
  snapshot: WorldCanarySnapshot;
  shouldRecover: boolean;
  shouldRestoreLighting: boolean;
};

export function createWorldCanarySnapshot(): WorldCanarySnapshot {
  return {
    samples: 0,
    passed: 0,
    failed: 0,
    consecutiveBlack: 0,
    consecutiveDim: 0,
    lastPixel: null,
    lastSceneLuminance: null,
    state: "waiting",
  };
}

export function shouldSampleWorldCanary(frame: number, interval = 30): boolean {
  const intervalFrames = Math.max(1, Math.floor(interval));
  return Number.isFinite(frame)
    && Number.isFinite(interval)
    && Math.floor(frame) > 0
    && intervalFrames > 0
    && Math.floor(frame) % intervalFrames === 0;
}

export function isBrightRedCanary(pixel: CanaryPixel | null): boolean {
  if (!pixel || pixel.some((channel) => !Number.isFinite(channel))) return false;
  return pixel[0] >= 180 && pixel[1] <= 72 && pixel[2] <= 72 && pixel[3] >= 180;
}

export function meanSceneLuminance(pixels: readonly CanaryPixel[]): number | null {
  if (pixels.length === 0) return null;
  let sum = 0;
  let valid = 0;
  for (const pixel of pixels) {
    if (pixel.some((channel) => !Number.isFinite(channel))) continue;
    sum += (0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2]) / 255;
    valid += 1;
  }
  return valid ? sum / valid : null;
}

export function recordWorldCanarySample(
  current: WorldCanarySnapshot,
  pixel: CanaryPixel | null,
  scenePixels: readonly CanaryPixel[] = [],
): WorldCanaryResult {
  if (!pixel) {
    return {
      snapshot: { ...current, state: current.samples ? current.state : "unavailable" },
      shouldRecover: false,
      shouldRestoreLighting: false,
    };
  }

  const passed = isBrightRedCanary(pixel);
  const luminance = meanSceneLuminance(scenePixels);
  const dim = passed && luminance !== null && luminance < 0.025;
  const consecutiveBlack = passed ? 0 : current.consecutiveBlack + 1;
  const consecutiveDim = dim ? current.consecutiveDim + 1 : 0;
  const snapshot: WorldCanarySnapshot = {
    samples: current.samples + 1,
    passed: current.passed + Number(passed),
    failed: current.failed + Number(!passed),
    consecutiveBlack,
    consecutiveDim,
    lastPixel: pixel,
    lastSceneLuminance: luminance,
    state: passed ? "healthy" : "black",
  };

  return {
    snapshot,
    shouldRecover: consecutiveBlack >= 5 && current.consecutiveBlack < 5,
    shouldRestoreLighting: consecutiveDim >= 5 && current.consecutiveDim < 5,
  };
}

export function isWorldRenderDead(stats: {
  calls: number;
  triangles: number;
  visibleRenderables: number;
}): boolean {
  return Number.isFinite(stats.calls)
    && Number.isFinite(stats.triangles)
    && Number.isFinite(stats.visibleRenderables)
    && stats.calls === 0
    && stats.triangles === 0
    && stats.visibleRenderables > 0;
}
