import assert from "node:assert/strict";
import test from "node:test";
import { resolveCanvasRecovery } from "./canvas-recovery.ts";

test("the shared renderer permits one automatic rebuild", () => {
  assert.deepEqual(resolveCanvasRecovery(0), { attempts: 1, shouldRebuild: true });
});

test("repeated automatic failures stop and expose a manual retry", () => {
  assert.deepEqual(resolveCanvasRecovery(1), { attempts: 1, shouldRebuild: false });
});

test("a manual retry resets the automatic recovery budget", () => {
  assert.deepEqual(resolveCanvasRecovery(1, true), { attempts: 0, shouldRebuild: true });
});
