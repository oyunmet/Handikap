import test from "node:test";
import assert from "node:assert/strict";
import {
  getIntroEventTimes,
  hasSeenIntro,
  INTRO_EVENT_MS,
  INTRO_STORAGE_KEY,
  markIntroSeen,
} from "./timeline.ts";

test("the first-launch cinematic runs for about twenty seconds before its prompt", () => {
  const events = getIntroEventTimes();
  assert.equal(events.worldReveal, 4_000);
  assert.equal(events.lineTwo - events.lineOne, 2_500);
  assert.equal(events.lineFive - events.lineFour, 2_500);
  assert.equal(events.prompt, 19_900);
});

test("reduced-motion timing keeps the story in order and shortens transitions", () => {
  const events = getIntroEventTimes(true);
  assert.ok(events.prompt < getIntroEventTimes().prompt);
  assert.ok(events.lineOne < events.lineTwo && events.lineTwo < events.lineThree);
  assert.equal(events.lineTwo - events.lineOne, 1_450);
});

test("intro completion persists and reads the requested local storage key", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.equal(hasSeenIntro(storage), false);
  markIntroSeen(storage);
  assert.equal(values.get(INTRO_STORAGE_KEY), "true");
  assert.equal(hasSeenIntro(storage), true);
});
