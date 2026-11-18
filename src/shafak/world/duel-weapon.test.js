import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  createDuelShield,
  createDuelWeapon,
  disposeDuelWeapon,
  normalizeDuelWeaponWorldSize,
} from "./duel-weapon.ts";

const weaponStyles = [
  "sword", "daggers", "axe", "greatsword", "spear", "bow",
  "mace", "staff", "crossbow", "throwingKnife",
];

test("every equipped weapon style creates a visible, finite 3D weapon", () => {
  for (const weaponStyle of weaponStyles) {
    const weapon = createDuelWeapon({
      weaponStyle,
      weaponColor: "#b8d4e0",
      trim: "#e3ba69",
      auraColor: "#9deaff",
    });
    const meshes = [];
    weapon.traverse((object) => {
      if (object instanceof THREE.Mesh) meshes.push(object);
    });
    const bounds = new THREE.Box3().setFromObject(weapon);
    const size = bounds.getSize(new THREE.Vector3());

    assert.ok(meshes.length >= 2, `${weaponStyle} should have visible geometry`);
    assert.ok([size.x, size.y, size.z].every(Number.isFinite), `${weaponStyle} bounds should be finite`);
    assert.ok(size.y > 0.15, `${weaponStyle} should be large enough to see in hand`);
    disposeDuelWeapon(weapon);
  }
});

test("an equipped sword is measured and normalized after inheriting the character scale", () => {
  const normalizedCharacter = new THREE.Group();
  normalizedCharacter.scale.setScalar(0.63);
  const hand = new THREE.Bone();
  normalizedCharacter.add(hand);
  const sword = createDuelWeapon({ weaponStyle: "sword" });
  hand.add(sword);

  normalizeDuelWeaponWorldSize(sword, 1);
  const bounds = new THREE.Box3().setFromObject(sword, true);
  const size = bounds.getSize(new THREE.Vector3());
  const worldDimension = Math.max(size.x, size.y, size.z);

  assert.ok(Math.abs(worldDimension - 1) < 1e-5, `expected a 1 m sword, got ${worldDimension} m`);
  disposeDuelWeapon(sword);
});

test("both shield silhouettes create detailed, measurable rig-ready equipment", () => {
  for (const shieldStyle of ["round", "tower"]) {
    const character = new THREE.Group();
    character.scale.setScalar(0.63);
    const forearm = new THREE.Bone();
    character.add(forearm);
    const shield = createDuelShield({
      shieldStyle,
      shieldColor: "#6685a4",
      armor: "#334e68",
      trim: "#e5c47c",
      auraColor: "#d4f1ff",
    });
    forearm.add(shield);
    normalizeDuelWeaponWorldSize(shield, 0.82);
    const meshes = [];
    shield.traverse((object) => {
      if (object instanceof THREE.Mesh) meshes.push(object);
    });
    const bounds = new THREE.Box3().setFromObject(shield, true);
    const size = bounds.getSize(new THREE.Vector3());

    assert.ok(meshes.length >= 12, `${shieldStyle} shield should have engraved detail`);
    assert.ok([size.x, size.y, size.z].every(Number.isFinite), `${shieldStyle} shield bounds should be finite`);
    assert.ok(Math.abs(Math.max(size.x, size.y, size.z) - 0.82) < 1e-5);
    disposeDuelWeapon(shield);
  }
});
