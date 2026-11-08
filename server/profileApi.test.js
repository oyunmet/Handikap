import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import test from "node:test";
import {
  ACCOUNT_DELETION_CONFIRMATION,
  AccountDeletionError,
  createProfileApi,
  createDefaultPlayerProfile,
  deleteAccountAndData,
  validatePlayerProfile,
  validateProfileRename,
} from "./profileApi.ts";
import { getWorldChapter } from "../src/shafak/world/world-content.ts";

const validProfile = {
  name: "Yolcu",
  level: 2,
  xp: 14,
  gold: 220,
  battles: 3,
  wins: 2,
  winStreak: 1,
  bestStreak: 2,
  items: ["Kül Mührü"],
  defeatedOpponents: ["ash-scout"],
  dailyBattles: 2,
  dailyWins: 1,
  dailyKey: "2026-10-08",
};

test("profile API accepts and normalizes a valid account profile", () => {
  const profile = validatePlayerProfile({ ...validProfile, name: "  Şafak   Yolcusu  " });
  assert.equal(profile?.name, "Şafak Yolcusu");
  assert.deepEqual(profile?.items, ["Kül Mührü"]);
  assert.equal(profile?.diamonds, 0);
  assert.equal(profile?.materials.ironShards, 0);
  assert.deepEqual(profile?.equipment, {
    weaponId: "weapon_ash_sword",
    offhandId: null,
    helmetId: null,
    armorId: "armor_ash_guard",
    glovesId: null,
    bootsId: null,
    capeId: "cape_worn",
    ringOneId: null,
    ringTwoId: null,
    effectId: "effect_none",
    dyeId: "dye_none",
  });
  assert.equal(profile?.inventory.ownedItemIds.length, 5);
});

test("new profiles start with starter equipment and no purchasable currency", () => {
  const profile = createDefaultPlayerProfile();
  assert.equal(profile.gold, 120);
  assert.equal(profile.diamonds, 0);
  assert.equal(profile.inventory.ownedItemIds.includes(profile.equipment.weaponId), true);
});

test("profile API rejects impossible progression and malformed collections", () => {
  assert.equal(validatePlayerProfile({ ...validProfile, wins: 4 }), null);
  assert.equal(validatePlayerProfile({ ...validProfile, dailyWins: 3 }), null);
  assert.equal(validatePlayerProfile({ ...validProfile, items: Array(31).fill("item") }), null);
  assert.equal(validatePlayerProfile({ ...validProfile, dailyKey: "not-a-date" }), null);
});

test("account progression requires the chapter boss before passing the gate", () => {
  const rivals = getWorldChapter(0).rivals;
  const baseWorldProgress = { distance: 141.3, depth: 0 };
  const beforeBoss = validatePlayerProfile({
    ...validProfile,
    defeatedOpponents: rivals.slice(0, 4).map((rival) => rival.id),
    worldProgress: baseWorldProgress,
  });
  const afterBoss = validatePlayerProfile({
    ...validProfile,
    defeatedOpponents: rivals.map((rival) => rival.id),
    worldProgress: baseWorldProgress,
  });
  assert.equal(beforeBoss, null);
  assert.equal(afterBoss?.worldProgress?.distance, baseWorldProgress.distance);

  const existingPlayer = validatePlayerProfile({
    ...validProfile,
    defeatedOpponents: rivals.slice(0, 4).map((rival) => rival.id),
    worldProgress: { distance: 150, depth: 0 },
  });
  assert.equal(existingPlayer?.worldProgress?.distance, 150);
});

test("profile API rejects unsafe or oversized values", () => {
  assert.equal(validatePlayerProfile({ ...validProfile, gold: -1 }), null);
  assert.equal(validatePlayerProfile({ ...validProfile, name: "x".repeat(21) }), null);
  assert.equal(validatePlayerProfile(null), null);
});

test("profile rename accepts only a display name, never client-owned progress", () => {
  assert.equal(validateProfileRename({ name: "  Yeni   Yolcu " }), "Yeni Yolcu");
  assert.equal(validateProfileRename({ name: "Yeni Yolcu", gold: 999999 }), null);
  assert.equal(validateProfileRename({ name: "" }), null);
});

test("account deletion removes every per-user table and then the Clerk identity", async () => {
  const operations = [];
  const client = {
    async query(sql, values) {
      operations.push({ sql, values });
      return { rows: [] };
    },
    release() {
      operations.push({ sql: "RELEASE" });
    },
  };
  const database = {
    async connect() {
      return client;
    },
  };
  const requests = [];
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    return new Response(null, { status: 204 });
  };

  await deleteAccountAndData(database, "user_123", "test-secret", fetcher);

  assert.deepEqual(operations.map(({ sql }) => sql), [
    "BEGIN",
    "DELETE FROM shafak_duels WHERE user_id = $1",
    "DELETE FROM shafak_pickup_claims WHERE user_id = $1",
    "DELETE FROM shafak_store_transactions WHERE user_id = $1",
    "DELETE FROM shafak_player_profiles WHERE user_id = $1",
    "COMMIT",
    "RELEASE",
  ]);
  assert.ok(operations.slice(1, 5).every(({ values }) => values[0] === "user_123"));
  assert.equal(requests[0].url, "https://api.clerk.com/v1/users/user_123");
  assert.equal(requests[0].options.method, "DELETE");
  assert.equal(requests[0].options.headers.Authorization, "Bearer test-secret");
});

test("account deletion rolls back game data when Clerk refuses to delete the identity", async () => {
  const operations = [];
  const client = {
    async query(sql) {
      operations.push(sql);
      return { rows: [] };
    },
    release() {
      operations.push("RELEASE");
    },
  };
  const database = { async connect() { return client; } };

  await assert.rejects(
    deleteAccountAndData(
      database,
      "user_123",
      "test-secret",
      async () => new Response(null, { status: 503 }),
    ),
    (error) => error instanceof AccountDeletionError && error.code === "identity_delete_failed",
  );
  assert.equal(operations.at(-2), "ROLLBACK");
  assert.equal(operations.at(-1), "RELEASE");
});

test("account deletion requires a same-origin request and explicit confirmation", async (t) => {
  const app = express();
  app.use(express.json());
  app.use(createProfileApi({
    async connect() {
      throw new Error("The route must reject these requests before opening a database connection.");
    },
  }, { clerkSecretKey: "test-secret" }));
  const server = createServer(app);

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}/api/profile/account`;
  const crossOrigin = await fetch(url, {
    method: "DELETE",
    headers: {
      Origin: "https://attacker.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ confirmation: ACCOUNT_DELETION_CONFIRMATION }),
  });
  assert.equal(crossOrigin.status, 403);

  const incompleteConfirmation = await fetch(url, {
    method: "DELETE",
    headers: {
      Origin: `http://127.0.0.1:${address.port}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ confirmation: "wrong" }),
  });
  assert.equal(incompleteConfirmation.status, 400);
});
