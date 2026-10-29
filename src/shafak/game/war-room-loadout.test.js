import assert from "node:assert/strict";
import test from "node:test";
import { isWarRoomWeaponOwned } from "./war-room-loadout.ts";

test("starter weapons stay selectable while store weapons need ownership", () => {
  assert.equal(isWarRoomWeaponOwned("powder_rifle", []), true);
  assert.equal(isWarRoomWeaponOwned("blaster_a", []), false);
  assert.equal(isWarRoomWeaponOwned("blaster_a", ["war_room_blaster_a"]), true);
});
