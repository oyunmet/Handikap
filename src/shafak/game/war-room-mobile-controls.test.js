import assert from "node:assert/strict";
import test from "node:test";
import {
  beginWarRoomJoystick,
  beginWarRoomLook,
  createWarRoomMobileControlsState,
  endWarRoomMobilePointer,
  getWarRoomAutoFollowYaw,
  getWarRoomTouchControlSide,
  readWarRoomJoystick,
  readWarRoomMouseLook,
  rebaseWarRoomJoystick,
  resetWarRoomMobileControls,
} from "./war-room-mobile-controls.ts";

test("joystick can start at any screen coordinate and captures a stable camera basis", () => {
  const controls = createWarRoomMobileControlsState();
  assert.equal(beginWarRoomJoystick(controls, 31, 348, 210, 40, Math.PI / 2), true);
  const reading = readWarRoomJoystick(controls, 31, 388, 210);
  assert.ok(reading);
  assert.ok(Math.abs(reading.x - 1) < 1e-9);
  assert.ok(Math.abs(reading.y) < 1e-9);
  assert.ok(Math.abs(reading.baseYaw - Math.PI / 2) < 1e-9);
  assert.ok(Math.abs(reading.cameraYaw - Math.PI) < 1e-9);
});

test("mobile touch zones route the left half to movement and the right half to camera look", () => {
  assert.equal(getWarRoomTouchControlSide(120, 20, 400), "movement");
  assert.equal(getWarRoomTouchControlSide(220, 20, 400), "look");
  assert.equal(getWarRoomTouchControlSide(0, 0, 0), null);
});

test("automatic camera yaw follows an active stick direction but stays still at neutral", () => {
  assert.ok(Math.abs(getWarRoomAutoFollowYaw(Math.PI / 2, 1, 0) - Math.PI) < 1e-9);
  assert.equal(getWarRoomAutoFollowYaw(0, 0, 0), null);
});

test("joystick rejects other pointers, filters touch jitter, and clamps diagonals", () => {
  const controls = createWarRoomMobileControlsState();
  beginWarRoomJoystick(controls, 7, 140, 300, 40, 0);
  assert.equal(readWarRoomJoystick(controls, 8, 180, 300), null);
  assert.deepEqual(readWarRoomJoystick(controls, 7, 143, 300), {
    x: 0,
    y: 0,
    baseYaw: 0,
    cameraYaw: null,
  });
  const diagonal = readWarRoomJoystick(controls, 7, 200, 240);
  assert.ok(diagonal);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-9);
  assert.ok(Math.abs(diagonal.cameraYaw - Math.PI / 4) < 1e-9);
});

test("camera yaw is always computed from the gesture start, not its smoothed current yaw", () => {
  const controls = createWarRoomMobileControlsState();
  beginWarRoomJoystick(controls, 4, 200, 400, 40, -Math.PI / 2);
  const first = readWarRoomJoystick(controls, 4, 240, 400);
  const second = readWarRoomJoystick(controls, 4, 240, 400);
  assert.equal(first.cameraYaw, second.cameraYaw);
  assert.ok(Math.abs(first.cameraYaw) < 1e-9);
});

test("manual camera movement rebases the active joystick without changing its pointer origin", () => {
  const controls = createWarRoomMobileControlsState();
  beginWarRoomJoystick(controls, 14, 200, 400, 40, 0);
  assert.equal(rebaseWarRoomJoystick(controls, Math.PI / 2), Math.PI / 2);
  const reading = readWarRoomJoystick(controls, 14, 240, 400);
  assert.equal(reading.baseYaw, Math.PI / 2);
  assert.ok(Math.abs(reading.cameraYaw - Math.PI) < 1e-9);
  assert.equal(controls.joystick.originX, 200);
});

test("look and movement pointers release independently and clear on reset", () => {
  const controls = createWarRoomMobileControlsState();
  beginWarRoomJoystick(controls, 1, 100, 300, 40, 0);
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
  assert.ok(controls.joystick);
  resetWarRoomMobileControls(controls);
  assert.equal(controls.joystick, null);
  assert.equal(controls.look, null);
});
