import assert from "node:assert/strict";
import test from "node:test";
import { GameRuntime } from "./game-runtime";

test("GameRuntime runs registered systems at a fixed step and stops after cleanup", () => {
  const runtime = new GameRuntime();
  const steps: number[] = [];
  const unregister = runtime.register((stepSeconds) => steps.push(stepSeconds));

  runtime.advanceFrame(1 / 30);
  unregister();
  runtime.advanceFrame(1 / 30);

  assert.deepEqual(steps, [1 / 60, 1 / 60]);
});
