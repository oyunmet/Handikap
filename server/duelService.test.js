import assert from "node:assert/strict";
import test from "node:test";
import {
  applyServerAward,
  completeDuel,
  createDuelChallenge,
  DuelServiceError,
} from "./duelService.ts";

const now = new Date("2026-10-08T12:01:00.000Z");

const profile = {
  name: "Yolcu",
  level: 1,
  xp: 0,
  gold: 120,
  battles: 3,
  wins: 2,
  winStreak: 2,
  bestStreak: 2,
  items: [],
  defeatedOpponents: ["ash-scout"],
  dailyBattles: 3,
  dailyWins: 2,
  dailyKey: "2026-10-08",
};

test("duel challenges stay disabled until the server action simulator exists", async () => {
  let queries = 0;
  const database = {
    async query() {
      queries += 1;
      throw new Error("disabled challenge should not touch the database");
    },
  };

  await assert.rejects(
    createDuelChallenge(database, "user-1", "iron-vow"),
    (error) => error instanceof DuelServiceError
      && error.status === 503
      && error.code === "duel_engine_unavailable",
  );
  assert.equal(queries, 0);
});

test("a client cannot submit a result or receive rewards while the simulator is disabled", async () => {
  let queries = 0;
  const client = {
    async query() {
      queries += 1;
      throw new Error("disabled completion should not touch the database");
    },
  };

  await assert.rejects(
    completeDuel(client, "user-1", { duelId: "forged", requestedOutcome: "victory" }),
    (error) => error instanceof DuelServiceError
      && error.status === 503
      && error.code === "duel_engine_unavailable",
  );
  assert.equal(queries, 0);
});

test("the retained server reward calculation preserves the third-win daily quest", () => {
  const awarded = applyServerAward(
    profile,
    { verdict: "victory", opponentId: "iron-vow", loot: 48 },
    now,
  );

  assert.equal(awarded.rewards.gold, 148);
  assert.equal(awarded.profile.gold, 268);
  assert.equal(awarded.profile.dailyBattles, 4);
  assert.equal(awarded.profile.dailyWins, 3);
  assert.equal(awarded.profile.battles, 4);
  assert.equal(awarded.profile.wins, 3);
  assert.ok(awarded.profile.defeatedOpponents.includes("iron-vow"));
});
