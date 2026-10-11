import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AUTO_QUALITY_DOWN_AFTER_MS,
  AUTO_QUALITY_DOWN_FPS,
  getAutoQualityAction,
  getPixelRatioCap,
  getShadowMapSize,
  normalizeGraphicsMode,
  resolveRenderQuality,
  stepAutoQuality,
} from "./graphics-quality.ts";

test("previous balanced settings remain valid as medium quality", () => {
  assert.equal(normalizeGraphicsMode("balanced"), "medium");
  assert.equal(normalizeGraphicsMode("medium"), "medium");
  assert.equal(normalizeGraphicsMode("unknown"), "auto");
});

test("graphics mode maps onto the existing scene quality tiers", () => {
  assert.equal(resolveRenderQuality("low", "high"), "low");
  assert.equal(resolveRenderQuality("medium", "high"), "balanced");
  assert.equal(resolveRenderQuality("high", "low"), "high");
  assert.equal(resolveRenderQuality("auto", "balanced"), "balanced");
});

test("automatic quality changes one tier at a time", () => {
  assert.equal(stepAutoQuality("high", "down"), "balanced");
  assert.equal(stepAutoQuality("balanced", "down"), "low");
  assert.equal(stepAutoQuality("low", "down"), "low");
  assert.equal(stepAutoQuality("low", "up"), "balanced");
  assert.equal(stepAutoQuality("balanced", "up"), "high");
});

test("automatic quality lowers after three seconds below 45 FPS and recovers gradually", () => {
  assert.equal(AUTO_QUALITY_DOWN_FPS, 45);
  assert.equal(AUTO_QUALITY_DOWN_AFTER_MS, 3_000);
  assert.equal(getAutoQualityAction(44.9, 2_999), null);
  assert.equal(getAutoQualityAction(44.9, 3_000), "down");
  assert.equal(getAutoQualityAction(56, 6_000), null);
  assert.equal(getAutoQualityAction(56.1, 6_000), "up");
});

test("world pixel ratio stays within the mobile rendering budget", () => {
  assert.equal(getPixelRatioCap("high"), 1.75);
  assert.equal(getPixelRatioCap("balanced"), 1.35);
  assert.equal(getPixelRatioCap("low"), 1);
});

test("shadow maps stay within the quality budget and scale with device DPR", () => {
  assert.equal(getShadowMapSize("high", 1), 512);
  assert.equal(getShadowMapSize("high", 2), 1_024);
  assert.equal(getShadowMapSize("high", 4), 1_024);
  assert.equal(getShadowMapSize("balanced", 4), 1_024);
  assert.equal(getShadowMapSize("low", 4), 512);
});
