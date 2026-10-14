import assert from "node:assert/strict";
import test from "node:test";
import {
  applyServerAward,
  completeDuel,
  createDuelChallenge,
  DuelServiceError,
  validateCombatInputLog,
} from "./duelService.ts";
import { INPUT_BUTTON, MAX_INPUT_BUTTONS } from "../src/shafak/game/combat-engine.ts";
import { createDefaultPlayerProfile } from "./profileApi.ts";
import { getWorldChapter } from "../src/shafak/world/world-content.ts";

const now = new Date("2026-10-08T12:01:00.000Z");

const profile = {
  name: "Yolcu",
  level: 1,
  xp: 0,
  gold: 120,
  battles: 3,
  wins: 2,
  winStreak: 2,
  bestStreak: 2,
  items: [],
  defeatedOpponents: ["ash-scout"],
  dailyBattles: 3,
  dailyWins: 2,
  dailyKey: "2026-10-08",
};

test("server challenges use a generated rival id and return server-owned combat settings", async () => {
  const rival = getWorldChapter(0).rivals[0];
  const inserts = [];
  let reads = 0;
  const database = {
    async query(sql, values = []) {
      if (sql.startsWith("SELECT profile")) return { rows: [{ profile }] };
      if (sql.startsWith("UPDATE shafak_duels")) return { rowCount: 0, rows: [] };
      if (sql.startsWith("SELECT duel_id")) return { rows: [] };
      if (sql.startsWith("INSERT INTO shafak_duels")) {
        inserts.push(values);
        return { rowCount: 1, rows: [] };
      }
      reads += 1;
      throw new Error(`Unexpected query ${sql}`);
    },
  };

  const challenge = await createDuelChallenge(database, "user-1", rival.id);
  assert.equal(challenge.opponent.id, rival.id);
  assert.equal(challenge.opponent.difficulty, rival.difficulty);
  assert.ok(Number.isSafeInteger(challenge.seed));
  assert.equal(challenge.playerStats.maxHealth, 150);
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0][3], rival.id);
  const savedCombatConfig = JSON.parse(inserts[0][4]);
  assert.deepEqual(savedCombatConfig.playerStats, challenge.playerStats);
  assert.deepEqual(savedCombatConfig.combatLoadout, challenge.combatLoadout);
  assert.equal(reads, 0);

  const legacyChallenge = await createDuelChallenge(
    database,
    "user-1",
    rival.id.replace(":rival:", ":bot:"),
  );
  assert.equal(legacyChallenge.opponent.id, rival.id);
  assert.ok(!JSON.stringify(legacyChallenge).toLowerCase().includes("bot"));
});

test("retrying a duel start reuses the active challenge for the same opponent", async () => {
  const rival = getWorldChapter(0).rivals[0];
  const existing = {
    duel_id: "f4b13e71-45e7-43a4-aea0-460de2c6c22f",
    seed: 77331,
    opponent_id: rival.id,
    player_stats: {
      maxHealth: 150,
      damageMultiplier: 1,
      defenseReduction: 0,
      criticalChance: 0.05,
      moveSpeedMultiplier: 1,
      attackSpeedMultiplier: 1,
      attackRangeBonus: 0,
    },
  };
  let inserts = 0;
  const database = {
    async query(sql) {
      if (sql.startsWith("SELECT profile")) return { rows: [{ profile }] };
      if (sql.startsWith("UPDATE shafak_duels")) return { rowCount: 0, rows: [] };
      if (sql.includes("completion->'summary'")) return { rows: [] };
      if (sql.includes("completed_at IS NULL")) return { rows: [existing] };
      if (sql.startsWith("INSERT INTO shafak_duels")) {
        inserts += 1;
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected query ${sql}`);
    },
  };

  const challenge = await createDuelChallenge(database, "user-1", rival.id);
  assert.equal(challenge.duelId, existing.duel_id);
  assert.equal(challenge.seed, existing.seed);
  assert.equal(challenge.opponent.id, rival.id);
  assert.equal(inserts, 0);
});

test("a client cannot submit a requested result or rewards", async () => {
  let queries = 0;
  const client = {
    async query() {
      queries += 1;
      throw new Error("disabled completion should not touch the database");
    },
  };

  await assert.rejects(
    completeDuel(client, "user-1", { duelId: "forged", requestedOutcome: "victory" }),
    (error) => error instanceof DuelServiceError
      && error.status === 400
      && error.code === "invalid_completion",
  );
  assert.equal(queries, 0);
});

test("input tapes reject broken button transitions and client-invented fields", () => {
  assert.deepEqual(validateCombatInputLog([
    [0, 0, 0, 0, 0, 0],
    [12, 0, 0, 1, 1, 0],
    [14, 0, 0, 0, 0, 1],
  ]), [
    [0, 0, 0, 0, 0, 0],
    [12, 0, 0, 1, 1, 0],
    [14, 0, 0, 0, 0, 1],
  ]);
  assert.equal(validateCombatInputLog([[0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 1, 0]]), null);
  assert.equal(validateCombatInputLog([[0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 900]]), null);
  assert.deepEqual(validateCombatInputLog([
    [0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 128, 128],
    [2, 0, 0, 0, 512, 512],
  ]), [
    [0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 128, 128],
    [2, 0, 0, 0, 512, 512],
  ]);
  const newActionBits = [
    [1, INPUT_BUTTON.aim],
    [2, INPUT_BUTTON.crouch],
    [3, INPUT_BUTTON.jump],
  ];
  const validNewActions = [
    [0, 0, 0, 0, 0, 0],
    ...newActionBits.map(([tick, button]) => [tick, 0, 0, 0, button, button]),
  ];
  assert.deepEqual(validateCombatInputLog(validNewActions), validNewActions);
  assert.deepEqual(validateCombatInputLog([
    [0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, MAX_INPUT_BUTTONS, MAX_INPUT_BUTTONS],
  ]), [
    [0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, MAX_INPUT_BUTTONS, MAX_INPUT_BUTTONS],
  ]);
  assert.equal(
    validateCombatInputLog([[0, 0, 0, 0, 0, 0], [1, 0, 0, 0, MAX_INPUT_BUTTONS + 1, MAX_INPUT_BUTTONS + 1]]),
    null,
  );
});

test("server replays the seeded duel and returns the stored result only once", async () => {
  const startedAt = new Date("2026-10-08T11:58:00.000Z");
  const duel = {
    duel_id: "f4b13e71-45e7-43a4-aea0-460de2c6c22f",
    user_id: "user-1",
    seed: 77331,
    opponent_id: getWorldChapter(0).rivals[0].id,
    started_at: startedAt,
    completed_at: null,
    completion: null,
  };
  const defaultInventory = createDefaultPlayerProfile().inventory;
  let storedProfile = {
    ...profile,
    defeatedOpponents: [],
    inventory: {
      ...defaultInventory,
      ownedItemIds: [...defaultInventory.ownedItemIds, "weapon_iron_axe"],
      secondaryWeaponId: "weapon_iron_axe",
    },
  };
  let profileWrites = 0;
  let completionWrites = 0;
  const client = {
    async query(sql, values = []) {
      if (sql.startsWith("SELECT duel_id")) return { rows: [{ ...duel }] };
      if (sql.startsWith("SELECT profile")) return { rows: [{ profile: storedProfile }] };
      if (sql.startsWith("UPDATE shafak_player_profiles")) {
        storedProfile = JSON.parse(values[1]);
        profileWrites += 1;
        return { rowCount: 1, rows: [] };
      }
      if (sql.startsWith("UPDATE shafak_duels")) {
        duel.completed_at = new Date(now);
        duel.input_log = JSON.parse(values[1]);
        duel.completion = JSON.parse(values[2]);
        completionWrites += 1;
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected query ${sql}`);
    },
  };
  const request = {
    duelId: duel.duel_id,
    inputLog: [
      [0, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 128, 128],
      [2, 0, 0, 0, 512, 512],
    ],
  };
  const first = await completeDuel(client, "user-1", request, now);
  const second = await completeDuel(client, "user-1", request, now);
  assert.equal(first.summary.verdict, "draw");
  assert.deepEqual(second, first);
  assert.equal(profileWrites, 1);
  assert.equal(completionWrites, 1);
  assert.equal(storedProfile.battles, profile.battles + 1);
  assert.equal(storedProfile.inventory.combatItemCounts.throwing_knife, defaultInventory.combatItemCounts.throwing_knife - 1);
});

test("the retained server reward calculation preserves the third-win daily quest", () => {
  const awarded = applyServerAward(
    profile,
    { verdict: "victory", opponentId: "iron-vow", loot: 48 },
    now,
  );

  assert.equal(awarded.rewards.gold, 148);
  assert.equal(awarded.rewards.diamonds, 2);
  assert.equal(awarded.profile.diamonds, 2);
  assert.equal(awarded.profile.gold, 268);
  assert.equal(awarded.profile.dailyBattles, 4);
  assert.equal(awarded.profile.dailyWins, 3);
  assert.equal(awarded.profile.battles, 4);
  assert.equal(awarded.profile.wins, 3);
  assert.ok(awarded.profile.defeatedOpponents.includes("iron-vow"));
});
