import assert from "node:assert/strict";
import test from "node:test";
import { resolveSharedCanvasDpr, scaleCanvasDpr } from "./canvas-pixel-ratio.ts";

test("the shared canvas keeps its conservative default when no scene sets a DPR", () => {
  assert.deepEqual(resolveSharedCanvasDpr([{}]), [1, 1.5]);
});

test("the shared canvas honors the requested fixed ratio for the world scene", () => {
  assert.equal(resolveSharedCanvasDpr([{ dpr: 1 }]), 1);
});

test("the shared canvas keeps adaptive War Room ratios after a quality change", () => {
  assert.equal(resolveSharedCanvasDpr([{ dpr: 0.75 }]), 0.75);
});

test("DPR ranges from concurrent scenes are intersected", () => {
  assert.deepEqual(
    resolveSharedCanvasDpr([{ dpr: [1, 2] }, { dpr: [1.1, 1.5] }]),
    [1.1, 1.5],
  );
});

test("a fixed scene ratio cannot exceed another scene's DPR budget", () => {
  assert.equal(resolveSharedCanvasDpr([{ dpr: 1.5 }, { dpr: [1, 1.25] }]), 1.25);
});

test("the safest fixed ratio wins when scene requirements do not overlap", () => {
  assert.equal(resolveSharedCanvasDpr([{ dpr: 0.9 }, { dpr: [1, 1.5] }]), 0.9);
});

test("WebGL recovery lowers shared canvas pixel density while preserving DPR ranges", () => {
  assert.equal(scaleCanvasDpr(1, 0.75), 0.75);
  assert.deepEqual(scaleCanvasDpr([1, 2], 0.75), [0.75, 1.5]);
  assert.equal(scaleCanvasDpr(0.75, 0.5), 0.5);
});
