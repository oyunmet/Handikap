import test from "node:test";
import assert from "node:assert/strict";
import {
  getInitialScreen,
  getIntroEventTimes,
  INTRO_EVENT_MS,
} from "./timeline.ts";

test("ordinary visits always start with the intro while the explicit world debug route remains available", () => {
  assert.equal(getInitialScreen(""), "intro");
  assert.equal(getInitialScreen("?introSeen=true"), "intro");
  assert.equal(getInitialScreen("?debug=1&scene=world"), "world");
  assert.equal(getInitialScreen("?debug=1"), "intro");
});

test("each readable story line stays visible before the production card, title, and start prompt", () => {
  const events = getIntroEventTimes();
  assert.equal(events.creditsFade - events.production, 2_760);
  assert.equal(events.worldReveal, 3_800);
  assert.equal(events.lineTwo - events.lineOne, 4_200);
  assert.equal(events.lineThree - events.lineTwo, 4_200);
  assert.equal(events.productionCard, events.lineThree + 4_700);
  assert.equal(events.productionCardFade - events.productionCard, 2_100);
  assert.ok(events.productionCardFade < events.title);
  assert.ok(events.title < events.prompt);
  assert.equal(events.prompt, 21_400);
});

test("reduced-motion timing shortens animation while preserving readable story dwell time", () => {
  const events = getIntroEventTimes(true);
  assert.ok(events.prompt < getIntroEventTimes().prompt);
  assert.ok(events.lineOne < events.lineTwo && events.lineTwo < events.lineThree);
  assert.equal(events.lineTwo - events.lineOne, 4_200);
  assert.equal(events.lineThree - events.lineTwo, 4_200);
  assert.equal(events.creditsFade - events.production, 1_601);
  assert.equal(events.productionCardFade - events.productionCard, 1_800);
});
