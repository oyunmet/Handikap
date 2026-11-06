import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomDailyChallenge,
  isWarRoomDailyChallengeComplete,
} from "./war-room-daily.ts";

test("the daily War Room seed is stable for the Istanbul calendar day", () => {
  const early = getWarRoomDailyChallenge(new Date("2026-11-06T00:10:00.000Z"));
  const late = getWarRoomDailyChallenge(new Date("2026-11-06T20:55:00.000Z"));

  assert.equal(early.dayKey, "2026-11-06");
  assert.deepEqual(late, early);
  assert.ok(early.seed > 0);
});

test("the daily War Room seed changes at the Istanbul midnight boundary", () => {
  const beforeMidnight = getWarRoomDailyChallenge(new Date("2026-11-06T20:59:00.000Z"));
  const afterMidnight = getWarRoomDailyChallenge(new Date("2026-11-06T21:01:00.000Z"));

  assert.equal(beforeMidnight.dayKey, "2026-11-06");
  assert.equal(afterMidnight.dayKey, "2026-11-07");
  assert.notEqual(afterMidnight.seed, beforeMidnight.seed);
});

test("daily completion only applies to the matching Istanbul date", () => {
  assert.equal(isWarRoomDailyChallengeComplete("2026-11-06", "2026-11-06"), true);
  assert.equal(isWarRoomDailyChallengeComplete("2026-11-06", "2026-11-07"), false);
  assert.equal(isWarRoomDailyChallengeComplete(null, "2026-11-06"), false);
});
