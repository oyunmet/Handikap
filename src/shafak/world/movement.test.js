import assert from "node:assert/strict";
import test from "node:test";
import { createWorldMotion, readWorldInput, stepWorldMotion } from "./movement.ts";

test("keyboard input reads WASD and arrows and normalizes diagonal travel", () => {
  const diagonal = readWorldInput(new Set(["w", "d"]), { x: 0, y: 0 });
  const north = readWorldInput(new Set(["arrowup"]), { x: 0, y: 0 });

  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-10);
  assert.ok(Math.abs(diagonal.x - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(diagonal.y - Math.SQRT1_2) < 1e-12);
  assert.deepEqual([north.x, north.y], [0, 1]);
});

test("joystick input preserves analog magnitude for walk-to-run speed", () => {
  const quarter = readWorldInput(new Set(), { x: 0, y: 0.25 });
  const pushed = readWorldInput(new Set(), { x: 0, y: 0.9 });
  let slow = createWorldMotion();
  let fast = createWorldMotion();
  for (let index = 0; index < 45; index += 1) {
    slow = stepWorldMotion(slow, quarter, 1 / 60);
    fast = stepWorldMotion(fast, pushed, 1 / 60);
  }

  assert.ok(fast.speed > slow.speed * 2);
  assert.equal(fast.motion, "running");
});

test("movement accelerates smoothly, advances the world, and emits footfall events", () => {
  const input = readWorldInput(new Set(["w"]), { x: 0, y: 0 });
  let state = createWorldMotion();
  const first = stepWorldMotion(state, input, 1 / 60);
  assert.ok(first.speed > 0 && first.speed < 126);
  assert.equal(first.distance, first.velocityY / 60);

  for (let index = 0; index < 90; index += 1) {
    state = stepWorldMotion(state, input, 1 / 60);
  }
  assert.ok(state.distance > 150);
  assert.ok(state.stepCount >= 3);
  assert.ok(state.zoom < 1 && state.zoom > 0.96);
});

test("releasing input decelerates rather than stopping immediately", () => {
  const moving = stepWorldMotion(
    createWorldMotion(),
    readWorldInput(new Set(["w"]), { x: 0, y: 0 }),
    0.05,
  );
  const released = stepWorldMotion(moving, readWorldInput(new Set(), { x: 0, y: 0 }), 1 / 60);

  assert.ok(released.speed > 0);
  assert.ok(released.speed < moving.speed);
  assert.ok(released.speed > moving.speed * 0.8);
});

test("horizontal travel stays bounded and flips the character toward movement", () => {
  let state = createWorldMotion();
  const right = readWorldInput(new Set(["d"]), { x: 0, y: 0 });
  for (let index = 0; index < 180; index += 1) {
    state = stepWorldMotion(state, right, 1 / 60);
  }

  assert.equal(state.facing, -1);
  assert.equal(state.positionX, 1);
});

test("invalid delta time does not inject movement", () => {
  const result = stepWorldMotion(
    createWorldMotion(),
    readWorldInput(new Set(["w"]), { x: 0, y: 0 }),
    Number.NaN,
  );
  assert.equal(result.speed, 0);
  assert.equal(result.distance, 0);
});

test("backward movement reverses the travel camera instead of freezing at the origin", () => {
  const backward = stepWorldMotion(
    createWorldMotion(),
    readWorldInput(new Set(["s"]), { x: 0, y: 0 }),
    0.05,
  );
  assert.ok(backward.distance < 0);
  assert.ok(backward.cameraLead > 0);
});
