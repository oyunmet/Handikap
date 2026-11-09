import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  getEquipmentPreviewBounds,
  getEquipmentPreviewSubject,
} from "./equipment-preview-camera.ts";

test("War Room weapon preview camera fits the weapon bounds instead of the character", () => {
  const character = new THREE.Group();
  const boots = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.3), new THREE.MeshBasicMaterial());
  boots.position.y = 0.1;
  character.add(boots);

  const hand = new THREE.Group();
  hand.position.set(0.35, 1.42, -0.22);
  character.add(hand);
  const weapon = new THREE.Group();
  hand.add(weapon);
  const weaponBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.16), new THREE.MeshBasicMaterial());
  weapon.add(weaponBody);

  const weaponSubject = getEquipmentPreviewSubject(true, character, weapon);
  assert.equal(weaponSubject, weapon);
  const weaponBounds = getEquipmentPreviewBounds(weaponSubject);
  assert.ok(weaponBounds.min.y > 1, "weapon fit must not include the character's boots");
  assert.ok(weaponBounds.getSize(new THREE.Vector3()).z <= 0.2);
  assert.equal(getEquipmentPreviewSubject(false, character, weapon), character);
});
