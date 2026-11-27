import assert from "node:assert/strict";
import test from "node:test";
import {
  CANVAS_CONTEXT_RESTORE_TIMEOUT_MS,
  CANVAS_RECOVERY_STABLE_WINDOW_MS,
  resolveCanvasRecovery,
  resolveCanvasRecoveryDprScale,
  shouldFailCanvasRecovery,
} from "./canvas-recovery.ts";

test("the shared renderer permits one automatic rebuild", () => {
  assert.deepEqual(resolveCanvasRecovery(0), { attempts: 1, shouldRebuild: true });
});

test("repeated automatic failures stop and expose a manual retry", () => {
  assert.deepEqual(resolveCanvasRecovery(1), { attempts: 1, shouldRebuild: false });
});

test("a manual retry resets the automatic recovery budget", () => {
  assert.deepEqual(resolveCanvasRecovery(1, true), { attempts: 0, shouldRebuild: true });
});

test("repeated context losses are fatal only after the automatic retry budget is exceeded", () => {
  assert.equal(shouldFailCanvasRecovery(3), false);
  assert.equal(shouldFailCanvasRecovery(4), true);
  assert.equal(shouldFailCanvasRecovery(Number.NaN), false);
});

test("a stable renderer restores full resolution after a temporary recovery reduction", () => {
  assert.equal(CANVAS_CONTEXT_RESTORE_TIMEOUT_MS, 8_000);
  assert.equal(CANVAS_RECOVERY_STABLE_WINDOW_MS, 15_000);
  assert.equal(resolveCanvasRecoveryDprScale(1), 0.75);
  assert.equal(resolveCanvasRecoveryDprScale(0.5), 0.5);
  assert.equal(resolveCanvasRecoveryDprScale(0.5, true), 1);
});
