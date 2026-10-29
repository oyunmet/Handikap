import assert from "node:assert/strict";
import test from "node:test";
import {
  cancelWarRoomPostAttackStrafeOnMovement,
  getWarRoomActorYawToTarget,
  getWarRoomPostAttackStrafeUntil,
  resolveWarRoomLocomotion,
  resolveWarRoomOrientation,
  stepWarRoomYaw,
} from "./war-room-orientation.ts";

function closeAngle(actual, expected) {
  const difference = Math.atan2(Math.sin(actual - expected), Math.cos(actual - expected));
  assert.ok(Math.abs(difference) < 1e-8, `expected ${actual} to be close to ${expected}`);
}

test("movement-facing mode turns toward backward joystick input", () => {
  const result = resolveWarRoomOrientation(0, 0, -1, 0, false, "movement");
  closeAngle(result.yaw, Math.PI);
  assert.equal(result.facingCamera, true);
  assert.equal(result.mode, "HAREKET");
  assert.equal(result.joystickAngleDegrees, 180);
});

test("movement-facing mode turns toward forward and lateral world directions", () => {
  const forward = resolveWarRoomOrientation(0, 0, 1, Math.PI, false, "movement");
  closeAngle(forward.yaw, 0);
  assert.equal(forward.facingCamera, false);
  assert.equal(forward.joystickAngleDegrees, 0);

  const right = resolveWarRoomOrientation(0, 1, 0, 0, false, "movement");
  closeAngle(right.yaw, Math.PI / 2);
  assert.equal(right.joystickAngleDegrees, 90);

  const left = resolveWarRoomOrientation(0, -1, 0, 0, false, "movement");
  closeAngle(left.yaw, -Math.PI / 2);
  assert.equal(left.joystickAngleDegrees, -90);
});

test("camera-facing mode tracks idle camera yaw while aim keeps strafe behavior", () => {
  const strafing = resolveWarRoomOrientation(0.4, 0, -1, 0, true);
  closeAngle(strafing.yaw, 0.4);
  assert.equal(strafing.mode, "STRAFE");

  const idle = resolveWarRoomOrientation(0, 0, 0, Math.PI, false);
  closeAngle(idle.yaw, 0);
  assert.equal(idle.mode, "KAMERA");
  assert.equal(idle.joystickAngleDegrees, null);
  assert.equal(idle.facingCamera, false);

  const movementIdle = resolveWarRoomOrientation(0, 0, 0, Math.PI, false, "movement");
  closeAngle(movementIdle.yaw, Math.PI);
  assert.equal(movementIdle.mode, "HAREKET");
  assert.equal(movementIdle.facingCamera, true);
});

test("locomotion resolves forward, backward, and sideways directions in body space", () => {
  assert.equal(resolveWarRoomLocomotion(0, 1, 0, 0).direction, "forward");
  const backward = resolveWarRoomLocomotion(0, -1, 0, 0);
  assert.equal(backward.direction, "backward");
  assert.equal(backward.playbackScale, -1);
  assert.equal(resolveWarRoomLocomotion(1, 0, 0, 0).direction, "right");
  assert.equal(resolveWarRoomLocomotion(-1, 0, 0, 0).direction, "left");
  assert.equal(resolveWarRoomLocomotion(0, 0, 0, 0).direction, "idle");
});

test("body rotation takes the short path across the ±180° boundary", () => {
  const from = Math.PI - 0.04;
  const to = -Math.PI + 0.04;
  const step = stepWarRoomYaw(from, to, 0.05);
  assert.ok(step > from, "the body should turn forward through 180°");
  assert.ok(Math.abs(Math.atan2(Math.sin(to - step), Math.cos(to - step))) < 0.012);
});

test("enemy model yaw compensates for its built-in facing offset", () => {
  closeAngle(getWarRoomActorYawToTarget(0, 0, 0, -5, Math.PI) + Math.PI, 0);
  closeAngle(getWarRoomActorYawToTarget(0, 0, 5, 0, Math.PI) + Math.PI, Math.PI / 2);
});

test("camera-facing body rotation catches up within 120 ms across the wrap boundary", () => {
  let yaw = Math.PI - 0.2;
  const target = -Math.PI + 0.2;
  for (let elapsed = 0; elapsed < 0.12; elapsed += 1 / 60) {
    yaw = stepWarRoomYaw(yaw, target, 1 / 60, 55);
  }
  const remaining = Math.abs(Math.atan2(Math.sin(target - yaw), Math.cos(target - yaw)));
  assert.ok(remaining < 0.01, `body should be within 0.01 radians; remaining ${remaining}`);
});

test("post-attack strafe ends 0.8 seconds after the attack animation", () => {
  assert.ok(Math.abs(getWarRoomPostAttackStrafeUntil(4, 0.6) - 5.4) < 1e-9);
  assert.ok(Math.abs(getWarRoomPostAttackStrafeUntil(4) - 4.8) < 1e-9);
  assert.equal(cancelWarRoomPostAttackStrafeOnMovement(5.4, 4.2, 0.4, 0), 4.2);
  assert.equal(cancelWarRoomPostAttackStrafeOnMovement(5.4, 4.2, 0.01, 0), 5.4);
});
