import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { attachOpponentCostume, shouldAttachOpponentCostume } from "./opponent-costume.ts";
import { getAnimatedRivalModelConfig } from "./opponent-model-config.ts";
import { getWorldBotProfileByArchetype } from "./world-bot-profiles.ts";

test("the shared boss costume still attaches correctly to non-Demir animated rivals", () => {
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

  assert.ok(names.includes("demir-tac-helmet"));
  assert.ok(names.includes("demir-tac-crown-band"));
  assert.ok(names.includes("demir-tac-crown-spike-2"));
  assert.ok(names.includes("demir-tac-crown-gem"));
  assert.ok(names.includes("demir-tac-breastplate"));
  assert.ok(names.includes("demir-tac-chest-sigil"));
  assert.ok(names.includes("demir-tac-angular-pauldron-left"));
  assert.ok(names.includes("demir-tac-angular-pauldron-right"));
  assert.ok(names.includes("demir-tac-crimson-cape"));
  assert.equal(headGear?.parent, head, "the helmet and crown stay attached to the animated head bone");
  assert.equal(headGear?.getObjectByName("demir-tac-helmet")?.parent, headGear);
  assert.equal(headGear?.getObjectByName("demir-tac-crown-band")?.parent, headGear);

  costume.update(1.2);
  costume.dispose();
  assert.equal(head.children.length, 0);
});

test("other chapter bosses still receive the shared animated-rig costume", () => {
  const profile = getWorldBotProfileByArchetype("chapter-boss");
  const config = getAnimatedRivalModelConfig("Kül Tahtı", profile);
  assert.equal(shouldAttachOpponentCostume(config), true);
});

test("the dedicated Demir Taç model does not receive duplicate generic armor", () => {
  const config = getAnimatedRivalModelConfig(
    "Demir Taç",
    getWorldBotProfileByArchetype("chapter-boss"),
  );
  assert.equal(shouldAttachOpponentCostume(config), false);
});
