import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorldMotion,
  getWorldOriginDistance,
  interpolateWorldMotion,
  readWorldInput,
  stepWorldMotion,
  WORLD_ORIGIN_REBASE_INTERVAL_METERS,
} from "./movement.ts";

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

test("holding sprint accelerates beyond the normal joystick run speed", () => {
  let regular = createWorldMotion();
  let sprinting = createWorldMotion();
  const regularInput = readWorldInput(new Set(["w"]), { x: 0, y: 0 });
  const sprintInput = readWorldInput(new Set(["w", "shift"]), { x: 0, y: 0 });
  for (let index = 0; index < 50; index += 1) {
    regular = stepWorldMotion(regular, regularInput, 1 / 60);
    sprinting = stepWorldMotion(sprinting, sprintInput, 1 / 60);
  }
  assert.ok(sprinting.speed > regular.speed * 1.8);
});

test("joystick forward input advances measured distance and the camera", () => {
  const input = readWorldInput(new Set(), { x: 0, y: 0.9 });
  let state = createWorldMotion();
  for (let index = 0; index < 90; index += 1) {
    state = stepWorldMotion(state, input, 1 / 60);
  }
  assert.ok(state.distance > 6);
  assert.ok(state.cameraX > 1);
  assert.equal(state.motion, "running");
});

test("W/S and up/down advance along the road while A/D changes lanes", () => {
  const forward = readWorldInput(new Set(["w"]), { x: 0, y: 0 });
  const lateral = readWorldInput(new Set(["d"]), { x: 0, y: 0 });
  let state = createWorldMotion();
  for (let index = 0; index < 90; index += 1) {
    state = stepWorldMotion(state, forward, 1 / 60);
  }
  assert.ok(state.distance > 4);
  assert.ok(state.stepCount >= 3);
  assert.ok(state.zoom < 1 && state.zoom > 0.96);

  let depthState = createWorldMotion();
  for (let index = 0; index < 90; index += 1) {
    depthState = stepWorldMotion(depthState, lateral, 1 / 60);
  }
  assert.equal(depthState.distance, 0);
  assert.ok(depthState.depth > 0.25);
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

test("forward travel accumulates and updates facing toward movement", () => {
  let state = createWorldMotion();
  const right = readWorldInput(new Set(["w"]), { x: 0, y: 0 });
  for (let index = 0; index < 180; index += 1) {
    state = stepWorldMotion(state, right, 1 / 60);
  }

  assert.equal(state.facing, 1);
  assert.ok(state.distance > 8);
  assert.ok(state.cameraX > 0);
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

test("fixed-step render interpolation fills the gap without replacing simulation state", () => {
  const previous = createWorldMotion(12, -0.4);
  const current = stepWorldMotion(
    previous,
    readWorldInput(new Set(["w", "d"]), { x: 0, y: 0 }),
    1 / 60,
  );
  const target = createWorldMotion();
  interpolateWorldMotion(previous, current, 0.5, target);

  assert.equal(target.distance, (previous.distance + current.distance) / 2);
  assert.equal(target.depth, (previous.depth + current.depth) / 2);
  assert.equal(target.stepCount, current.stepCount);
  assert.equal(target.hasMoved, current.hasMoved);
  assert.equal(previous.distance, 12);
});

test("backward movement reverses the travel camera instead of freezing at the origin", () => {
  let backward = createWorldMotion();
  const input = readWorldInput(new Set(["s"]), { x: 0, y: 0 });
  for (let index = 0; index < 30; index += 1) backward = stepWorldMotion(backward, input, 1 / 60);
  assert.ok(backward.distance < 0);
  assert.ok(backward.cameraX < 0);
});

test("floating origin keeps render coordinates bounded while preserving absolute distance", () => {
  const threshold = WORLD_ORIGIN_REBASE_INTERVAL_METERS;
  let state = createWorldMotion(threshold - 0.01);
  assert.equal(state.originDistance, 0);

  state = stepWorldMotion(state, readWorldInput(new Set(["w"]), { x: 0, y: 0 }), 0.05);
  assert.ok(state.distance > threshold);
  assert.equal(state.originDistance, threshold);
  assert.ok(state.distance - state.originDistance < 1);
  assert.equal(getWorldOriginDistance(threshold * 10 + 3), threshold * 10);
  assert.equal(getWorldOriginDistance(-threshold), 0);

  const interpolated = createWorldMotion();
  interpolateWorldMotion(state, state, 0.5, interpolated);
  assert.equal(interpolated.distance, state.distance);
  assert.equal(interpolated.originDistance, state.originDistance);
});
