import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomPointerSensitivity,
  normalizeWarRoomLookSensitivity,
  readWarRoomLookSensitivitySettings,
  WAR_ROOM_LOOK_SENSITIVITY_DEFAULT,
  WAR_ROOM_LOOK_SENSITIVITY_MAX,
  WAR_ROOM_LOOK_SENSITIVITY_MIN,
} from "./war-room-look-settings.ts";

test("look sensitivity stays inside the slider range and uses a safe default", () => {
  assert.equal(normalizeWarRoomLookSensitivity(Number.NaN), WAR_ROOM_LOOK_SENSITIVITY_DEFAULT);
  assert.equal(normalizeWarRoomLookSensitivity(0), WAR_ROOM_LOOK_SENSITIVITY_MIN);
  assert.equal(normalizeWarRoomLookSensitivity(5), WAR_ROOM_LOOK_SENSITIVITY_MAX);
});

test("pointer sensitivity scales with viewport size and the saved user multiplier", () => {
  assert.deepEqual(getWarRoomPointerSensitivity(720, 420), { x: 0.007, y: 0.0045 });
  const smallPhone = getWarRoomPointerSensitivity(360, 720, 1.5);
  assert.ok(smallPhone.x > 0.007);
  assert.ok(smallPhone.y < getWarRoomPointerSensitivity(360, 420, 1.5).y);
});

test("horizontal and vertical look sensitivity scale independently", () => {
  const sensitivity = getWarRoomPointerSensitivity(720, 420, {
    horizontal: 1.5,
    vertical: 0.75,
  });
  assert.ok(Math.abs(sensitivity.x - 0.0105) < 1e-12);
  assert.ok(Math.abs(sensitivity.y - 0.003375) < 1e-12);
  assert.deepEqual(readWarRoomLookSensitivitySettings(), {
    horizontal: WAR_ROOM_LOOK_SENSITIVITY_DEFAULT,
    vertical: WAR_ROOM_LOOK_SENSITIVITY_DEFAULT,
  });
});
