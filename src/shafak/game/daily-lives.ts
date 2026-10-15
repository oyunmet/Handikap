export const DAILY_DEFEAT_LIMIT = 3;
export const DAILY_AD_DUEL_LIMIT = 1;
export const DAILY_RESET_TIME_ZONE = "Europe/Istanbul";

export type DailyLifeState = {
  dailyKey: string;
  dailyBattles: number;
  dailyWins: number;
  dailyLosses: number;
  dailyAdRewardUsed: boolean;
  dailyAdDuelsRemaining: number;
};

export function getIstanbulDayKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DAILY_RESET_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function normalizeDailyLifeState(
  state: Partial<DailyLifeState> | null | undefined,
  now = new Date(),
): DailyLifeState {
  const today = getIstanbulDayKey(now);
  if (!state || state.dailyKey !== today) {
    return {
      dailyKey: today,
      dailyBattles: 0,
      dailyWins: 0,
      dailyLosses: 0,
      dailyAdRewardUsed: false,
      dailyAdDuelsRemaining: 0,
    };
  }
  const dailyBattles = safeCount(state.dailyBattles);
  const dailyWins = Math.min(dailyBattles, safeCount(state.dailyWins));
  const dailyLosses = Math.min(dailyBattles, safeCount(state.dailyLosses));
  return {
    dailyKey: today,
    dailyBattles,
    dailyWins,
    dailyLosses,
    dailyAdRewardUsed: state.dailyAdRewardUsed === true,
    dailyAdDuelsRemaining: Math.min(DAILY_AD_DUEL_LIMIT, safeCount(state.dailyAdDuelsRemaining)),
  };
}

export function canStartDailyDuel(state: Partial<DailyLifeState>, now = new Date()) {
  const daily = normalizeDailyLifeState(state, now);
  if (daily.dailyLosses < DAILY_DEFEAT_LIMIT) return { allowed: true, usesAdDuel: false, daily };
  if (daily.dailyAdDuelsRemaining > 0) return { allowed: true, usesAdDuel: true, daily };
  return { allowed: false, usesAdDuel: false, daily };
}

export function grantDailyAdDuel(
  state: Partial<DailyLifeState>,
  now = new Date(),
): DailyLifeState | null {
  const daily = normalizeDailyLifeState(state, now);
  if (daily.dailyLosses < DAILY_DEFEAT_LIMIT || daily.dailyAdRewardUsed) return null;
  return { ...daily, dailyAdRewardUsed: true, dailyAdDuelsRemaining: DAILY_AD_DUEL_LIMIT };
}

export function consumeDailyAdDuel(
  state: Partial<DailyLifeState>,
  now = new Date(),
): DailyLifeState | null {
  const { allowed, usesAdDuel, daily } = canStartDailyDuel(state, now);
  if (!allowed) return null;
  return usesAdDuel
    ? { ...daily, dailyAdDuelsRemaining: daily.dailyAdDuelsRemaining - 1 }
    : daily;
}

function safeCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.min(1_000_000, Math.floor(value))
    : 0;
}
