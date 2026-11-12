import type { RenderQuality } from "../world/graphics-quality";

export const WAR_ROOM_PERFORMANCE_HISTORY_SIZE = 3_600;
export const WAR_ROOM_BENCHMARK_DURATION_MS = 60_000;
export const WAR_ROOM_BENCHMARK_SEED = 0x5afac011;

export type WarRoomPerformanceCollector = {
  frameMs: Float32Array;
  drawCalls: Uint16Array;
  triangles: Uint32Array;
  geometries: Uint16Array;
  textures: Uint16Array;
  pixelRatios: Float32Array;
  activeBots: Uint8Array;
  writeIndex: number;
  sampleCount: number;
  lastFrameAtMs: number | null;
  longTaskCount: number;
  longTaskTotalMs: number;
  qualityEvents: Array<{ atMs: number; from: RenderQuality; to: RenderQuality }>;
  latest: {
    canvasWidth: number;
    canvasHeight: number;
    devicePixelRatio: number;
    quality: RenderQuality;
    mapName: string;
    renderer: string;
  };
};

export type WarRoomPerformanceReport = {
  generatedAt: string;
  sampleCount: number;
  sampleWindowMs: number;
  averageFps: number;
  requestAnimationFrameHz: number;
  lowRefreshRateSuspected: boolean;
  frameTimeMs: { p50: number; p95: number; p99: number; max: number };
  framesOver50Ms: number;
  longTasks: { supported: boolean; count: number; totalMs: number };
  render: {
    quality: RenderQuality;
    renderScale: number;
    devicePixelRatio: number;
    canvasWidth: number;
    canvasHeight: number;
    averageDrawCalls: number;
    peakDrawCalls: number;
    averageTriangles: number;
    peakTriangles: number;
    geometries: number;
    textures: number;
  };
  device: {
    hardwareConcurrency: number | null;
    deviceMemoryGiB: number | null;
    jsHeapUsedBytes: number | null;
    webglRenderer: string;
  };
  scene: { mapName: string; activeBots: number };
  qualityDowngrades: Array<{ atMs: number; from: RenderQuality; to: RenderQuality }>;
  privacy: "local-only";
};

const clampInteger = (value: number, maximum = 65_535) =>
  Number.isFinite(value) ? Math.max(0, Math.min(maximum, Math.floor(value))) : 0;

export function createWarRoomPerformanceCollector(): WarRoomPerformanceCollector {
  return {
    frameMs: new Float32Array(WAR_ROOM_PERFORMANCE_HISTORY_SIZE),
    drawCalls: new Uint16Array(WAR_ROOM_PERFORMANCE_HISTORY_SIZE),
    triangles: new Uint32Array(WAR_ROOM_PERFORMANCE_HISTORY_SIZE),
    geometries: new Uint16Array(WAR_ROOM_PERFORMANCE_HISTORY_SIZE),
    textures: new Uint16Array(WAR_ROOM_PERFORMANCE_HISTORY_SIZE),
    pixelRatios: new Float32Array(WAR_ROOM_PERFORMANCE_HISTORY_SIZE),
    activeBots: new Uint8Array(WAR_ROOM_PERFORMANCE_HISTORY_SIZE),
    writeIndex: 0,
    sampleCount: 0,
    lastFrameAtMs: null,
    longTaskCount: 0,
    longTaskTotalMs: 0,
    qualityEvents: [],
    latest: {
      canvasWidth: 0,
      canvasHeight: 0,
      devicePixelRatio: 1,
      quality: "balanced",
      mapName: "unknown",
      renderer: "unknown",
    },
  };
}

export const warRoomPerformanceCollector = createWarRoomPerformanceCollector();

export function resetWarRoomPerformanceCollector(
  collector: WarRoomPerformanceCollector = warRoomPerformanceCollector,
) {
  collector.frameMs.fill(0);
  collector.drawCalls.fill(0);
  collector.triangles.fill(0);
  collector.geometries.fill(0);
  collector.textures.fill(0);
  collector.pixelRatios.fill(0);
  collector.activeBots.fill(0);
  collector.writeIndex = 0;
  collector.sampleCount = 0;
  collector.lastFrameAtMs = null;
  collector.longTaskCount = 0;
  collector.longTaskTotalMs = 0;
  collector.qualityEvents.length = 0;
}

export function recordWarRoomPerformanceFrame(
  collector: WarRoomPerformanceCollector,
  nowMs: number,
  drawCalls: number,
  triangles: number,
  geometries: number,
  textures: number,
  pixelRatio: number,
  canvasWidth: number,
  canvasHeight: number,
  bots: number,
  quality: RenderQuality,
  mapName: string,
  renderer: string,
  devicePixelRatio: number,
) {
  if (!Number.isFinite(nowMs)) return;
  const index = collector.writeIndex;
  collector.frameMs[index] = collector.lastFrameAtMs === null
    ? 0
    : Math.max(0, nowMs - collector.lastFrameAtMs);
  collector.drawCalls[index] = clampInteger(drawCalls);
  collector.triangles[index] = clampInteger(triangles, 4_294_967_295);
  collector.geometries[index] = clampInteger(geometries);
  collector.textures[index] = clampInteger(textures);
  collector.pixelRatios[index] = Number.isFinite(pixelRatio) ? Math.max(0, pixelRatio) : 0;
  collector.activeBots[index] = clampInteger(bots, 255);
  collector.latest.canvasWidth = clampInteger(canvasWidth, 16_384);
  collector.latest.canvasHeight = clampInteger(canvasHeight, 16_384);
  collector.latest.devicePixelRatio = Number.isFinite(devicePixelRatio)
    ? Math.max(0, devicePixelRatio)
    : 1;
  collector.latest.quality = quality;
  collector.latest.mapName = mapName || "unknown";
  collector.latest.renderer = renderer || "unknown";
  collector.lastFrameAtMs = nowMs;
  collector.writeIndex = (index + 1) % WAR_ROOM_PERFORMANCE_HISTORY_SIZE;
  collector.sampleCount = Math.min(
    WAR_ROOM_PERFORMANCE_HISTORY_SIZE,
    collector.sampleCount + 1,
  );
}

export function recordWarRoomLongTask(
  collector: WarRoomPerformanceCollector,
  durationMs: number,
) {
  if (!Number.isFinite(durationMs) || durationMs < 0) return;
  collector.longTaskCount += 1;
  collector.longTaskTotalMs += durationMs;
}

export function observeWarRoomLongTasks(
  collector: WarRoomPerformanceCollector = warRoomPerformanceCollector,
): () => void {
  if (typeof PerformanceObserver === "undefined") return () => undefined;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        recordWarRoomLongTask(collector, entry.duration);
      }
    });
    observer.observe({ type: "longtask", buffered: true });
    return () => observer.disconnect();
  } catch {
    return () => undefined;
  }
}

export function recordWarRoomQualityDowngrade(
  collector: WarRoomPerformanceCollector,
  atMs: number,
  from: RenderQuality,
  to: RenderQuality,
) {
  if (!Number.isFinite(atMs) || from === to) return;
  if (collector.qualityEvents.length === 12) collector.qualityEvents.shift();
  collector.qualityEvents.push({ atMs, from, to });
}

function percentile(sorted: number[], fraction: number) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
}

export function buildWarRoomPerformanceReport(
  collector: WarRoomPerformanceCollector = warRoomPerformanceCollector,
  now = new Date(),
): WarRoomPerformanceReport {
  const intervals: number[] = [];
  const draws: number[] = [];
  const triangles: number[] = [];
  let botCount = 0;
  for (let offset = 0; offset < collector.sampleCount; offset += 1) {
    const index = (collector.writeIndex - collector.sampleCount + offset
      + WAR_ROOM_PERFORMANCE_HISTORY_SIZE) % WAR_ROOM_PERFORMANCE_HISTORY_SIZE;
    const frameMs = collector.frameMs[index] ?? 0;
    if (frameMs > 0 && Number.isFinite(frameMs)) intervals.push(frameMs);
    draws.push(collector.drawCalls[index] ?? 0);
    triangles.push(collector.triangles[index] ?? 0);
    botCount = collector.activeBots[index] ?? 0;
  }
  intervals.sort((a, b) => a - b);
  const sumFrameMs = intervals.reduce((total, value) => total + value, 0);
  const averageFps = sumFrameMs > 0 ? intervals.length * 1_000 / sumFrameMs : 0;
  const drawCallsTotal = draws.reduce((total, value) => total + value, 0);
  const trianglesTotal = triangles.reduce((total, value) => total + value, 0);
  const nav = typeof navigator === "undefined"
    ? null
    : navigator as Navigator & { deviceMemory?: number };
  const memory = typeof performance === "undefined"
    ? null
    : (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
  const hasLongTaskObserver = typeof PerformanceObserver !== "undefined"
    && PerformanceObserver.supportedEntryTypes?.includes("longtask") === true;

  return {
    generatedAt: now.toISOString(),
    sampleCount: intervals.length,
    sampleWindowMs: Math.round(sumFrameMs),
    averageFps: Number(averageFps.toFixed(1)),
    requestAnimationFrameHz: Number(averageFps.toFixed(1)),
    lowRefreshRateSuspected: averageFps >= 25 && averageFps <= 35,
    frameTimeMs: {
      p50: Number(percentile(intervals, 0.5).toFixed(2)),
      p95: Number(percentile(intervals, 0.95).toFixed(2)),
      p99: Number(percentile(intervals, 0.99).toFixed(2)),
      max: Number((intervals.at(-1) ?? 0).toFixed(2)),
    },
    framesOver50Ms: intervals.reduce((count, value) => count + Number(value > 50), 0),
    longTasks: {
      supported: hasLongTaskObserver,
      count: collector.longTaskCount,
      totalMs: Number(collector.longTaskTotalMs.toFixed(1)),
    },
    render: {
      quality: collector.latest.quality,
      renderScale: Number((collector.sampleCount
        ? collector.pixelRatios[(collector.writeIndex - 1 + WAR_ROOM_PERFORMANCE_HISTORY_SIZE)
          % WAR_ROOM_PERFORMANCE_HISTORY_SIZE] ?? 0
        : 0).toFixed(2)),
      devicePixelRatio: Number(collector.latest.devicePixelRatio.toFixed(2)),
      canvasWidth: collector.latest.canvasWidth,
      canvasHeight: collector.latest.canvasHeight,
      averageDrawCalls: draws.length ? Number((drawCallsTotal / draws.length).toFixed(1)) : 0,
      peakDrawCalls: draws.length ? Math.max(...draws) : 0,
      averageTriangles: triangles.length
        ? Number((trianglesTotal / triangles.length).toFixed(0))
        : 0,
      peakTriangles: triangles.length ? Math.max(...triangles) : 0,
      geometries: collector.sampleCount
        ? collector.geometries[(collector.writeIndex - 1 + WAR_ROOM_PERFORMANCE_HISTORY_SIZE)
          % WAR_ROOM_PERFORMANCE_HISTORY_SIZE] ?? 0
        : 0,
      textures: collector.sampleCount
        ? collector.textures[(collector.writeIndex - 1 + WAR_ROOM_PERFORMANCE_HISTORY_SIZE)
          % WAR_ROOM_PERFORMANCE_HISTORY_SIZE] ?? 0
        : 0,
    },
    device: {
      hardwareConcurrency: nav?.hardwareConcurrency ?? null,
      deviceMemoryGiB: typeof nav?.deviceMemory === "number" ? nav.deviceMemory : null,
      jsHeapUsedBytes: typeof memory?.usedJSHeapSize === "number"
        ? memory.usedJSHeapSize
        : null,
      webglRenderer: collector.latest.renderer,
    },
    scene: {
      mapName: collector.latest.mapName,
      activeBots: botCount,
    },
    qualityDowngrades: collector.qualityEvents.map((event) => ({ ...event })),
    privacy: "local-only",
  };
}

export function shouldRunWarRoomBenchmark(search: string, disabled = false) {
  return !disabled && new URLSearchParams(search).get("benchmark") === "1";
}

export type WarRoomBenchmarkInput = {
  moveX: number;
  moveY: number;
  fireHeld: boolean;
  complete: boolean;
};

export function getWarRoomBenchmarkInput(
  elapsedMs: number,
  output: WarRoomBenchmarkInput = { moveX: 0, moveY: 0, fireHeld: false, complete: false },
) {
  const safeElapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const direction = Math.floor(safeElapsed / 6_000) % 4;
  output.moveX = direction === 0 ? 0.35
    : direction === 1 ? -0.35
      : direction === 2 ? 0.2
        : -0.2;
  output.moveY = direction === 0 || direction === 2 ? 0.72 : 0.42;
  output.fireHeld = safeElapsed < WAR_ROOM_BENCHMARK_DURATION_MS;
  output.complete = safeElapsed >= WAR_ROOM_BENCHMARK_DURATION_MS;
  return output;
}
