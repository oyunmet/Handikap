import { getIstanbulDayKey } from "./daily-lives";

export type WarRoomDailyChallenge = {
  dayKey: string;
  seed: number;
};

export function getWarRoomDailyChallenge(now = new Date()): WarRoomDailyChallenge {
  const dayKey = getIstanbulDayKey(now);
  let hash = 0x811c9dc5;
  for (const character of dayKey) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return { dayKey, seed: (hash >>> 0) || 1 };
}

export function isWarRoomDailyChallengeComplete(
  completedDayKey: string | null | undefined,
  dayKey: string,
) {
  return completedDayKey === dayKey;
}
