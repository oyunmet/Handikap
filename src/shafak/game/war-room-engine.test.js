import assert from "node:assert/strict";
import test from "node:test";
import { WAR_ROOM_WEAPONS } from "./war-room-data.ts";
import {
  applyWarRoomDamage,
  createWarRoomRuntime,
  moveWarRoomEntity,
  segmentBlockFraction,
  shortestAngleDelta,
} from "./war-room-engine.ts";
import { getWarRoomLoadoutFromProfile } from "./war-room-loadout.ts";
import { defaultProfile } from "./profile.ts";

test("the room starts with eight guards and a durable commander", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  assert.equal(runtime.enemies.length, 9);
  assert.equal(runtime.enemies.filter((enemy) => enemy.commander).length, 1);
  assert.equal(runtime.enemies.find((enemy) => enemy.commander)?.maxHp, 360);
  assert.equal(runtime.player.ammo.powder_rifle?.magazine, 30);
  assert.equal(runtime.player.ammo.crossbow?.magazine, 1);
});

test("all five weapons expose complete, valid shooter settings", () => {
  assert.equal(WAR_ROOM_WEAPONS.length, 5);
  for (const weapon of WAR_ROOM_WEAPONS) {
    for (const key of ["damage", "fireInterval", "magazine", "reserve", "reloadSeconds", "recoil", "spread", "headshotMultiplier", "range"]) {
      assert.ok(weapon[key] > 0, `${weapon.id} must define a positive ${key}`);
    }
  }
  assert.equal(WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "powder_rifle")?.magazine, 30);
  assert.equal(WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "sidearm")?.magazine, 12);
  assert.ok((WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "scattergun")?.pellets ?? 0) > 1);
  assert.equal(WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "longbow")?.charge, true);
});

test("weapon GLB fallbacks are mapped and normalize rifle and pistol to their target lengths", () => {
  const rifle = WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "powder_rifle");
  const pistol = WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "sidearm");
  assert.deepEqual(
    WAR_ROOM_WEAPONS.map((weapon) => weapon.modelFile),
    ["rifle.glb", "pistol.glb", "shotgun.glb", "crossbow.glb", "bow.glb"],
  );
  assert.ok(Math.abs(rifle.modelSize[2] * 0.58 - 1) < 0.02);
  assert.ok(Math.abs(pistol.modelSize[2] * 0.58 - 0.25) < 0.02);
});

test("the same damage helper clamps health and applies headshot multipliers", () => {
  const target = { hp: 50, maxHp: 50 };
  assert.deepEqual(applyWarRoomDamage(target, 20, 2), { damage: 40, killed: false });
  assert.deepEqual(applyWarRoomDamage(target, 20, 2), { damage: 10, killed: true });
  assert.equal(target.hp, 0);
});

test("movement stops at solid blockers and ray tests report cover", () => {
  const wall = moveWarRoomEntity(34, 0, 4, 0);
  assert.ok(wall.x < 35);
  assert.equal(segmentBlockFraction({ x: -5, y: 0.8, z: -1 }, { x: 10, y: 0.8, z: -1 }) !== null, true);
  assert.equal(segmentBlockFraction({ x: 0, y: 1, z: 24 }, { x: 0, y: 1, z: 10 }), null);
});

test("angle interpolation chooses the short path across the wrap boundary", () => {
  const delta = shortestAngleDelta(Math.PI - 0.05, -Math.PI + 0.05);
  assert.ok(Math.abs(delta - 0.1) < 1e-6);
});

test("owned bows and crossbows are mapped into the room loadout", () => {
  const profile = structuredClone(defaultProfile);
  profile.inventory.ownedItemIds.push("weapon_short_bow", "weapon_crossbow");
  profile.equipment.weaponId = "weapon_crossbow";
  assert.deepEqual(getWarRoomLoadoutFromProfile(profile), ["crossbow", "longbow"]);
});

test("profiles without a ranged inventory item receive the default loadout", () => {
  assert.deepEqual(getWarRoomLoadoutFromProfile(defaultProfile), ["powder_rifle", "crossbow"]);
});
