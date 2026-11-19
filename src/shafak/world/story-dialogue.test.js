import assert from "node:assert/strict";
import test from "node:test";
import {
  getChapterStoryDialogue,
  getNpcStoryDialogue,
  getOpeningStoryDialogue,
  getWorldRivalStoryDialogue,
} from "./story-dialogue.ts";
import { loadCampaignLevelData } from "./campaign-level-data.ts";
import {
  CAMPAIGN_ACT_COUNT,
  CAMPAIGN_LEVEL_COUNT,
  CAMPAIGN_LEVELS_PER_ACT,
} from "./campaign-progression.ts";
import { CAMPAIGN_NARRATIVE } from "./campaign-narrative.ts";

test("opening establishes the Kuzgun operation, Alaz, and the captured communications network", () => {
  const opening = getOpeningStoryDialogue();
  assert.equal(opening.kind, "opening");
  assert.equal(opening.title, "KAYIP SİNYAL");
  assert.match(opening.lines.join(" "), new RegExp(CAMPAIGN_NARRATIVE.cityName));
  assert.match(opening.lines.join(" "), new RegExp(CAMPAIGN_NARRATIVE.squadLeadName));
  assert.match(opening.lines.join(" "), /dokuz dosya/i);
  assert.match(opening.lines.join(" "), new RegExp(`${CAMPAIGN_ACT_COUNT} operasyonda`));
  assert.match(opening.hint, new RegExp(`Son bölüm \\(${CAMPAIGN_LEVEL_COUNT}\\)`));
});

test("chapter dialogue uses the active act story and campaign progress", async () => {
  const firstActLevel = await loadCampaignLevelData(0);
  const secondActLevel = await loadCampaignLevelData(CAMPAIGN_LEVELS_PER_ACT);
  const finalLevel = await loadCampaignLevelData(CAMPAIGN_LEVEL_COUNT - 1);
  const first = getChapterStoryDialogue(
    firstActLevel.chapterId,
    firstActLevel.storySummary,
    firstActLevel.objective,
  );
  const second = getChapterStoryDialogue(secondActLevel.chapterId, secondActLevel.storySummary);
  const final = getChapterStoryDialogue(finalLevel.chapterId, finalLevel.storySummary);

  assert.match(first.title, /İLERİ HAT · OPERASYON 1 · BÖLÜM 1/);
  assert.match(second.title, /KUZEY GEÇİDİ · OPERASYON 2 · BÖLÜM 51/);
  assert.match(final.title, new RegExp(`SON KOMUTA MERKEZİ · OPERASYON ${CAMPAIGN_ACT_COUNT} · BÖLÜM ${CAMPAIGN_LEVEL_COUNT}`));
  assert.match(first.lines[0], /tahliye konvoyu/);
  assert.equal(first.lines[1], `Bu bölümün hedefi: ${firstActLevel.objective}`);
  assert.match(final.hint, new RegExp(`Operasyon ${CAMPAIGN_ACT_COUNT}/${CAMPAIGN_ACT_COUNT} · Bölüm ${CAMPAIGN_LEVEL_COUNT}/${CAMPAIGN_LEVEL_COUNT}`));
});

test("rivals have distinct multi-line voices; Demir Yemin follows the active act", () => {
  const archer = getWorldRivalStoryDialogue({
    name: "Kül Okçusu", archetype: "ash-archer", chapterId: 0, taunt: "Yayı bırak."
  });
  const hunter = getWorldRivalStoryDialogue({
    name: "Ayaz Avcısı", archetype: "frost-hunter", chapterId: 0, taunt: "Yayı bırak."
  });
  assert.equal(archer.lines.length, 3);
  assert.notDeepEqual(archer.lines, hunter.lines);

  const openingChapter = getNpcStoryDialogue("Demir Yemin", 0);
  const frozenChapter = getNpcStoryDialogue("Demir Yemin", CAMPAIGN_LEVELS_PER_ACT);
  const finalChapter = getNpcStoryDialogue("Demir Yemin", CAMPAIGN_LEVEL_COUNT - 1);
  assert.equal(openingChapter?.kind, "npc");
  assert.notDeepEqual(openingChapter?.lines, frozenChapter?.lines);
  assert.match(finalChapter?.lines.join(" ") ?? "", /Son Komuta Merkezi/);
  assert.match(finalChapter?.hint ?? "", new RegExp(`Operasyon ${CAMPAIGN_ACT_COUNT}/${CAMPAIGN_ACT_COUNT}`));
  assert.equal(getNpcStoryDialogue("Kül Okçusu", 1), null);
});

test("the final boss explains Alaz's plan and directs the player to the ending", () => {
  const finalBoss = getWorldRivalStoryDialogue({
    name: "Karanlık Hükümdar",
    archetype: "chapter-boss",
    chapterId: CAMPAIGN_LEVEL_COUNT - 1,
    taunt: "Son kapı açıldı.",
  });
  assert.equal(finalBoss.title, "SON ÇATIŞMA");
  assert.match(finalBoss.lines.join(" "), /Alaz/i);
  assert.match(finalBoss.hint, /Alaz'la iletişim kur/i);
});
