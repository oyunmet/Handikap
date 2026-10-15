import assert from "node:assert/strict";
import test from "node:test";
import { COMBAT_BOT_ARCHETYPES } from "./combat-engine.ts";
import { rollCombatLoot } from "./combat-loot.ts";

test("loot rolls are stable per encounter and bosses always drop their own trophy table", () => {
  const bossDrop = rollCombatLoot("chapter-boss", 18, 77_321, "hard");
  assert.ok(bossDrop);
  assert.equal(rollCombatLoot("chapter-boss", 18, 77_321, "hard"), bossDrop);
  assert.notEqual(bossDrop, rollCombatLoot("gate-warden", 18, 77_321, "hard"));
});

test("all rival archetypes have a distinct non-empty loot table", () => {
  const drops = COMBAT_BOT_ARCHETYPES.map((archetype) => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const item = rollCombatLoot(archetype, 100, seed, "hard", true);
      if (item) return item;
    }
    return null;
  });
  assert.ok(drops.every(Boolean));
  assert.equal(new Set(drops).size, COMBAT_BOT_ARCHETYPES.length);
});
