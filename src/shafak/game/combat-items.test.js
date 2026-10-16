import assert from "node:assert/strict";
import test from "node:test";
import {
  COMBAT_ITEMS,
  DEFAULT_COMBAT_ITEM_COUNTS,
  DEFAULT_COMBAT_QUICK_SLOTS,
  normalizeCombatItemCounts,
  normalizeCombatQuickSlots,
} from "./combat-items.ts";
import {
  INPUT_BUTTON,
  createCombatState,
  stepCombat,
} from "./combat-engine.ts";

function createLoadout(itemId = "health_potion", secondaryWeaponId = "weapon_twin_daggers") {
  const itemCounts = { ...DEFAULT_COMBAT_ITEM_COUNTS };
  return {
    quickSlots: [itemId, null, null, null],
    itemCounts,
    weaponIds: ["weapon_ash_sword", secondaryWeaponId],
    weaponStats: [
      { maxHealth: 150, damageMultiplier: 1, defenseReduction: 0, criticalChance: 0.12, moveSpeedMultiplier: 1, attackSpeedMultiplier: 1, attackRangeBonus: 0 },
      { maxHealth: 150, damageMultiplier: 1.3, defenseReduction: 0, criticalChance: 0.12, moveSpeedMultiplier: 1, attackSpeedMultiplier: 1, attackRangeBonus: 0.2 },
    ],
  };
}

function tap(button) {
  return { x: 0, y: 0, buttons: 0, pressed: button, released: button };
}

test("combat inventory defaults provide four usable quick slots and normalize old saves", () => {
  assert.equal(COMBAT_ITEMS.length, 6);
  assert.deepEqual(normalizeCombatItemCounts(undefined), DEFAULT_COMBAT_ITEM_COUNTS);
  assert.deepEqual(normalizeCombatQuickSlots(undefined, DEFAULT_COMBAT_ITEM_COUNTS), DEFAULT_COMBAT_QUICK_SLOTS);
  assert.equal(normalizeCombatItemCounts({ health_potion: -4 }).health_potion, 0);
  assert.equal(normalizeCombatQuickSlots(["not-an-item", null, null, null], DEFAULT_COMBAT_ITEM_COUNTS)[0], null);
});

test("a potion heals once, consumes one charge, and observes its combat cooldown", () => {
  const state = createCombatState(9081, "easy", undefined, createLoadout());
  state.player.hp = 80;

  const used = stepCombat(state, tap(INPUT_BUTTON.quickSlotOne));
  assert.equal(used.state.player.hp, 124);
  assert.equal(used.state.combatItemCounts.health_potion, 1);
  assert.equal(used.state.player.quickSlotCooldownUntilTick[0], used.state.tick + 720);

  const blocked = stepCombat(used.state, tap(INPUT_BUTTON.quickSlotOne));
  assert.equal(blocked.state.combatItemCounts.health_potion, 1);
});

test("using the last projectile removes it from the quick slot and damages a reachable rival", () => {
  const loadout = createLoadout("throwing_knife");
  loadout.itemCounts.throwing_knife = 1;
  const initial = createCombatState(9082, "easy", undefined, loadout);
  const result = stepCombat(initial, tap(INPUT_BUTTON.quickSlotOne));

  assert.equal(result.state.bot.hp, initial.bot.hp - 13);
  assert.equal(result.state.combatItemCounts.throwing_knife, 0);
  assert.equal(result.state.quickSlotItemIds[0], null);
  assert.ok(result.events.some((event) => event.type === "item" && event.itemId === "throwing_knife"));
});

test("a weapon switch changes combat modifiers and cannot be repeated inside 1.5 seconds", () => {
  const state = createCombatState(9083, "easy", undefined, createLoadout(null));
  const switched = stepCombat(state, tap(INPUT_BUTTON.weaponSwitch));
  assert.equal(switched.state.activeWeaponSlot, 1);
  assert.equal(switched.state.playerStats.damageMultiplier, 1.3);
  assert.ok(switched.events.some((event) => event.type === "weaponSwitch"));

  const blocked = stepCombat(switched.state, tap(INPUT_BUTTON.weaponSwitch));
  assert.equal(blocked.state.activeWeaponSlot, 1);
  assert.equal(blocked.state.weaponSwapCooldownUntilTick, switched.state.tick + 90);
});
