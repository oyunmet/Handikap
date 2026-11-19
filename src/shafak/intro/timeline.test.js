import test from "node:test";
import assert from "node:assert/strict";
import {
  getInitialScreen,
  getIntroEventTimes,
  INTRO_EVENT_MS,
} from "./timeline.ts";

test("ordinary visits start at the Sunvoria home while the world debug route remains available", () => {
  assert.equal(getInitialScreen(""), "opening");
  assert.equal(getInitialScreen("?introSeen=true"), "opening");
  assert.equal(getInitialScreen("?debug=1&scene=world"), "world");
  assert.equal(getInitialScreen("?debug=1"), "opening");
});

test("each readable story line stays visible before the production card, title, and start prompt", () => {
  const events = getIntroEventTimes();
  assert.equal(events.creditsFade - events.production, 2_000);
  assert.equal(events.worldReveal, 3_000);
  assert.equal(events.lineTwo - events.lineOne, 2_600);
  assert.equal(events.lineThree - events.lineTwo, 2_600);
  assert.equal(events.productionCard, events.lineThree + 1_100);
  assert.equal(events.productionCardFade - events.productionCard, 1_300);
  assert.ok(events.productionCardFade < events.title);
  assert.ok(events.title < events.prompt);
  assert.equal(events.prompt, 12_300);
});

test("reduced-motion timing shortens animation while preserving readable story dwell time", () => {
  const events = getIntroEventTimes(true);
  assert.ok(events.prompt < getIntroEventTimes().prompt);
  assert.ok(events.lineOne < events.lineTwo && events.lineTwo < events.lineThree);
  assert.equal(events.lineTwo - events.lineOne, 2_600);
  assert.equal(events.lineThree - events.lineTwo, 2_600);
  assert.equal(events.creditsFade - events.production, 1_160);
  assert.equal(events.productionCard, events.lineThree + 1_100);
  assert.equal(events.productionCardFade - events.productionCard, 1_000);
});
