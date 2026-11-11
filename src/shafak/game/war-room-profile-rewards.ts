import type { PlayerProfile } from "./profile.ts";
import type { WarRoomModeId } from "./war-room-missions.ts";
import { getIstanbulDayKey } from "./daily-lives.ts";

export const WAR_ROOM_DAILY_PROFILE_XP_CAP = 60;
export const WAR_ROOM_DAILY_SEAL_CAP = 1;

export type WarRoomProfileRewardRequest = {
  mode: WarRoomModeId;
  victory: boolean;
  kills: number;
  headshots: number;
  wave: number;
};

export type WarRoomProfileReward = {
  xp: number;
  sealFragments: number;
};

const VALID_MODES = new Set<WarRoomModeId>(["raid", "survival", "treasure", "defense", "daily"]);

export function parseWarRoomProfileRewardRequest(value: unknown): WarRoomProfileRewardRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some((key) => !["mode", "victory", "kills", "headshots", "wave"].includes(key))
    || !VALID_MODES.has(input.mode as WarRoomModeId)
    || typeof input.victory !== "boolean"
    || !Number.isSafeInteger(input.kills) || (input.kills as number) < 0 || (input.kills as number) > 10_000
    || !Number.isSafeInteger(input.headshots) || (input.headshots as number) < 0 || (input.headshots as number) > 10_000
    || !Number.isSafeInteger(input.wave) || (input.wave as number) < 1 || (input.wave as number) > 10_000
  ) return null;

  return {
    mode: input.mode as WarRoomModeId,
    victory: input.victory,
    kills: input.kills as number,
    headshots: input.headshots as number,
    wave: input.wave as number,
  };
}

function getRequestedXp(request: WarRoomProfileRewardRequest) {
  if (!request.victory) return 5;
  if (request.mode === "survival") return Math.min(45, 12 + request.wave * 2);
  return request.mode === "daily" ? 32 : 24;
}

export function awardWarRoomProfileReward(
  profile: PlayerProfile,
  request: WarRoomProfileRewardRequest,
  dayKey = getIstanbulDayKey(),
) {
  const sameDay = profile.warRoomRewardDayKey === dayKey;
  const dailyXp = sameDay ? profile.warRoomDailyXp : 0;
  const dailySealClaimed = sameDay && profile.warRoomDailySealClaimed;
  const xp = Math.min(getRequestedXp(request), Math.max(0, WAR_ROOM_DAILY_PROFILE_XP_CAP - dailyXp));
  const sealFragments = request.mode === "daily" && request.victory && !dailySealClaimed
    ? WAR_ROOM_DAILY_SEAL_CAP
    : 0;

  let level = profile.level;
  let totalXp = profile.xp + xp;
  while (totalXp >= 100 + level * 45) {
    totalXp -= 100 + level * 45;
    level += 1;
  }

  return {
    profile: {
      ...profile,
      level,
      xp: totalXp,
      materials: {
        ...profile.materials,
        sealFragments: profile.materials.sealFragments + sealFragments,
      },
      warRoomRewardDayKey: dayKey,
      warRoomDailyXp: dailyXp + xp,
      warRoomDailySealClaimed: dailySealClaimed || sealFragments > 0,
    },
    rewards: { xp, sealFragments } satisfies WarRoomProfileReward,
  };
}
