import assert from "node:assert/strict";
import test from "node:test";
import { getDuelArenaTheme } from "./duel-arena-theme.ts";

test("arena materials change with each world biome", () => {
  const ash = getDuelArenaTheme(0);
  const ice = getDuelArenaTheme(3 * 144);
  const marsh = getDuelArenaTheme(6 * 144);

  assert.notEqual(ash.background, ice.background);
  assert.notEqual(ice.floor, marsh.floor);
  assert.notEqual(ash.accent, marsh.accent);
  assert.ok(ash.stone.length >= 5 && ice.wall.length >= 3 && marsh.column.length >= 3);
});

test("arena theme remains stable within a biome and handles invalid travel distance", () => {
  assert.equal(getDuelArenaTheme(12).accent, getDuelArenaTheme(400).accent);
  assert.equal(getDuelArenaTheme(Number.NaN).background, getDuelArenaTheme(0).background);
});
