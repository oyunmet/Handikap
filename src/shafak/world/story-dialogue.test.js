import assert from "node:assert/strict";
import test from "node:test";
import {
  getChapterStoryDialogue,
  getNpcStoryDialogue,
  getOpeningStoryDialogue,
  getWorldRivalStoryDialogue,
} from "./story-dialogue.ts";

test("opening connects the game modes and explains the seal's purpose", () => {
  const opening = getOpeningStoryDialogue();
  assert.equal(opening.kind, "opening");
  assert.equal(opening.title, "MÜHRÜN ÇAĞRISI");
  assert.match(opening.lines.join(" "), /Savaş Odası/);
  assert.match(opening.hint, /Mühür Parçaları/);
});

test("chapter story changes at each gate and leaves a new question", () => {
  const dialogues = Array.from({ length: 9 }, (_, chapter) => getChapterStoryDialogue(chapter));
  assert.equal(new Set(dialogues.map((dialogue) => dialogue.title)).size, 9);
  assert.ok(dialogues.every((dialogue) => dialogue.lines.length >= 2 && dialogue.hint.length > 0));
  assert.match(getChapterStoryDialogue(8).lines.join(" "), /ardında|kapı/i);
  assert.match(getChapterStoryDialogue(9).title, /DÖNGÜ 2/);
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
  assert.match(finalChapter?.lines.join(" ") ?? "", /döngü/i);
  assert.equal(getNpcStoryDialogue("Kül Okçusu", 1), null);
});
