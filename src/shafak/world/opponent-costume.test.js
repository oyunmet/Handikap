import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  applyOpponentBasePalette,
  attachOpponentCostume,
  shouldAttachOpponentCostume,
} from "./opponent-costume.ts";
import { getAnimatedRivalModelConfig } from "./opponent-model-config.ts";
import { getWorldBotProfileByArchetype } from "./world-bot-profiles.ts";

test("other chapter bosses keep their existing animated costume unchanged", () => {
  const profile = getWorldBotProfileByArchetype("chapter-boss");
  const config = getAnimatedRivalModelConfig("Kül Tahtı", profile);
  assert.equal(shouldAttachOpponentCostume(config), true);
  const model = new THREE.Group();
  model.scale.setScalar(3.35 / 1.8);

  const head = new THREE.Bone();
  head.name = "Head";
  for (const name of ["Head", "Torso", "Shoulder.L", "Shoulder.R"]) {
    if (name === "Head") {
      model.add(head);
      continue;
    }
    const bone = new THREE.Bone();
    bone.name = name;
    model.add(bone);
  }

  const costume = attachOpponentCostume(model, config, config.appearance);
  const names = [];
  model.traverse((object) => names.push(object.name));
  const headGear = head.getObjectByName("demir-tac-head-gear");

  assert.ok(names.includes("demir-tac-head-gear"));
  assert.ok(names.includes("demir-tac-crown-band"));
  assert.ok(names.includes("demir-tac-chest-armor"));
  assert.ok(names.includes("demir-tac-chest-sigil"));
  assert.ok(names.includes("opponent-angular-pauldron-left"));
  assert.ok(names.includes("opponent-angular-pauldron-right"));
  assert.ok(names.includes("opponent-boss-cape"));
  assert.equal(headGear?.parent, head);
  assert.ok(!names.includes("demir-tac-vambrace-left"));

  costume.update(1.2);
  costume.dispose();
  assert.equal(head.children.length, 0);
});

test("other chapter bosses still receive the shared animated-rig costume", () => {
  const profile = getWorldBotProfileByArchetype("chapter-boss");
  const config = getAnimatedRivalModelConfig("Kül Tahtı", profile);
  assert.equal(shouldAttachOpponentCostume(config), true);
});

test("Demir Taç uses the animated player rig with its own mounted armor and crown", () => {
  const config = getAnimatedRivalModelConfig(
    "Demir Taç",
    getWorldBotProfileByArchetype("chapter-boss"),
  );
  assert.equal(config.modelPath, "/models/player-hero.glb");
  assert.ok(config.animationClips.run?.includes("CharacterArmature|Run"));
  assert.equal(shouldAttachOpponentCostume(config), true);

  const model = new THREE.Group();
  const bones = new Map();
  for (const name of [
    "Head",
    "Torso",
    "ShoulderL",
    "ShoulderR",
    "LowerArmL",
    "LowerArmR",
    "LowerLegL",
    "LowerLegR",
  ]) {
    const bone = new THREE.Bone();
    bone.name = name;
    model.add(bone);
    bones.set(name, bone);
  }
  const costume = attachOpponentCostume(model, config, config.appearance);
  const names = [];
  model.traverse((object) => names.push(object.name));

  assert.ok(names.includes("demir-tac-head-gear"));
  assert.ok(names.includes("demir-tac-crown-band"));
  assert.ok(names.includes("demir-tac-chest-armor"));
  assert.ok(names.includes("demir-tac-crimson-cape"));
  assert.ok(names.includes("demir-tac-vambrace-right"));
  assert.ok(names.includes("demir-tac-greave-left"));
  assert.equal(model.getObjectByName("demir-tac-head-gear").parent, bones.get("Head"));
  const chestArmor = model.getObjectByName("demir-tac-chest-armor");
  assert.ok(chestArmor.geometry instanceof THREE.ExtrudeGeometry);
  chestArmor.geometry.computeBoundingBox();
  assert.ok(chestArmor.geometry.boundingBox.min.z >= 0);

  costume.dispose();
});

test("Demir Taç's shared player model uses a dark boss palette instead of the green player clothes", () => {
  const config = getAnimatedRivalModelConfig(
    "Demir Taç",
    getWorldBotProfileByArchetype("chapter-boss"),
  );
  const model = new THREE.Group();
  const materialByName = new Map();

  for (const name of ["Hair", "Skin", "UnderShirt", "Shirt", "Pants", "Boots", "Detail", "Material.006", "Eye"]) {
    const material = new THREE.MeshStandardMaterial({ color: "#22aa66" });
    material.name = name;
    materialByName.set(name, material);
    model.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), material));
  }

  applyOpponentBasePalette(model, config);

  assert.equal(materialByName.get("Hair").color.getHexString(), config.materialPalette.hair.slice(1));
  assert.equal(materialByName.get("Skin").color.getHexString(), config.materialPalette.skin.slice(1));
  assert.equal(materialByName.get("UnderShirt").color.getHexString(), config.appearance.armorDark.slice(1));
  assert.equal(materialByName.get("Shirt").color.getHexString(), config.appearance.armor.slice(1));
  assert.equal(materialByName.get("Detail").color.getHexString(), config.appearance.trim.slice(1));
  assert.equal(materialByName.get("Material.006").color.getHexString(), config.appearance.cape.slice(1));
  assert.equal(materialByName.get("Eye").color.getHexString(), "22aa66");
});
