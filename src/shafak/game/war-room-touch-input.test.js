import assert from "node:assert/strict";
import test from "node:test";
import {
  createWarRoomTouchInputState,
  endWarRoomTouch,
  moveWarRoomTouch,
  resetWarRoomTouchInput,
  startWarRoomTouch,
  WAR_ROOM_TOUCH_JOYSTICK_RADIUS,
} from "./war-room-touch-input.ts";

test("default touch zones map the left half to movement and right half to camera look", () => {
  const state = createWarRoomTouchInputState();
  assert.equal(startWarRoomTouch(state, 1, 80, 100, 400), "joystick");
  assert.equal(startWarRoomTouch(state, 2, 320, 100, 400), "look");
  assert.equal(startWarRoomTouch(state, 3, 320, 100, 400), null);
});

test("left-handed movement zone moves to the right half", () => {
  const state = createWarRoomTouchInputState();
  assert.equal(startWarRoomTouch(state, 1, 320, 100, 400, "right"), "joystick");
  assert.equal(startWarRoomTouch(state, 2, 80, 100, 400, "right"), "look");
});

test("joystick movement is normalized and releasing the touch clears it", () => {
  const state = createWarRoomTouchInputState();
  assert.equal(startWarRoomTouch(state, 1, 80, 100, 400), "joystick");
  const reading = moveWarRoomTouch(state, 1, 80 + WAR_ROOM_TOUCH_JOYSTICK_RADIUS, 100);
  assert.equal(reading?.role, "joystick");
  assert.equal(reading?.moveX, 1);
  assert.equal(reading?.moveY, 0);
  assert.deepEqual(endWarRoomTouch(state, 1), { endedJoystick: true, endedLook: false });
  assert.deepEqual(state.input, { moveX: 0, moveY: 0, lookDX: 0, lookDY: 0 });
});

test("right-side look reports bounded per-move camera deltas", () => {
  const state = createWarRoomTouchInputState();
  assert.equal(startWarRoomTouch(state, 1, 320, 100, 400), "look");
  const reading = moveWarRoomTouch(state, 1, 500, 100);
  assert.equal(reading?.role, "look");
  assert.equal(reading?.dx, 120);
  assert.equal(reading?.dy, 0);
  assert.deepEqual(endWarRoomTouch(state, 1), { endedJoystick: false, endedLook: true });
});

test("reset clears active touch roles and values without losing diagnostics", () => {
  const state = createWarRoomTouchInputState();
  assert.equal(startWarRoomTouch(state, 1, 80, 100, 400), "joystick");
  state.touchstart = 1;
  moveWarRoomTouch(state, 1, 100, 90);
  resetWarRoomTouchInput(state);
  assert.equal(state.roles.size, 0);
  assert.equal(state.touchstart, 1);
  assert.deepEqual(state.input, { moveX: 0, moveY: 0, lookDX: 0, lookDY: 0 });
});
