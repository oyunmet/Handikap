import assert from "node:assert/strict";
import test from "node:test";
import { getBossHudPhase, getBossHudPhaseRoman } from "./boss-hud.ts";

test("boss HUD phases use visual health thresholds without changing combat state", () => {
  assert.equal(getBossHudPhase(360, 360), 1);
  assert.equal(getBossHudPhase(241, 360), 1);
  assert.equal(getBossHudPhase(240, 360), 2);
  assert.equal(getBossHudPhase(121, 360), 2);
  assert.equal(getBossHudPhase(120, 360), 3);
  assert.equal(getBossHudPhase(0, 360), 3);
});

test("boss HUD handles invalid health and formats phase labels", () => {
  assert.equal(getBossHudPhase(Number.NaN, 360), 1);
  assert.equal(getBossHudPhase(0, 0), 1);
  assert.equal(getBossHudPhase(400, 360), 1);
  assert.equal(getBossHudPhaseRoman(1), "I");
  assert.equal(getBossHudPhaseRoman(2), "II");
  assert.equal(getBossHudPhaseRoman(3), "III");
});
