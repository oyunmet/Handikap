import test from "node:test";
import assert from "node:assert/strict";
import { createProceduralStonePixels } from "./procedural-materials.ts";

test("procedural stone PBR channels are deterministic, complete, and distinct", () => {
  const first = createProceduralStonePixels(16);
  const second = createProceduralStonePixels(16);

  assert.deepEqual(first, second);
  assert.equal(first.size, 16);
  assert.equal(first.color.length, 16 * 16 * 4);
  assert.equal(first.normal.length, 16 * 16 * 4);
  assert.equal(first.roughness.length, 16 * 16 * 4);
  assert.notDeepEqual(first.color, first.normal);
  assert.ok(first.roughness.every((channel) => channel > 0));
});
