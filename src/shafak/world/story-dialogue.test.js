import assert from "node:assert/strict";
import test from "node:test";
import {
  getChapterStoryDialogue,
  getNpcStoryDialogue,
  getOpeningStoryDialogue,
} from "./story-dialogue.ts";

test("opening and each chapter gate provide concise Turkish story dialogue and a gameplay hint", () => {
  const opening = getOpeningStoryDialogue();
  const firstGate = getChapterStoryDialogue(1);
  const secondGate = getChapterStoryDialogue(2);
  assert.equal(opening.kind, "opening");
  assert.equal(firstGate.title, "DONMUŞ GEÇİT");
  assert.equal(secondGate.title, "KIZIL BATAKLIK");
  for (const dialogue of [opening, firstGate, secondGate]) {
    assert.ok(dialogue.lines.length >= 2);
    assert.ok(dialogue.lines.every((line) => line.trim().length > 0));
    assert.ok(dialogue.hint.length > 0);
    assert.equal(dialogue.speaker, "YOL KILAVUZU");
  }
});

test("Demir Yemin has distinct lines that change with the chapter", () => {
  const openingChapter = getNpcStoryDialogue("Demir Yemin", 0);
  const frozenChapter = getNpcStoryDialogue("Demir Yemin", 1);
  assert.equal(openingChapter?.kind, "npc");
  assert.notDeepEqual(openingChapter?.lines, frozenChapter?.lines);
  assert.equal(getNpcStoryDialogue("Kül Okçusu", 1), null);
});
