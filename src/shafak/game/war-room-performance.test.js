import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWarRoomPerformanceReport,
  createWarRoomFrameStallWatchdogState,
  createWarRoomPerformanceCollector,
  getWarRoomBenchmarkInput,
  recordWarRoomLongTask,
  recordWarRoomPerformanceFrame,
  recordWarRoomQualityDowngrade,
  recordWarRoomShaderWarmup,
  resetWarRoomPerformanceFrameClock,
  resetWarRoomFrameStallWatchdog,
  sampleWarRoomFrameStallWatchdog,
  shouldRunWarRoomBenchmark,
  WAR_ROOM_BENCHMARK_DURATION_MS,
  WAR_ROOM_BENCHMARK_SEED,
  WAR_ROOM_PERFORMANCE_HISTORY_SIZE,
} from "./war-room-performance.ts";

function sample(collector, nowMs, drawCalls, triangles, bots = 9) {
  recordWarRoomPerformanceFrame(
    collector,
    nowMs,
    drawCalls,
    triangles,
    42,
    18,
    0.85,
    717,
    331,
    bots,
    "balanced",
    "Taş Avlu",
    "Test WebGL Renderer",
    1,
  );
}

test("local performance report calculates frame percentiles and renderer totals", () => {
  const collector = createWarRoomPerformanceCollector();
  sample(collector, 1_000, 38, 1_600);
  sample(collector, 1_016, 39, 1_650);
  sample(collector, 1_050, 40, 1_700);
  sample(collector, 1_110, 41, 1_750, 8);
  recordWarRoomLongTask(collector, 78.5);
  recordWarRoomQualityDowngrade(collector, 1_080, "high", "balanced");
  recordWarRoomShaderWarmup(collector, 42.26, true);

  const report = buildWarRoomPerformanceReport(collector, new Date("2026-11-12T00:00:00.000Z"));
  assert.equal(report.sampleCount, 3);
  assert.equal(report.frameTimeMs.p50, 34);
  assert.equal(report.frameTimeMs.p95, 60);
  assert.equal(report.frameTimeMs.p99, 60);
  assert.equal(report.lowRefreshRateSuspected, true);
  assert.equal(report.framesOver50Ms, 1);
  assert.equal(report.framesOver250Ms, 0);
  assert.equal(report.render.averageDrawCalls, 39.5);
  assert.equal(report.render.peakTriangles, 1_750);
  assert.equal(report.render.geometries, 42);
  assert.equal(report.render.textures, 18);
  assert.equal(report.render.renderScale, 0.85);
  assert.equal(report.render.canvasWidth, 717);
  assert.equal(report.scene.activeBots, 8);
  assert.equal(report.scene.mapName, "Taş Avlu");
  assert.deepEqual(report.qualityDowngrades, [{ atMs: 1_080, from: "high", to: "balanced" }]);
  assert.equal(report.longTasks.count, 1);
  assert.equal(report.longTasks.totalMs, 78.5);
  assert.deepEqual(report.warmup, { shaderCompileMs: 42.3, shaderCompileSucceeded: true });
  assert.equal(report.privacy, "local-only");
});

test("frame-stall watchdog recovers once after repeated 250ms stalls and resets on visibility", () => {
  const state = createWarRoomFrameStallWatchdogState();
  assert.equal(sampleWarRoomFrameStallWatchdog(state, 249, 1_000), false);
  assert.equal(sampleWarRoomFrameStallWatchdog(state, 250, 1_016), false);
  assert.equal(sampleWarRoomFrameStallWatchdog(state, 20, 1_032), false);
  assert.equal(sampleWarRoomFrameStallWatchdog(state, 300, 1_048), false);
  assert.equal(sampleWarRoomFrameStallWatchdog(state, 280, 1_328), true);
  assert.equal(sampleWarRoomFrameStallWatchdog(state, 270, 1_598), false);
  assert.equal(sampleWarRoomFrameStallWatchdog(state, 280, 11_300), false);
  assert.equal(sampleWarRoomFrameStallWatchdog(state, 290, 11_590), false);
  assert.equal(sampleWarRoomFrameStallWatchdog(state, 300, 11_890), true);
  resetWarRoomFrameStallWatchdog(state);
  assert.equal(sampleWarRoomFrameStallWatchdog(state, 290, 12_180), false);
});

test("background suspension resets the frame clock without recording a long resume frame", () => {
  const collector = createWarRoomPerformanceCollector();
  sample(collector, 1_000, 38, 1_600);
  sample(collector, 1_016, 39, 1_650);

  resetWarRoomPerformanceFrameClock(collector);
  sample(collector, 120_000, 40, 1_700);
  sample(collector, 120_016, 41, 1_750);

  const report = buildWarRoomPerformanceReport(collector);
  assert.equal(report.framesOver250Ms, 0);
  assert.equal(report.frameTimeMs.max, 16);
});

test("performance collector uses a bounded ring and skips invalid timestamps", () => {
  const collector = createWarRoomPerformanceCollector();
  assert.equal(collector.frameMs.length, WAR_ROOM_PERFORMANCE_HISTORY_SIZE);
  sample(collector, Number.NaN, 10, 10);
  for (let index = 0; index <= WAR_ROOM_PERFORMANCE_HISTORY_SIZE; index += 1) {
    sample(collector, index * 16.67, index, index * 100);
  }
  assert.equal(collector.sampleCount, WAR_ROOM_PERFORMANCE_HISTORY_SIZE);
  assert.equal(collector.drawCalls[(collector.writeIndex - 1 + WAR_ROOM_PERFORMANCE_HISTORY_SIZE)
    % WAR_ROOM_PERFORMANCE_HISTORY_SIZE], WAR_ROOM_PERFORMANCE_HISTORY_SIZE);
});

test("benchmark is opt-in by query and can be disabled by environment", () => {
  assert.equal(shouldRunWarRoomBenchmark("?benchmark=1"), true);
  assert.equal(shouldRunWarRoomBenchmark("?benchmark=0"), false);
  assert.equal(shouldRunWarRoomBenchmark("?mod=savas"), false);
  assert.equal(shouldRunWarRoomBenchmark("?benchmark=1", true), false);
});

test("benchmark input stays deterministic and ends after sixty seconds", () => {
  assert.equal(WAR_ROOM_BENCHMARK_SEED, 0x5afac011);
  assert.equal(WAR_ROOM_BENCHMARK_DURATION_MS, 60_000);
  assert.deepEqual(getWarRoomBenchmarkInput(0), {
    moveX: 0.35,
    moveY: 0.72,
    fireHeld: true,
    complete: false,
  });
  assert.deepEqual(getWarRoomBenchmarkInput(60_000), {
    moveX: 0.2,
    moveY: 0.72,
    fireHeld: false,
    complete: true,
  });
  assert.deepEqual(getWarRoomBenchmarkInput(0), getWarRoomBenchmarkInput(0));
});
