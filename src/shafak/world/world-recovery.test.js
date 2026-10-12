import test from "node:test";
import assert from "node:assert/strict";
import {
  decideWorldRecovery,
  shouldRecoverForWorldReason,
} from "./world-recovery.ts";

test("only definite renderer failures request recovery", () => {
  assert.equal(shouldRecoverForWorldReason("CTX_LOST"), true);
  assert.equal(shouldRecoverForWorldReason("CANARY_BLACK"), true);
  assert.equal(shouldRecoverForWorldReason("ZERO_DRAW_CALLS"), true);
  assert.equal(shouldRecoverForWorldReason("NO_FIRST_FRAME"), false);
  assert.equal(shouldRecoverForWorldReason("FRAMELOOP_PAUSED"), false);
});

test("destructive renderer and scene rebuilds are capped at two per rolling minute", () => {
  const soft = decideWorldRecovery(0, "CTX_LOST", [], 1_000);
  assert.deepEqual(
    { accepted: soft.accepted, stage: soft.stage, recentEscalations: soft.recentEscalations },
    { accepted: true, stage: 1, recentEscalations: [] },
  );
  const rendererRebuild = decideWorldRecovery(1, "CTX_LOST", soft.recentEscalations, 2_000);
  const sceneRebuild = decideWorldRecovery(2, "CTX_LOST", rendererRebuild.recentEscalations, 3_000);
  const blocked = decideWorldRecovery(1, "CTX_LOST", sceneRebuild.recentEscalations, 4_000);
  assert.deepEqual(
    { accepted: rendererRebuild.accepted, stage: rendererRebuild.stage, count: rendererRebuild.recentEscalations.length },
    { accepted: true, stage: 2, count: 1 },
  );
  assert.deepEqual(
    { accepted: sceneRebuild.accepted, stage: sceneRebuild.stage, count: sceneRebuild.recentEscalations.length },
    { accepted: true, stage: 3, count: 2 },
  );
  assert.deepEqual(
    { accepted: blocked.accepted, stage: blocked.stage, exhausted: blocked.exhausted },
    { accepted: false, stage: 4, exhausted: true },
  );
});

test("destructive recovery timestamps expire after one minute", () => {
  const next = decideWorldRecovery(1, "ZERO_DRAW_CALLS", [1_000, 2_000], 62_000);
  assert.equal(next.accepted, true);
  assert.equal(next.stage, 2);
  assert.deepEqual(next.recentEscalations, [62_000]);
});
