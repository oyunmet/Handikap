import assert from "node:assert/strict";
import test from "node:test";
import {
  createWarRoomTouchInputState,
  endWarRoomTouch,
  moveWarRoomTouch,
  recordWarRoomTouchFrame,
  resetWarRoomTouchInput,
  startWarRoomTouch,
  WAR_ROOM_TOUCH_JOYSTICK_RADIUS,
} from "./war-room-touch-input.ts";

test("floating joystick starts anywhere on the screen with immediate bounded movement", () => {
  const state = createWarRoomTouchInputState();
  const points = [
    [0, 0],
    [843, 0],
    [0, 843],
    [843, 843],
    [422, 422],
    [12, 420],
    [832, 420],
  ];
  for (let index = 0; index < points.length; index += 1) {
    const [x, y] = points[index];
    assert.equal(startWarRoomTouch(state, index, x, y, 844, "any"), "joystick");
    const moved = moveWarRoomTouch(state, index, x, y - 42);
    assert.ok(moved);
    assert.ok(state.input.moveY > 0.5);
    assert.equal(state.joy.ox, x);
    assert.equal(state.joy.oy, y);
    assert.deepEqual(endWarRoomTouch(state, index), { endedJoystick: true, endedLook: false });
    assert.deepEqual([state.input.moveX, state.input.moveY], [0, 0]);
  }
});

test("the second free touch looks from either screen side without stealing movement", () => {
  for (const lookX of [16, 828]) {
    const state = createWarRoomTouchInputState();
    assert.equal(startWarRoomTouch(state, 1, 820, 400, 844, "any"), "joystick");
    assert.equal(startWarRoomTouch(state, 2, lookX, 240, 844, "any"), "look");
    assert.equal(startWarRoomTouch(state, 3, 400, 300, 844, "any"), null);

    moveWarRoomTouch(state, 1, 820, 340);
    const look = moveWarRoomTouch(state, 2, lookX + 30, 220);
    assert.ok(state.input.moveY > 0.5);
    assert.deepEqual(look, { role: "look", dx: 30, dy: -20 });
    assert.equal(state.roles.get(1), "joystick");
    assert.equal(state.roles.get(2), "look");
    assert.equal(state.roles.has(3), false);
  }
});

test("look applies every changed touch delta per axis and continues until its identifier ends", () => {
  const state = createWarRoomTouchInputState();
  assert.equal(startWarRoomTouch(state, 41, 600, 140, 844), "look");
  assert.deepEqual(moveWarRoomTouch(state, 41, 720, 260), { role: "look", dx: 120, dy: 120 });
  assert.deepEqual([state.input.lookDX, state.input.lookDY], [120, 120]);
  assert.deepEqual(moveWarRoomTouch(state, 41, 760, 270), { role: "look", dx: 40, dy: 10 });
  assert.deepEqual([state.input.lookDX, state.input.lookDY], [160, 130]);
  assert.deepEqual(endWarRoomTouch(state, 41), { endedJoystick: false, endedLook: true });
  assert.equal(state.roles.size, 0);
});

test("simultaneous movement and look have independent touch ownership", () => {
  const state = createWarRoomTouchInputState();
  startWarRoomTouch(state, 11, 190, 310, 844);
  startWarRoomTouch(state, 12, 670, 200, 844);
  moveWarRoomTouch(state, 11, 190, 270);
  moveWarRoomTouch(state, 12, 710, 180);
  assert.ok(state.input.moveY > 0.5);
  assert.deepEqual([state.input.lookDX, state.input.lookDY], [40, -20]);
  endWarRoomTouch(state, 12);
  assert.ok(state.input.moveY > 0.5);
  endWarRoomTouch(state, 11);
  assert.deepEqual([state.input.moveX, state.input.moveY], [0, 0]);
});

test("a new touch replaces stale same-side ownership and short taps clean up", () => {
  const state = createWarRoomTouchInputState();
  startWarRoomTouch(state, 1, 100, 100, 844);
  moveWarRoomTouch(state, 1, 100, 40);
  assert.equal(startWarRoomTouch(state, 2, 120, 110, 844), "joystick");
  assert.equal(state.roles.has(1), false);
  assert.deepEqual([state.input.moveX, state.input.moveY], [0, 0]);
  assert.deepEqual(endWarRoomTouch(state, 2), { endedJoystick: true, endedLook: false });
  assert.equal(state.joy.id, -1);
  assert.equal(WAR_ROOM_TOUCH_JOYSTICK_RADIUS, 60);
});

test("reset clears all gesture ids, origins, deltas, and diagnostic frame state remains live", () => {
  const state = createWarRoomTouchInputState();
  startWarRoomTouch(state, 2, 120, 110, 844);
  startWarRoomTouch(state, 3, 700, 200, 844);
  moveWarRoomTouch(state, 2, 120, 50);
  moveWarRoomTouch(state, 3, 750, 230);
  resetWarRoomTouchInput(state);
  assert.deepEqual(state.joy, { id: -1, ox: 0, oy: 0 });
  assert.deepEqual(state.look, { id: -1, lx: 0, ly: 0 });
  assert.deepEqual(state.input, { moveX: 0, moveY: 0, lookDX: 0, lookDY: 0 });
  assert.equal(state.roles.size, 0);
  recordWarRoomTouchFrame(state, 1.25, -0.3, true, false, 1_000);
  recordWarRoomTouchFrame(state, 1.3, -0.2, false, false, 1_500);
  assert.equal(state.frames, 2);
  assert.equal(state.yaw, 1.3);
  assert.equal(state.paused, false);
  assert.ok(state.fps > 0);
});
