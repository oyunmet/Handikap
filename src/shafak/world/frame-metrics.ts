export type FrameMetricsSnapshot = {
  averageFps: number;
  minimumFps: number;
  averageFrameMs: number;
  longFrames: number;
};

export type FrameMetricsAccumulator = {
  startedAt: number | null;
  sampleStartedAt: number | null;
  totalFrames: number;
  sampleFrames: number;
  totalFrameMs: number;
  minimumFps: number;
  longFrames: number;
};

export function createFrameMetricsAccumulator(): FrameMetricsAccumulator {
  return {
    startedAt: null,
    sampleStartedAt: null,
    totalFrames: 0,
    sampleFrames: 0,
    totalFrameMs: 0,
    minimumFps: Number.POSITIVE_INFINITY,
    longFrames: 0,
  };
}

export function recordFrameMetric(
  accumulator: FrameMetricsAccumulator,
  nowMs: number,
  frameMs: number,
): FrameMetricsSnapshot | null {
  if (!Number.isFinite(nowMs) || !Number.isFinite(frameMs) || frameMs < 0) return null;
  if (accumulator.startedAt === null) {
    accumulator.startedAt = nowMs - frameMs;
    accumulator.sampleStartedAt = accumulator.startedAt;
  }

  accumulator.totalFrames += 1;
  accumulator.sampleFrames += 1;
  accumulator.totalFrameMs += frameMs;
  if (frameMs > 50) accumulator.longFrames += 1;

  const sampleDurationMs = nowMs - (accumulator.sampleStartedAt ?? nowMs);
  if (sampleDurationMs < 1_000) return null;

  accumulator.minimumFps = Math.min(
    accumulator.minimumFps,
    accumulator.sampleFrames * 1_000 / sampleDurationMs,
  );
  const totalDurationMs = nowMs - accumulator.startedAt;
  const snapshot = {
    averageFps: totalDurationMs > 0 ? accumulator.totalFrames * 1_000 / totalDurationMs : 0,
    minimumFps: Number.isFinite(accumulator.minimumFps) ? accumulator.minimumFps : 0,
    averageFrameMs: accumulator.totalFrames > 0 ? accumulator.totalFrameMs / accumulator.totalFrames : 0,
    longFrames: accumulator.longFrames,
  };
  accumulator.sampleStartedAt = nowMs;
  accumulator.sampleFrames = 0;
  return snapshot;
}
