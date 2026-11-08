import assert from "node:assert/strict";
import test from "node:test";
import { getUpgradeCost } from "./store-balance.ts";

test("weapon upgrades become progressively expensive while their bonuses remain capped", () => {
  assert.deepEqual(
    Array.from({ length: 5 }, (_, level) => getUpgradeCost("weapon", level).gold),
    [140, 280, 560, 1_120, 2_240],
  );
  assert.equal(getUpgradeCost("weapon", 5).gold, 2_240);
});

test("armor upgrades require rising gold and rare materials at higher tiers", () => {
  assert.deepEqual(
    Array.from({ length: 5 }, (_, level) => getUpgradeCost("armor", level).gold),
    [190, 305, 420, 535, 650],
  );
  assert.equal(getUpgradeCost("armor", 0).sealFragments, 0);
  assert.ok(getUpgradeCost("armor", 2).sealFragments > 0);
  assert.ok(getUpgradeCost("armor", 4).emberCrystals > getUpgradeCost("armor", 0).emberCrystals);
});
