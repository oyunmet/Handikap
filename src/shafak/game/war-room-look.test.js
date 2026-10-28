import assert from "node:assert/strict";
import test from "node:test";
import { applyWarRoomLookDelta, WAR_ROOM_PITCH_MAX, WAR_ROOM_PITCH_MIN } from "./war-room-look.ts";

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
  assert.equal(input.yaw, 0.2);
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
