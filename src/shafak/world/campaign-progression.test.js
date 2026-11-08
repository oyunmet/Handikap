import assert from "node:assert/strict";
import test from "node:test";
import {
  CAMPAIGN_CHAPTER_COUNT,
  CAMPAIGN_REGIONS,
  FINAL_CAMPAIGN_BOSS_ID,
  FINAL_CAMPAIGN_CHAPTER_ID,
  FINAL_CAMPAIGN_DISTANCE,
  getCampaignRegion,
  getCampaignRivalCount,
  isCampaignComplete,
  isCampaignFinalBoss,
  resetCampaignProgressForNewGamePlus,
} from "./campaign-progression.ts";

test("the story campaign has nine chapters in three fixed regions", () => {
  assert.equal(CAMPAIGN_CHAPTER_COUNT, 9);
  assert.deepEqual(CAMPAIGN_REGIONS.map((region) => region.name), [
    "Kül Yolu",
    "Donmuş Geçit",
    "Kızıl Bataklık",
  ]);
  assert.equal(getCampaignRegion(0).name, "Kül Yolu");
  assert.equal(getCampaignRegion(3).name, "Donmuş Geçit");
  assert.equal(getCampaignRegion(8).name, "Kızıl Bataklık");
  assert.equal(getCampaignRegion(30).name, "Kızıl Bataklık");
});

test("rival count rises through the campaign and the final boss is the ninth chapter boss", () => {
  assert.deepEqual(
    Array.from({ length: CAMPAIGN_CHAPTER_COUNT }, (_, chapter) => getCampaignRivalCount(chapter)),
    [5, 5, 6, 6, 7, 7, 8, 8, 9],
  );
  assert.equal(FINAL_CAMPAIGN_CHAPTER_ID, 8);
  assert.equal(FINAL_CAMPAIGN_BOSS_ID, "ash-road:8:rival:8");
  assert.equal(isCampaignFinalBoss(8, true), true);
  assert.equal(isCampaignFinalBoss(7, true), false);
  assert.equal(isCampaignFinalBoss(8, false), false);
});

test("campaign completion recognizes the final boss or a legacy save beyond its gate", () => {
  assert.equal(isCampaignComplete([FINAL_CAMPAIGN_BOSS_ID]), true);
  assert.equal(isCampaignComplete([], FINAL_CAMPAIGN_DISTANCE), true);
  assert.equal(isCampaignComplete([], FINAL_CAMPAIGN_DISTANCE - 1), false);
});

test("New Game+ clears only chapter position and defeated route records", () => {
  const profile = {
    name: "Yolcu",
    level: 23,
    gold: 1_240,
    diamonds: 18,
    materials: { ironShards: 9, emberCrystals: 4, sealFragments: 3 },
    equipment: { weaponId: "weapon_ash_sword" },
    inventory: { ownedItemIds: ["weapon_ash_sword"], upgrades: { weapon_ash_sword: 2 } },
    defeatedOpponents: ["ash-road:8:rival:8"],
    worldProgress: { distance: 1_400, depth: 0.2, routeChoice: { chapterId: 9, side: "left", difficulty: "hard" } },
  };

  const reset = resetCampaignProgressForNewGamePlus(profile);

  assert.deepEqual(reset.defeatedOpponents, []);
  assert.equal(reset.worldProgress, null);
  assert.equal(reset.gold, profile.gold);
  assert.equal(reset.diamonds, profile.diamonds);
  assert.equal(reset.level, profile.level);
  assert.deepEqual(reset.materials, profile.materials);
  assert.deepEqual(reset.equipment, profile.equipment);
  assert.deepEqual(reset.inventory, profile.inventory);
});
