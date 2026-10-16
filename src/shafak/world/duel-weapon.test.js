import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createDuelWeapon, disposeDuelWeapon } from "./duel-weapon.ts";

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
