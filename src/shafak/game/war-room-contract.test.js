import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomContractProgress,
  getWarRoomContractReward,
  isWarRoomContractComplete,
} from "./war-room-contract.ts";

const headshotContract = {
  kind: "headshots",
  title: "Keskin nişancı",
  description: "Kafa vuruşu yap",
  target: 3,
  bonusGold: 75,
};
const lootContract = {
  kind: "loot",
  title: "Sandık avı",
  description: "Sandık aç",
  target: 2,
  bonusGold: 80,
};

test("contract progress reads the matching goal, clamps at its target, and never goes negative", () => {
  assert.equal(getWarRoomContractProgress(headshotContract, { headshots: 2, lootChestsOpened: 9 }), 2);
  assert.equal(getWarRoomContractProgress(headshotContract, { headshots: 5, lootChestsOpened: 0 }), 3);
  assert.equal(getWarRoomContractProgress(lootContract, { headshots: 5, lootChestsOpened: -1 }), 0);
  assert.equal(getWarRoomContractProgress(lootContract, { headshots: 0, lootChestsOpened: 1 }), 1);
});

test("a side contract pays its bonus only when its full target is reached", () => {
  assert.equal(isWarRoomContractComplete(lootContract, 1), false);
  assert.equal(getWarRoomContractReward(lootContract, 1), 0);
  assert.equal(isWarRoomContractComplete(lootContract, 2), true);
  assert.equal(getWarRoomContractReward(lootContract, 2), 80);
});
