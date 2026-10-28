export const WAR_ROOM_LOW_HEALTH_RATIO = 0.25;
export const WAR_ROOM_MULTI_KILL_WINDOW_MS = 3_000;

export function isWarRoomLowHealth(hp: number, maxHp: number) {
  return Number.isFinite(hp)
    && Number.isFinite(maxHp)
    && maxHp > 0
    && hp / maxHp <= WAR_ROOM_LOW_HEALTH_RATIO;
}

export type WarRoomKillStreakState = { count: number; at: number };

export function advanceWarRoomKillStreak(
  previous: WarRoomKillStreakState,
  now: number,
): WarRoomKillStreakState {
  const previousCount = Number.isFinite(previous.count)
    ? Math.max(0, Math.floor(previous.count))
    : 0;
  const continues = previousCount > 0
    && Number.isFinite(now)
    && Number.isFinite(previous.at)
    && now >= previous.at
    && now - previous.at <= WAR_ROOM_MULTI_KILL_WINDOW_MS;
  return {
    count: continues ? previousCount + 1 : 1,
    at: Number.isFinite(now) ? now : previous.at,
  };
}
