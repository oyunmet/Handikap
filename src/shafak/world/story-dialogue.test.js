import assert from "node:assert/strict";
import test from "node:test";
import {
  getChapterStoryDialogue,
  getNpcStoryDialogue,
  getOpeningStoryDialogue,
  getWorldRivalStoryDialogue,
} from "./story-dialogue.ts";

test("opening establishes the missing princess, fallen kingdom, and seal quest", () => {
  const opening = getOpeningStoryDialogue();
  assert.equal(opening.kind, "opening");
  assert.equal(opening.title, "KAYIP PRENSES");
  assert.match(opening.lines.join(" "), /karanlık krallığı ele geçirirken prenses kayboldu/i);
  assert.match(opening.lines.join(" "), /Mühür Parçaları/i);
  assert.match(opening.hint, /Mühür Parçaları/);
});

test("every chapter has a distinct two-line story across the three regions", () => {
  const dialogues = Array.from({ length: 9 }, (_, chapter) => getChapterStoryDialogue(chapter));
  assert.equal(new Set(dialogues.map((dialogue) => dialogue.title)).size, 9);
  assert.ok(dialogues.every((dialogue) => dialogue.lines.length >= 2 && dialogue.lines.length <= 3 && dialogue.hint.length > 0));
  assert.match(dialogues[0].title, /KÜL YOLU/);
  assert.match(dialogues[3].title, /DONMUŞ GEÇİT/);
  assert.match(dialogues[6].title, /KIZIL BATAKLIK/);
  assert.match(getChapterStoryDialogue(8).lines.join(" "), /ardında|kapı/i);
  assert.match(getChapterStoryDialogue(9).title, /SON EŞİK/);
});

test("rivals have distinct multi-line voices; Demir Yemin's regional story remains", () => {
  const archer = getWorldRivalStoryDialogue({
    name: "Kül Okçusu", archetype: "ash-archer", chapterId: 0, taunt: "Yayı bırak."
  });
  const hunter = getWorldRivalStoryDialogue({
    name: "Ayaz Avcısı", archetype: "frost-hunter", chapterId: 0, taunt: "Yayı bırak."
  });
  assert.equal(archer.lines.length, 3);
  assert.notDeepEqual(archer.lines, hunter.lines);

  const openingChapter = getNpcStoryDialogue("Demir Yemin", 0);
  const frozenChapter = getNpcStoryDialogue("Demir Yemin", 3);
  const finalChapter = getNpcStoryDialogue("Demir Yemin", 6);
  assert.equal(openingChapter?.kind, "npc");
  assert.notDeepEqual(openingChapter?.lines, frozenChapter?.lines);
  assert.match(finalChapter?.lines.join(" ") ?? "", /Karanlık Hükümdar|krallık/i);
  assert.equal(getNpcStoryDialogue("Kül Okçusu", 1), null);
});

test("the final boss reveals the princess is alive and directs the player to the ending", () => {
  const finalBoss = getWorldRivalStoryDialogue({
    name: "Karanlık Hükümdar",
    archetype: "chapter-boss",
    chapterId: 8,
    taunt: "Son kapı açıldı.",
  });
  assert.equal(finalBoss.title, "SON KAPI");
  assert.match(finalBoss.lines.join(" "), /prenses/i);
  assert.match(finalBoss.hint, /prensesle konuş/i);
});
