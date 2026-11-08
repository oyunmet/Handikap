import assert from "node:assert/strict";
import test from "node:test";
import { getStoreItem, getWarRoomWeaponStoreStats } from "./store-catalog.ts";
import { getWarRoomLoadoutFromProfile, isWarRoomWeaponOwned } from "./war-room-loadout.ts";
import { WAR_ROOM_WEAPONS } from "./war-room-data.ts";

test("every store-linked War Room weapon exposes its real combat values", () => {
  for (const weapon of WAR_ROOM_WEAPONS.filter((entry) => entry.storeItemId)) {
    const item = getStoreItem(weapon.storeItemId);
    assert.ok(item, `${weapon.id} must have a store item`);
    assert.equal(item.warRoomWeaponId, weapon.id);
    const stats = getWarRoomWeaponStoreStats(item.warRoomWeaponId);
    assert.ok(stats);
    assert.equal(stats.damage, weapon.damage);
    assert.equal(stats.range, weapon.range);
    assert.ok(stats.fireInterval > 0);
    if (weapon.weaponClass === "melee") {
      assert.equal(stats.magazine, null);
    } else {
      assert.ok(stats.magazine > 0);
      assert.ok(stats.reserve > 0);
    }
  }
});

test("a purchased War Room weapon is owned and available in the two-slot briefing loadout", () => {
  const itemId = "war_room_blaster_r";
  const item = getStoreItem(itemId);
  assert.ok(item);
  assert.equal(item.slot, null, "War Room weapons stay outside normal RPG equipment slots");

  const ownedItemIds = [itemId];
  assert.equal(isWarRoomWeaponOwned("blaster_r", ownedItemIds), true);
  assert.deepEqual(getWarRoomLoadoutFromProfile({
    equipment: { weaponId: "weapon_ash_sword" },
    inventory: { ownedItemIds, secondaryWeaponId: null },
  }), ["blaster_r", "powder_rifle"]);
});
