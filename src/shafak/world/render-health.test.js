import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceBlackFrameSamples,
  BLACK_FRAME_LUMINANCE_THRESHOLD,
} from "./render-health.ts";

test("black-frame recovery waits for two consecutive near-black samples", () => {
  const first = advanceBlackFrameSamples(0, BLACK_FRAME_LUMINANCE_THRESHOLD / 2);
  assert.deepEqual(first, { consecutiveSamples: 1, shouldRecover: false });
  assert.deepEqual(
    advanceBlackFrameSamples(first.consecutiveSamples, 0),
    { consecutiveSamples: 2, shouldRecover: true },
  );
});

test("a lit frame resets the black-frame streak and unreadable pixels are ignored", () => {
  assert.deepEqual(
    advanceBlackFrameSamples(1, BLACK_FRAME_LUMINANCE_THRESHOLD),
    { consecutiveSamples: 0, shouldRecover: false },
  );
  assert.deepEqual(advanceBlackFrameSamples(1, null), {
    consecutiveSamples: 1,
    shouldRecover: false,
  });
});
