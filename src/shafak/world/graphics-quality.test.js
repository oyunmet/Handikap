import assert from "node:assert/strict";
import test from "node:test";
import { getWorldRenderPixelRatio } from "./graphics-quality.ts";

test("touch renderers use the one-times pixel cap at every quality setting", () => {
  for (const quality of ["low", "balanced", "high"]) {
    assert.equal(getWorldRenderPixelRatio(quality, 3, true), 1);
  }
});

test("desktop pixel ratio remains capped by selected quality and the renderer maximum", () => {
  assert.equal(getWorldRenderPixelRatio("balanced", 3, false), 1.35);
  assert.equal(getWorldRenderPixelRatio("high", 3, false), 1.5);
  assert.equal(getWorldRenderPixelRatio("high", 1.25, false), 1.25);
});
