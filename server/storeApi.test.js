import assert from "node:assert/strict";
import express from "express";
import test from "node:test";
import { createDefaultPlayerProfile } from "./profileApi.ts";
import { calculateAccountCombatStats, createStoreApi, validateStoreOperationBody } from "./storeApi.ts";
import { STORE_CATALOG } from "./storeCatalog.ts";
import { getUpgradeCost, MAX_UPGRADE_LEVEL } from "../src/shafak/game/store-types.ts";

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
