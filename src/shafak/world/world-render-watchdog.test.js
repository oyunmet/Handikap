import test from "node:test";
import assert from "node:assert/strict";
import { getWorldRenderWatchdogTimeouts } from "./world-render-watchdog.ts";

test("software WebGL gets time for cold shader compilation and slow frames", () => {
  assert.deepEqual(
    getWorldRenderWatchdogTimeouts("ANGLE (Google, SwiftShader Device (Subzero))"),
    { firstFrameMs: 30_000, renderStallMs: 15_000 },
  );
  assert.deepEqual(
    getWorldRenderWatchdogTimeouts("llvmpipe (LLVM 18.1.8, 256 bits)"),
    { firstFrameMs: 30_000, renderStallMs: 15_000 },
  );
});

test("hardware WebGL uses shorter first-frame and dead-renderer detection", () => {
  assert.deepEqual(
    getWorldRenderWatchdogTimeouts("Apple GPU"),
    { firstFrameMs: 8_000, renderStallMs: 5_000 },
  );
});
