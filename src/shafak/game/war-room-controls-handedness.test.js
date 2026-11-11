import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultWarRoomControlLayout,
  isWarRoomMovementTouchAllowed,
  isWarRoomLeftHandedLayout,
  setWarRoomControlHandedness,
} from "./war-room-controls.ts";
import { getWarRoomTouchControlSide } from "./war-room-mobile-controls.ts";
import { createWarRoomTouchInputState, startWarRoomTouch } from "./war-room-touch-input.ts";

test("left-handed layout moves action controls to the other side and swaps touch zones", () => {
  const right = createDefaultWarRoomControlLayout();
  const left = setWarRoomControlHandedness(right, true);

  assert.equal(isWarRoomLeftHandedLayout(right), false);
  assert.equal(isWarRoomLeftHandedLayout(left), true);
  assert.equal(left.fire.x, 1 - right.fire.x);
  assert.equal(left.aim.x, 1 - right.aim.x);
  assert.equal(left["weapon-select"].x, right["weapon-select"].x);
  assert.equal(setWarRoomControlHandedness(left, false).fire.x, right.fire.x);
});

test("left-handed mode swaps movement and look touch zones", () => {
  const width = 400;
  assert.equal(getWarRoomTouchControlSide(100, 0, width, false), "movement");
  assert.equal(getWarRoomTouchControlSide(300, 0, width, false), "look");
  assert.equal(getWarRoomTouchControlSide(100, 0, width, true), "look");
  assert.equal(getWarRoomTouchControlSide(300, 0, width, true), "movement");
  assert.equal(isWarRoomMovementTouchAllowed(300, 200, width, 400, true), true);

  const touchState = createWarRoomTouchInputState();
  assert.equal(startWarRoomTouch(touchState, 1, 300, 200, width, "right"), "joystick");
});
