import {
  CAMPAIGN_NARRATIVE,
  getCampaignChapterName,
  getCampaignOperationForChapter,
  STORY_DIALOGUE_CONTENT,
  type StoryDialogue,
} from "../../data/story.ts";
import { STORY_UI_STRINGS } from "../../data/strings.ts";
import {
  CAMPAIGN_ACT_COUNT,
  CAMPAIGN_LEVEL_COUNT,
  CAMPAIGN_LEVELS_PER_ACT,
  clampCampaignChapterId,
  getCampaignLevelNumber,
  getCampaignRegion,
  isCampaignActBoss,
} from "./campaign-progression.ts";
export type { StoryDialogue } from "../../data/story.ts";

const NPC_STORY_BEATS = STORY_DIALOGUE_CONTENT.npcBeats;
const RIVAL_STORIES = STORY_DIALOGUE_CONTENT.rivalVoices;

export function getOpeningStoryDialogue(): StoryDialogue {
  const firstOperation = getCampaignOperationForChapter(0);
  return {
    id: "story-opening",
    kind: "opening",
    title: STORY_UI_STRINGS.dialogue.openingTitle,
    speaker: CAMPAIGN_NARRATIVE.guideName,
    portrait: "sema",
    lines: [...CAMPAIGN_NARRATIVE.openingLines],
    hint: STORY_UI_STRINGS.dialogue.openingHint(firstOperation.name, CAMPAIGN_LEVEL_COUNT),
  };
}

export function getChapterStoryDialogue(
  chapterId: number,
  storySummary?: string,
  objective?: string,
): StoryDialogue {
  const safeChapter = clampCampaignChapterId(chapterId);
  const actNumber = Math.floor(safeChapter / CAMPAIGN_LEVELS_PER_ACT) + 1;
  const levelNumber = getCampaignLevelNumber(safeChapter);
  const region = getCampaignRegion(safeChapter);
  return {
    id: `story-chapter-${safeChapter}`,
    kind: "chapter",
    title: getCampaignChapterName(safeChapter).toLocaleUpperCase("tr-TR"),
    speaker: CAMPAIGN_NARRATIVE.guideName,
    portrait: "sema",
    lines: [
      storySummary?.trim() || STORY_UI_STRINGS.dialogue.chapterFallback(
        region.name,
        CAMPAIGN_NARRATIVE.lostOfficerName,
      ),
      objective?.trim()
        ? `${STORY_UI_STRINGS.dialogue.objectivePrefix} ${objective.trim()}`
        : STORY_UI_STRINGS.dialogue.chapterObjectiveFallback(CAMPAIGN_ACT_COUNT, levelNumber),
    ],
    hint: STORY_UI_STRINGS.dialogue.chapterHint(
      actNumber,
      getCampaignOperationForChapter(safeChapter).name,
      levelNumber,
      CAMPAIGN_LEVEL_COUNT,
    ),
  };
}

export function getNpcStoryDialogue(name: string, chapterId: number): StoryDialogue | null {
  if (name !== "Demir Yemin" && name !== CAMPAIGN_NARRATIVE.guideName) return null;
  const safeChapter = clampCampaignChapterId(chapterId);
  const actNumber = Math.floor(safeChapter / CAMPAIGN_LEVELS_PER_ACT) + 1;
  const region = getCampaignRegion(safeChapter);
  return {
    id: `story-demir-yemin-${safeChapter}`,
    kind: "npc",
    title: STORY_UI_STRINGS.dialogue.reportTitle,
    speaker: CAMPAIGN_NARRATIVE.guideName,
    portrait: "sema",
    lines: [
      `${region.name} bölgesinde ${CAMPAIGN_NARRATIVE.lostOfficerName}'ın son yayınını takip ediyoruz.`,
      NPC_STORY_BEATS[safeChapter % NPC_STORY_BEATS.length],
    ],
    hint: STORY_UI_STRINGS.dialogue.npcHint(actNumber, getCampaignLevelNumber(safeChapter)),
  };
}

export function getWorldRivalStoryDialogue(rival: {
  name: string;
  archetype: string;
  chapterId: number;
  taunt: string;
}): StoryDialogue {
  if (rival.name === CAMPAIGN_NARRATIVE.finalBossName || rival.name === "Karanlık Hükümdar") {
    return {
      id: "story-final-boss",
      kind: "npc",
      title: STORY_UI_STRINGS.dialogue.finalTitle,
      speaker: CAMPAIGN_NARRATIVE.enemyName,
      portrait: "commander",
      lines: [
        rival.taunt,
        ...STORY_DIALOGUE_CONTENT.finalBossLines,
      ],
      hint: STORY_UI_STRINGS.dialogue.finalBossHint,
    };
  }
  const special = getNpcStoryDialogue(rival.name, rival.chapterId);
  if (special) return special;
  const safeChapter = clampCampaignChapterId(rival.chapterId);
  const operation = getCampaignOperationForChapter(safeChapter);
  if (isCampaignActBoss(safeChapter)) {
    return {
      id: `story-operation-commander-${safeChapter}`,
      kind: "npc",
      title: STORY_UI_STRINGS.dialogue.actBossTitle,
      speaker: CAMPAIGN_NARRATIVE.enemyName,
      portrait: "commander",
      lines: [rival.taunt, operation.commanderLine],
      hint: operation.nextOperationHint ?? STORY_UI_STRINGS.dialogue.finalBossHint,
    };
  }
  const voice = STORY_DIALOGUE_CONTENT.rivalVoices[
    rival.archetype as keyof typeof STORY_DIALOGUE_CONTENT.rivalVoices
  ] ?? STORY_DIALOGUE_CONTENT.rivalVoices["gate-warden"];
  const offset = (safeChapter + rival.name.length) % voice.length;
  return {
    id: `story-rival-${rival.archetype}-${safeChapter}`,
    kind: "npc",
    title: STORY_UI_STRINGS.dialogue.reportTitle,
    speaker: rival.name.toLocaleUpperCase("tr-TR"),
    portrait: rival.archetype === "chapter-boss" ? "commander" : "field-agent",
    lines: [
      rival.taunt,
      voice[offset],
      voice[(offset + 1) % voice.length],
    ],
    hint: STORY_UI_STRINGS.dialogue.reportHint,
  };
}
