import assert from "node:assert/strict";
import test from "node:test";
import {
  applyWarRoomLootChest,
  createWarRoomRuntime,
  getNearbyWarRoomLootChest,
} from "./war-room-engine.ts";
import { getWarRoomRoom } from "./war-room-rooms.ts";

test("every two-storey house has weapon and ammunition chests on both floors", () => {
  const room = getWarRoomRoom(1);
  assert.equal(room.buildings.length, 8);
  assert.equal(room.lootChests.length, 32);

  for (const building of room.buildings) {
    const houseChests = room.lootChests.filter((chest) => chest.buildingId === building.id);
    assert.equal(houseChests.length, 4);
    for (const floor of [0, 1]) {
      const floorChests = houseChests.filter((chest) => chest.floor === floor);
      assert.deepEqual(new Set(floorChests.map((chest) => chest.kind)), new Set(["ammo", "weapon"]));
      assert.ok(floorChests.every((chest) => (
        chest.floorHeight === (floor === 0 ? 0 : building.storyHeight)
      )));
    }
  }
});

test("nearby loot is floor-specific and collecting it changes only the match runtime", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"], 0, 1);
  const upperWeaponChest = runtime.lootChests.find((chest) => chest.floor === 1 && chest.kind === "weapon");
  assert.ok(upperWeaponChest);
  runtime.player.x = upperWeaponChest.x;
  runtime.player.z = upperWeaponChest.z;

  runtime.player.floorHeight = 0;
  assert.equal(getNearbyWarRoomLootChest(runtime)?.chest.floor, 0);
  runtime.player.floorHeight = upperWeaponChest.floorHeight;
  assert.equal(getNearbyWarRoomLootChest(runtime)?.chest.id, upperWeaponChest.id);

  const oldSlots = [...runtime.player.weaponSlots];
  runtime.player.ammo[upperWeaponChest.weaponId] = { magazine: 0, reserve: 0 };
  const result = applyWarRoomLootChest(runtime.player, upperWeaponChest);
  assert.ok(result.includes("alındı"));
  assert.ok(runtime.player.weaponSlots.includes(upperWeaponChest.weaponId));
  assert.ok(runtime.player.ammo[upperWeaponChest.weaponId].magazine > 0);
  assert.ok(oldSlots.every((weaponId) => runtime.player.weaponSlots.includes(weaponId)));
  assert.equal(upperWeaponChest.opened, false);
  upperWeaponChest.opened = true;
  assert.notEqual(getNearbyWarRoomLootChest(runtime)?.chest.id, upperWeaponChest.id);
});
