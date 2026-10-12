import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldCountWorldWatchdogFrame,
  shouldReportFirstFrameTimeout,
  WORLD_FIRST_FRAME_GRACE_MS,
} from "./world-render-watchdog.ts";

test("slow, hidden, paused, and inactive frames do not count toward watchdog thresholds", () => {
  const eligible = { active: true, visible: true, paused: false, deltaMs: 16 };
  assert.equal(shouldCountWorldWatchdogFrame(eligible), true);
  assert.equal(shouldCountWorldWatchdogFrame({ ...eligible, deltaMs: 251 }), false);
  assert.equal(shouldCountWorldWatchdogFrame({ ...eligible, visible: false }), false);
  assert.equal(shouldCountWorldWatchdogFrame({ ...eligible, paused: true }), false);
  assert.equal(shouldCountWorldWatchdogFrame({ ...eligible, active: false }), false);
});

test("first-frame reporting gives cold startup at least twenty seconds and never recovers on timeout alone", () => {
  assert.equal(WORLD_FIRST_FRAME_GRACE_MS, 20_000);
  assert.equal(shouldReportFirstFrameTimeout(19_999, false), false);
  assert.equal(shouldReportFirstFrameTimeout(20_000, false), true);
  assert.equal(shouldReportFirstFrameTimeout(30_000, true), false);
});
