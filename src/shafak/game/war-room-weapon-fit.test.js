import assert from "node:assert/strict";
import test from "node:test";
import { fitWarRoomWeapon } from "./war-room-weapon-fit.ts";
import { WAR_ROOM_WEAPONS } from "./war-room-data.ts";

test("normalizes the longest GLB axis and places the configured grip at the hand origin", () => {
  const fit = fitWarRoomWeapon([-0.1, -1, -0.02], [0.1, 1, 0.02], 1.9, 0.25);
  assert.equal(fit.axis, "y");
  assert.equal((2 * fit.scale[1]).toFixed(3), "1.900");
  assert.equal((-0.5 * fit.scale[1] + fit.offset[1]).toFixed(6), "0.000000");
  assert.equal((0 * fit.scale[0] + fit.offset[0]).toFixed(6), "0.000000");
  assert.equal((0 * fit.scale[2] + fit.offset[2]).toFixed(6), "0.000000");
});

test("minimum visual thickness grows only the cross-section, not the normalized weapon axis", () => {
  const fit = fitWarRoomWeapon([-0.01, 0, -0.005], [0.01, 0.5, 0.005], 1, 0.2, 0.04);
  assert.equal(fit.axis, "y");
  assert.equal((0.5 * fit.scale[1]).toFixed(3), "1.000");
  assert.equal((0.02 * fit.scale[0]).toFixed(3), "0.040");
  assert.equal((0.01 * fit.scale[2]).toFixed(3), "0.040");
});

test("grip ratios are clamped and degenerate bounds fail explicitly", () => {
  const fit = fitWarRoomWeapon([0, 0, 0], [0.1, 1, 0.1], 1, 4);
  assert.equal(fit.offset[1], -1);
  assert.throws(() => fitWarRoomWeapon([0, 0, 0], [0, 0, 0], 1), /sınırları/);
});

test("every War Room melee weapon has a normalized length and configured hand grip", () => {
  for (const weapon of WAR_ROOM_WEAPONS.filter((entry) => entry.weaponClass === "melee")) {
    assert.ok((weapon.normalizeLength ?? 0) > 0, `${weapon.id} needs a target length`);
    assert.ok(
      Number.isFinite(weapon.mount?.gripRatio)
        && weapon.mount.gripRatio >= 0
        && weapon.mount.gripRatio <= 1,
      `${weapon.id} needs a grip ratio from 0 to 1`,
    );
  }
});
