import test from "node:test";
import assert from "node:assert/strict";
import { nextWorldRecoveryStage } from "./world-recovery.ts";

test("ordinary renderer recovery advances through three bounded stages", () => {
  assert.deepEqual(
    [0, 1, 2, 3].map((stage) => nextWorldRecoveryStage(stage)),
    [1, 2, 3, 4],
  );
});

test("a renderer creation failure skips the material-only reset", () => {
  assert.equal(
    nextWorldRecoveryStage(0, "THREE.WebGLRenderer: Error creating WebGL context."),
    2,
  );
  assert.equal(
    nextWorldRecoveryStage(2, "Could not create a WebGL context"),
    3,
  );
});

test("invalid stage values reset safely and context creation retries stay bounded", () => {
  assert.equal(nextWorldRecoveryStage(Number.NaN), 1);
  assert.equal(nextWorldRecoveryStage(-4), 1);
  assert.equal(nextWorldRecoveryStage(3, "Error creating WebGL context"), 4);
});
