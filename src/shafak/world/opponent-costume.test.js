import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { attachOpponentCostume, shouldAttachOpponentCostume } from "./opponent-costume.ts";
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

test("Demir Taç receives an animated crown, layered iron armor, and limb guards", () => {
  const config = getAnimatedRivalModelConfig(
    "Demir Taç",
    getWorldBotProfileByArchetype("chapter-boss"),
  );
  assert.equal(shouldAttachOpponentCostume(config), true);
  const model = new THREE.Group();
  for (const name of [
    "Head",
    "Torso",
    "Shoulder.L",
    "Shoulder.R",
    "LowerArm.L",
    "LowerArm.R",
    "LowerLeg.L",
    "LowerLeg.R",
  ]) {
    const bone = new THREE.Bone();
    bone.name = name;
    model.add(bone);
  }
  const costume = attachOpponentCostume(model, config, config.appearance);
  const names = [];
  model.traverse((object) => names.push(object.name));

  for (const name of [
    "demir-tac-helmet",
    "demir-tac-crown-band",
    "demir-tac-crown-spike-2",
    "demir-tac-crown-gem",
    "demir-tac-chest-armor",
    "demir-tac-chest-sigil",
    "demir-tac-vambrace-left",
    "demir-tac-greave-right",
  ]) assert.ok(names.includes(name), `missing animated detail ${name}`);
  assert.ok(!names.includes("opponent-breastplate"));

  costume.dispose();
});
