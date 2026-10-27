import assert from "node:assert/strict";
import test from "node:test";
import { WAR_ROOM_WEAPONS } from "./war-room-data.ts";
import {
  getNextWarRoomLabWeaponIndex,
  getWarRoomLabWeaponLength,
} from "./war-room-lab.ts";

test("weapon lab cycles every weapon once in catalog order", () => {
  let index = 0;
  const visited = [WAR_ROOM_WEAPONS[index].id];
  for (let count = 1; count < WAR_ROOM_WEAPONS.length; count += 1) {
    index = getNextWarRoomLabWeaponIndex(index);
    visited.push(WAR_ROOM_WEAPONS[index].id);
  }
  assert.deepEqual(visited, WAR_ROOM_WEAPONS.map((weapon) => weapon.id));
  assert.equal(getNextWarRoomLabWeaponIndex(index), 0);
});

test("weapon lab reports configured fit length rather than weapon combat range", () => {
  const shovel = WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "melee_shovel");
  const pistol = WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "blaster_b");
  assert.equal(getWarRoomLabWeaponLength(shovel), 1.2);
  assert.equal(getWarRoomLabWeaponLength(pistol), 0.25);
});
