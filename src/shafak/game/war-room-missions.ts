export type WarRoomModeId = "raid" | "survival" | "treasure" | "defense" | "daily";
export type WarRoomDifficultyId = "easy" | "normal" | "hard" | "nightmare";
export type WarRoomModifierId = "darkness" | "fog" | "fast-enemies" | "low-ammo" | "double-damage";

export type WarRoomMissionOptions = {
  mode: WarRoomModeId;
  difficulty: WarRoomDifficultyId;
  modifiers: readonly WarRoomModifierId[];
  mapId: string;
  dailyObjective?: Exclude<WarRoomModeId, "daily" | "survival">;
};

export type WarRoomMissionState = {
  mode: WarRoomModeId;
  dailyObjective: Exclude<WarRoomModeId, "daily" | "survival"> | null;
  difficulty: WarRoomDifficultyId;
  modifiers: WarRoomModifierId[];
  mapId: string;
  objectivePosition: { x: number; z: number };
  timeLimitSeconds: number | null;
  targetChests: number;
  defenseHp: number;
  defenseMaxHp: number;
  wave: number;
  score: number;
};

export type WarRoomMissionOutcome = "victory" | "defeat" | "continue" | "wave-complete";

export type WarRoomMissionSnapshot = {
  remaining: number;
  openedChests: number;
  elapsedSeconds: number;
  playerHp: number;
  defenseHp: number;
};

export function getWarRoomObjectiveMode(
  mission: Pick<WarRoomMissionState, "mode" | "dailyObjective">,
): Exclude<WarRoomModeId, "daily" | "survival"> | "survival" {
  return mission.mode === "daily" ? mission.dailyObjective ?? "raid" : mission.mode;
}

export const WAR_ROOM_MODES: readonly {
  id: Exclude<WarRoomModeId, "daily">;
  name: string;
  description: string;
}[] = [
  { id: "raid", name: "Baskın", description: "Muhafızları ve komutanı alt et." },
  { id: "survival", name: "Hayatta Kalma", description: "Sonsuz dalgalarda dayan; skorunu yükselt." },
  { id: "treasure", name: "Sandık Avı", description: "Süre dolmadan beş sandık aç." },
  { id: "defense", name: "Savunma", description: "Komutanı yen ve savunma noktasını koru." },
];

export const WAR_ROOM_DIFFICULTIES: readonly {
  id: WarRoomDifficultyId;
  name: string;
  enemyHealth: number;
  enemyDamage: number;
}[] = [
  { id: "easy", name: "Kolay", enemyHealth: 0.72, enemyDamage: 0.7 },
  { id: "normal", name: "Normal", enemyHealth: 1, enemyDamage: 1 },
  { id: "hard", name: "Zor", enemyHealth: 1.35, enemyDamage: 1.2 },
  { id: "nightmare", name: "Kâbus", enemyHealth: 1.8, enemyDamage: 1.5 },
];

export const WAR_ROOM_MODIFIERS: readonly {
  id: WarRoomModifierId;
  name: string;
}[] = [
  { id: "darkness", name: "Karanlık" },
  { id: "fog", name: "Sis" },
  { id: "fast-enemies", name: "Hızlı düşman" },
  { id: "low-ammo", name: "Az mühimmat" },
  { id: "double-damage", name: "Çift hasar" },
];

export const WAR_ROOM_DAILY_MODIFIERS: readonly WarRoomModifierId[] = [
  "darkness",
  "fog",
  "fast-enemies",
  "low-ammo",
  "double-damage",
];

export function getWarRoomDailyPreset(seed: number, mapIds: readonly string[]) {
  const safeSeed = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 1;
  const modifier = WAR_ROOM_DAILY_MODIFIERS[safeSeed % WAR_ROOM_DAILY_MODIFIERS.length]!;
  const difficulty: WarRoomDifficultyId[] = ["easy", "normal", "hard", "nightmare"];
  const mode: WarRoomModeId[] = ["raid", "treasure", "defense"];
  const selectedMap = mapIds[safeSeed % Math.max(1, mapIds.length)] ?? "stone-courtyard";
  return {
    mode: mode[Math.floor(safeSeed / 3) % mode.length]!,
    difficulty: difficulty[Math.floor(safeSeed / 5) % difficulty.length]!,
    modifiers: [modifier],
    mapId: selectedMap,
  };
}

export function createWarRoomMissionState(
  options: WarRoomMissionOptions,
  objectivePosition: { x: number; z: number },
): WarRoomMissionState {
  const validModifierIds = new Set(WAR_ROOM_MODIFIERS.map(({ id }) => id));
  const modifiers = [...new Set(options.modifiers)].filter((id) => validModifierIds.has(id));
  const dailyObjective = options.mode === "daily" ? options.dailyObjective ?? "raid" : null;
  const objectiveMode = dailyObjective ?? options.mode;
  return {
    mode: options.mode,
    dailyObjective,
    difficulty: options.difficulty,
    modifiers,
    mapId: options.mapId,
    objectivePosition: { ...objectivePosition },
    timeLimitSeconds: objectiveMode === "treasure" ? 180 : objectiveMode === "defense" ? 240 : null,
    targetChests: objectiveMode === "treasure" ? 5 : 0,
    defenseHp: objectiveMode === "defense" ? 100 : 0,
    defenseMaxHp: objectiveMode === "defense" ? 100 : 0,
    wave: 1,
    score: 0,
  };
}

export function getWarRoomMissionOutcome(
  mode: WarRoomModeId,
  snapshot: WarRoomMissionSnapshot,
  mission: Pick<WarRoomMissionState, "timeLimitSeconds" | "targetChests" | "defenseHp" | "dailyObjective">,
): WarRoomMissionOutcome {
  if (snapshot.playerHp <= 0) return "defeat";
  const objectiveMode = getWarRoomObjectiveMode({ mode, dailyObjective: mission.dailyObjective });
  if (objectiveMode === "treasure") {
    if (snapshot.openedChests >= mission.targetChests) return "victory";
    return mission.timeLimitSeconds !== null && snapshot.elapsedSeconds >= mission.timeLimitSeconds
      ? "defeat"
      : "continue";
  }
  if (objectiveMode === "defense") {
    if (snapshot.defenseHp <= 0) return "defeat";
    if (snapshot.remaining === 0) return "victory";
    return mission.timeLimitSeconds !== null && snapshot.elapsedSeconds >= mission.timeLimitSeconds
      ? "defeat"
      : "continue";
  }
  if (snapshot.remaining > 0) return "continue";
  return mode === "survival" ? "wave-complete" : "victory";
}

export function getWarRoomMissionReward({
  mode,
  victory,
  alreadyClaimedToday = false,
  kills,
  headshots,
  contractBonus,
  wave = 1,
}: {
  mode: WarRoomModeId;
  victory: boolean;
  alreadyClaimedToday?: boolean;
  kills: number;
  headshots: number;
  contractBonus: number;
  wave?: number;
}) {
  const base = 90 + Math.max(0, Math.floor(kills)) * 7 + Math.max(0, Math.floor(headshots)) * 5;
  if (mode === "daily") {
    return !victory || alreadyClaimedToday ? 0 : Math.min(180, base + Math.max(0, contractBonus));
  }
  if (mode === "survival") {
    return Math.min(300, Math.max(0, Math.floor(wave)) * 12 + base - 90);
  }
  return victory ? base + Math.max(0, contractBonus) : 0;
}

export function getWarRoomResultGrade({
  accuracy,
  healthRatio,
  seconds,
}: {
  accuracy: number;
  healthRatio: number;
  seconds: number;
}) {
  const safeAccuracy = Math.max(0, Math.min(100, Number.isFinite(accuracy) ? accuracy : 0));
  const safeHealth = Math.max(0, Math.min(1, Number.isFinite(healthRatio) ? healthRatio : 0));
  const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : Number.POSITIVE_INFINITY);
  if (safeAccuracy >= 80 && safeHealth >= 0.7 && safeSeconds <= 180) return "S" as const;
  if (safeAccuracy >= 60 && safeHealth >= 0.4) return "A" as const;
  if (safeAccuracy >= 35 || safeHealth >= 0.2) return "B" as const;
  return "C" as const;
}

export function getWarRoomEnemySpeedMultiplier(modifiers: readonly WarRoomModifierId[]) {
  return modifiers.includes("fast-enemies") ? 1.35 : 1;
}

export function getWarRoomEnemyDamageMultiplier(
  difficulty: WarRoomDifficultyId,
  modifiers: readonly WarRoomModifierId[],
) {
  const selected = WAR_ROOM_DIFFICULTIES.find((item) => item.id === difficulty) ?? WAR_ROOM_DIFFICULTIES[1]!;
  return selected.enemyDamage * (modifiers.includes("double-damage") ? 2 : 1);
}

export function getWarRoomEnemyHealthMultiplier(difficulty: WarRoomDifficultyId) {
  return WAR_ROOM_DIFFICULTIES.find((item) => item.id === difficulty)?.enemyHealth ?? 1;
}

export function getWarRoomAmmoMultiplier(modifiers: readonly WarRoomModifierId[]) {
  return modifiers.includes("low-ammo") ? 0.45 : 1;
}

export function getWarRoomResultLabel(mode: WarRoomModeId) {
  switch (mode) {
    case "survival": return "HAYATTA KALMA";
    case "treasure": return "SANDIK AVI";
    case "defense": return "SAVUNMA";
    case "daily": return "GÜNLÜK SINAV";
    default: return "BASKIN";
  }
}
