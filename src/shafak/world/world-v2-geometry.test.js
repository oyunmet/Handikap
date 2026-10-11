import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorldV2DuneData,
  WORLD_V2_DUNE_COLUMNS,
  WORLD_V2_DUNE_ROWS,
} from "./world-v2-geometry.ts";

test("v2 ash terrain has bounded, finite geometry and leaves the central road clear", () => {
  const { positions, colors, indices } = createWorldV2DuneData();
  assert.equal(positions.length, (WORLD_V2_DUNE_COLUMNS + 1) * (WORLD_V2_DUNE_ROWS + 1) * 3);
  assert.equal(colors.length, positions.length);
  assert.equal(indices.length, WORLD_V2_DUNE_COLUMNS * WORLD_V2_DUNE_ROWS * 6);
  assert.equal(positions.every(Number.isFinite), true);
  assert.equal(colors.every(Number.isFinite), true);
  assert.equal(indices.every(Number.isFinite), true);

  const centerRow = Math.floor(WORLD_V2_DUNE_ROWS / 2);
  const centerColumn = Math.floor(WORLD_V2_DUNE_COLUMNS / 2);
  const centerOffset = (centerRow * (WORLD_V2_DUNE_COLUMNS + 1) + centerColumn) * 3;
  assert.ok(positions[centerOffset + 2] < -0.9);
});
