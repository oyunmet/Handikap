import assert from "node:assert/strict";
import test from "node:test";
import {
  cancelWarRoomPostAttackStrafeOnMovement,
  getWarRoomPostAttackStrafeUntil,
  resolveWarRoomOrientation,
} from "./war-room-orientation.ts";

function closeAngle(actual, expected) {
  const difference = Math.atan2(Math.sin(actual - expected), Math.cos(actual - expected));
  assert.ok(Math.abs(difference) < 1e-8, `expected ${actual} to be close to ${expected}`);
}

test("backward joystick movement faces the player toward the camera", () => {
  const result = resolveWarRoomOrientation(0, 0, -1, 0, false);
  closeAngle(result.yaw, Math.PI);
  assert.equal(result.facingCamera, true);
  assert.equal(result.mode, "HAREKET");
  assert.equal(result.joystickAngleDegrees, 180);
});

test("forward and lateral joystick movement face their corresponding world directions", () => {
  const forward = resolveWarRoomOrientation(0, 0, 1, Math.PI, false);
  closeAngle(forward.yaw, 0);
  assert.equal(forward.facingCamera, false);
  assert.equal(forward.joystickAngleDegrees, 0);

  const right = resolveWarRoomOrientation(0, 1, 0, 0, false);
  closeAngle(right.yaw, Math.PI / 2);
  assert.equal(right.joystickAngleDegrees, 90);

  const left = resolveWarRoomOrientation(0, -1, 0, 0, false);
  closeAngle(left.yaw, -Math.PI / 2);
  assert.equal(left.joystickAngleDegrees, -90);
});

test("strafe mode faces the camera and idle movement keeps its last body direction", () => {
  const strafing = resolveWarRoomOrientation(0.4, 0, -1, 0, true);
  closeAngle(strafing.yaw, 0.4);
  assert.equal(strafing.mode, "STRAFE");

  const idle = resolveWarRoomOrientation(0, 0, 0, Math.PI, false);
  closeAngle(idle.yaw, Math.PI);
  assert.equal(idle.joystickAngleDegrees, null);
  assert.equal(idle.facingCamera, true);
});

test("post-attack strafe ends 0.8 seconds after the attack animation", () => {
  assert.ok(Math.abs(getWarRoomPostAttackStrafeUntil(4, 0.6) - 5.4) < 1e-9);
  assert.ok(Math.abs(getWarRoomPostAttackStrafeUntil(4) - 4.8) < 1e-9);
  assert.equal(cancelWarRoomPostAttackStrafeOnMovement(5.4, 4.2, 0.4, 0), 4.2);
  assert.equal(cancelWarRoomPostAttackStrafeOnMovement(5.4, 4.2, 0.01, 0), 5.4);
});
