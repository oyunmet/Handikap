import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createFantasyKnightModel,
  disposeFantasyKnightModel,
  FANTASY_KNIGHT_AXIS_CORRECTION,
  getFantasyKnightHeadAccessory,
} from "./fantasy-knight-model.ts";

function makeZUpSource() {
  const source = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.3, 2.335),
    new THREE.MeshStandardMaterial({ color: "#84909a" }),
  );
  body.name = "torso";
  body.position.z = 1.1675;
  source.add(body);
  const tabard = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.04, 0.55),
    new THREE.MeshStandardMaterial({ color: "#ac4b5c" }),
  );
  tabard.name = "tabard";
  tabard.position.set(0, -0.19, 0.72);
  source.add(tabard);
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.02, 0.8),
    new THREE.MeshStandardMaterial({ color: "#949a9f" }),
  );
  blade.name = "sword_blade";
  blade.position.set(-0.4, 0, 0.6);
  source.add(blade);
  return { source, body, tabard, blade };
}

test("the static knight is converted from Z-up and grounded at the requested height", () => {
  const { source } = makeZUpSource();
  const model = createFantasyKnightModel(source, { targetHeight: 1.7 });
  const bounds = new THREE.Box3().setFromObject(model.root, true);
  const size = bounds.getSize(new THREE.Vector3());

  assert.equal(model.root.children[0].rotation.x, FANTASY_KNIGHT_AXIS_CORRECTION);
  assert.ok(Math.abs(size.y - 1.7) < 0.002);
  assert.ok(bounds.min.y > -0.001 && bounds.min.y < 0.001);
  assert.equal(model.root.position.x, 0, "cape and sword extents must not shift the body off center");
  disposeFantasyKnightModel(model);
});

test("outfit colors are instance-owned and sword visibility follows the loadout", () => {
  const { source, tabard, blade } = makeZUpSource();
  const model = createFantasyKnightModel(source, {
    appearance: { armor: "#28765d", weaponColor: "#d94737" },
    showWeapon: false,
  });
  const styledTabard = model.root.getObjectByName("tabard");
  const styledBlade = model.root.getObjectByName("sword_blade");

  assert.notEqual(styledTabard.material, tabard.material);
  assert.equal(styledTabard.material.color.getHexString(), "28765d");
  assert.equal(tabard.material.color.getHexString(), "ac4b5c");
  assert.equal(styledBlade.visible, false);
  assert.equal(blade.visible, true);
  disposeFantasyKnightModel(model);
});

test("hats and glasses are static add-ons on the same knight body", () => {
  const { source } = makeZUpSource();
  const hat = createFantasyKnightModel(source, { headAccessory: "hat" });
  const glasses = createFantasyKnightModel(source, { headAccessory: "glasses" });

  assert.ok(hat.root.children.some((child) => child instanceof THREE.Mesh));
  assert.equal(glasses.root.children.filter((child) => child instanceof THREE.Mesh).length, 3);
  assert.equal(hat.root.userData.animations, undefined);
  disposeFantasyKnightModel(hat);
  disposeFantasyKnightModel(glasses);
});

test("head accessories stay deterministic for each character identity", () => {
  const choices = new Set(
    Array.from({ length: 30 }, (_, index) => getFantasyKnightHeadAccessory(`opponent-${index}`)),
  );
  assert.ok(choices.has(null));
  assert.ok(choices.has("hat"));
  assert.ok(choices.has("glasses"));
  assert.equal(getFantasyKnightHeadAccessory("rival-42"), getFantasyKnightHeadAccessory("rival-42"));
});

test("the same source can be reused for static arm and leg viewmodels", () => {
  const { source } = makeZUpSource();
  const armModel = createFantasyKnightModel(source, { parts: "arms" });
  const legModel = createFantasyKnightModel(source, { parts: "legs" });

  assert.equal(armModel.root.getObjectByName("torso").visible, false);
  assert.equal(legModel.root.getObjectByName("torso").visible, false);
  disposeFantasyKnightModel(armModel);
  disposeFantasyKnightModel(legModel);
});
