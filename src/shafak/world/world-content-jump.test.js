import assert from "node:assert/strict";
import test from "node:test";
import { resolveWorldPathCollision } from "./world-content.ts";

test("a jump clears a low rock but ground movement still collides with it", () => {
  const rock = {
    id: "test-rock",
    x: 0,
    distance: 0,
    shape: "circle",
    radius: 1,
    halfWidth: 1,
    halfDepth: 1,
    jumpable: true,
    jumpHeight: 0.78,
  };
  const grid = new Map([[0, new Map([[0, [rock]]])]]);
  const grounded = resolveWorldPathCollision(0, 0, 0, 0, grid, new Set());
  const airborne = resolveWorldPathCollision(0, 0, 0, 0, grid, new Set(), { x: 0, distance: 0 }, 0.9);

  assert.ok(Math.abs(grounded.x) > 1);
  assert.equal(airborne.x, 0);
  assert.equal(airborne.distance, 0);
});
