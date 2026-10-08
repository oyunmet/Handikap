import { randomInt, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import {
  DUEL_MOVES,
  chooseBotMove,
  createDuelState,
  resolveDuelMove,
} from "../src/shafak/game/duel.js";
import { validatePlayerProfile, type PlayerProfileRecord } from "./profileApi";

export const SERVER_OPPONENTS = [
  { id: "ash-scout", name: "Kül İzci", level: 2, loot: 48, difficulty: "easy" as const },
  { id: "iron-vow", name: "Demir Yemin", level: 4, loot: 76, difficulty: "medium" as const },
  { id: "dusk-wolf", name: "Alacakaranlık Kurdu", level: 6, loot: 112, difficulty: "hard" as const },
];

export const MIN_DUEL_DURATION_MS = 12_000;

export type SubmittedMove = { first: number; second: number };
export type DuelVerdict = "victory" | "defeat" | "draw";

type CompletionPayload = { duelId: string; moves: SubmittedMove[] };
type DuelChallenge = {
  duel_id: string;
  seed: number | string;
  opponent_id: string;
  started_at: Date | string;
  completed_at: Date | string | null;
};
type DuelSummary = {
  verdict: DuelVerdict;
  opponentId: string;
  playerScore: number;
  opponentScore: number;
  playerCombo: number;
  opponentCombo: number;
  loot: number;
};
type BattleRewards = { gold: number; xp: number; item: string | null; lostStake: number };

export class DuelServiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = "DuelServiceError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateDuelCompletion(value: unknown): CompletionPayload | null {
  if (!isRecord(value) || Object.keys(value).sort().join(",") !== "duelId,moves") {
    return null;
  }
  if (
    typeof value.duelId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.duelId) ||
    !Array.isArray(value.moves) ||
    value.moves.length === 0 ||
    value.moves.length > DUEL_MOVES
  ) {
    return null;
  }

  const moves: SubmittedMove[] = [];
  for (const move of value.moves) {
    if (
      !isRecord(move) ||
      Object.keys(move).sort().join(",") !== "first,second" ||
      !Number.isSafeInteger(move.first) ||
      !Number.isSafeInteger(move.second) ||
      (move.first as number) < 0 ||
      (move.first as number) >= 49 ||
      (move.second as number) < 0 ||
      (move.second as number) >= 49
    ) {
      return null;
    }
    moves.push({ first: move.first as number, second: move.second as number });
  }

  return { duelId: value.duelId, moves };
}

export function replayDuel(seed: number, opponentId: string, moves: SubmittedMove[]) {
  const opponent = SERVER_OPPONENTS.find((candidate) => candidate.id === opponentId);
  if (!opponent) throw new DuelServiceError(400, "unknown_opponent");

  let playerState = createDuelState(seed);
  let opponentState = createDuelState(seed);
  let opponentCouldNotMove = false;

  for (const move of moves) {
    if (playerState.status !== "playing" || playerState.movesLeft <= 0) {
      throw new DuelServiceError(400, "too_many_moves");
    }
    const playerTurn = resolveDuelMove(playerState, move.first, move.second);
    if (!playerTurn.accepted) throw new DuelServiceError(422, "illegal_move");
    playerState = playerTurn.state;

    const opponentMove = chooseBotMove(opponentState, opponent.difficulty);
    if (!opponentMove) {
      opponentCouldNotMove = true;
      break;
    }
    const opponentTurn = resolveDuelMove(opponentState, opponentMove.first, opponentMove.second);
    if (!opponentTurn.accepted) throw new DuelServiceError(500, "opponent_simulation_failed");
    opponentState = opponentTurn.state;
  }

  const completedAllMoves = moves.length === DUEL_MOVES && playerState.movesLeft === 0;
  const compareScores = () => playerState.score > opponentState.score
    ? "victory"
    : playerState.score < opponentState.score
      ? "defeat"
      : playerState.comboBest > opponentState.comboBest
        ? "victory"
        : playerState.comboBest < opponentState.comboBest ? "defeat" : "draw";
  const verdict = !completedAllMoves && !opponentCouldNotMove ? "defeat" : compareScores();

  return {
    summary: {
      verdict,
      opponentId,
      playerScore: playerState.score,
      opponentScore: opponentState.score,
      playerCombo: playerState.comboBest,
      opponentCombo: opponentState.comboBest,
      loot: opponent.loot,
    } satisfies DuelSummary,
    opponent,
  };
}

function applyServerAward(
  profile: PlayerProfileRecord,
  summary: DuelSummary,
  now: Date,
): { profile: PlayerProfileRecord; rewards: BattleRewards } {
  const today = now.toISOString().slice(0, 10);
  const base = profile.dailyKey === today
    ? profile
    : { ...profile, dailyBattles: 0, dailyWins: 0, dailyKey: today };
  const lostStake = summary.verdict === "defeat" ? Math.min(20, Math.floor(base.gold * 0.03)) : 0;
  const questBonus = summary.verdict === "victory" && base.dailyWins === 2 ? 100 : 0;
  const gold = summary.verdict === "victory" ? summary.loot + questBonus : 0;
  const xp = summary.verdict === "victory" ? 58 : summary.verdict === "draw" ? 35 : 27;
  const item = summary.verdict === "victory" ? "Kül Mührü" : null;
  let level = base.level;
  let totalXp = base.xp + xp;
  while (totalXp >= 100 + level * 45) {
    totalXp -= 100 + level * 45;
    level += 1;
  }
  const wins = base.wins + Number(summary.verdict === "victory");
  const winStreak = summary.verdict === "victory" ? base.winStreak + 1 : 0;
  const next: PlayerProfileRecord = {
    ...base,
    level,
    xp: totalXp,
    gold: Math.max(0, base.gold - lostStake + gold),
    battles: base.battles + 1,
    wins,
    winStreak,
    bestStreak: Math.max(base.bestStreak, winStreak),
    items: item && !base.items.includes(item) ? [...base.items, item].slice(-30) : base.items,
    defeatedOpponents: summary.verdict === "victory" && !base.defeatedOpponents.includes(summary.opponentId)
      ? [...base.defeatedOpponents, summary.opponentId].slice(-30)
      : base.defeatedOpponents,
    dailyBattles: base.dailyBattles + 1,
    dailyWins: base.dailyWins + Number(summary.verdict === "victory"),
    dailyKey: today,
  };
  return { profile: next, rewards: { gold, xp, item, lostStake } };
}

export async function createDuelChallenge(
  database: { query: Function },
  userId: string,
  opponentId: unknown,
) {
  if (typeof opponentId !== "string") throw new DuelServiceError(400, "invalid_opponent");
  const opponent = SERVER_OPPONENTS.find((candidate) => candidate.id === opponentId);
  if (!opponent) throw new DuelServiceError(400, "unknown_opponent");

  const profileResult = await database.query(
    "SELECT profile FROM shafak_player_profiles WHERE user_id = $1",
    [userId],
  );
  const profile = validatePlayerProfile(profileResult.rows[0]?.profile);
  if (!profile) throw new DuelServiceError(409, "profile_not_ready");
  const nextOpponent = SERVER_OPPONENTS.find((candidate) => !profile.defeatedOpponents.includes(candidate.id));
  if (nextOpponent?.id !== opponent.id) throw new DuelServiceError(403, "opponent_locked");

  const duelId = randomUUID();
  const seed = randomInt(1, 0xffff_ffff);
  await database.query(
    `INSERT INTO shafak_duels (duel_id, user_id, seed, opponent_id, started_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [duelId, userId, seed, opponentId],
  );
  return { duelId, seed, opponentId };
}

export async function completeDuel(
  client: Pick<PoolClient, "query">,
  userId: string,
  value: unknown,
  now = new Date(),
) {
  const payload = validateDuelCompletion(value);
  if (!payload) throw new DuelServiceError(400, "invalid_completion");

  await client.query("BEGIN");
  try {
    const challengeResult = await client.query<DuelChallenge>(
      `SELECT duel_id, seed, opponent_id, started_at, completed_at
       FROM shafak_duels
       WHERE duel_id = $1 AND user_id = $2
       FOR UPDATE`,
      [payload.duelId, userId],
    );
    const challenge = challengeResult.rows[0];
    if (!challenge) throw new DuelServiceError(404, "duel_not_found");
    if (challenge.completed_at) throw new DuelServiceError(409, "duel_already_settled");
    if (now.getTime() - new Date(challenge.started_at).getTime() < MIN_DUEL_DURATION_MS) {
      throw new DuelServiceError(429, "duel_too_fast");
    }

    const profileResult = await client.query<{ profile: unknown }>(
      "SELECT profile FROM shafak_player_profiles WHERE user_id = $1 FOR UPDATE",
      [userId],
    );
    const profile = validatePlayerProfile(profileResult.rows[0]?.profile);
    if (!profile) throw new DuelServiceError(409, "profile_not_ready");

    const { summary } = replayDuel(Number(challenge.seed), challenge.opponent_id, payload.moves);
    const awarded = applyServerAward(profile, summary, now);
    const result = { summary, rewards: awarded.rewards, profile: awarded.profile };

    await client.query(
      `UPDATE shafak_player_profiles
       SET profile = $2::jsonb, updated_at = NOW()
       WHERE user_id = $1`,
      [userId, JSON.stringify(awarded.profile)],
    );
    const settled = await client.query(
      `UPDATE shafak_duels
       SET moves = $2::jsonb, result = $3::jsonb, completed_at = NOW()
       WHERE duel_id = $1 AND user_id = $4 AND completed_at IS NULL
       RETURNING duel_id`,
      [payload.duelId, JSON.stringify(payload.moves), JSON.stringify(result), userId],
    );
    if (settled.rowCount !== 1) throw new DuelServiceError(409, "duel_already_settled");

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
