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

test("the production card follows the final line before the title and start prompt", () => {
  const events = getIntroEventTimes();
  assert.equal(events.creditsFade - events.production, 3_600);
  assert.equal(events.worldReveal, 5_200);
  assert.equal(events.lineTwo - events.lineOne, 2_500);
  assert.equal(events.lineFive - events.lineFour, 2_500);
  assert.equal(events.productionCard, events.lineFive + 2_500);
  assert.equal(events.productionCardFade - events.productionCard, 4_200);
  assert.ok(events.productionCardFade < events.title);
  assert.ok(events.title < events.prompt);
  assert.equal(events.prompt, 25_400);
});

test("reduced-motion timing keeps the story in order and shortens transitions", () => {
  const events = getIntroEventTimes(true);
  assert.ok(events.prompt < getIntroEventTimes().prompt);
  assert.ok(events.lineOne < events.lineTwo && events.lineTwo < events.lineThree);
  assert.equal(events.lineTwo - events.lineOne, 1_450);
  assert.equal(events.creditsFade - events.production, 2_088);
  assert.equal(events.productionCardFade - events.productionCard, 2_436);
});
