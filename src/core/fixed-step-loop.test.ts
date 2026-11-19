import assert from "node:assert/strict";
import test from "node:test";
import { FixedStepLoop } from "./fixed-step-loop";

test("FixedStepLoop accumulates partial frames and advances in fixed increments", () => {
  const loop = new FixedStepLoop({ stepSeconds: 0.02 });
  const steps: number[] = [];

  const first = loop.advance(0.01, (step) => steps.push(step));
  assert.equal(first.steps, 0);
  assert.equal(first.alpha, 0.5);

  const second = loop.advance(0.03, (step) => steps.push(step));
  assert.equal(second.steps, 2);
  assert.deepEqual(steps, [0.02, 0.02]);
});

test("FixedStepLoop clamps long frames and caps catch-up work", () => {
  const loop = new FixedStepLoop({
    stepSeconds: 0.02,
    maxFrameDeltaSeconds: 0.1,
    maxStepsPerFrame: 2,
  });
  let updates = 0;

  const result = loop.advance(1, () => {
    updates += 1;
  });

  assert.equal(updates, 2);
  assert.equal(result.steps, 2);
  assert.ok(result.droppedSeconds > 0);
  assert.ok(result.alpha >= 0 && result.alpha < 1);
});
