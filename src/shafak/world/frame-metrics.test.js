import assert from "node:assert/strict";
import test from "node:test";
import { createFrameMetricsAccumulator, recordFrameMetric } from "./frame-metrics.ts";

test("frame monitor reports average FPS, average frame time, minimum FPS, and long frames", () => {
  const metrics = createFrameMetricsAccumulator();
  let snapshot = null;
  for (let frame = 1; frame <= 60; frame += 1) {
    snapshot = recordFrameMetric(metrics, frame * (1_000 / 60), 1_000 / 60) ?? snapshot;
  }

  assert.ok(snapshot);
  assert.ok(Math.abs(snapshot.averageFps - 60) < 0.1);
  assert.ok(Math.abs(snapshot.minimumFps - 60) < 0.1);
  assert.ok(Math.abs(snapshot.averageFrameMs - 1_000 / 60) < 0.1);
  assert.equal(snapshot.longFrames, 0);

  for (let frame = 1; frame <= 11; frame += 1) {
    snapshot = recordFrameMetric(metrics, 1_000 + frame * 100, 100) ?? snapshot;
  }
  assert.ok(snapshot.minimumFps < 11);
  assert.equal(snapshot.longFrames, 11);
});

test("frame monitor ignores invalid samples and counts frames over 50 ms", () => {
  const metrics = createFrameMetricsAccumulator();
  assert.equal(recordFrameMetric(metrics, Number.NaN, 16), null);
  assert.equal(recordFrameMetric(metrics, 20, Number.NaN), null);
  recordFrameMetric(metrics, 1, 16);
  recordFrameMetric(metrics, 1_001, 51);
  assert.equal(metrics.longFrames, 1);
});
