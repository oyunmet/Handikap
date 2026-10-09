import assert from "node:assert/strict";
import { test } from "node:test";
import {
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

test("shadow maps stay within the quality budget and scale with device DPR", () => {
  assert.equal(getShadowMapSize("high", 1), 512);
  assert.equal(getShadowMapSize("high", 2), 1_024);
  assert.equal(getShadowMapSize("high", 4), 2_048);
  assert.equal(getShadowMapSize("balanced", 4), 1_024);
  assert.equal(getShadowMapSize("low", 4), 512);
});
