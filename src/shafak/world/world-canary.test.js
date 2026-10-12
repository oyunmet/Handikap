import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorldCanarySnapshot,
  isBrightRedCanary,
  isWorldRenderDead,
  meanSceneLuminance,
  recordWorldCanarySample,
  shouldSampleWorldCanary,
} from "./world-canary.ts";

test("the production canary samples every thirtieth frame only", () => {
  assert.equal(shouldSampleWorldCanary(30), true);
  assert.equal(shouldSampleWorldCanary(60), true);
  assert.equal(shouldSampleWorldCanary(29), false);
  assert.equal(shouldSampleWorldCanary(0), false);
  assert.equal(shouldSampleWorldCanary(Number.NaN), false);
});

test("the canary requires a bright red pixel and five consecutive misses to request recovery", () => {
  const brightRed = [255, 0, 0, 255];
  assert.equal(isBrightRedCanary(brightRed), true);
  assert.equal(isBrightRedCanary([0, 0, 0, 255]), false);
  let snapshot = createWorldCanarySnapshot();

  for (let index = 0; index < 4; index += 1) {
    const result = recordWorldCanarySample(snapshot, [0, 0, 0, 255]);
    snapshot = result.snapshot;
    assert.equal(result.shouldRecover, false);
  }
  const fifth = recordWorldCanarySample(snapshot, [0, 0, 0, 255]);
  assert.equal(fifth.shouldRecover, true);
  assert.equal(fifth.snapshot.consecutiveBlack, 5);
  assert.equal(recordWorldCanarySample(fifth.snapshot, [0, 0, 0, 255]).shouldRecover, false);
  let tenthSnapshot = fifth.snapshot;
  for (let index = 0; index < 4; index += 1) {
    tenthSnapshot = recordWorldCanarySample(tenthSnapshot, [0, 0, 0, 255]).snapshot;
    assert.equal(recordWorldCanarySample(tenthSnapshot, [0, 0, 0, 255]).shouldRecover, false);
  }
  const tenth = recordWorldCanarySample(tenthSnapshot, [0, 0, 0, 255]);
  assert.equal(tenth.shouldRecover, true);
  assert.equal(tenth.snapshot.consecutiveBlack, 10);
  assert.equal(recordWorldCanarySample(fifth.snapshot, brightRed).snapshot.consecutiveBlack, 0);
});

test("a bright canary plus five dim scene samples requests a lighting reset", () => {
  const blackScene = [[0, 0, 0, 255], [2, 2, 2, 255], [1, 1, 1, 255]];
  assert.equal(meanSceneLuminance(blackScene) < 0.025, true);
  assert.equal(meanSceneLuminance([[255, 0, 0, 255]]) > 0.025, true);
  let snapshot = createWorldCanarySnapshot();
  for (let index = 0; index < 4; index += 1) {
    const result = recordWorldCanarySample(snapshot, [255, 0, 0, 255], blackScene);
    snapshot = result.snapshot;
    assert.equal(result.shouldRestoreLighting, false);
  }
  const fifth = recordWorldCanarySample(snapshot, [255, 0, 0, 255], blackScene);
  assert.equal(fifth.shouldRestoreLighting, true);
  assert.equal(fifth.snapshot.state, "healthy");
  assert.equal(fifth.snapshot.consecutiveDim, 5);
});

test("zero calls and triangles indicate a dead renderer only when a visible renderable exists", () => {
  assert.equal(isWorldRenderDead({ calls: 0, triangles: 0, visibleRenderables: 1 }), true);
  assert.equal(isWorldRenderDead({ calls: 0, triangles: 0, visibleRenderables: 0 }), false);
  assert.equal(isWorldRenderDead({ calls: 1, triangles: 0, visibleRenderables: 1 }), false);
  assert.equal(isWorldRenderDead({ calls: 0, triangles: 12, visibleRenderables: 1 }), false);
});
