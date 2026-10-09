import { randomInt, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { validatePlayerProfile, type PlayerProfileRecord } from "./profileApi";
import { normalizePlayerCombatModifiers, replayCombat, type CombatDifficulty, type CombatInputFrame } from "../src/shafak/game/combat-engine";
import { getWorldChapter } from "../src/shafak/world/world-content";
import { calculatePlayerCombatModifiers } from "./storeCatalog";

export type DuelVerdict = "victory" | "defeat" | "draw";
export type DuelOutcome = { verdict: DuelVerdict; opponentId: string; loot: number };
type BattleRewards = { gold: number; diamonds: number; xp: number; item: string | null; lostStake: number };
type ServerOpponent = {
  id: string;
  name: string;
  level: number;
  loot: number;
  difficulty: CombatDifficulty;
};

const MAX_DUEL_AGE_MS = 30 * 60 * 1000;
const MAX_INPUT_FRAMES = 5_401;

export class DuelServiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = "DuelServiceError";
  }
}

export const DUEL_ENGINE_ENABLED = true;

function resolveOpponent(opponentId: unknown): ServerOpponent | null {
  if (typeof opponentId !== "string") return null;
  const match = /^ash-road:(\d{1,7}):bot:([0-3])$/.exec(opponentId);
  if (!match) return null;
  const chapterId = Number(match[1]);
  const rivalIndex = Number(match[2]);
  if (!Number.isSafeInteger(chapterId) || chapterId > 1_000_000) return null;
  const rival = getWorldChapter(chapterId).rivals[rivalIndex];
  if (!rival || rival.id !== opponentId) return null;
  const maximumLootByRival = [48, 72, 96, 120][rivalIndex];
  return {
    id: rival.id,
    name: rival.name,
    level: rival.level,
    loot: Math.min(rival.loot, maximumLootByRival),
    difficulty: rival.difficulty,
  };
}

export function validateCombatInputLog(value: unknown): CombatInputFrame[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_INPUT_FRAMES) return null;
  const frames: CombatInputFrame[] = [];
  let previousTick = -1;
  let previousButtons = 0;
  for (const entry of value) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 6 ||
      entry.some((part) => typeof part !== "number" || !Number.isSafeInteger(part))
    ) return null;
    const [tick, x, y, buttons, pressed, released] = entry as number[];
    if (
      tick < 0 ||
      tick > 5_400 ||
      tick <= previousTick ||
      x < -100 ||
      x > 100 ||
      y < -100 ||
      y > 100 ||
      buttons < 0 ||
      buttons > 31 ||
      pressed < 0 ||
      pressed > 31 ||
      released < 0 ||
      released > 31
    ) return null;
    const expectedButtons = ((previousButtons | pressed) & ~released) & 31;
    if (
      buttons !== expectedButtons ||
      (pressed & previousButtons) !== 0 ||
      (released & (previousButtons | pressed)) !== released
    ) return null;
    if (tick === 0 && (x !== 0 || y !== 0 || buttons !== 0 || pressed !== 0 || released !== 0)) return null;
    frames.push([tick, x, y, buttons, pressed, released]);
    previousTick = tick;
    previousButtons = buttons;
  }
  return frames[0]?.[0] === 0 ? frames : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function applyServerAward(
  profile: PlayerProfileRecord,
  outcome: DuelOutcome,
  now = new Date(),
): { profile: PlayerProfileRecord; rewards: BattleRewards } {
  const normalizedProfile = validatePlayerProfile(profile);
  if (!normalizedProfile) throw new DuelServiceError(409, "profile_not_ready");
  const today = now.toISOString().slice(0, 10);
  const base = normalizedProfile.dailyKey === today
    ? normalizedProfile
    : { ...normalizedProfile, dailyBattles: 0, dailyWins: 0, dailyKey: today };
  const lostStake = outcome.verdict === "defeat" ? Math.min(20, Math.floor(base.gold * 0.03)) : 0;
  const questBonus = outcome.verdict === "victory" && base.dailyWins === 2 ? 100 : 0;
  const gold = outcome.verdict === "victory" ? Math.max(0, Math.floor(outcome.loot)) + questBonus : 0;
  const diamonds = outcome.verdict === "victory" ? 1 + Number(questBonus > 0) : 0;
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
    diamonds: base.diamonds + diamonds,
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
  return { profile: next, rewards: { gold, diamonds, xp, item, lostStake } };
}

export async function createDuelChallenge(
  database: { query: Function },
  userId: string,
  opponentId: unknown,
) {
  const opponent = resolveOpponent(opponentId);
  if (!opponent) throw new DuelServiceError(400, "unknown_opponent");

  const profileResult = await database.query(
    "SELECT profile FROM shafak_player_profiles WHERE user_id = $1 FOR UPDATE",
    [userId],
  );
  const profile = validatePlayerProfile(profileResult.rows[0]?.profile);
  if (!profile) throw new DuelServiceError(409, "profile_not_ready");
  const playerStats = calculatePlayerCombatModifiers(profile);
  if (profile.defeatedOpponents.includes(opponent.id)) throw new DuelServiceError(403, "opponent_already_defeated");
  const priorWin = await database.query(
    `SELECT duel_id FROM shafak_duels
     WHERE user_id = $1 AND opponent_id = $2
       AND completion->'summary'->>'verdict' = 'victory'
     LIMIT 1`,
    [userId, opponent.id],
  );
  if (priorWin.rows[0]) throw new DuelServiceError(403, "opponent_already_defeated");

  await database.query(
    `UPDATE shafak_duels
     SET completed_at = NOW()
     WHERE user_id = $1 AND completed_at IS NULL AND started_at < NOW() - INTERVAL '30 minutes'`,
    [userId],
  );
  const activeResult = await database.query(
    `SELECT duel_id FROM shafak_duels
     WHERE user_id = $1 AND completed_at IS NULL
     LIMIT 1`,
    [userId],
  );
  if (activeResult.rows[0]) throw new DuelServiceError(409, "duel_already_active");

  const duelId = randomUUID();
  const seed = randomInt(1, 0xffff_ffff);
  await database.query(
    `INSERT INTO shafak_duels (duel_id, user_id, seed, opponent_id, started_at, player_stats)
     VALUES ($1, $2, $3, $4, NOW(), $5::jsonb)`,
    [duelId, userId, seed, opponentId, JSON.stringify(playerStats)],
  );
  return {
    duelId,
    seed,
    playerStats,
    opponent: {
      id: opponent.id,
      name: opponent.name,
      level: opponent.level,
      loot: opponent.loot,
      difficulty: opponent.difficulty,
    },
  };
}

export async function completeDuel(
  client: Pick<PoolClient, "query">,
  userId: string,
  value: unknown,
  now = new Date(),
) {
  if (!isRecord(value) || typeof value.duelId !== "string" || !/^[0-9a-f-]{36}$/i.test(value.duelId)) {
    throw new DuelServiceError(400, "invalid_completion");
  }
  const surrendered = value.surrendered === true;
  const expectedKeys = surrendered ? ["duelId", "surrendered"] : ["duelId", "inputLog"];
  if (
    Object.keys(value).length !== expectedKeys.length ||
    expectedKeys.some((key) => !(key in value)) ||
    (!surrendered && value.surrendered !== undefined)
  ) throw new DuelServiceError(400, "invalid_completion");

  const inputLog = surrendered ? null : validateCombatInputLog(value.inputLog);
  if (!surrendered && !inputLog) throw new DuelServiceError(400, "invalid_input_log");

  const duelResult = await client.query(
    `SELECT duel_id, user_id, seed, opponent_id, started_at, completed_at, completion, player_stats
     FROM shafak_duels WHERE duel_id = $1 AND user_id = $2 FOR UPDATE`,
    [value.duelId, userId],
  );
  const duel = duelResult.rows[0];
  if (!duel) throw new DuelServiceError(404, "duel_not_found");
  if (duel.completion) return duel.completion;
  if (duel.completed_at) throw new DuelServiceError(409, "duel_already_completed");

  const startedAt = new Date(duel.started_at).getTime();
  const elapsedMs = now.getTime() - startedAt;
  if (!Number.isFinite(startedAt) || elapsedMs < 0) throw new DuelServiceError(409, "invalid_duel_clock");
  if (elapsedMs > MAX_DUEL_AGE_MS) throw new DuelServiceError(410, "duel_expired");

  const opponent = resolveOpponent(duel.opponent_id);
  if (!opponent) throw new DuelServiceError(409, "duel_opponent_invalid");

  let verdict: DuelVerdict;
  let simulatedTicks = 0;
  if (surrendered) {
    if (elapsedMs < 5_000) throw new DuelServiceError(422, "duel_finished_too_quickly");
    verdict = "defeat";
  } else {
    const playerStats = normalizePlayerCombatModifiers(duel.player_stats);
    const replay = replayCombat(Number(duel.seed), opponent.difficulty, inputLog!, playerStats);
    simulatedTicks = replay.state.tick;
    if (!replay.state.ended || !replay.state.verdict || replay.consumedFrames !== inputLog!.length) {
      throw new DuelServiceError(422, "duel_not_finished");
    }
    if (elapsedMs < Math.max(2_500, simulatedTicks * (1_000 / 60) * 0.6)) {
      throw new DuelServiceError(422, "duel_finished_too_quickly");
    }
    verdict = replay.state.verdict;
  }

  const profileResult = await client.query(
    "SELECT profile FROM shafak_player_profiles WHERE user_id = $1 FOR UPDATE",
    [userId],
  );
  const profile = validatePlayerProfile(profileResult.rows[0]?.profile);
  if (!profile) throw new DuelServiceError(409, "profile_not_ready");
  const outcome = { verdict, opponentId: opponent.id, loot: opponent.loot };
  const awarded = surrendered
    ? { profile, rewards: { gold: 0, diamonds: 0, xp: 0, item: null, lostStake: 0 } }
    : applyServerAward(profile, outcome, now);
  if (!surrendered) {
    await client.query(
      "UPDATE shafak_player_profiles SET profile = $2::jsonb, updated_at = NOW() WHERE user_id = $1",
      [userId, JSON.stringify(awarded.profile)],
    );
  }
  const completion = {
    summary: outcome,
    rewards: awarded.rewards,
    profile: awarded.profile,
  };
  await client.query(
    `UPDATE shafak_duels
     SET completed_at = NOW(), input_log = $2::jsonb, completion = $3::jsonb
     WHERE duel_id = $1 AND completed_at IS NULL`,
    [value.duelId, inputLog ? JSON.stringify(inputLog) : null, JSON.stringify(completion)],
  );
  return completion;
}
