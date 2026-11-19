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

test("GameRuntime notifies frame systems after fixed updates with interpolation state", () => {
  const runtime = new GameRuntime();
  const events: Array<string | [string, number, number]> = [];
  runtime.register(() => events.push("step"));
  const unregisterFrame = runtime.registerFrame(({ steps, alpha }) => {
    events.push(["frame", steps, alpha]);
  });

  runtime.advanceFrame(1 / 30);
  unregisterFrame();
  runtime.advanceFrame(1 / 60);

  assert.deepEqual(events, [
    "step",
    "step",
    ["frame", 2, 0],
    "step",
  ]);
});
