import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceWarRoomKillStreak,
  getWarRoomHealthBand,
  isWarRoomLowHealth,
  WAR_ROOM_MULTI_KILL_WINDOW_MS,
  WAR_ROOM_LOW_HEALTH_RATIO,
} from "./war-room-feedback.ts";

test("health bar color follows stable high, medium, and low health bands", () => {
  assert.equal(getWarRoomHealthBand(80, 100), "is-high");
  assert.equal(getWarRoomHealthBand(50, 100), "is-medium");
  assert.equal(getWarRoomHealthBand(20, 100), "is-low");
  assert.equal(getWarRoomHealthBand(0, 0), "is-low");
});

test("low-health feedback starts at one quarter health and rejects invalid maxima", () => {
  assert.equal(isWarRoomLowHealth(25, 100), true);
  assert.equal(isWarRoomLowHealth(26, 100), false);
  assert.equal(isWarRoomLowHealth(1, 0), false);
  assert.equal(isWarRoomLowHealth(Number.NaN, 100), false);
  assert.equal(WAR_ROOM_LOW_HEALTH_RATIO, 0.25);
});

test("kill streak increments only inside its short feedback window", () => {
  const first = advanceWarRoomKillStreak({ count: 0, at: 0 }, 500);
  const second = advanceWarRoomKillStreak(first, 2_000);
  const expired = advanceWarRoomKillStreak(second, 2_000 + WAR_ROOM_MULTI_KILL_WINDOW_MS + 1);
  assert.deepEqual(first, { count: 1, at: 500 });
  assert.deepEqual(second, { count: 2, at: 2_000 });
  assert.equal(expired.count, 1);
});
