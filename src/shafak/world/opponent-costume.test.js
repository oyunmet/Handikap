import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { attachOpponentCostume } from "./opponent-costume.ts";
import { getAnimatedRivalModelConfig } from "./opponent-model-config.ts";
import { getWorldBotProfileByArchetype } from "./world-bot-profiles.ts";

test("the chapter boss costume adds a readable iron crown, crimson armor marks, and a cape to the player rig", () => {
  const profile = getWorldBotProfileByArchetype("chapter-boss");
  const config = getAnimatedRivalModelConfig("Demir Taç", profile);
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

  assert.ok(names.includes("demir-tac-helmet"));
  assert.ok(names.includes("demir-tac-crown-band"));
  assert.ok(names.includes("demir-tac-crown-spike-2"));
  assert.ok(names.includes("demir-tac-crown-gem"));
  assert.ok(names.includes("demir-tac-breastplate"));
  assert.ok(names.includes("demir-tac-chest-sigil"));
  assert.ok(names.includes("demir-tac-angular-pauldron-left"));
  assert.ok(names.includes("demir-tac-angular-pauldron-right"));
  assert.ok(names.includes("demir-tac-crimson-cape"));

  costume.update(1.2);
  costume.dispose();
  assert.equal(head.children.length, 0);
});
