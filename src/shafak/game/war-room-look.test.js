import assert from "node:assert/strict";
import test from "node:test";
import {
  applyWarRoomLookDelta,
  getWarRoomCameraAngles,
  normalizeWarRoomCameraYaw,
  WAR_ROOM_PITCH_MAX,
  WAR_ROOM_PITCH_MIN,
} from "./war-room-look.ts";

test("touching upward looks upward by increasing pitch", () => {
  const input = { yaw: 0, pitch: 0 };
  applyWarRoomLookDelta(input, 0, -10, 0.01, "touch");
  assert.equal(input.pitch, 0.1);
});

test("the invert-Y preference reverses only touch pitch, not horizontal look", () => {
  const input = { yaw: 0, pitch: 0 };
  applyWarRoomLookDelta(input, 5, -10, 0.01, "touch", true);
  assert.equal(input.yaw, 0.05);
  assert.equal(input.pitch, -0.1);
});

test("horizontal and vertical look sensitivity can be tuned independently", () => {
  const input = { yaw: 0, pitch: 0 };
  applyWarRoomLookDelta(input, 10, -10, { x: 0.02, y: 0.005 }, "touch");
  assert.ok(Math.abs(input.yaw - 0.2) < 1e-10);
  assert.equal(input.pitch, 0.05);
});

test("mouse look keeps its existing vertical direction and pitch limits", () => {
  const input = { yaw: 0, pitch: WAR_ROOM_PITCH_MAX - 0.01 };
  applyWarRoomLookDelta(input, 5, 10, 0.01, "mouse", true);
  assert.equal(input.yaw, 0.05);
  assert.equal(input.pitch, WAR_ROOM_PITCH_MAX);
  applyWarRoomLookDelta(input, 0, -200, 0.01, "mouse");
  assert.equal(input.pitch, WAR_ROOM_PITCH_MIN);
});

test("camera pitch uses the requested range and remains the single normalized look value", () => {
  const input = { yaw: 0, pitch: 0 };
  applyWarRoomLookDelta(input, 0, -300, 0.01, "touch");
  assert.equal(input.pitch, WAR_ROOM_PITCH_MAX);
  applyWarRoomLookDelta(input, 0, 300, 0.01, "touch");
  assert.equal(input.pitch, WAR_ROOM_PITCH_MIN);

  const angles = getWarRoomCameraAngles(Math.PI * 3, 0.25);
  assert.ok(Math.abs(angles.yaw - Math.PI) < 1e-8);
  assert.equal(angles.pitch, 0.25);
  assert.equal(normalizeWarRoomCameraYaw(Number.NaN), 0);
});
