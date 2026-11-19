import assert from "node:assert/strict";
import test from "node:test";
import { GameInputManager } from "./input-manager";

test("input manager normalizes movement and returns a reusable frame snapshot", () => {
  const input = new GameInputManager();
  input.setTouchMovement(1, 1);
  input.setAction("jump", true);
  input.addLookDelta(12, -4);

  const first = input.readFrame();
  assert.equal(Math.round(Math.hypot(first.moveX, first.moveY) * 100), 100);
  assert.equal(first.lookX, 12);
  assert.equal(first.lookY, -4);
  assert.equal(first.actions.has("jump"), true);

  const second = input.readFrame();
  assert.equal(second, first);
  assert.equal(second.lookX, 0);
  assert.equal(second.lookY, 0);
  assert.equal(second.actions.has("jump"), true);
});

test("input manager ignores non-finite touch and look values", () => {
  const input = new GameInputManager();
  input.setTouchMovement(Number.NaN, Number.POSITIVE_INFINITY);
  input.addLookDelta(Number.NaN, 3);

  const frame = input.readFrame();
  assert.equal(frame.moveX, 0);
  assert.equal(frame.moveY, 0);
  assert.equal(frame.lookX, 0);
  assert.equal(frame.lookY, 3);
});
