import { randomInt, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { validatePlayerProfile, type PlayerProfileRecord } from "./profileApi";

export const SERVER_OPPONENTS = [
  { id: "ash-scout", name: "Kül İzci", level: 2, loot: 48, difficulty: "easy" as const },
  { id: "iron-vow", name: "Demir Yemin", level: 4, loot: 76, difficulty: "medium" as const },
  { id: "dusk-wolf", name: "Alacakaranlık Kurdu", level: 6, loot: 112, difficulty: "hard" as const },
];

export type DuelVerdict = "victory" | "defeat" | "draw";
export type DuelOutcome = { verdict: DuelVerdict; opponentId: string; loot: number };
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

/**
 * Combat remains paused until the action engine can produce a result that the
 * server can independently verify. Challenge and reward services fail closed.
 */
export const DUEL_ENGINE_ENABLED = false;

export function applyServerAward(
  profile: PlayerProfileRecord,
  outcome: DuelOutcome,
  now = new Date(),
): { profile: PlayerProfileRecord; rewards: BattleRewards } {
  const today = now.toISOString().slice(0, 10);
  const base = profile.dailyKey === today
    ? profile
    : { ...profile, dailyBattles: 0, dailyWins: 0, dailyKey: today };
  const lostStake = outcome.verdict === "defeat" ? Math.min(20, Math.floor(base.gold * 0.03)) : 0;
  const questBonus = outcome.verdict === "victory" && base.dailyWins === 2 ? 100 : 0;
  const gold = outcome.verdict === "victory" ? Math.max(0, Math.floor(outcome.loot)) + questBonus : 0;
  const xp = outcome.verdict === "victory" ? 58 : outcome.verdict === "draw" ? 35 : 27;
  const item = outcome.verdict === "victory" ? "Kül Mührü" : null;
  let level = base.level;
  let totalXp = base.xp + xp;
  while (totalXp >= 100 + level * 45) {
    totalXp -= 100 + level * 45;
    level += 1;
  }
  const wins = base.wins + Number(outcome.verdict === "victory");
  const winStreak = outcome.verdict === "victory" ? base.winStreak + 1 : 0;
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
    defeatedOpponents: outcome.verdict === "victory" && !base.defeatedOpponents.includes(outcome.opponentId)
      ? [...base.defeatedOpponents, outcome.opponentId].slice(-30)
      : base.defeatedOpponents,
    dailyBattles: base.dailyBattles + 1,
    dailyWins: base.dailyWins + Number(outcome.verdict === "victory"),
    dailyKey: today,
  };
  return { profile: next, rewards: { gold, xp, item, lostStake } };
}

export async function createDuelChallenge(
  database: { query: Function },
  userId: string,
  opponentId: unknown,
) {
  if (!DUEL_ENGINE_ENABLED) throw new DuelServiceError(503, "duel_engine_unavailable");
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
  _client: Pick<PoolClient, "query">,
  _userId: string,
  _value: unknown,
): Promise<never> {
  throw new DuelServiceError(503, "duel_engine_unavailable");
}
