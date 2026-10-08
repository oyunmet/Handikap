import assert from "node:assert/strict";
import test from "node:test";
import { validatePlayerProfile } from "./profileApi.ts";

const validProfile = {
  name: "Yolcu",
  level: 2,
  xp: 14,
  gold: 220,
  battles: 3,
  wins: 2,
  winStreak: 1,
  bestStreak: 2,
  items: ["Kül Mührü"],
  defeatedOpponents: ["ash-scout"],
  dailyBattles: 2,
  dailyWins: 1,
  dailyKey: "2026-10-08",
};

test("profile API accepts and normalizes a valid account profile", () => {
  const profile = validatePlayerProfile({ ...validProfile, name: "  Şafak   Yolcusu  " });
  assert.equal(profile?.name, "Şafak Yolcusu");
  assert.deepEqual(profile?.items, ["Kül Mührü"]);
});

test("profile API rejects impossible progression and malformed collections", () => {
  assert.equal(validatePlayerProfile({ ...validProfile, wins: 4 }), null);
  assert.equal(validatePlayerProfile({ ...validProfile, dailyWins: 3 }), null);
  assert.equal(validatePlayerProfile({ ...validProfile, items: Array(31).fill("item") }), null);
  assert.equal(validatePlayerProfile({ ...validProfile, dailyKey: "not-a-date" }), null);
});

test("profile API rejects unsafe or oversized values", () => {
  assert.equal(validatePlayerProfile({ ...validProfile, gold: -1 }), null);
  assert.equal(validatePlayerProfile({ ...validProfile, name: "x".repeat(21) }), null);
  assert.equal(validatePlayerProfile(null), null);
});
