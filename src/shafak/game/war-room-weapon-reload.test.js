import assert from "node:assert/strict";
import test from "node:test";
import { getWarRoomWeaponReloadOffsets } from "./war-room-weapon-reload.ts";

test("reload offsets are zero when a weapon is at rest", () => {
  assert.deepEqual(
    getWarRoomWeaponReloadOffsets("powder_rifle", 0),
    { magazineY: 0, boltZ: 0, arrowX: 0, arrowY: 0, arrowZ: 0 },
  );
  assert.deepEqual(
    getWarRoomWeaponReloadOffsets("crossbow", 1),
    { magazineY: 0, boltZ: 0, arrowX: 0, arrowY: 0, arrowZ: 0 },
  );
});

test("reload offsets move from each model part's original local position", () => {
  const magazine = getWarRoomWeaponReloadOffsets("powder_rifle", 0.45);
  const boltAtPeak = getWarRoomWeaponReloadOffsets("powder_rifle", 0.88);
  const crossbowArrow = getWarRoomWeaponReloadOffsets("crossbow", 0.25);
  const bowArrow = getWarRoomWeaponReloadOffsets("longbow", 0, 0.5);

  assert.equal(magazine.magazineY, -0.24);
  assert.equal(boltAtPeak.boltZ, 0.14);
  assert.deepEqual(
    [crossbowArrow.arrowX, crossbowArrow.arrowY, crossbowArrow.arrowZ],
    [0.32, -0.3, 0.22],
  );
  assert.equal(bowArrow.arrowZ, 0.09);
});
