import assert from "node:assert/strict";
import test from "node:test";
import {
  beginWarRoomJoystick,
  beginWarRoomButtonPointer,
  beginWarRoomLook,
  createWarRoomMobileControlsState,
  endWarRoomMobilePointer,
  getWarRoomTouchControlSide,
  isWarRoomLookDeltaValid,
  WAR_ROOM_MAX_LOOK_DELTA_PIXELS,
  readWarRoomJoystick,
  readWarRoomMouseLook,
  resetWarRoomMobileControls,
} from "./war-room-mobile-controls.ts";

test("joystick can start at any screen coordinate and reports local movement axes", () => {
  const controls = createWarRoomMobileControlsState();
  assert.equal(beginWarRoomJoystick(controls, 31, 348, 210, 40), true);
  const reading = readWarRoomJoystick(controls, 31, 388, 210);
  assert.ok(reading);
  assert.ok(Math.abs(reading.x - 1) < 1e-9);
  assert.ok(Math.abs(reading.y) < 1e-9);
});

test("mobile touch zones route the left half to movement and the right half to camera look", () => {
  assert.equal(getWarRoomTouchControlSide(120, 20, 400), "movement");
  assert.equal(getWarRoomTouchControlSide(220, 20, 400), "look");
  assert.equal(getWarRoomTouchControlSide(0, 0, 0), null);
});

test("camera look ignores jitter and clamps pointer jumps to 80 pixels", () => {
  assert.equal(isWarRoomLookDeltaValid(0.2, 0.2), false);
  assert.equal(isWarRoomLookDeltaValid(81, 0), false);
  assert.equal(isWarRoomLookDeltaValid(0, 80), true);
  assert.equal(WAR_ROOM_MAX_LOOK_DELTA_PIXELS, 80);
  assert.equal(isWarRoomLookDeltaValid(20, -12), true);
});

test("joystick rejects other pointers, filters touch jitter, and clamps diagonals", () => {
  const controls = createWarRoomMobileControlsState();
  beginWarRoomJoystick(controls, 7, 140, 300, 40);
  assert.equal(readWarRoomJoystick(controls, 8, 180, 300), null);
  assert.deepEqual(readWarRoomJoystick(controls, 7, 143, 300), { x: 0, y: 0 });
  const diagonal = readWarRoomJoystick(controls, 7, 200, 240);
  assert.ok(diagonal);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-9);
});

test("joystick deadzone filters fifteen percent of its travel", () => {
  const controls = createWarRoomMobileControlsState();
  beginWarRoomJoystick(controls, 22, 100, 100, 100);
  assert.deepEqual(readWarRoomJoystick(controls, 22, 115, 100), { x: 0, y: 0 });
  assert.ok((readWarRoomJoystick(controls, 22, 116, 100)?.x ?? 0) > 0);
});

test("look and movement pointers release independently and clear on reset", () => {
  const controls = createWarRoomMobileControlsState();
  beginWarRoomJoystick(controls, 1, 100, 300, 40);
  beginWarRoomLook(controls, {
    pointerId: 2,
    x: 300,
    y: 200,
    pointerType: "touch",
    button: 2,
  });
  assert.deepEqual(readWarRoomMouseLook(controls, 2, 310, 190), {
    dx: 10,
    dy: -10,
    pointerType: "touch",
    button: 2,
  });
  assert.deepEqual(endWarRoomMobilePointer(controls, 2), {
    endedJoystick: false,
    endedLook: { pointerId: 2, x: 310, y: 190, pointerType: "touch", button: 2 },
  });
  assert.equal(controls.roles.has(2), false);
  assert.equal(controls.roles.get(1), "joystick");
  assert.ok(controls.joystick);
  resetWarRoomMobileControls(controls);
  assert.equal(controls.joystick, null);
  assert.equal(controls.look, null);
  assert.equal(controls.roles.size, 0);
});

test("each touch pointer stays assigned to its original control role", () => {
  const controls = createWarRoomMobileControlsState();
  beginWarRoomButtonPointer(controls, 9);
  assert.equal(beginWarRoomJoystick(controls, 9, 120, 300, 42, 0), false);
  assert.equal(beginWarRoomLook(controls, {
    pointerId: 9, x: 120, y: 300, pointerType: "touch", button: 0,
  }), false);
  assert.equal(controls.roles.get(9), "button");
});

test("the first look event only establishes a reference and the next delta is bounded", () => {
  const controls = createWarRoomMobileControlsState();
  beginWarRoomLook(controls, {
    pointerId: 4, x: 100, y: 100, pointerType: "touch", button: 0,
  });
  assert.deepEqual(readWarRoomMouseLook(controls, 4, 100, 100), null);
  const delta = readWarRoomMouseLook(controls, 4, 400, 100);
  assert.deepEqual(delta, {
    dx: WAR_ROOM_MAX_LOOK_DELTA_PIXELS,
    dy: 0,
    pointerType: "touch",
    button: 0,
  });
});
