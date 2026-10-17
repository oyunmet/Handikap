import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  createDuelWeapon,
  disposeDuelWeapon,
  normalizeDuelWeaponWorldSize,
} from "./duel-weapon.ts";

const weaponStyles = ["sword", "daggers", "axe", "greatsword", "spear", "bow", "mace", "staff"];

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
