export type PlayerProfile = {
  name: string;
  level: number;
  xp: number;
  gold: number;
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

export type BattleOutcome = {
  verdict: "victory" | "defeat" | "draw";
  opponentId: string;
  loot: number;
};

const STORAGE_KEY = "shafak-local-profile-v1";
const storageKeyFor = (userId?: string) => `${STORAGE_KEY}:${userId || "guest"}`;

export const defaultProfile: PlayerProfile = {
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
  dailyKey: new Date().toISOString().slice(0, 10),
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizePlayerProfile(value: unknown): PlayerProfile {
  const saved = value as Partial<PlayerProfile> | null;
  if (!saved || typeof saved !== "object") return { ...defaultProfile };
  const today = todayKey();
  return {
    name: typeof saved.name === "string" && saved.name.trim() ? saved.name.trim().slice(0, 20) : defaultProfile.name,
    level: finiteNumber(saved.level, defaultProfile.level),
    xp: finiteNumber(saved.xp, defaultProfile.xp),
    gold: finiteNumber(saved.gold, defaultProfile.gold),
    battles: finiteNumber(saved.battles, defaultProfile.battles),
    wins: finiteNumber(saved.wins, defaultProfile.wins),
    winStreak: finiteNumber(saved.winStreak, defaultProfile.winStreak),
    bestStreak: finiteNumber(saved.bestStreak, defaultProfile.bestStreak),
    items: Array.isArray(saved.items) ? saved.items.filter((item): item is string => typeof item === "string").slice(0, 30) : [],
    defeatedOpponents: Array.isArray(saved.defeatedOpponents)
      ? saved.defeatedOpponents.filter((item): item is string => typeof item === "string").slice(-30)
      : [],
    dailyBattles: saved.dailyKey === today ? finiteNumber(saved.dailyBattles, 0) : 0,
    dailyWins: saved.dailyKey === today ? finiteNumber(saved.dailyWins, 0) : 0,
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

export function awardBattle(profile: PlayerProfile, outcome: BattleOutcome, userId?: string): { profile: PlayerProfile; rewards: { gold: number; xp: number; item: string | null; lostStake: number } } {
  const currentDay = todayKey();
  const base = profile.dailyKey === currentDay ? profile : { ...profile, dailyBattles: 0, dailyWins: 0, dailyKey: currentDay };
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
  const next: PlayerProfile = {
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
    dailyKey: currentDay,
  };
  saveProfile(next, userId);
  return { profile: next, rewards: { gold, xp, item, lostStake } };
}

export function renameProfile(profile: PlayerProfile, name: string, userId?: string): PlayerProfile {
  const cleanName = name.trim().replace(/\s+/g, " ").slice(0, 20);
  const next = { ...profile, name: cleanName || defaultProfile.name };
  saveProfile(next, userId);
  return next;
}
