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
  assert.equal(getNextWarRoomLabWeaponIndex(-1), 0);
});

test("weapon lab reports a positive fitted length for every weapon", () => {
  for (const weapon of WAR_ROOM_WEAPONS) {
    assert.ok(getWarRoomLabWeaponLength(weapon) > 0, `${weapon.id} should have a measurable length`);
  }
  assert.equal(getWarRoomLabWeaponLength(WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "melee_shovel")), 1.2);
  assert.equal(getWarRoomLabWeaponLength(WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "blaster_b")), 0.25);
});
