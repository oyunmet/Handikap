import { WORLD_GATE_INTERVAL_METERS } from "./movement.ts";

export const CAMPAIGN_ACT_COUNT = 9;
export const CAMPAIGN_LEVELS_PER_ACT = 50;
export const CAMPAIGN_LEVEL_COUNT = CAMPAIGN_ACT_COUNT * CAMPAIGN_LEVELS_PER_ACT;
export const CAMPAIGN_CHAPTER_COUNT = CAMPAIGN_LEVEL_COUNT;
export const CAMPAIGN_PROGRESS_VERSION = 2;
export const FINAL_CAMPAIGN_CHAPTER_ID = CAMPAIGN_CHAPTER_COUNT - 1;
export const MAX_DEFEATED_OPPONENTS = 64;

export const CAMPAIGN_REGIONS = [
  { id: "ash-road", name: "Kül Yolu", firstChapterId: 0, lastChapterId: 49 },
  { id: "frozen-pass", name: "Donmuş Geçit", firstChapterId: 50, lastChapterId: 99 },
  { id: "red-marsh", name: "Kızıl Bataklık", firstChapterId: 100, lastChapterId: 149 },
  { id: "whispering-forest", name: "Fısıltı Ormanı", firstChapterId: 150, lastChapterId: 199 },
  { id: "broken-throne", name: "Çürük Taht", firstChapterId: 200, lastChapterId: 249 },
  { id: "mist-coast", name: "Sisli Kıyı", firstChapterId: 250, lastChapterId: 299 },
  { id: "lost-city", name: "Kayıp Şehir", firstChapterId: 300, lastChapterId: 349 },
  { id: "black-summit", name: "Kara Zirve", firstChapterId: 350, lastChapterId: 399 },
  { id: "shadow-palace", name: "Gölge Sarayı", firstChapterId: 400, lastChapterId: 449 },
] as const;

export type CampaignMissionKind =
  | "normal-combat"
  | "survival"
  | "target-hunt"
  | "siege"
  | "exploration"
  | "mini-boss"
  | "act-boss";

export const CAMPAIGN_MISSION_LABELS: Readonly<Record<CampaignMissionKind, string>> = {
  "normal-combat": "Normal çatışma",
  survival: "Hayatta kalma dalgası",
  "target-hunt": "Hedef avı",
  siege: "Kuşatma",
  exploration: "Keşif ve hazine",
  "mini-boss": "Mini-boss",
  "act-boss": "Perde boss'u",
};

const REGULAR_MISSION_KINDS = [
  "normal-combat",
  "survival",
  "target-hunt",
  "siege",
  "exploration",
] as const satisfies readonly CampaignMissionKind[];

export function clampCampaignChapterId(value: number) {
  const chapter = Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.max(0, Math.min(FINAL_CAMPAIGN_CHAPTER_ID, chapter));
}

export function getCampaignLevelNumber(chapterId: number) {
  return clampCampaignChapterId(chapterId) + 1;
}

export function getCampaignRegion(chapterId: number) {
  const safeChapter = clampCampaignChapterId(chapterId);
  return CAMPAIGN_REGIONS[Math.floor(safeChapter / CAMPAIGN_LEVELS_PER_ACT)];
}

export function getCampaignLevelKind(chapterId: number): CampaignMissionKind {
  const levelNumber = getCampaignLevelNumber(chapterId);
  if (levelNumber % CAMPAIGN_LEVELS_PER_ACT === 0) return "act-boss";
  if (levelNumber % 10 === 0) return "mini-boss";
  return REGULAR_MISSION_KINDS[(levelNumber - 1) % REGULAR_MISSION_KINDS.length];
}

export function getCampaignProgressFromDistance(distance: number) {
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  const chapterId = clampCampaignChapterId(Math.floor(safeDistance / WORLD_GATE_INTERVAL_METERS));
  const withinLevelDistance = safeDistance % WORLD_GATE_INTERVAL_METERS;
  const levelProgressPercent = safeDistance >= FINAL_CAMPAIGN_DISTANCE
    ? 100
    : Math.max(0, Math.min(100, (withinLevelDistance / WORLD_GATE_INTERVAL_METERS) * 100));
  return {
    chapterId,
    levelNumber: chapterId + 1,
    actNumber: Math.floor(chapterId / CAMPAIGN_LEVELS_PER_ACT) + 1,
    region: getCampaignRegion(chapterId),
    levelProgressPercent,
    campaignProgressPercent: Math.max(
      0,
      Math.min(100, (safeDistance / FINAL_CAMPAIGN_DISTANCE) * 100),
    ),
  };
}

export function getCampaignRivalCount(chapterId: number) {
  const chapter = Math.max(0, Math.floor(Number.isFinite(chapterId) ? chapterId : 0));
  return 5 + Math.min(4, Math.floor(chapter / 90));
}

export const FINAL_CAMPAIGN_BOSS_ID =
  `ash-road:${FINAL_CAMPAIGN_CHAPTER_ID}:rival:${getCampaignRivalCount(FINAL_CAMPAIGN_CHAPTER_ID) - 1}`;

// Legacy world distance remains the save source of truth; no existing progress is reset.
export const FINAL_CAMPAIGN_DISTANCE = CAMPAIGN_LEVEL_COUNT * WORLD_GATE_INTERVAL_METERS;

export function isCampaignMiniBoss(chapterId: number) {
  const levelNumber = getCampaignLevelNumber(chapterId);
  return levelNumber % 10 === 0 && levelNumber % CAMPAIGN_LEVELS_PER_ACT !== 0;
}

export function isCampaignActBoss(chapterId: number) {
  return getCampaignLevelNumber(chapterId) % CAMPAIGN_LEVELS_PER_ACT === 0;
}

export function isCampaignBossLevel(chapterId: number) {
  return isCampaignMiniBoss(chapterId) || isCampaignActBoss(chapterId);
}

export function isCampaignFinalBoss(chapterId: number, isBoss: boolean) {
  return isBoss
    && Number.isSafeInteger(chapterId)
    && chapterId === FINAL_CAMPAIGN_CHAPTER_ID;
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
