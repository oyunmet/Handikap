import {
  CAMPAIGN_ACT_COUNT,
  CAMPAIGN_LEVELS_PER_ACT,
  CAMPAIGN_MISSION_LABELS,
  CAMPAIGN_REGIONS,
  getCampaignLevelKind,
  type CampaignMissionKind,
} from "./campaign-progression.ts";

type RegularMissionKind = Exclude<CampaignMissionKind, "mini-boss" | "act-boss">;

export type CampaignMissionTemplate = {
  id: string;
  name: string;
  kind: RegularMissionKind;
  objective: string;
};

export type CampaignBossTemplate = {
  id: string;
  name: string;
  objective: string;
};

export type CampaignActData = {
  id: string;
  name: string;
  theme: string;
  enemyFaction: string;
  mapVariants: readonly string[];
  missionTemplates: readonly CampaignMissionTemplate[];
  miniBossTemplate: CampaignBossTemplate;
  actBossTemplate: CampaignBossTemplate;
};

export type CampaignLevelData = {
  id: string;
  chapterId: number;
  levelNumber: number;
  actNumber: number;
  actId: string;
  actName: string;
  regionName: string;
  theme: string;
  enemyFaction: string;
  kind: CampaignMissionKind;
  kindLabel: string;
  templateId: string;
  templateName: string;
  objective: string;
  mapVariant: string;
  parameters: {
    localLevelNumber: number;
    patternIndex: number;
    actIntensity: number;
    seed: number;
  };
};

type CampaignActModule = { CAMPAIGN_ACT_DATA: CampaignActData };
const ACT_LOADERS: readonly (() => Promise<CampaignActModule>)[] = [
  () => import("./campaign-acts/act-01.ts"),
  () => import("./campaign-acts/act-02.ts"),
  () => import("./campaign-acts/act-03.ts"),
  () => import("./campaign-acts/act-04.ts"),
  () => import("./campaign-acts/act-05.ts"),
  () => import("./campaign-acts/act-06.ts"),
  () => import("./campaign-acts/act-07.ts"),
  () => import("./campaign-acts/act-08.ts"),
  () => import("./campaign-acts/act-09.ts"),
];

const loadedActs = new Map<number, CampaignActData>();

export function getLoadedCampaignActNumbers() {
  return [...loadedActs.keys()].sort((left, right) => left - right);
}

export async function loadCampaignActData(actNumber: number) {
  if (!Number.isSafeInteger(actNumber) || actNumber < 1 || actNumber > CAMPAIGN_ACT_COUNT) {
    throw new RangeError("Campaign act number is outside the supported range.");
  }
  const cached = loadedActs.get(actNumber);
  if (cached) return cached;

  const loaded = await ACT_LOADERS[actNumber - 1]();
  const act = loaded.CAMPAIGN_ACT_DATA;
  const expectedRegion = CAMPAIGN_REGIONS[actNumber - 1];
  if (act.id !== expectedRegion.id || act.name !== expectedRegion.name) {
    throw new Error(`Campaign act ${actNumber} does not match its region manifest.`);
  }
  loadedActs.set(actNumber, act);
  return act;
}

export async function loadCampaignLevelData(chapterId: number): Promise<CampaignLevelData> {
  if (
    !Number.isSafeInteger(chapterId)
    || chapterId < 0
    || chapterId >= CAMPAIGN_ACT_COUNT * CAMPAIGN_LEVELS_PER_ACT
  ) {
    throw new RangeError("Campaign chapter is outside the supported range.");
  }

  const levelNumber = chapterId + 1;
  const actNumber = Math.floor(chapterId / CAMPAIGN_LEVELS_PER_ACT) + 1;
  const localLevelNumber = (chapterId % CAMPAIGN_LEVELS_PER_ACT) + 1;
  const act = await loadCampaignActData(actNumber);
  const kind = getCampaignLevelKind(chapterId);
  const patternIndex = (localLevelNumber - 1) % act.mapVariants.length;
  const template = kind === "act-boss"
    ? act.actBossTemplate
    : kind === "mini-boss"
      ? act.miniBossTemplate
      : act.missionTemplates.find((candidate) => candidate.kind === kind);
  if (!template) {
    throw new Error(`Campaign act ${actNumber} is missing a ${kind} template.`);
  }

  return {
    id: `campaign:${levelNumber}`,
    chapterId,
    levelNumber,
    actNumber,
    actId: act.id,
    actName: act.name,
    regionName: act.name,
    theme: act.theme,
    enemyFaction: act.enemyFaction,
    kind,
    kindLabel: CAMPAIGN_MISSION_LABELS[kind],
    templateId: template.id,
    templateName: template.name,
    objective: template.objective,
    mapVariant: act.mapVariants[patternIndex],
    parameters: {
      localLevelNumber,
      patternIndex,
      actIntensity: actNumber,
      seed: Math.imul(levelNumber, 0x45d9f3b) >>> 0,
    },
  };
}
