import assert from "node:assert/strict";
import test from "node:test";
import {
  markStoryDialogueSeen,
  parseSeenStoryDialogueIds,
  shouldShowFirstEntryStoryDialogue,
} from "./story-dialogue-progress.ts";

test("story history safely normalizes valid IDs and ignores malformed storage", () => {
  assert.deepEqual(parseSeenStoryDialogueIds('["story-opening","story-opening","chapter-2",3,""]'), [
    "story-opening",
    "chapter-2",
  ]);
  assert.deepEqual(parseSeenStoryDialogueIds("{broken"), []);
  assert.deepEqual(parseSeenStoryDialogueIds(null), []);
});

test("opening and chapter stories appear once while NPC dialogue remains repeatable", () => {
  const seen = ["story-opening", "story-chapter-2"];
  assert.equal(shouldShowFirstEntryStoryDialogue({ id: "story-opening", kind: "opening" }, seen), false);
  assert.equal(shouldShowFirstEntryStoryDialogue({ id: "story-chapter-2", kind: "chapter" }, seen), false);
  assert.equal(shouldShowFirstEntryStoryDialogue({ id: "story-chapter-3", kind: "chapter" }, seen), true);
  assert.equal(shouldShowFirstEntryStoryDialogue({ id: "npc-guard", kind: "npc" }, seen), true);
});

test("first-entry story does not cover a directly opened store tab", () => {
  assert.equal(shouldShowFirstEntryStoryDialogue(
    { id: "story-opening", kind: "opening" },
    [],
    true,
  ), false);
});

test("closing a story marks it once without removing earlier entries", () => {
  assert.deepEqual(markStoryDialogueSeen(["story-opening"], "story-chapter-1"), [
    "story-opening",
    "story-chapter-1",
  ]);
});
