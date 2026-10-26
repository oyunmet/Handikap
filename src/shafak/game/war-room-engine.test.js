import assert from "node:assert/strict";
import test from "node:test";
import { WAR_ROOM_WEAPONS } from "./war-room-data.ts";
import { STORE_CATALOG } from "./store-catalog.ts";
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

test("five melee weapons have no ammunition state and have per-weapon attack values", () => {
  const meleeIds = ["melee_knife", "melee_axe", "melee_cudgel", "melee_spear", "melee_shovel"];
  const runtime = createWarRoomRuntime(["melee_knife", "melee_spear"]);
  assert.equal(meleeIds.length, 5);
  assert.equal(runtime.player.ammo.melee_knife, undefined);
  assert.equal(runtime.player.ammo.melee_spear, undefined);
  for (const id of meleeIds) {
    const weapon = WAR_ROOM_WEAPONS.find((candidate) => candidate.id === id);
    assert.equal(weapon?.weaponClass, "melee");
    assert.ok((weapon?.damage ?? 0) > 0);
    assert.ok((weapon?.fireInterval ?? 0) > 0);
    assert.ok((weapon?.range ?? 0) > 0);
    assert.ok((weapon?.meleeDuration ?? Infinity) <= (weapon?.fireInterval ?? 0));
    assert.ok(weapon?.mount, `${id} needs its own hand mount settings`);
  }
  assert.equal(WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "melee_knife")?.normalizeLength, 0.3);
  assert.equal(WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "melee_axe")?.normalizeLength, 0.6);
  assert.equal(WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "melee_spear")?.normalizeLength, 1.8);
});

test("all War Room weapons expose complete, valid shooter settings", () => {
  assert.equal(WAR_ROOM_WEAPONS.length, 28);
  for (const weapon of WAR_ROOM_WEAPONS) {
    for (const key of ["damage", "fireInterval", "magazine", "reserve", "reloadSeconds", "recoil", "spread", "headshotMultiplier", "range"]) {
      if (weapon.weaponClass === "melee" && ["magazine", "reserve", "reloadSeconds"].includes(key)) {
        assert.equal(weapon[key], 0, `${weapon.id} must not have ammunition or reloading`);
      } else if (weapon.weaponClass === "melee" && ["recoil", "spread"].includes(key)) {
        assert.equal(weapon[key], 0, `${weapon.id} does not use firearm recoil or spread`);
      } else {
        assert.ok(weapon[key] > 0, `${weapon.id} must define a positive ${key}`);
      }
    }
  }
  assert.equal(WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "powder_rifle")?.magazine, 30);
  assert.equal(WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "sidearm")?.magazine, 12);
  assert.ok((WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "scattergun")?.pellets ?? 0) > 1);
  assert.equal(WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "longbow")?.charge, true);
  const blasters = WAR_ROOM_WEAPONS.filter((weapon) => weapon.id.startsWith("blaster_"));
  assert.equal(blasters.length, 18);
  assert.equal(new Set(blasters.map((weapon) => weapon.modelFile)).size, 18);
  assert.equal(new Set(blasters.map((weapon) => weapon.name)).size, 18);
  assert.ok(blasters.every((weapon) => !/\d/.test(weapon.name)));
  assert.ok(blasters.every((weapon) =>
    weapon.sourceBounds?.every((dimension) => dimension > 0)
    && weapon.normalizeLength
    && weapon.storeItemId
    && weapon.rarity
    && weapon.weaponClass
    && weapon.mount?.muzzleEnd === -1
    && STORE_CATALOG.some((item) => item.id === weapon.storeItemId && item.warRoomWeaponId === weapon.id),
  ));
});

test("missing legacy weapon GLBs keep procedural fallbacks", () => {
  const rifle = WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "powder_rifle");
  const pistol = WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "sidearm");
  assert.deepEqual(
    WAR_ROOM_WEAPONS.slice(0, 5).map((weapon) => weapon.modelFile),
    [null, null, null, null, null],
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

test("owned Blaster Kit items are selectable in the War Room loadout", () => {
  const profile = structuredClone(defaultProfile);
  profile.inventory.ownedItemIds.push("war_room_blaster_a", "war_room_blaster_b");
  assert.deepEqual(getWarRoomLoadoutFromProfile(profile), ["blaster_a", "blaster_b"]);
});
