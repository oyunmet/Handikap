import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAudioVolume } from "./audio-settings.ts";
import { getChapterMusicNotes } from "./chapter-music.ts";

test("audio volumes normalize malformed and out-of-range saved preferences", () => {
  assert.equal(normalizeAudioVolume(0.4, 0.8), 0.4);
  assert.equal(normalizeAudioVolume(-2, 0.8), 0);
  assert.equal(normalizeAudioVolume(4, 0.8), 1);
  assert.equal(normalizeAudioVolume(Number.NaN, 0.8), 0.8);
  assert.equal(normalizeAudioVolume("0.4", 0.8), 0.8);
});

test("chapter music uses distinct, looping themes for the three world biomes", () => {
  assert.equal(getChapterMusicNotes(3), getChapterMusicNotes(0));
  assert.notDeepEqual(getChapterMusicNotes(0), getChapterMusicNotes(1));
  assert.notDeepEqual(getChapterMusicNotes(1), getChapterMusicNotes(2));
  assert.equal(getChapterMusicNotes(-1).length, 3);
});
