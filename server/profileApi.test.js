import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultPlayerProfile, validatePlayerProfile, validateProfileRename } from "./profileApi.ts";

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
    armorId: "armor_ash_guard",
    capeId: "cape_worn",
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
