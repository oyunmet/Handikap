import { MAX_UPGRADE_LEVEL, type EquipmentLoadout, type PlayerInventory } from "./store-types.ts";
import { grantLootItem } from "./store-rewards.ts";
import { DEFAULT_COMBAT_ITEM_COUNTS, DEFAULT_COMBAT_QUICK_SLOTS, normalizeCombatItemCounts, normalizeCombatQuickSlots } from "./combat-items.ts";
import { getIstanbulDayKey, normalizeDailyLifeState } from "./daily-lives.ts";
import type { WorldRouteChoice } from "../world/route-difficulty.ts";

export type PlayerProfile = {
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

export type BattleOutcome = {
  verdict: "victory" | "defeat" | "draw";
  opponentId: string;
  loot: number;
  item?: string | null;
};

const STORAGE_KEY = "shafak-local-profile-v1";
const storageKeyFor = (userId?: string) => `${STORAGE_KEY}:${userId || "guest"}`;

export const defaultProfile: PlayerProfile = {
  name: "Yolcu",
  level: 1,
  xp: 0,
  gold: 120,
  diamonds: 0,
  materials: { emberCrystals: 0, sealFragments: 0, ironShards: 0 },
  equipment: {
    weaponId: "weapon_ash_sword",
    armorId: "armor_ash_guard",
    capeId: "cape_worn",
    effectId: "effect_none",
    dyeId: "dye_none",
  },
  inventory: {
    ownedItemIds: ["weapon_ash_sword", "armor_ash_guard", "cape_worn", "effect_none", "dye_none"],
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

function todayKey() {
  return getIstanbulDayKey();
}

export function normalizePlayerProfile(value: unknown): PlayerProfile {
  const saved = value as Partial<PlayerProfile> | null;
  if (!saved || typeof saved !== "object") return { ...defaultProfile };
  const savedMaterials = saved.materials && typeof saved.materials === "object"
    ? saved.materials as Partial<PlayerProfile["materials"]>
    : {};
  const savedWorldProgress = saved.worldProgress && typeof saved.worldProgress === "object"
    ? saved.worldProgress as Partial<NonNullable<PlayerProfile["worldProgress"]>>
    : null;
  const today = todayKey();
  const daily = normalizeDailyLifeState(saved, new Date());
  const routeValue = savedWorldProgress?.routeChoice;
  const routeChoice = routeValue && typeof routeValue === "object"
    && Number.isSafeInteger(routeValue.chapterId)
    && routeValue.chapterId >= 1
    && (routeValue.side === "left" || routeValue.side === "right")
    && (routeValue.difficulty === "easy" || routeValue.difficulty === "hard")
    ? {
        chapterId: routeValue.chapterId,
        side: routeValue.side,
        difficulty: routeValue.difficulty,
      } satisfies WorldRouteChoice
    : null;
  return {
    name: typeof saved.name === "string" && saved.name.trim() ? saved.name.trim().slice(0, 20) : defaultProfile.name,
    level: finiteNumber(saved.level, defaultProfile.level),
    xp: finiteNumber(saved.xp, defaultProfile.xp),
    gold: finiteNumber(saved.gold, defaultProfile.gold),
    diamonds: finiteNumber(saved.diamonds, defaultProfile.diamonds),
    materials: {
      emberCrystals: finiteNumber(savedMaterials.emberCrystals, 0),
      sealFragments: finiteNumber(savedMaterials.sealFragments, 0),
      ironShards: finiteNumber(savedMaterials.ironShards, 0),
    },
    equipment: normalizeEquipment(saved.equipment),
    inventory: normalizeInventory(saved.inventory),
    battles: finiteNumber(saved.battles, defaultProfile.battles),
    wins: finiteNumber(saved.wins, defaultProfile.wins),
    winStreak: finiteNumber(saved.winStreak, defaultProfile.winStreak),
    bestStreak: finiteNumber(saved.bestStreak, defaultProfile.bestStreak),
    items: Array.isArray(saved.items) ? saved.items.filter((item): item is string => typeof item === "string").slice(0, 30) : [],
    defeatedOpponents: Array.isArray(saved.defeatedOpponents)
      ? saved.defeatedOpponents.filter((item): item is string => typeof item === "string").slice(-30)
      : [],
    worldProgress: savedWorldProgress
      && typeof savedWorldProgress.distance === "number"
      && Number.isFinite(savedWorldProgress.distance)
      && savedWorldProgress.distance >= 0
      && typeof savedWorldProgress.depth === "number"
      && Number.isFinite(savedWorldProgress.depth)
      ? {
          distance: savedWorldProgress.distance,
          depth: Math.max(-1, Math.min(1, savedWorldProgress.depth)),
          routeChoice,
        }
      : null,
    dailyBattles: daily.dailyBattles,
    dailyWins: daily.dailyWins,
    dailyLosses: daily.dailyLosses,
    dailyAdRewardUsed: daily.dailyAdRewardUsed,
    dailyAdDuelsRemaining: daily.dailyAdDuelsRemaining,
    dailyKey: today,
  };
}

export function readProfile(userId?: string): PlayerProfile {
  try {
    let storedValue = localStorage.getItem(storageKeyFor(userId));
    if (!storedValue && !userId) {
      storedValue = localStorage.getItem(STORAGE_KEY);
      if (storedValue) localStorage.setItem(storageKeyFor(userId), storedValue);
    }
    return normalizePlayerProfile(JSON.parse(storedValue ?? "null"));
  } catch {
    return { ...defaultProfile };
  }
}

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

export function saveProfile(profile: PlayerProfile, userId?: string) {
  try {
    localStorage.setItem(storageKeyFor(userId), JSON.stringify(profile));
  } catch {
    // The active session can continue when browser storage is unavailable.
  }
}

export function awardBattle(profile: PlayerProfile, outcome: BattleOutcome, userId?: string): {
  profile: PlayerProfile;
  rewards: { gold: number; diamonds: number; xp: number; item: string | null; itemId: string | null; salvaged: boolean; lostStake: number };
} {
  const currentDay = todayKey();
  const base = { ...profile, ...normalizeDailyLifeState(profile) };
  const lostStake = outcome.verdict === "defeat" ? Math.min(20, Math.floor(base.gold * 0.03)) : 0;
  const questBonus = outcome.verdict === "victory" && base.dailyWins === 2 ? 100 : 0;
  const gold = outcome.verdict === "victory" ? Math.max(0, Math.floor(outcome.loot)) + questBonus : 0;
  const diamonds = outcome.verdict === "victory" ? 1 + Number(questBonus > 0) : 0;
  const xp = outcome.verdict === "victory" ? 58 : outcome.verdict === "draw" ? 35 : 27;
  const droppedItem = outcome.verdict === "victory"
    ? outcome.item === undefined ? "Kül Mührü" : outcome.item
    : null;
  const lootGrant = droppedItem ? grantLootItem(base, droppedItem) : null;
  const grantProfile = lootGrant?.profile ?? base;
  let level = base.level;
  let totalXp = base.xp + xp;
  while (totalXp >= 100 + level * 45) {
    totalXp -= 100 + level * 45;
    level += 1;
  }
  const wins = base.wins + Number(outcome.verdict === "victory");
  const winStreak = outcome.verdict === "victory" ? base.winStreak + 1 : 0;
  const next: PlayerProfile = {
    ...grantProfile,
    level,
    xp: totalXp,
    gold: Math.max(0, base.gold - lostStake + gold),
    diamonds: base.diamonds + diamonds,
    battles: base.battles + 1,
    wins,
    winStreak,
    bestStreak: Math.max(base.bestStreak, winStreak),
    defeatedOpponents: outcome.verdict === "victory" && !base.defeatedOpponents.includes(outcome.opponentId)
      ? [...base.defeatedOpponents, outcome.opponentId].slice(-30)
      : base.defeatedOpponents,
    dailyBattles: base.dailyBattles + 1,
    dailyWins: base.dailyWins + Number(outcome.verdict === "victory"),
    dailyLosses: base.dailyLosses + Number(outcome.verdict === "defeat"),
    dailyKey: currentDay,
  };
  saveProfile(next, userId);
  return {
    profile: next,
    rewards: {
      gold,
      diamonds,
      xp,
      item: lootGrant?.displayName ?? null,
      itemId: lootGrant?.itemId ?? null,
      salvaged: lootGrant?.salvaged ?? false,
      lostStake,
    },
  };
}

function normalizeEquipment(value: unknown): EquipmentLoadout {
  const saved = value && typeof value === "object" ? value as Partial<EquipmentLoadout> : {};
  return {
    weaponId: safeItemId(saved.weaponId, defaultProfile.equipment.weaponId),
    armorId: safeItemId(saved.armorId, defaultProfile.equipment.armorId),
    capeId: safeItemId(saved.capeId, defaultProfile.equipment.capeId),
    effectId: safeItemId(saved.effectId, defaultProfile.equipment.effectId),
    dyeId: safeItemId(saved.dyeId, defaultProfile.equipment.dyeId),
  };
}

function normalizeInventory(value: unknown): PlayerInventory {
  const saved = value && typeof value === "object" ? value as Partial<PlayerInventory> : {};
  const ownedItemIds = Array.isArray(saved.ownedItemIds)
    ? [...new Set(saved.ownedItemIds.filter((id): id is string => typeof id === "string" && /^[a-z0-9_-]{1,60}$/.test(id)))].slice(0, 120)
    : [...defaultProfile.inventory.ownedItemIds];
  for (const starterId of defaultProfile.inventory.ownedItemIds) {
    if (!ownedItemIds.includes(starterId)) ownedItemIds.push(starterId);
  }
  const upgrades: Record<string, number> = {};
  if (saved.upgrades && typeof saved.upgrades === "object") {
    for (const [itemId, level] of Object.entries(saved.upgrades).slice(0, 120)) {
      if (ownedItemIds.includes(itemId) && typeof level === "number" && Number.isInteger(level) && level >= 0 && level <= MAX_UPGRADE_LEVEL) {
        upgrades[itemId] = level;
      }
    }
  }
  const newItemIds = Array.isArray(saved.newItemIds)
    ? [...new Set(saved.newItemIds.filter((id): id is string => typeof id === "string" && ownedItemIds.includes(id)))].slice(0, 120)
    : [];
  const combatItemCounts = normalizeCombatItemCounts(saved.combatItemCounts);
  const quickSlots = normalizeCombatQuickSlots(saved.quickSlots, combatItemCounts);
  const secondaryWeapon = typeof saved.secondaryWeaponId === "string"
    ? saved.secondaryWeaponId
    : null;
  const secondaryWeaponId = secondaryWeapon
    && ownedItemIds.includes(secondaryWeapon)
    && /^weapon_[a-z0-9_-]+$/.test(secondaryWeapon)
    ? secondaryWeapon
    : null;
  return { ownedItemIds, upgrades, newItemIds, combatItemCounts, quickSlots, secondaryWeaponId };
}

function safeItemId(value: unknown, fallback: string) {
  return typeof value === "string" && /^[a-z0-9_-]{1,60}$/.test(value) ? value : fallback;
}

export function renameProfile(profile: PlayerProfile, name: string, userId?: string): PlayerProfile {
  const cleanName = name.trim().replace(/\s+/g, " ").slice(0, 20);
  const next = { ...profile, name: cleanName || defaultProfile.name };
  saveProfile(next, userId);
  return next;
}
