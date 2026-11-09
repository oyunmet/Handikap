import assert from "node:assert/strict";
import test from "node:test";
import { normalizePlayerProfile, defaultProfile } from "../game/profile.ts";
import { CAMPAIGN_PROGRESS_VERSION } from "./campaign-progression.ts";
import { WORLD_GATE_INTERVAL_METERS } from "./movement.ts";

test("legacy saves keep player, economy, inventory, and world position during campaign migration", () => {
  const legacySave = {
    ...defaultProfile,
    name: "Kül Yolcusu",
    level: 17,
    xp: 2_350,
    gold: 8_420,
    diamonds: 31,
    materials: { emberCrystals: 7, sealFragments: 4, ironShards: 19 },
    inventory: {
      ...defaultProfile.inventory,
      ownedItemIds: ["weapon_ash_sword", "armor_ash_guard", "rare_helm"],
      upgrades: { weapon_ash_sword: 4 },
    },
    equipment: { ...defaultProfile.equipment, helmetId: "rare_helm" },
    worldProgress: {
      distance: 51 * WORLD_GATE_INTERVAL_METERS + 43,
      depth: -0.35,
      routeChoice: { chapterId: 52, side: "right", difficulty: "hard" },
    },
  };

  const migrated = normalizePlayerProfile(legacySave);

  assert.equal(migrated.worldProgress?.campaignVersion, CAMPAIGN_PROGRESS_VERSION);
  assert.equal(migrated.worldProgress?.distance, legacySave.worldProgress.distance);
  assert.equal(migrated.worldProgress?.depth, legacySave.worldProgress.depth);
  assert.deepEqual(migrated.worldProgress?.routeChoice, legacySave.worldProgress.routeChoice);
  assert.equal(migrated.name, legacySave.name);
  assert.equal(migrated.level, legacySave.level);
  assert.equal(migrated.xp, legacySave.xp);
  assert.equal(migrated.gold, legacySave.gold);
  assert.equal(migrated.diamonds, legacySave.diamonds);
  assert.deepEqual(migrated.materials, legacySave.materials);
  for (const itemId of legacySave.inventory.ownedItemIds) {
    assert.ok(migrated.inventory.ownedItemIds.includes(itemId), `keeps ${itemId}`);
  }
  assert.deepEqual(migrated.inventory.upgrades, legacySave.inventory.upgrades);
  assert.deepEqual(migrated.equipment, legacySave.equipment);
});
