import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultPlayerProfile } from "./profileApi.ts";
import { calculateAccountCombatStats, validateStoreOperationBody } from "./storeApi.ts";
import { STORE_CATALOG } from "./storeCatalog.ts";
import { getUpgradeCost, MAX_UPGRADE_LEVEL } from "../src/shafak/game/store-types.ts";

const key = "d85e8c16-e9a2-4a74-96c0-2a25270050e8";

test("purchase and upgrade bodies accept only a canonical item ID and idempotency UUID", () => {
  assert.deepEqual(validateStoreOperationBody({ itemId: "weapon_iron_axe", idempotencyKey: key }), {
    itemId: "weapon_iron_axe",
    idempotencyKey: key,
  });
  assert.equal(validateStoreOperationBody({ itemId: "weapon_iron_axe", idempotencyKey: key, gold: 0 }), null);
  assert.equal(validateStoreOperationBody({ itemId: "weapon_iron_axe", idempotencyKey: "not-a-uuid" }), null);
  assert.equal(validateStoreOperationBody({ itemId: "../weapon", idempotencyKey: key }), null);
});

test("server catalog contains the staged equipment categories with in-game-only prices", () => {
  assert.equal(STORE_CATALOG.filter((item) => item.category === "weapons").length, 5);
  assert.equal(STORE_CATALOG.filter((item) => item.category === "armor").length, 4);
  assert.equal(STORE_CATALOG.filter((item) => item.category === "capes").length, 4);
  assert.equal(STORE_CATALOG.filter((item) => item.category === "effects").length, 5);
  assert.equal(STORE_CATALOG.filter((item) => item.category === "dyes").length, 4);
  assert.ok(STORE_CATALOG.every((item) => Object.keys(item.price).sort().join(",") === "diamonds,gold"));
});

test("equipped and upgraded item stats are calculated from the server catalog", () => {
  const profile = createDefaultPlayerProfile();
  const weapon = STORE_CATALOG.find((item) => item.id === "weapon_iron_axe");
  assert.ok(weapon);
  profile.inventory.ownedItemIds.push(weapon.id);
  profile.equipment.weaponId = weapon.id;
  let stats = calculateAccountCombatStats(profile);
  assert.equal(stats?.damageMultiplier, 1.08);

  profile.inventory.upgrades[weapon.id] = 1;
  stats = calculateAccountCombatStats(profile);
  assert.equal(stats?.damageMultiplier, 1.098);
});

test("upgrade prices increase by level and reserve seal fragments for higher tiers", () => {
  const first = getUpgradeCost("weapon", 0);
  const third = getUpgradeCost("weapon", 2);
  const fifth = getUpgradeCost("weapon", MAX_UPGRADE_LEVEL - 1);
  assert.equal(first.sealFragments, 0);
  assert.ok(third.sealFragments > 0);
  assert.ok(fifth.gold > third.gold);
});
