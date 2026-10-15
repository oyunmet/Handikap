import test from "node:test";
import assert from "node:assert/strict";
import {
  canStartDailyDuel,
  consumeDailyAdDuel,
  getIstanbulDayKey,
  grantDailyAdDuel,
} from "./daily-lives.ts";

test("daily lives reset at midnight in Istanbul, not UTC midnight", () => {
  assert.equal(getIstanbulDayKey(new Date("2026-10-14T20:59:59.000Z")), "2026-10-14");
  assert.equal(getIstanbulDayKey(new Date("2026-10-14T21:00:00.000Z")), "2026-10-15");
});

test("three defeats block duels until one real ad reward is granted", () => {
  const exhausted = {
    dailyKey: "2026-10-15",
    dailyBattles: 3,
    dailyWins: 0,
    dailyLosses: 3,
    dailyAdRewardUsed: false,
    dailyAdDuelsRemaining: 0,
  };
  assert.equal(canStartDailyDuel(exhausted, new Date("2026-10-15T12:00:00+03:00")).allowed, false);
  const rewarded = grantDailyAdDuel(exhausted, new Date("2026-10-15T12:00:00+03:00"));
  assert.ok(rewarded);
  assert.equal(rewarded.dailyAdDuelsRemaining, 1);
  assert.equal(grantDailyAdDuel(rewarded, new Date("2026-10-15T12:00:00+03:00")), null);
  assert.equal(canStartDailyDuel(rewarded, new Date("2026-10-15T12:00:00+03:00")).usesAdDuel, true);
});

test("the rewarded duel is consumed when it starts, and reset clears the lockout", () => {
  const state = {
    dailyKey: "2026-10-15",
    dailyBattles: 3,
    dailyWins: 0,
    dailyLosses: 3,
    dailyAdRewardUsed: true,
    dailyAdDuelsRemaining: 1,
  };
  const consumed = consumeDailyAdDuel(state, new Date("2026-10-15T12:00:00+03:00"));
  assert.ok(consumed);
  assert.equal(consumed?.dailyAdDuelsRemaining, 0);
  assert.equal(canStartDailyDuel(consumed, new Date("2026-10-15T12:00:00+03:00")).allowed, false);
  assert.equal(canStartDailyDuel(state, new Date("2026-10-16T00:00:00+03:00")).allowed, true);
});
