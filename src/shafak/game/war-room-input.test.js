import test from "node:test";
import assert from "node:assert/strict";
import {
  beginWarRoomPointer,
  endWarRoomPointer,
  moveWarRoomPointer,
  pressWarRoomAction,
  releaseWarRoomAction,
  resolveWarRoomStanceTap,
  setWarRoomMoveVector,
} from "./war-room-input.ts";

function createInput() {
  return {
    keys: new Set(),
    moveX: 0,
    moveY: 0,
    yaw: 0,
    pitch: 0,
    facingSetting: "camera",
    fireHeld: false,
    firePressed: false,
    fireReleased: false,
    aimHeld: false,
    reloadPressed: false,
    swapPressed: false,
    jumpPressed: false,
    dodgePressed: false,
    crouchPressed: false,
    sprintLocked: false,
    weaponSlotPressed: null,
    pronePressed: false,
    paused: false,
  };
}

test("independent pointers preserve joystick, fire, and look ownership", () => {
  const pointers = new Map();
  beginWarRoomPointer(pointers, 11, { x: 20, y: 30, pointerType: "touch", button: -1 });
  beginWarRoomPointer(pointers, 12, { x: 400, y: 300, pointerType: "touch", button: -1 });
  beginWarRoomPointer(pointers, 13, { x: 700, y: 360, pointerType: "touch", button: -1 });

  assert.deepEqual(moveWarRoomPointer(pointers, 11, 35, 25), { dx: 15, dy: -5 });
  assert.deepEqual(moveWarRoomPointer(pointers, 12, 410, 295), { dx: 10, dy: -5 });
  assert.deepEqual(moveWarRoomPointer(pointers, 13, 704, 348), { dx: 4, dy: -12 });
  assert.equal(endWarRoomPointer(pointers, 12), true);
  assert.equal(pointers.has(11), true);
  assert.equal(pointers.has(13), true);
  assert.equal(moveWarRoomPointer(pointers, 12, 500, 500), null);
});

test("touch and keyboard controls produce the expected input-only actions", () => {
  const input = createInput();
  pressWarRoomAction(input, "fire");
  pressWarRoomAction(input, "aim");
  pressWarRoomAction(input, "reload");
  pressWarRoomAction(input, "jump");
  pressWarRoomAction(input, "crouch");
  pressWarRoomAction(input, "dodge");
  pressWarRoomAction(input, "swap");
  pressWarRoomAction(input, "weapon-slot", 1);
  pressWarRoomAction(input, "sprint-lock");

  assert.equal(input.fireHeld, true);
  assert.equal(input.firePressed, true);
  assert.equal(input.aimHeld, true);
  assert.equal(input.reloadPressed, true);
  assert.equal(input.jumpPressed, true);
  assert.equal(input.crouchPressed, true);
  assert.equal(input.dodgePressed, true);
  assert.equal(input.swapPressed, true);
  assert.equal(input.weaponSlotPressed, 1);
  assert.equal(input.sprintLocked, true);

  releaseWarRoomAction(input, "fire");
  releaseWarRoomAction(input, "aim");
  assert.equal(input.fireHeld, false);
  assert.equal(input.fireReleased, true);
  assert.equal(input.aimHeld, false);
});

test("movement vectors are finite and clamped to the unit circle", () => {
  const input = createInput();
  setWarRoomMoveVector(input, 1, 1);
  assert.ok(Math.abs(Math.hypot(input.moveX, input.moveY) - 1) < 1e-9);
  setWarRoomMoveVector(input, Number.NaN, 2);
  assert.deepEqual([input.moveX, input.moveY], [0, 1]);
});

test("a quick second crouch tap requests prone instead of a second crouch toggle", () => {
  const firstTap = resolveWarRoomStanceTap(null, 100);
  assert.deepEqual(firstTap, { action: "crouch", nextTapAt: 100 });
  assert.deepEqual(resolveWarRoomStanceTap(firstTap.nextTapAt, 340), {
    action: "prone",
    nextTapAt: null,
  });
  assert.equal(resolveWarRoomStanceTap(firstTap.nextTapAt, 500).action, "crouch");
});
