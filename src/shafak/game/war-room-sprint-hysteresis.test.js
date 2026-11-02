import test from "node:test";
import assert from "node:assert/strict";
import {
  createWarRoomSprintHysteresisState,
  stepWarRoomSprintHysteresis,
} from "./war-room-input.ts";

test("sprint on and off transitions each wait through the 150ms hysteresis", () => {
  const state = createWarRoomSprintHysteresisState();
  assert.equal(stepWarRoomSprintHysteresis(state, true, 1), false);
  assert.equal(stepWarRoomSprintHysteresis(state, true, 1.149), false);
  assert.equal(stepWarRoomSprintHysteresis(state, true, 1.151), true);
  assert.equal(stepWarRoomSprintHysteresis(state, false, 2), true);
  assert.equal(stepWarRoomSprintHysteresis(state, false, 2.149), true);
  assert.equal(stepWarRoomSprintHysteresis(state, false, 2.151), false);
});
