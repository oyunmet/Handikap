import { getAuth } from "@clerk/express";
import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import type { Pool } from "pg";

export type PlayerProfileRecord = {
  name: string;
  level: number;
  xp: number;
  gold: number;
  materials: {
    emberCrystals: number;
    sealFragments: number;
  };
  battles: number;
  wins: number;
  winStreak: number;
  bestStreak: number;
  items: string[];
  defeatedOpponents: string[];
  dailyBattles: number;
  dailyWins: number;
  dailyKey: string;
};

export function createDefaultPlayerProfile(name = "Yolcu"): PlayerProfileRecord {
  return {
    name,
    level: 1,
    xp: 0,
    gold: 120,
    materials: { emberCrystals: 0, sealFragments: 0 },
    battles: 0,
    wins: 0,
    winStreak: 0,
    bestStreak: 0,
    items: [],
    defeatedOpponents: [],
    dailyBattles: 0,
    dailyWins: 0,
    dailyKey: new Date().toISOString().slice(0, 10),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedInteger(value: unknown, minimum: number, maximum: number): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum || value > maximum) {
    return null;
  }
  return value;
}

function stringList(value: unknown, maximumItems: number): string[] | null {
  if (
    !Array.isArray(value) ||
    value.length > maximumItems ||
    value.some((item) => typeof item !== "string" || item.length > 60)
  ) {
    return null;
  }
  return [...new Set(value as string[])];
}

export function validateProfileRename(value: unknown): string | null {
  if (!isRecord(value) || Object.keys(value).length !== 1 || typeof value.name !== "string") return null;
  const name = value.name.trim().replace(/\s+/g, " ");
  return name.length > 0 && name.length <= 20 ? name : null;
}

export function validatePlayerProfile(value: unknown): PlayerProfileRecord | null {
  if (!isRecord(value)) return null;

  const name = typeof value.name === "string" ? value.name.trim().replace(/\s+/g, " ") : "";
  const level = boundedInteger(value.level, 1, 1000);
  const xp = boundedInteger(value.xp, 0, 1_000_000_000);
  const gold = boundedInteger(value.gold, 0, 1_000_000_000);
  const materialsValue = isRecord(value.materials) ? value.materials : {};
  const emberCrystals = value.materials === undefined
    ? 0
    : boundedInteger(materialsValue.emberCrystals, 0, 1_000_000_000);
  const sealFragments = value.materials === undefined
    ? 0
    : boundedInteger(materialsValue.sealFragments, 0, 1_000_000_000);
  const battles = boundedInteger(value.battles, 0, 10_000_000);
  const wins = boundedInteger(value.wins, 0, 10_000_000);
  const winStreak = boundedInteger(value.winStreak, 0, 10_000_000);
  const bestStreak = boundedInteger(value.bestStreak, 0, 10_000_000);
  const items = stringList(value.items, 30);
  const defeatedOpponents = stringList(value.defeatedOpponents, 30);
  const dailyBattles = boundedInteger(value.dailyBattles, 0, 100_000);
  const dailyWins = boundedInteger(value.dailyWins, 0, 100_000);
  const dailyKey = typeof value.dailyKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.dailyKey)
    ? value.dailyKey
    : null;

  if (
    !name ||
    name.length > 20 ||
    level === null ||
    xp === null ||
    gold === null ||
    emberCrystals === null ||
    sealFragments === null ||
    battles === null ||
    wins === null ||
    wins > battles ||
    winStreak === null ||
    winStreak > wins ||
    bestStreak === null ||
    bestStreak < winStreak ||
    items === null ||
    defeatedOpponents === null ||
    dailyBattles === null ||
    dailyWins === null ||
    dailyWins > dailyBattles ||
    dailyKey === null
  ) {
    return null;
  }

  return {
    name,
    level,
    xp,
    gold,
    materials: { emberCrystals, sealFragments },
    battles,
    wins,
    winStreak,
    bestStreak,
    items,
    defeatedOpponents,
    dailyBattles,
    dailyWins,
    dailyKey,
  };
}

export function createProfileApi(database: Pool) {
  const router = Router();
  const profileLimit = rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  function authenticatedUserId(request: Request, response: Response): string | null {
    const userId = getAuth(request).userId;
    if (!userId) {
      response.status(401).json({ error: "authentication_required" });
      return null;
    }
    return userId;
  }

  router.get("/api/profile", profileLimit, async (request, response) => {
    const userId = authenticatedUserId(request, response);
    if (!userId) return;
    response.setHeader("Cache-Control", "no-store");

    try {
      let result = await database.query<{ profile: unknown }>(
        "SELECT profile FROM shafak_player_profiles WHERE user_id = $1",
        [userId],
      );
      if (!result.rows[0]) {
        await database.query(
          `INSERT INTO shafak_player_profiles (user_id, profile, updated_at)
           VALUES ($1, $2::jsonb, NOW())
           ON CONFLICT (user_id) DO NOTHING`,
          [userId, JSON.stringify(createDefaultPlayerProfile())],
        );
        result = await database.query<{ profile: unknown }>(
          "SELECT profile FROM shafak_player_profiles WHERE user_id = $1",
          [userId],
        );
      }
      const profile = validatePlayerProfile(result.rows[0]?.profile);
      if (!profile) {
        response.status(503).json({ error: "profile_storage_invalid" });
        return;
      }
      response.json({ profile });
    } catch {
      response.status(503).json({ error: "profile_storage_unavailable" });
    }
  });

  router.patch("/api/profile", profileLimit, async (request, response) => {
    const userId = authenticatedUserId(request, response);
    if (!userId) return;
    response.setHeader("Cache-Control", "no-store");

    const name = validateProfileRename(request.body);
    if (!name) {
      response.status(400).json({ error: "invalid_name" });
      return;
    }

    try {
      const result = await database.query<{ profile: unknown }>(
        `UPDATE shafak_player_profiles
         SET profile = jsonb_set(profile, '{name}', to_jsonb($2::text), true), updated_at = NOW()
         WHERE user_id = $1
         RETURNING profile`,
        [userId, name],
      );
      const profile = validatePlayerProfile(result.rows[0]?.profile);
      if (!profile) {
        response.status(404).json({ error: "profile_not_found" });
        return;
      }
      response.json({ profile });
    } catch {
      response.status(503).json({ error: "profile_storage_unavailable" });
    }
  });

  return router;
}
