import assert from "node:assert/strict";
import test from "node:test";
import { WORLD_GATE_INTERVAL_METERS } from "./movement.ts";
import {
  CAMPAIGN_ACT_COUNT,
  CAMPAIGN_CHAPTER_COUNT,
  CAMPAIGN_LEVELS_PER_ACT,
  CAMPAIGN_LEVEL_COUNT,
  CAMPAIGN_REGIONS,
  FINAL_CAMPAIGN_BOSS_ID,
  FINAL_CAMPAIGN_CHAPTER_ID,
  FINAL_CAMPAIGN_DISTANCE,
  getCampaignLevelKind,
  getCampaignLevelNumber,
  getCampaignProgressFromDistance,
  getCampaignRegion,
  getCampaignRivalCount,
  isCampaignActBoss,
  isCampaignBossLevel,
  isCampaignComplete,
  isCampaignFinalBoss,
  isCampaignMiniBoss,
  resetCampaignProgressForNewGamePlus,
} from "./campaign-progression.ts";

test("the long campaign has nine 50-level acts and preserves existing region identities", () => {
  assert.equal(CAMPAIGN_ACT_COUNT, 9);
  assert.equal(CAMPAIGN_LEVELS_PER_ACT, 50);
  assert.equal(CAMPAIGN_LEVEL_COUNT, 450);
  assert.equal(CAMPAIGN_CHAPTER_COUNT, CAMPAIGN_LEVEL_COUNT);
  assert.deepEqual(CAMPAIGN_REGIONS.map((region) => region.name), [
    "Kül Yolu",
    "Donmuş Geçit",
    "Kızıl Bataklık",
    "Fısıltı Ormanı",
    "Çürük Taht",
    "Sisli Kıyı",
    "Kayıp Şehir",
    "Kara Zirve",
    "Gölge Sarayı",
  ]);
  assert.equal(getCampaignRegion(0).name, "Kül Yolu");
  assert.equal(getCampaignRegion(49).name, "Kül Yolu");
  assert.equal(getCampaignRegion(50).name, "Donmuş Geçit");
  assert.equal(getCampaignRegion(100).name, "Kızıl Bataklık");
  assert.equal(getCampaignRegion(449).name, "Gölge Sarayı");
  assert.equal(getCampaignRegion(500).name, "Gölge Sarayı");
});

test("every tenth level is a mini-boss and every fiftieth level is an act boss", () => {
  assert.equal(getCampaignLevelNumber(449), 450);
  for (let chapterId = 0; chapterId < CAMPAIGN_LEVEL_COUNT; chapterId += 1) {
    const levelNumber = chapterId + 1;
    const expected = levelNumber % 50 === 0
      ? "act-boss"
      : levelNumber % 10 === 0
        ? "mini-boss"
        : undefined;
    assert.equal(isCampaignActBoss(chapterId), levelNumber % 50 === 0);
    assert.equal(isCampaignMiniBoss(chapterId), levelNumber % 10 === 0 && levelNumber % 50 !== 0);
    assert.equal(isCampaignBossLevel(chapterId), expected !== undefined);
    if (expected) assert.equal(getCampaignLevelKind(chapterId), expected);
  }
  assert.equal(FINAL_CAMPAIGN_CHAPTER_ID, 449);
  assert.equal(FINAL_CAMPAIGN_BOSS_ID, "ash-road:449:rival:8");
  assert.equal(isCampaignFinalBoss(449, true), true);
  assert.equal(isCampaignFinalBoss(448, true), false);
  assert.equal(isCampaignFinalBoss(449, false), false);
  assert.deepEqual(
    [0, 89, 90, 179, 180, 269, 270, 359, 360, 449].map(getCampaignRivalCount),
    [5, 5, 6, 6, 7, 7, 8, 8, 9, 9],
  );
});

test("saved distance maps to a campaign act, level, and readable progress", () => {
  const halfwayThroughLevel52 = getCampaignProgressFromDistance(
    51 * WORLD_GATE_INTERVAL_METERS + WORLD_GATE_INTERVAL_METERS / 2,
  );
  assert.equal(halfwayThroughLevel52.levelNumber, 52);
  assert.equal(halfwayThroughLevel52.actNumber, 2);
  assert.equal(halfwayThroughLevel52.region.name, "Donmuş Geçit");
  assert.equal(halfwayThroughLevel52.levelProgressPercent, 50);
  assert.ok(halfwayThroughLevel52.campaignProgressPercent > 11);
  const complete = getCampaignProgressFromDistance(FINAL_CAMPAIGN_DISTANCE);
  assert.equal(complete.levelNumber, 450);
  assert.equal(complete.campaignProgressPercent, 100);
});

test("campaign completion requires the final boss or a legacy save past the final gate", () => {
  assert.equal(isCampaignComplete([FINAL_CAMPAIGN_BOSS_ID]), true);
  assert.equal(isCampaignComplete([], FINAL_CAMPAIGN_DISTANCE - 2.8), false);
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
