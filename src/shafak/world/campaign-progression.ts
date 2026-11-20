import { WORLD_GATE_INTERVAL_METERS } from "./movement.ts";
import {
  CAMPAIGN_ACT_COUNT,
  CAMPAIGN_LEVEL_COUNT,
  CAMPAIGN_LEVELS_PER_OPERATION,
  CAMPAIGN_OPERATIONS,
  getCampaignStoryRecordForChapter,
  normalizeCampaignStoryRecordIds,
  type CampaignMissionKind,
  type CampaignStoryRecord,
} from "../../data/story.ts";
import { CAMPAIGN_MISSION_LABELS } from "../../data/strings.ts";

export { CAMPAIGN_ACT_COUNT, CAMPAIGN_LEVEL_COUNT, CAMPAIGN_MISSION_LABELS };
export type { CampaignMissionKind };

export const CAMPAIGN_LEVELS_PER_ACT = CAMPAIGN_LEVELS_PER_OPERATION;
export const CAMPAIGN_CHAPTER_COUNT = CAMPAIGN_LEVEL_COUNT;
export const CAMPAIGN_PROGRESS_VERSION = 2;
export const FINAL_CAMPAIGN_CHAPTER_ID = CAMPAIGN_CHAPTER_COUNT - 1;
export const MAX_DEFEATED_OPPONENTS = 64;

export const CAMPAIGN_REGIONS = CAMPAIGN_OPERATIONS.map((operation, index) => ({
  id: operation.id,
  name: operation.name,
  firstChapterId: index * CAMPAIGN_LEVELS_PER_ACT,
  lastChapterId: (index + 1) * CAMPAIGN_LEVELS_PER_ACT - 1,
}));

export function getCampaignStoryRecordForDefeatedOpponent(opponentId: string): CampaignStoryRecord | null {
  const match = /^ash-road:(\d{1,7}):rival:(\d{1,2})$/.exec(opponentId);
  if (!match) return null;
  const chapterId = Number(match[1]);
  const rivalIndex = Number(match[2]);
  const record = getCampaignStoryRecordForChapter(chapterId);
  return record && rivalIndex === getCampaignRivalCount(chapterId) - 1 ? record : null;
}

export function getUnlockedCampaignStoryRecords(defeatedOpponentIds: readonly string[]) {
  const unlockedIds = new Set(
    defeatedOpponentIds
      .map(getCampaignStoryRecordForDefeatedOpponent)
      .filter((record): record is CampaignStoryRecord => record !== null)
      .map((record) => record.id),
  );
  return CAMPAIGN_OPERATIONS
    .map((operation) => operation.record)
    .filter((record) => unlockedIds.has(record.id));
}

export function addCampaignRecordForVictory(recordIds: readonly string[], opponentId: string) {
  const record = getCampaignStoryRecordForDefeatedOpponent(opponentId);
  return normalizeCampaignStoryRecordIds(record ? [...recordIds, record.id] : recordIds);
}

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
