import { WORLD_GATE_INTERVAL_METERS } from "./movement.ts";

export const CAMPAIGN_CHAPTER_COUNT = 9;
export const FINAL_CAMPAIGN_CHAPTER_ID = CAMPAIGN_CHAPTER_COUNT - 1;
export const MAX_DEFEATED_OPPONENTS = 64;

export const CAMPAIGN_REGIONS = [
  { id: "ash-road", name: "Kül Yolu", firstChapterId: 0, lastChapterId: 2 },
  { id: "frozen-pass", name: "Donmuş Geçit", firstChapterId: 3, lastChapterId: 5 },
  { id: "red-marsh", name: "Kızıl Bataklık", firstChapterId: 6, lastChapterId: 8 },
] as const;

export function getCampaignRivalCount(chapterId: number) {
  const chapter = Number.isFinite(chapterId)
    ? Math.max(0, Math.min(FINAL_CAMPAIGN_CHAPTER_ID, Math.floor(chapterId)))
    : 0;
  return 5 + Math.floor(chapter / 2);
}

export const FINAL_CAMPAIGN_BOSS_ID =
  `ash-road:${FINAL_CAMPAIGN_CHAPTER_ID}:rival:${getCampaignRivalCount(FINAL_CAMPAIGN_CHAPTER_ID) - 1}`;

export const FINAL_CAMPAIGN_DISTANCE = CAMPAIGN_CHAPTER_COUNT * WORLD_GATE_INTERVAL_METERS - 2.8;

export function getCampaignRegion(chapterId: number) {
  const chapter = Number.isFinite(chapterId) ? Math.max(0, Math.floor(chapterId)) : 0;
  const regionIndex = Math.max(0, Math.min(CAMPAIGN_REGIONS.length - 1, Math.floor(chapter / 3)));
  return CAMPAIGN_REGIONS[regionIndex];
}

export function isCampaignFinalBoss(chapterId: number, isBoss: boolean) {
  return isBoss && Math.floor(chapterId) === FINAL_CAMPAIGN_CHAPTER_ID;
}

export function isCampaignComplete(
  defeatedOpponentIds: readonly string[],
  distance = 0,
) {
  return defeatedOpponentIds.includes(FINAL_CAMPAIGN_BOSS_ID)
    || (Number.isFinite(distance) && distance >= FINAL_CAMPAIGN_DISTANCE);
}

export function resetCampaignProgressForNewGamePlus<
  T extends { defeatedOpponents: string[]; worldProgress: unknown },
>(profile: T): T {
  return {
    ...profile,
    defeatedOpponents: [],
    worldProgress: null,
  };
}
