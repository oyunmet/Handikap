import assert from "node:assert/strict";
import express from "express";
import test from "node:test";
import { createDefaultPlayerProfile } from "./profileApi.ts";
import { calculateAccountCombatStats, createStoreApi, validateStoreOperationBody } from "./storeApi.ts";
import { STORE_CATALOG } from "./storeCatalog.ts";
import {
  getItemSellValue,
  getSalvageYield,
  getUpgradeCost,
  getUpgradeSuccessChance,
  MAX_UPGRADE_LEVEL,
  rollUpgradeSuccess,
} from "../src/shafak/game/store-types.ts";

const key = "d85e8c16-e9a2-4a74-96c0-2a25270050e8";

function createMemoryPool(initialProfile = createDefaultPlayerProfile()) {
  let profile = structuredClone(initialProfile);
  const transactions = new Map();
  return {
    get profile() {
      return profile;
    },
    async connect() {
      let transactionProfile = null;
      return {
        async query(sql, values = []) {
          if (sql === "BEGIN") {
            transactionProfile = structuredClone(profile);
            return { rows: [] };
          }
          if (sql === "COMMIT") {
            profile = transactionProfile;
            return { rows: [] };
          }
          if (sql === "ROLLBACK") {
            transactionProfile = null;
            return { rows: [] };
          }
          if (sql.startsWith("INSERT INTO shafak_player_profiles")) return { rows: [] };
          if (sql.startsWith("SELECT profile FROM shafak_player_profiles")) {
            return { rows: [{ profile: transactionProfile }] };
          }
          if (sql.startsWith("SELECT pg_advisory_xact_lock")) return { rows: [] };
          if (sql.startsWith("SELECT operation_type, item_id, response")) {
            const record = transactions.get(`${values[0]}:${values[1]}`);
            return { rows: record ? [record] : [] };
          }
          if (sql.startsWith("UPDATE shafak_player_profiles")) {
            transactionProfile = JSON.parse(values[1]);
            return { rows: [] };
          }
          if (sql.startsWith("INSERT INTO shafak_store_transactions")) {
            transactions.set(`${values[0]}:${values[1]}`, {
              operation_type: values[2],
              item_id: values[3],
              response: JSON.parse(values[4]),
            });
            return { rows: [] };
          }
          throw new Error(`Unexpected store SQL: ${sql}`);
        },
        release() {},
      };
    },
  };
}

async function openStoreApi(t, profile) {
  const app = express();
  const pool = createMemoryPool(profile);
  app.use(express.json());
  app.use(createStoreApi(pool, () => "store-test-player"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  const send = (operation, body) => fetch(`http://127.0.0.1:${address.port}/api/store/${operation}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { pool, send };
}

test("purchase and upgrade bodies accept only a canonical item ID and idempotency UUID", () => {
  assert.deepEqual(validateStoreOperationBody({ itemId: "weapon_iron_axe", idempotencyKey: key }), {
    itemId: "weapon_iron_axe",
    idempotencyKey: key,
  });
  assert.equal(validateStoreOperationBody({ itemId: "weapon_iron_axe", idempotencyKey: key, gold: 0 }), null);
  assert.equal(validateStoreOperationBody({ itemId: "weapon_iron_axe", idempotencyKey: "not-a-uuid" }), null);
  assert.equal(validateStoreOperationBody({ itemId: "../weapon", idempotencyKey: key }), null);
});

test("the account purchase route rejects spoofed prices and unaffordable catalog items", async (t) => {
  const { pool, send } = await openStoreApi(t);
  const unaffordable = await send("purchase", { itemId: "weapon_road_spear", idempotencyKey: key });
  assert.equal(unaffordable.status, 409);
  assert.deepEqual(await unaffordable.json(), { error: "insufficient_funds" });
  assert.equal(pool.profile.gold, 120);

  const spoofed = await send("purchase", {
    itemId: "effect_ember_trail",
    idempotencyKey: "3f92ef1e-76c8-4985-a93f-7c631887bd21",
    price: { gold: 0, diamonds: 0 },
  });
  assert.equal(spoofed.status, 400);
  assert.equal(pool.profile.gold, 120);
});

test("the account purchase route replays idempotently and blocks buying an owned item again", async (t) => {
  const profile = createDefaultPlayerProfile();
  profile.gold = 500;
  const { pool, send } = await openStoreApi(t, profile);
  const body = { itemId: "effect_ember_trail", idempotencyKey: key };
  const first = await send("purchase", body);
  assert.equal(first.status, 200);
  assert.equal(pool.profile.gold, 320);

  const replay = await send("purchase", body);
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).replayed, true);
  assert.equal(pool.profile.gold, 320);

  const secondPurchase = await send("purchase", {
    itemId: body.itemId,
    idempotencyKey: "7b8ac999-b36a-4e25-bd30-06e4ce43e2fa",
  });
  assert.equal(secondPurchase.status, 409);
  assert.deepEqual(await secondPurchase.json(), { error: "item_already_owned" });
  assert.equal(pool.profile.gold, 320);
});

test("the account equip route refuses items the profile does not own", async (t) => {
  const { pool, send } = await openStoreApi(t);
  const response = await send("equip", { itemId: "weapon_road_spear" });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "item_not_owned" });
  assert.equal(pool.profile.equipment.weaponId, "weapon_ash_sword");
});

test("the account equip route supports an explicit second ring slot", async (t) => {
  const profile = createDefaultPlayerProfile();
  profile.inventory.ownedItemIds.push("ring_storm");
  const { pool, send } = await openStoreApi(t, profile);
  const response = await send("equip", { itemId: "ring_storm", equipmentKey: "ringTwoId" });
  assert.equal(response.status, 200);
  assert.equal(pool.profile.equipment.ringTwoId, "ring_storm");
  assert.equal(pool.profile.equipment.ringOneId, null);
});

test("repeat purchases add consumable and material stock without creating equipment entries", async (t) => {
  const profile = createDefaultPlayerProfile();
  profile.gold = 1000;
  profile.inventory.combatItemCounts.health_potion = 0;
  profile.materials.ironShards = 0;
  const { pool, send } = await openStoreApi(t, profile);
  const firstKey = "c8dd7e88-7929-4e36-94ca-02f0a76a7028";
  const secondKey = "7454d20b-593a-44b5-9602-0be1d346c80d";
  const firstPotion = await send("purchase", { itemId: "supply_health_potion", idempotencyKey: firstKey });
  const secondPotion = await send("purchase", { itemId: "supply_health_potion", idempotencyKey: secondKey });
  assert.equal(firstPotion.status, 200);
  assert.equal(secondPotion.status, 200);
  assert.equal(pool.profile.inventory.combatItemCounts.health_potion, 2);
  assert.equal(pool.profile.inventory.ownedItemIds.includes("supply_health_potion"), false);
  const material = await send("purchase", { itemId: "material_iron_shard", idempotencyKey: "e74b6113-2fb0-4954-ae8b-1303d883f3e3" });
  assert.equal(material.status, 200);
  assert.equal(pool.profile.materials.ironShards, 1);
});

test("selling returns forty percent, removes the item once, and rejects equipped gear", async (t) => {
  const profile = createDefaultPlayerProfile();
  profile.gold = 0;
  profile.inventory.ownedItemIds.push("weapon_iron_sword");
  const { pool, send } = await openStoreApi(t, profile);
  const expectedValue = getItemSellValue(STORE_CATALOG.find((item) => item.id === "weapon_iron_sword"));
  const saleKey = "173b0583-66df-4b46-90b1-81339261df6b";
  const first = await send("sell", { itemId: "weapon_iron_sword", idempotencyKey: saleKey });
  assert.equal(first.status, 200);
  assert.equal(pool.profile.gold, expectedValue.gold);
  assert.equal(pool.profile.inventory.ownedItemIds.includes("weapon_iron_sword"), false);
  const replay = await send("sell", { itemId: "weapon_iron_sword", idempotencyKey: saleKey });
  assert.equal(replay.status, 200);
  assert.equal(pool.profile.gold, expectedValue.gold);

  const equippedProfile = createDefaultPlayerProfile();
  equippedProfile.inventory.ownedItemIds.push("weapon_iron_sword");
  equippedProfile.equipment.weaponId = "weapon_iron_sword";
  const equippedStore = await openStoreApi(t, equippedProfile);
  const blocked = await equippedStore.send("sell", {
    itemId: "weapon_iron_sword",
    idempotencyKey: "7ce5888d-8468-40bd-a950-63d861e2cfbb",
  });
  assert.equal(blocked.status, 409);
  assert.deepEqual(await blocked.json(), { error: "item_equipped" });
});

test("salvaging removes loose gear and returns upgrade-aware materials", async (t) => {
  const profile = createDefaultPlayerProfile();
  profile.inventory.ownedItemIds.push("weapon_iron_sword");
  profile.inventory.upgrades.weapon_iron_sword = 4;
  const { pool, send } = await openStoreApi(t, profile);
  const expectedYield = getSalvageYield(STORE_CATALOG.find((item) => item.id === "weapon_iron_sword"), 4);
  const response = await send("salvage", {
    itemId: "weapon_iron_sword",
    idempotencyKey: "fbe26539-df39-4df5-9eb4-14c27e83469b",
  });
  assert.equal(response.status, 200);
  assert.equal(pool.profile.inventory.ownedItemIds.includes("weapon_iron_sword"), false);
  assert.equal(pool.profile.inventory.upgrades.weapon_iron_sword, undefined);
  assert.equal(pool.profile.materials.ironShards, expectedYield.ironShards);
  assert.equal(pool.profile.materials.emberCrystals, expectedYield.emberCrystals);
});

test("upgrade risk is deterministic, costs are spent on failure, and replays do not charge twice", async (t) => {
  assert.equal(getUpgradeSuccessChance(0), 100);
  assert.equal(getUpgradeSuccessChance(6), 85);
  const profile = createDefaultPlayerProfile();
  profile.gold = 1_000_000;
  profile.materials = { ironShards: 100, emberCrystals: 100, sealFragments: 100 };
  profile.inventory.upgrades.weapon_ash_sword = 6;
  const { pool, send } = await openStoreApi(t, profile);
  const upgradeKey = "2e630bf0-d06d-49c6-a8d3-939cc724ffdc";
  const expectedSuccess = rollUpgradeSuccess(upgradeKey, 6);
  const beforeGold = pool.profile.gold;
  const cost = getUpgradeCost("weapon", 6);
  const response = await send("upgrade", { itemId: "weapon_ash_sword", idempotencyKey: upgradeKey });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.upgradeSucceeded, expectedSuccess);
  assert.equal(pool.profile.gold, beforeGold - cost.gold);
  assert.equal(pool.profile.inventory.upgrades.weapon_ash_sword, expectedSuccess ? 7 : 6);
  const replay = await send("upgrade", { itemId: "weapon_ash_sword", idempotencyKey: upgradeKey });
  assert.equal((await replay.json()).replayed, true);
  assert.equal(pool.profile.gold, beforeGold - cost.gold);
});

test("the account combat loadout saves assigned slots and only accepts owned weapons and available items", async (t) => {
  const profile = createDefaultPlayerProfile();
  profile.inventory.ownedItemIds.push("weapon_iron_axe");
  profile.inventory.combatItemCounts.venom_vial = 0;
  const { pool, send } = await openStoreApi(t, profile);
  const response = await send("combat-loadout", {
    quickSlots: ["health_potion", null, "throwing_knife", null],
    secondaryWeaponId: "weapon_iron_axe",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(pool.profile.inventory.quickSlots, ["health_potion", null, "throwing_knife", null]);
  assert.equal(pool.profile.inventory.secondaryWeaponId, "weapon_iron_axe");

  const unavailable = await send("combat-loadout", {
    quickSlots: ["venom_vial", null, null, null],
    secondaryWeaponId: null,
  });
  assert.equal(unavailable.status, 409);
  assert.deepEqual(await unavailable.json(), { error: "combat_item_unavailable" });
  assert.deepEqual(pool.profile.inventory.quickSlots, ["health_potion", null, "throwing_knife", null]);

  const malformed = await send("combat-loadout", {
    quickSlots: ["health_potion", "health_potion", null, null],
    secondaryWeaponId: null,
  });
  assert.equal(malformed.status, 400);
});

test("server catalog contains the staged equipment categories with in-game-only prices", () => {
  assert.ok(STORE_CATALOG.filter((item) => item.category === "weapons").length >= 8);
  assert.ok(STORE_CATALOG.filter((item) => item.category === "armor").length >= 8);
  assert.ok(STORE_CATALOG.filter((item) => item.category === "accessories").length >= 10);
  assert.ok(STORE_CATALOG.filter((item) => item.category === "consumables").length >= 6);
  assert.ok(STORE_CATALOG.filter((item) => item.category === "materials").length >= 3);
  assert.ok(STORE_CATALOG.filter((item) => item.category === "specials").length >= 4);
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
