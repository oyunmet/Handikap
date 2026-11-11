import assert from "node:assert/strict";
import test from "node:test";
import { defaultProfile } from "./profile.ts";
import {
  awardWarRoomProfileReward,
  parseWarRoomProfileRewardRequest,
  WAR_ROOM_DAILY_PROFILE_XP_CAP,
} from "./war-room-profile-rewards.ts";

const day = "2026-11-11";

function freshProfile() {
  return {
    ...structuredClone(defaultProfile),
    warRoomRewardDayKey: day,
    warRoomDailyXp: 0,
    warRoomDailySealClaimed: false,
  };
}

test("daily challenge grants one limited seal without changing campaign gold or progression", () => {
  const before = freshProfile();
  const request = {
    mode: "daily",
    victory: true,
    kills: 12,
    headshots: 3,
    wave: 1,
  };
  const first = awardWarRoomProfileReward(before, request, day);
  const second = awardWarRoomProfileReward(first.profile, request, day);

  assert.deepEqual(first.rewards, { xp: 32, sealFragments: 1 });
  assert.deepEqual(second.rewards, { xp: 28, sealFragments: 0 });
  assert.equal(second.profile.warRoomDailyXp, WAR_ROOM_DAILY_PROFILE_XP_CAP);
  assert.equal(second.profile.materials.sealFragments, before.materials.sealFragments + 1);
  assert.equal(second.profile.gold, before.gold);
  assert.equal(second.profile.diamonds, before.diamonds);
  assert.equal(second.profile.battles, before.battles);
  assert.deepEqual(second.profile.defeatedOpponents, before.defeatedOpponents);
  assert.deepEqual(second.profile.worldProgress, before.worldProgress);
});

test("profile reward cap resets on the next Istanbul day and losses give no seal", () => {
  const full = {
    ...freshProfile(),
    warRoomDailyXp: WAR_ROOM_DAILY_PROFILE_XP_CAP,
    warRoomDailySealClaimed: true,
  };
  const loss = awardWarRoomProfileReward(full, {
    mode: "daily",
    victory: false,
    kills: 0,
    headshots: 0,
    wave: 1,
  }, "2026-11-12");

  assert.deepEqual(loss.rewards, { xp: 5, sealFragments: 0 });
  assert.equal(loss.profile.warRoomRewardDayKey, "2026-11-12");
  assert.equal(loss.profile.warRoomDailyXp, 5);
  assert.equal(loss.profile.warRoomDailySealClaimed, false);
});

test("reward requests reject client-supplied payout fields and malformed metrics", () => {
  assert.equal(parseWarRoomProfileRewardRequest({
    mode: "daily", victory: true, kills: 1, headshots: 0, wave: 1, xp: 999999,
  }), null);
  assert.equal(parseWarRoomProfileRewardRequest({
    mode: "daily", victory: true, kills: -1, headshots: 0, wave: 1,
  }), null);
  assert.deepEqual(parseWarRoomProfileRewardRequest({
    mode: "survival", victory: true, kills: 18, headshots: 4, wave: 6,
  }), { mode: "survival", victory: true, kills: 18, headshots: 4, wave: 6 });
});
