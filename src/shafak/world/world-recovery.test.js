import test from "node:test";
import assert from "node:assert/strict";
import { nextWorldRecoveryStage } from "./world-recovery.ts";

test("ordinary renderer recovery advances through the four bounded stages", () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((stage) => nextWorldRecoveryStage(stage)),
    [1, 2, 3, 4, 5],
  );
});

test("a renderer creation failure skips scene-only resets", () => {
  assert.equal(
    nextWorldRecoveryStage(0, "THREE.WebGLRenderer: Error creating WebGL context."),
    3,
  );
  assert.equal(
    nextWorldRecoveryStage(3, "Could not create a WebGL context"),
    4,
  );
});

test("invalid stage values reset safely and context creation retries stay bounded", () => {
  assert.equal(nextWorldRecoveryStage(Number.NaN), 1);
  assert.equal(nextWorldRecoveryStage(-4), 1);
  assert.equal(nextWorldRecoveryStage(4, "Error creating WebGL context"), 5);
});
