import assert from "node:assert/strict";
import test from "node:test";
import { WAR_ROOM_WEAPONS } from "./war-room-data.ts";
import { getWarRoomWeaponIconDataUrl } from "./war-room-weapon-icons.ts";

test("every weapon gets a cached, weapon-colored silhouette icon", () => {
  const urls = WAR_ROOM_WEAPONS.map((weapon) => getWarRoomWeaponIconDataUrl(weapon.id));
  assert.ok(urls.every((url) => url.startsWith("data:image/svg+xml;charset=UTF-8,")));
  assert.equal(getWarRoomWeaponIconDataUrl(WAR_ROOM_WEAPONS[0].id), urls[0]);
  assert.notEqual(
    getWarRoomWeaponIconDataUrl("melee_shovel"),
    getWarRoomWeaponIconDataUrl("melee_pickaxe"),
  );
  assert.notEqual(
    getWarRoomWeaponIconDataUrl("melee_cudgel"),
    getWarRoomWeaponIconDataUrl("melee_spear"),
  );
});
