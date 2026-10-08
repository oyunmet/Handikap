import assert from "node:assert/strict";
import test from "node:test";
import { createDuelState, isAdjacent, resolveDuelMove } from "../src/shafak/game/duel.js";
import {
  completeDuel,
  DuelServiceError,
  validateDuelCompletion,
} from "./duelService.ts";

const duelId = "14e329ec-7a57-4d9b-a20f-629e1f06580a";
const startedAt = new Date("2026-10-08T12:00:00.000Z");
const settledAt = new Date("2026-10-08T12:01:00.000Z");

const profile = {
  name: "Yolcu",
  level: 1,
  xp: 0,
  gold: 120,
  battles: 0,
  wins: 0,
  winStreak: 0,
  bestStreak: 0,
  items: [],
  defeatedOpponents: [],
  dailyBattles: 0,
  dailyWins: 0,
  dailyKey: "2026-10-08",
};

function createMemoryClient() {
  const state = {
    challenge: {
      duel_id: duelId,
      seed: 39405,
      opponent_id: "ash-scout",
      started_at: startedAt,
      completed_at: null,
    },
    profile: structuredClone(profile),
    commits: 0,
    rollbacks: 0,
  };

  return {
    state,
    async query(sql, values = []) {
      if (sql === "BEGIN") return { rows: [], rowCount: null };
      if (sql === "COMMIT") {
        state.commits += 1;
        return { rows: [], rowCount: null };
      }
      if (sql === "ROLLBACK") {
        state.rollbacks += 1;
        return { rows: [], rowCount: null };
      }
      if (sql.includes("FROM shafak_duels")) return { rows: [structuredClone(state.challenge)], rowCount: 1 };
      if (sql.includes("FROM shafak_player_profiles")) {
        return { rows: [{ profile: structuredClone(state.profile) }], rowCount: 1 };
      }
      if (sql.includes("UPDATE shafak_player_profiles")) {
        state.profile = JSON.parse(values[1]);
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("UPDATE shafak_duels")) {
        if (state.challenge.completed_at) return { rows: [], rowCount: 0 };
        state.challenge.moves = JSON.parse(values[1]);
        state.challenge.result = JSON.parse(values[2]);
        state.challenge.completed_at = settledAt;
        return { rows: [{ duel_id: duelId }], rowCount: 1 };
      }
      throw new Error(`Unexpected SQL in test database: ${sql}`);
    },
  };
}

function legalMoves(seed, count = 20) {
  let state = createDuelState(seed);
  const moves = [];
  for (let turn = 0; turn < count; turn += 1) {
    let accepted = null;
    for (let first = 0; first < 49 && !accepted; first += 1) {
      for (let second = 0; second < 49 && !accepted; second += 1) {
        if (!isAdjacent(first, second)) continue;
        const result = resolveDuelMove(state, first, second);
        if (result.accepted) accepted = { move: { first, second }, state: result.state };
      }
    }
    assert.ok(accepted, `expected a legal player move at turn ${turn + 1}`);
    moves.push(accepted.move);
    state = accepted.state;
  }
  return moves;
}

test("duel completion rejects forged scores, out-of-range moves, and move-count overflow", () => {
  const moves = legalMoves(39405, 1);
  assert.equal(validateDuelCompletion({ duelId, moves, playerScore: 999_999 }), null);
  assert.equal(validateDuelCompletion({ duelId, moves: [] }), null);
  assert.equal(validateDuelCompletion({ duelId, moves: [...moves, ...Array(20).fill(moves[0])] }), null);
  assert.equal(validateDuelCompletion({ duelId, moves: [{ first: 49, second: 48 }] }), null);
});

test("an empty duel cannot claim even defeat rewards", async () => {
  const client = createMemoryClient();

  await assert.rejects(
    completeDuel(client, "user-1", { duelId, moves: [] }, settledAt),
    (error) => error instanceof DuelServiceError && error.status === 400 && error.code === "invalid_completion",
  );
  assert.equal(client.state.profile.battles, 0);
  assert.equal(client.state.profile.gold, 120);
  assert.equal(client.state.commits, 0);
});

test("server replay rejects an impossible move without awarding any profile progress", async () => {
  const client = createMemoryClient();
  const payload = { duelId, moves: [{ first: 0, second: 2 }] };

  await assert.rejects(
    completeDuel(client, "user-1", payload, settledAt),
    (error) => error instanceof DuelServiceError && error.status === 422 && error.code === "illegal_move",
  );
  assert.equal(client.state.profile.battles, 0);
  assert.equal(client.state.profile.gold, 120);
  assert.equal(client.state.challenge.completed_at, null);
  assert.equal(client.state.rollbacks, 1);
});

test("a challenge can grant its server-calculated rewards only once", async () => {
  const client = createMemoryClient();
  const payload = { duelId, moves: legalMoves(39405) };
  const result = await completeDuel(client, "user-1", payload, settledAt);

  assert.equal(result.profile.battles, 1);
  assert.equal(result.profile.dailyBattles, 1);
  assert.equal(result.profile.xp, result.rewards.xp);
  assert.equal(client.state.commits, 1);

  await assert.rejects(
    completeDuel(client, "user-1", payload, settledAt),
    (error) => error instanceof DuelServiceError && error.status === 409 && error.code === "duel_already_settled",
  );
  assert.equal(client.state.profile.battles, 1);
  assert.equal(client.state.commits, 1);
  assert.equal(client.state.rollbacks, 1);
});

test("the server refuses results submitted too soon after challenge creation", async () => {
  const client = createMemoryClient();
  const tooSoon = new Date(startedAt.getTime() + 2_000);

  await assert.rejects(
    completeDuel(client, "user-1", { duelId, moves: legalMoves(39405) }, tooSoon),
    (error) => error instanceof DuelServiceError && error.status === 429 && error.code === "duel_too_fast",
  );
  assert.equal(client.state.profile.battles, 0);
  assert.equal(client.state.challenge.completed_at, null);
});
