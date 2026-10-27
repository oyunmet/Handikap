import assert from "node:assert/strict";
import test from "node:test";
import { WAR_ROOM_WEAPONS } from "./war-room-data.ts";
import {
  getWarRoomCommanderTelegraphProgress,
  getWarRoomDeathFadeProgress,
  getWarRoomHitRimIntensity,
  getWarRoomVisualKnockbackDistance,
  WAR_ROOM_COMMANDER_TELEGRAPH_SECONDS,
  WAR_ROOM_ENEMY_DEATH_FADE_SECONDS,
  WAR_ROOM_ENEMY_HIT_FLASH_SECONDS,
} from "./war-room-reactions.ts";

test("visual melee knockback stays in the requested range and scales by weapon", () => {
  const melee = WAR_ROOM_WEAPONS.filter((weapon) => weapon.weaponClass === "melee");
  const distances = melee.map((weapon) => getWarRoomVisualKnockbackDistance(weapon.id, false));
  assert.ok(distances.every((distance) => distance >= 0.3 && distance <= 1));
  assert.ok(getWarRoomVisualKnockbackDistance("melee_spear", false) > getWarRoomVisualKnockbackDistance("melee_knife", false));
  assert.ok(getWarRoomVisualKnockbackDistance("melee_spear", true) >= getWarRoomVisualKnockbackDistance("melee_spear", false));
  assert.equal(getWarRoomVisualKnockbackDistance("powder_rifle", false), 0.3);
});

test("only an imminent commander shot receives a visual warning", () => {
  assert.equal(getWarRoomCommanderTelegraphProgress(false, 2, 2.2, 0.5), null);
  assert.equal(getWarRoomCommanderTelegraphProgress(true, 1, 2, 0.5), null);
  assert.equal(getWarRoomCommanderTelegraphProgress(true, 2, 2.5, 0.5), 0);
  assert.equal(getWarRoomCommanderTelegraphProgress(true, 2, 2, 0.5), 1);
});

test("hit rim and death fade use the requested short visual windows", () => {
  assert.equal(WAR_ROOM_ENEMY_HIT_FLASH_SECONDS, 0.09);
  assert.equal(getWarRoomHitRimIntensity(1, 1.09), 1);
  assert.equal(getWarRoomHitRimIntensity(1.09, 1.09), 0);
  assert.equal(WAR_ROOM_ENEMY_DEATH_FADE_SECONDS, 1.5);
  assert.equal(getWarRoomDeathFadeProgress(8.5, 7), 1);
});
