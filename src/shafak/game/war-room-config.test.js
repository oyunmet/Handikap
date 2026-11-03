import assert from "node:assert/strict";
import test from "node:test";
import { WAR_ROOM_CONFIG } from "./war-room-config.ts";

test("shared War Room config preserves the established movement and camera defaults", () => {
  assert.equal(WAR_ROOM_CONFIG.player.collisionRadius, 0.4);
  assert.equal(WAR_ROOM_CONFIG.camera.firstPerson.near, 0.05);
  assert.equal(WAR_ROOM_CONFIG.camera.firstPerson.far, 100);
  assert.equal(WAR_ROOM_CONFIG.camera.pitchLimitDegrees, 85);
});

test("shared War Room config preserves active and raw-touch input limits", () => {
  assert.equal(WAR_ROOM_CONFIG.input.pointerJoystickDeadZone, 0.15);
  assert.equal(WAR_ROOM_CONFIG.input.touchJoystickDeadZone, 0.12);
  assert.equal(WAR_ROOM_CONFIG.input.touchJoystickRadius, 60);
});

test("shared War Room config preserves current sensitivity, door, and render budgets", () => {
  assert.equal(WAR_ROOM_CONFIG.sensitivity.horizontal, 0.007);
  assert.equal(WAR_ROOM_CONFIG.sensitivity.vertical, 0.0045);
  assert.equal(WAR_ROOM_CONFIG.doors.openSeconds, 6);
  assert.equal(WAR_ROOM_CONFIG.performance.drawCallBudget, 150);
});
