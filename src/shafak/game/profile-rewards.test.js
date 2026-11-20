import assert from "node:assert/strict";
import test from "node:test";
import { awardBattle, defaultProfile, normalizePlayerProfile } from "./profile.ts";

test("offline boss victories grant one seal fragment with the normal victory rewards", () => {
  const result = awardBattle(defaultProfile, {
    verdict: "victory",
    opponentId: "chapter-boss",
    loot: 48,
    item: null,
    isBoss: true,
  });

  assert.equal(result.rewards.gold, 48);
  assert.equal(result.rewards.xp, 58);
  assert.equal(result.rewards.sealFragments, 1);
  assert.equal(result.profile.materials.sealFragments, defaultProfile.materials.sealFragments + 1);
});

test("ordinary victories and non-victories do not create seal fragments", () => {
  const regularWin = awardBattle(defaultProfile, {
    verdict: "victory",
    opponentId: "ordinary-rival",
    loot: 48,
    item: null,
    isBoss: false,
  });
  const bossDefeat = awardBattle(defaultProfile, {
    verdict: "defeat",
    opponentId: "chapter-boss",
    loot: 48,
    item: null,
    isBoss: true,
  });

  assert.equal(regularWin.rewards.sealFragments, 0);
  assert.equal(bossDefeat.rewards.sealFragments, 0);
  assert.equal(bossDefeat.profile.materials.sealFragments, defaultProfile.materials.sealFragments);
});

test("verified operation-final victories persist records beyond the defeated-rival history window", () => {
  const firstOperation = awardBattle(defaultProfile, {
    verdict: "victory",
    opponentId: "ash-road:49:rival:4",
    loot: 48,
    item: null,
    isBoss: true,
  });
  const laterVictories = Array.from({ length: 70 }).reduce(
    (profile) => awardBattle(profile, {
      verdict: "victory",
      opponentId: `ordinary-${profile.battles}`,
      loot: 1,
      item: null,
    }).profile,
    firstOperation.profile,
  );
  const migratedLegacyProfile = normalizePlayerProfile({
    ...firstOperation.profile,
    campaignRecordIds: undefined,
  });

  assert.deepEqual(firstOperation.profile.campaignRecordIds, ["campaign-record-01"]);
  assert.ok(laterVictories.campaignRecordIds.includes("campaign-record-01"));
  assert.ok(!laterVictories.defeatedOpponents.includes("ash-road:49:rival:4"));
  assert.deepEqual(migratedLegacyProfile.campaignRecordIds, ["campaign-record-01"]);
  assert.deepEqual(
    awardBattle(defaultProfile, {
      verdict: "defeat",
      opponentId: "ash-road:49:rival:4",
      loot: 48,
      isBoss: true,
    }).profile.campaignRecordIds,
    [],
  );
});

test("the daily third-win bonus stays limited while campaign gold rewards are paced", () => {
  const outcome = {
    verdict: "victory",
    opponentId: "daily-quest-rival",
    loot: 48,
    item: null,
    isBoss: false,
  };
  const regular = awardBattle({ ...defaultProfile, dailyBattles: 1, dailyWins: 1 }, outcome);
  const thirdWin = awardBattle({ ...defaultProfile, dailyBattles: 2, dailyWins: 2 }, outcome);

  assert.equal(regular.rewards.gold, 48);
  assert.equal(thirdWin.rewards.gold, 98);
});
