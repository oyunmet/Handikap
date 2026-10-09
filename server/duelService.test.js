import assert from "node:assert/strict";
import test from "node:test";
import {
  applyServerAward,
  completeDuel,
  createDuelChallenge,
  DuelServiceError,
  validateCombatInputLog,
} from "./duelService.ts";
import { getWorldChapter } from "../src/shafak/world/world-content.ts";

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

test("server challenges use a generated BOT id and return server-owned combat settings", async () => {
  const rival = getWorldChapter(0).rivals[0];
  const inserts = [];
  let reads = 0;
  const database = {
    async query(sql, values = []) {
      if (sql.startsWith("SELECT profile")) return { rows: [{ profile }] };
      if (sql.startsWith("UPDATE shafak_duels")) return { rowCount: 0, rows: [] };
      if (sql.startsWith("SELECT duel_id")) return { rows: [] };
      if (sql.startsWith("INSERT INTO shafak_duels")) {
        inserts.push(values);
        return { rowCount: 1, rows: [] };
      }
      reads += 1;
      throw new Error(`Unexpected query ${sql}`);
    },
  };

  const challenge = await createDuelChallenge(database, "user-1", rival.id);
  assert.equal(challenge.opponent.id, rival.id);
  assert.equal(challenge.opponent.difficulty, rival.difficulty);
  assert.ok(Number.isSafeInteger(challenge.seed));
  assert.equal(challenge.playerStats.maxHealth, 150);
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0][3], rival.id);
  assert.deepEqual(JSON.parse(inserts[0][4]), challenge.playerStats);
  assert.equal(reads, 0);
});

test("a client cannot submit a requested result or rewards", async () => {
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
      && error.status === 400
      && error.code === "invalid_completion",
  );
  assert.equal(queries, 0);
});

test("input tapes reject broken button transitions and client-invented fields", () => {
  assert.deepEqual(validateCombatInputLog([
    [0, 0, 0, 0, 0, 0],
    [12, 0, 0, 1, 1, 0],
    [14, 0, 0, 0, 0, 1],
  ]), [
    [0, 0, 0, 0, 0, 0],
    [12, 0, 0, 1, 1, 0],
    [14, 0, 0, 0, 0, 1],
  ]);
  assert.equal(validateCombatInputLog([[0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 1, 0]]), null);
  assert.equal(validateCombatInputLog([[0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 900]]), null);
});

test("server replays the seeded duel and returns the stored result only once", async () => {
  const startedAt = new Date("2026-10-08T11:58:00.000Z");
  const duel = {
    duel_id: "f4b13e71-45e7-43a4-aea0-460de2c6c22f",
    user_id: "user-1",
    seed: 77331,
    opponent_id: getWorldChapter(0).rivals[0].id,
    started_at: startedAt,
    completed_at: null,
    completion: null,
  };
  let storedProfile = { ...profile, defeatedOpponents: [] };
  let profileWrites = 0;
  let completionWrites = 0;
  const client = {
    async query(sql, values = []) {
      if (sql.startsWith("SELECT duel_id")) return { rows: [{ ...duel }] };
      if (sql.startsWith("SELECT profile")) return { rows: [{ profile: storedProfile }] };
      if (sql.startsWith("UPDATE shafak_player_profiles")) {
        storedProfile = JSON.parse(values[1]);
        profileWrites += 1;
        return { rowCount: 1, rows: [] };
      }
      if (sql.startsWith("UPDATE shafak_duels")) {
        duel.completed_at = new Date(now);
        duel.input_log = JSON.parse(values[1]);
        duel.completion = JSON.parse(values[2]);
        completionWrites += 1;
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected query ${sql}`);
    },
  };
  const request = { duelId: duel.duel_id, inputLog: [[0, 0, 0, 0, 0, 0]] };
  const first = await completeDuel(client, "user-1", request, now);
  const second = await completeDuel(client, "user-1", request, now);
  assert.equal(first.summary.verdict, "defeat");
  assert.deepEqual(second, first);
  assert.equal(profileWrites, 1);
  assert.equal(completionWrites, 1);
  assert.equal(storedProfile.battles, profile.battles + 1);
});

test("the retained server reward calculation preserves the third-win daily quest", () => {
  const awarded = applyServerAward(
    profile,
    { verdict: "victory", opponentId: "iron-vow", loot: 48 },
    now,
  );

  assert.equal(awarded.rewards.gold, 148);
  assert.equal(awarded.rewards.diamonds, 2);
  assert.equal(awarded.profile.diamonds, 2);
  assert.equal(awarded.profile.gold, 268);
  assert.equal(awarded.profile.dailyBattles, 4);
  assert.equal(awarded.profile.dailyWins, 3);
  assert.equal(awarded.profile.battles, 4);
  assert.equal(awarded.profile.wins, 3);
  assert.ok(awarded.profile.defeatedOpponents.includes("iron-vow"));
});
