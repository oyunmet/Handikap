import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import type { Pool } from "pg";
import { requireAuthenticatedUserId } from "./auth.ts";
import { MAX_UPGRADE_LEVEL, type EquipmentLoadout, type PlayerInventory } from "../src/shafak/game/store-types.ts";
import {
  DEFAULT_COMBAT_ITEM_COUNTS,
  DEFAULT_COMBAT_QUICK_SLOTS,
  isCombatItemId,
  normalizeCombatItemCounts,
  normalizeCombatQuickSlots,
} from "../src/shafak/game/combat-items.ts";
import { DEFAULT_EQUIPMENT, getStoreItem, STARTER_ITEM_IDS } from "./storeCatalog.ts";
import { WORLD_GATE_INTERVAL_METERS } from "../src/shafak/world/movement.ts";
import { WORLD_GATE_STOP_OFFSET_METERS } from "../src/shafak/world/world-progress.ts";
import { DAILY_DEFEAT_LIMIT, getIstanbulDayKey, grantDailyAdDuel, normalizeDailyLifeState } from "../src/shafak/game/daily-lives.ts";
import { getDoorDifficulty, type WorldRouteChoice, type WorldRouteSide } from "../src/shafak/world/route-difficulty.ts";

export type PlayerProfileRecord = {
  name: string;
  level: number;
  xp: number;
  gold: number;
  diamonds: number;
  materials: {
    emberCrystals: number;
    sealFragments: number;
    ironShards: number;
  };
  equipment: EquipmentLoadout;
  inventory: PlayerInventory;
  battles: number;
  wins: number;
  winStreak: number;
  bestStreak: number;
  items: string[];
  defeatedOpponents: string[];
  worldProgress: { distance: number; depth: number; routeChoice?: WorldRouteChoice | null } | null;
  dailyBattles: number;
  dailyWins: number;
  dailyLosses: number;
  dailyAdRewardUsed: boolean;
  dailyAdDuelsRemaining: number;
  dailyKey: string;
};

export function createDefaultPlayerProfile(name = "Yolcu"): PlayerProfileRecord {
  return {
    name,
    level: 1,
    xp: 0,
    gold: 120,
    diamonds: 0,
    materials: { emberCrystals: 0, sealFragments: 0, ironShards: 0 },
    equipment: { ...DEFAULT_EQUIPMENT },
    inventory: {
      ownedItemIds: [...STARTER_ITEM_IDS],
      upgrades: {},
      newItemIds: [],
      combatItemCounts: { ...DEFAULT_COMBAT_ITEM_COUNTS },
      quickSlots: [...DEFAULT_COMBAT_QUICK_SLOTS],
      secondaryWeaponId: null,
    },
    battles: 0,
    wins: 0,
    winStreak: 0,
    bestStreak: 0,
    items: [],
    defeatedOpponents: [],
    worldProgress: null,
    dailyBattles: 0,
    dailyWins: 0,
    dailyLosses: 0,
    dailyAdRewardUsed: false,
    dailyAdDuelsRemaining: 0,
    dailyKey: getIstanbulDayKey(),
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

function maximumUnlockedDistance(defeatedOpponents: readonly string[], previouslyReachedDistance = 0) {
  const defeated = new Set(defeatedOpponents);
  let unlockedThroughChapter = 0;
  while (
    previouslyReachedDistance >= (unlockedThroughChapter + 1) * WORLD_GATE_INTERVAL_METERS
    || (
      [0, 1, 2, 3].every((rivalIndex) =>
        defeated.has(`ash-road:${unlockedThroughChapter}:rival:${rivalIndex}`),
      )
      && defeated.has(`ash-road:${unlockedThroughChapter}:rival:4`)
    )
  ) {
    unlockedThroughChapter += 1;
  }
  return Math.max(
    0,
    (unlockedThroughChapter + 1) * WORLD_GATE_INTERVAL_METERS - WORLD_GATE_STOP_OFFSET_METERS,
  );
}

function validateWorldPosition(
  value: unknown,
  defeatedOpponents: readonly string[],
  userId?: string,
  previous: PlayerProfileRecord["worldProgress"] = null,
) {
  if (!isRecord(value) || Object.keys(value).some((key) => !["distance", "depth", "routeChoice"].includes(key))) {
    return null;
  }
  const { distance, depth } = value;
  if (
    typeof distance !== "number" ||
    !Number.isFinite(distance) ||
    distance < 0 ||
    distance > maximumUnlockedDistance(defeatedOpponents, previous?.distance ?? 0) ||
    typeof depth !== "number" ||
    !Number.isFinite(depth) ||
    depth < -1 ||
    depth > 1
  ) {
    return null;
  }
  const activeChapter = Math.floor(distance / WORLD_GATE_INTERVAL_METERS);
  let routeChoice = previous?.routeChoice ?? null;
  if (Object.hasOwn(value, "routeChoice")) {
    if (value.routeChoice === null) routeChoice = null;
    else {
      const requested = value.routeChoice;
      if (
        !isRecord(requested)
        || !Number.isSafeInteger(requested.chapterId)
        || Number(requested.chapterId) < 1
        || Number(requested.chapterId) > 1_000_000
        || (requested.side !== "left" && requested.side !== "right")
      ) return null;
      const chapterId = Number(requested.chapterId);
      if (chapterId < activeChapter || chapterId > activeChapter + 1) return null;
      const side = requested.side as WorldRouteSide;
      const expectedDifficulty = userId ? getDoorDifficulty(`account:${userId}`, chapterId, side) : null;
      const difficulty = expectedDifficulty ?? requested.difficulty;
      if (difficulty !== "easy" && difficulty !== "hard") return null;
      if (requested.difficulty !== undefined && requested.difficulty !== difficulty) return null;
      routeChoice = { chapterId, side, difficulty };
    }
  }
  return routeChoice ? { distance, depth, routeChoice } : { distance, depth };
}

function isItemId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_-]{1,60}$/.test(value);
}

function normalizeEquipment(value: unknown): EquipmentLoadout | null {
  if (value === undefined) return { ...DEFAULT_EQUIPMENT };
  if (!isRecord(value)) return null;
  const stringFields = ["weaponId", "armorId", "capeId", "effectId", "dyeId"] as const;
  const optionalFields = ["offhandId", "helmetId", "glovesId", "bootsId", "ringOneId", "ringTwoId"] as const;
  if (stringFields.some((field) => value[field] !== undefined && !isItemId(value[field]))) return null;
  if (optionalFields.some((field) => value[field] !== undefined && value[field] !== null && !isItemId(value[field]))) return null;
  return {
    weaponId: isItemId(value.weaponId) ? value.weaponId : DEFAULT_EQUIPMENT.weaponId,
    offhandId: isItemId(value.offhandId) ? value.offhandId : null,
    helmetId: isItemId(value.helmetId) ? value.helmetId : null,
    armorId: isItemId(value.armorId) ? value.armorId : DEFAULT_EQUIPMENT.armorId,
    glovesId: isItemId(value.glovesId) ? value.glovesId : null,
    bootsId: isItemId(value.bootsId) ? value.bootsId : null,
    capeId: isItemId(value.capeId) ? value.capeId : DEFAULT_EQUIPMENT.capeId,
    ringOneId: isItemId(value.ringOneId) ? value.ringOneId : null,
    ringTwoId: isItemId(value.ringTwoId) ? value.ringTwoId : null,
    effectId: isItemId(value.effectId) ? value.effectId : DEFAULT_EQUIPMENT.effectId,
    dyeId: isItemId(value.dyeId) ? value.dyeId : DEFAULT_EQUIPMENT.dyeId,
  };
}

function normalizeInventory(value: unknown): PlayerInventory | null {
  if (value === undefined) {
    return {
      ownedItemIds: [...STARTER_ITEM_IDS],
      upgrades: {},
      newItemIds: [],
      combatItemCounts: { ...DEFAULT_COMBAT_ITEM_COUNTS },
      quickSlots: [...DEFAULT_COMBAT_QUICK_SLOTS],
      secondaryWeaponId: null,
    };
  }
  if (!isRecord(value)) return null;
  const owned = stringList(value.ownedItemIds, 120);
  const newItems = stringList(value.newItemIds ?? [], 120);
  if (!owned || !newItems || owned.some((id) => !isItemId(id)) || newItems.some((id) => !isItemId(id))) return null;
  const ownedItemIds = [...new Set([...STARTER_ITEM_IDS, ...owned])];
  if (value.combatItemCounts !== undefined) {
    if (!isRecord(value.combatItemCounts) || Object.keys(value.combatItemCounts).some((id) => !isCombatItemId(id))) return null;
    if (Object.values(value.combatItemCounts).some((count) => boundedInteger(count, 0, 999) === null)) return null;
  }
  if (
    value.quickSlots !== undefined &&
    (!Array.isArray(value.quickSlots) ||
      value.quickSlots.length !== 4 ||
      value.quickSlots.some((itemId) => itemId !== null && !isCombatItemId(itemId)))
  ) return null;
  if (value.secondaryWeaponId !== undefined && value.secondaryWeaponId !== null && !isItemId(value.secondaryWeaponId)) return null;
  const combatItemCounts = normalizeCombatItemCounts(value.combatItemCounts);
  const quickSlots = normalizeCombatQuickSlots(value.quickSlots, combatItemCounts);
  const secondaryWeaponId = typeof value.secondaryWeaponId === "string" ? value.secondaryWeaponId : null;
  if (
    secondaryWeaponId &&
    (!ownedItemIds.includes(secondaryWeaponId) || getStoreItem(secondaryWeaponId)?.slot !== "weapon")
  ) return null;
  if (value.upgrades !== undefined && !isRecord(value.upgrades)) return null;
  const rawUpgrades = isRecord(value.upgrades) ? value.upgrades : {};
  if (Object.keys(rawUpgrades).length > 120) return null;
  const upgrades: Record<string, number> = {};
  for (const [itemId, level] of Object.entries(rawUpgrades)) {
    const parsedLevel = boundedInteger(level, 0, MAX_UPGRADE_LEVEL);
    if (!isItemId(itemId) || parsedLevel === null || !ownedItemIds.includes(itemId)) return null;
    upgrades[itemId] = parsedLevel;
  }
  if (newItems.some((id) => !ownedItemIds.includes(id))) return null;
  return {
    ownedItemIds,
    upgrades,
    newItemIds: [...new Set(newItems)],
    combatItemCounts,
    quickSlots,
    secondaryWeaponId,
  };
}

export function validateProfileRename(value: unknown): string | null {
  if (!isRecord(value) || Object.keys(value).length !== 1 || typeof value.name !== "string") return null;
  const name = value.name.trim().replace(/\s+/g, " ");
  return name.length > 0 && name.length <= 20 ? name : null;
}

export function validatePlayerProfile(value: unknown, userId?: string): PlayerProfileRecord | null {
  if (!isRecord(value)) return null;

  const name = typeof value.name === "string" ? value.name.trim().replace(/\s+/g, " ") : "";
  const level = boundedInteger(value.level, 1, 1000);
  const xp = boundedInteger(value.xp, 0, 1_000_000_000);
  const gold = boundedInteger(value.gold, 0, 1_000_000_000);
  const diamonds = value.diamonds === undefined ? 0 : boundedInteger(value.diamonds, 0, 1_000_000_000);
  const materialsValue = isRecord(value.materials) ? value.materials : {};
  const emberCrystals = value.materials === undefined
    ? 0
    : boundedInteger(materialsValue.emberCrystals, 0, 1_000_000_000);
  const sealFragments = value.materials === undefined
    ? 0
    : boundedInteger(materialsValue.sealFragments, 0, 1_000_000_000);
  const ironShards = value.materials === undefined || materialsValue.ironShards === undefined
    ? 0
    : boundedInteger(materialsValue.ironShards, 0, 1_000_000_000);
  const equipment = normalizeEquipment(value.equipment);
  const inventory = normalizeInventory(value.inventory);
  const battles = boundedInteger(value.battles, 0, 10_000_000);
  const wins = boundedInteger(value.wins, 0, 10_000_000);
  const winStreak = boundedInteger(value.winStreak, 0, 10_000_000);
  const bestStreak = boundedInteger(value.bestStreak, 0, 10_000_000);
  const items = stringList(value.items, 30);
  const defeatedOpponents = stringList(value.defeatedOpponents, 30);
  const hasWorldProgress = value.worldProgress !== undefined && value.worldProgress !== null;
  const worldProgress = hasWorldProgress && defeatedOpponents
    ? validateWorldPosition(
        value.worldProgress,
        defeatedOpponents,
        userId,
        value.worldProgress as PlayerProfileRecord["worldProgress"],
      )
    : null;
  const dailyBattles = boundedInteger(value.dailyBattles, 0, 100_000);
  const dailyWins = boundedInteger(value.dailyWins, 0, 100_000);
  const dailyLosses = value.dailyLosses === undefined ? 0 : boundedInteger(value.dailyLosses, 0, 100_000);
  const dailyAdRewardUsed = value.dailyAdRewardUsed === undefined ? false : value.dailyAdRewardUsed === true;
  const dailyAdDuelsRemaining = value.dailyAdDuelsRemaining === undefined
    ? 0
    : boundedInteger(value.dailyAdDuelsRemaining, 0, 1);
  const dailyKey = typeof value.dailyKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.dailyKey)
    ? value.dailyKey
    : null;

  if (
    !name ||
    name.length > 20 ||
    level === null ||
    xp === null ||
    gold === null ||
    diamonds === null ||
    emberCrystals === null ||
    sealFragments === null ||
    ironShards === null ||
    equipment === null ||
    inventory === null ||
    battles === null ||
    wins === null ||
    wins > battles ||
    winStreak === null ||
    winStreak > wins ||
    bestStreak === null ||
    bestStreak < winStreak ||
    items === null ||
    defeatedOpponents === null ||
    (hasWorldProgress && worldProgress === null) ||
    dailyBattles === null ||
    dailyWins === null ||
    dailyWins > dailyBattles ||
    dailyLosses === null ||
    dailyLosses > dailyBattles ||
    dailyAdDuelsRemaining === null ||
    (dailyAdDuelsRemaining > 0 && !dailyAdRewardUsed) ||
    dailyKey === null
  ) {
    return null;
  }

  return {
    name,
    level,
    xp,
    gold,
    diamonds,
    materials: { emberCrystals, sealFragments, ironShards },
    equipment,
    inventory,
    battles,
    wins,
    winStreak,
    bestStreak,
    items,
    defeatedOpponents,
    worldProgress,
    dailyBattles,
    dailyWins,
    dailyLosses,
    dailyAdRewardUsed,
    dailyAdDuelsRemaining,
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
    return requireAuthenticatedUserId(request, response);
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
      const profile = validatePlayerProfile(result.rows[0]?.profile, userId);
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
      const profile = validatePlayerProfile(result.rows[0]?.profile, userId);
      if (!profile) {
        response.status(404).json({ error: "profile_not_found" });
        return;
      }
      response.json({ profile });
    } catch {
      response.status(503).json({ error: "profile_storage_unavailable" });
    }
  });

  router.patch("/api/profile/world-progress", profileLimit, async (request, response) => {
    const userId = authenticatedUserId(request, response);
    if (!userId) return;
    response.setHeader("Cache-Control", "no-store");

    try {
      const currentResult = await database.query<{ profile: unknown }>(
        "SELECT profile FROM shafak_player_profiles WHERE user_id = $1",
        [userId],
      );
      const currentProfile = validatePlayerProfile(currentResult.rows[0]?.profile);
      if (!currentProfile) {
        response.status(404).json({ error: "profile_not_found" });
        return;
      }
      const worldProgress = validateWorldPosition(
        request.body,
        currentProfile.defeatedOpponents,
        userId,
        currentProfile.worldProgress,
      );
      if (!worldProgress) {
        response.status(400).json({ error: "invalid_world_progress" });
        return;
      }
      const updated = await database.query<{ worldProgress: unknown }>(
        `UPDATE shafak_player_profiles
         SET profile = jsonb_set(profile, '{worldProgress}', $2::jsonb, true), updated_at = NOW()
         WHERE user_id = $1
         RETURNING profile->'worldProgress' AS "worldProgress"`,
        [userId, JSON.stringify(worldProgress)],
      );
      if (!updated.rows[0]) {
        response.status(404).json({ error: "profile_not_found" });
        return;
      }
      response.json({ worldProgress: updated.rows[0].worldProgress });
    } catch {
      response.status(503).json({ error: "profile_storage_unavailable" });
    }
  });

  router.post("/api/profile/daily-ad-reward", profileLimit, async (request, response) => {
    const userId = authenticatedUserId(request, response);
    if (!userId) return;
    response.setHeader("Cache-Control", "no-store");

    try {
      const currentResult = await database.query<{ profile: unknown }>(
        "SELECT profile FROM shafak_player_profiles WHERE user_id = $1",
        [userId],
      );
      const rawProfile = currentResult.rows[0]?.profile;
      const profile = validatePlayerProfile(rawProfile, userId);
      if (!profile) {
        response.status(404).json({ error: "profile_not_found" });
        return;
      }
      const daily = normalizeDailyLifeState(profile);
      const rewarded = grantDailyAdDuel(daily);
      if (!rewarded) {
        response.status(409).json({
          error: daily.dailyLosses < DAILY_DEFEAT_LIMIT ? "daily_lives_remaining" : "daily_ad_reward_used",
        });
        return;
      }
      const nextProfile = { ...profile, ...rewarded };
      const updated = await database.query<{ profile: unknown }>(
        `UPDATE shafak_player_profiles
         SET profile = $3::jsonb, updated_at = NOW()
         WHERE user_id = $1 AND profile = $2::jsonb
         RETURNING profile`,
        [userId, JSON.stringify(rawProfile), JSON.stringify(nextProfile)],
      );
      if (!updated.rows[0]) {
        response.status(409).json({ error: "daily_ad_reward_raced" });
        return;
      }
      const savedProfile = validatePlayerProfile(updated.rows[0].profile, userId);
      if (!savedProfile) {
        response.status(503).json({ error: "profile_storage_invalid" });
        return;
      }
      response.json({ profile: savedProfile });
    } catch {
      response.status(503).json({ error: "profile_storage_unavailable" });
    }
  });

  return router;
}
