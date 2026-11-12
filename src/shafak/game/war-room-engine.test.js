import assert from "node:assert/strict";
import test from "node:test";
import { WAR_ROOM_WEAPONS } from "./war-room-data.ts";
import { STORE_CATALOG } from "./store-catalog.ts";
import {
  applyWarRoomDamage,
  createWarRoomRuntime,
  getWarRoomFallDamage,
  moveWarRoomEntity,
  segmentBlockFraction,
  shortestAngleDelta,
  WAR_ROOM_PLAYER_COLLISION_RADIUS,
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

test("melee weapons have no ammunition state and have per-weapon attack values", () => {
  const meleeIds = [
    "melee_knife", "melee_axe", "melee_cudgel", "melee_spear", "melee_shovel",
    "melee_staff", "melee_war_spear", "melee_pickaxe",
  ];
  const runtime = createWarRoomRuntime(["melee_knife", "melee_spear"]);
  assert.equal(meleeIds.length, 8);
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
  assert.equal(WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "melee_axe")?.normalizeLength, 0.75);
  assert.equal(WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "melee_spear")?.normalizeLength, 1.9);
});

test("all War Room weapons expose complete, valid shooter settings", () => {
  assert.equal(WAR_ROOM_WEAPONS.length, 31);
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

test("the three new War Room melee models are optimized, purchasable and mapped to hand-fit profiles", () => {
  const expected = [
    ["melee_staff", "war_room_melee_staff", "war-room-staff.glb", "Nadir", 620],
    ["melee_war_spear", "war_room_melee_spear", "war-room-spear.glb", "Epik", 780],
    ["melee_pickaxe", "war_room_melee_pickaxe", "war-room-pickaxe.glb", "Epik", 820],
  ];
  for (const [id, storeId, modelFile, rarity, price] of expected) {
    const weapon = WAR_ROOM_WEAPONS.find((candidate) => candidate.id === id);
    assert.ok(weapon, `${id} exists`);
    assert.equal(weapon.modelFile, modelFile);
    assert.ok(weapon.normalizeLength > 0);
    assert.ok(weapon.mount);
    assert.equal(weapon.rarity, rarity);
    assert.equal(weapon.priceGold, price);
    assert.ok(STORE_CATALOG.some((item) => item.id === storeId && item.warRoomWeaponId === id));
  }
  assert.equal(WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "melee_war_spear")?.meleeStyle, "thrust");
  assert.equal(WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "melee_staff")?.meleeStyle, "slash");
  assert.ok((WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "melee_pickaxe")?.damage ?? 0) >
    (WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "melee_staff")?.damage ?? Infinity));
});

test("starter weapons use dedicated GLBs while retaining their tuned model dimensions", () => {
  const rifle = WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "powder_rifle");
  const pistol = WAR_ROOM_WEAPONS.find((weapon) => weapon.id === "sidearm");
  assert.deepEqual(
    WAR_ROOM_WEAPONS.slice(0, 5).map((weapon) => weapon.modelFile),
    [
      "kara-barut-rifle.glb",
      "spark-pistol.glb",
      "brokenstone-shotgun.glb",
      "ash-crossbow.glb",
      "dusk-longbow.glb",
    ],
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

test("entity movement can reuse a caller-owned result object", () => {
  const result = { x: -1, z: -1 };
  const moved = moveWarRoomEntity(0, 0, 1, 0, 0.4, [], 0, 0, result);

  assert.equal(moved, result);
  assert.ok(Math.abs(moved.x - 1) < 1e-8);
  assert.equal(moved.z, 0);
});

test("small movement steps slide along walls instead of sticking on diagonal contact", () => {
  const wall = {
    id: "slide-wall",
    kind: "wall",
    x: 0,
    z: 0,
    width: 0.5,
    depth: 12,
    height: 3,
    color: "#000",
  };
  const result = moveWarRoomEntity(
    -0.66,
    -2,
    0.45,
    4,
    WAR_ROOM_PLAYER_COLLISION_RADIUS,
    [wall],
  );

  assert.ok(
    result.x <= -(wall.width / 2 + WAR_ROOM_PLAYER_COLLISION_RADIUS) + 0.01,
    "the player can approach the wall but the capsule stays outside its collision boundary",
  );
  assert.ok(result.z > 1.8, "the player keeps moving along the wall");
});

test("jumping above an upper balcony rail clears its movement blocker", () => {
  const rail = {
    id: "upper-balcony-front-rail",
    kind: "wall",
    x: 0,
    z: 0,
    width: 8,
    depth: 0.12,
    height: 0.95,
    baseY: 3.05,
    color: "#000",
  };
  const blocked = moveWarRoomEntity(0, -3, 0, 5, 0.4, [rail], 3.05);
  const jumping = moveWarRoomEntity(0, -3, 0, 5, 0.4, [rail], 3.05, 1.05);

  assert.ok(blocked.z < -0.45, "the railing still blocks movement when grounded");
  assert.ok(jumping.z > 1.8, "the player can hop over the railing");
});

test("balcony falls apply mild damage only beyond a safe distance", () => {
  assert.equal(getWarRoomFallDamage(0), 0);
  assert.equal(getWarRoomFallDamage(2.1), 0);
  assert.equal(getWarRoomFallDamage(3.05), 9);
  assert.equal(getWarRoomFallDamage(-3), 0);
  assert.equal(getWarRoomFallDamage(Number.POSITIVE_INFINITY), 0);
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
