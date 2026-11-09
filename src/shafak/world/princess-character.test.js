import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  createPrincessCharacter,
  disposePrincessCharacter,
  getPrincessCharacterHeight,
} from "./princess-character.ts";
import { PLAYER_CHARACTER_MODEL_PATH } from "./player-model.ts";

const playerModelUrl = new URL("../../../public/models/player-hero.glb", import.meta.url);

async function loadPlayerGlb() {
  const binary = fs.readFileSync(playerModelUrl);
  const arrayBuffer = binary.buffer.slice(
    binary.byteOffset,
    binary.byteOffset + binary.byteLength,
  );
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer, "/", resolve, reject);
  });
}

test("princess is generated from the player's sub-3 MiB skinned rig", async () => {
  const gltf = await loadPlayerGlb();
  const sourceShirt = gltf.scene.getObjectByName("Rogue_4");
  assert.ok(sourceShirt instanceof THREE.Mesh);
  const originalColor = sourceShirt.material.color.getHexString();
  const heroBoneNames = [];
  gltf.scene.traverse((object) => {
    if (object instanceof THREE.Bone) heroBoneNames.push(object.name);
  });

  const princess = createPrincessCharacter(gltf.scene, gltf.animations);
  try {
    assert.equal(PLAYER_CHARACTER_MODEL_PATH, "/models/player-hero.glb");
    assert.ok(fs.statSync(playerModelUrl).size < 3 * 1024 * 1024);
    assert.ok(getPrincessCharacterHeight(princess) >= 1.65);
    assert.ok(getPrincessCharacterHeight(princess) <= 1.9);

    const princessBoneNames = [];
    let skinnedMeshes = 0;
    princess.model.traverse((object) => {
      if (object instanceof THREE.Bone) princessBoneNames.push(object.name);
      if (object instanceof THREE.SkinnedMesh) skinnedMeshes += 1;
    });
    assert.deepEqual(princessBoneNames, heroBoneNames);
    assert.equal(skinnedMeshes, 7);
    assert.equal(sourceShirt.material.color.getHexString(), originalColor);
    assert.equal(
      princess.model.getObjectByName("Rogue_4").material.color.getHexString(),
      "76263a",
    );

    for (const name of [
      "PrincessDressSkirt",
      "PrincessGoldDressTrim",
      "PrincessLongHairBack",
      "PrincessCrownBand",
      "PrincessCrownGarnet",
    ]) {
      assert.ok(princess.model.getObjectByName(name), `missing generated part ${name}`);
    }

    assert.deepEqual(
      princess.animations.map((clip) => clip.name),
      ["PrincessIdle", "PrincessWalk", "PrincessWave", "PrincessTalk"],
    );

    const mixer = new THREE.AnimationMixer(princess.model);
    mixer.clipAction(princess.animations.find((clip) => clip.name === "PrincessWave")).play();
    mixer.setTime(0.5);
    princess.model.updateMatrixWorld(true);
    const shoulder = princess.model.getObjectByName("ShoulderL");
    const hand = princess.model.getObjectByName("FistL");
    assert.ok(shoulder instanceof THREE.Bone);
    assert.ok(hand instanceof THREE.Bone);
    const shoulderY = shoulder.getWorldPosition(new THREE.Vector3()).y;
    const handY = hand.getWorldPosition(new THREE.Vector3()).y;
    assert.ok(handY > shoulderY + 0.12, `wave should lift the hand, shoulder=${shoulderY}, hand=${handY}`);
    mixer.stopAllAction();
    mixer.uncacheRoot(princess.model);

    const skirt = princess.model.getObjectByName("PrincessSkirtPivot");
    assert.ok(skirt instanceof THREE.Group);
    assert.ok(princess.ownedGeometries.length >= 10);
  } finally {
    disposePrincessCharacter(princess);
  }
});
