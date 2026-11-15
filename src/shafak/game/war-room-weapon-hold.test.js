import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  fitCharacterModel,
} from "../world/character-model.ts";
import {
  applyWarRoomRangedWeaponReadyPose,
  restoreWarRoomRangedWeaponReadyPose,
} from "./war-room-weapon-hold.ts";

const playerModelUrl = new URL("../../../public/models/player-hero.glb", import.meta.url);

test("ranged weapon pose raises the real player hands and stays stable through idle animation", async () => {
  const bytes = fs.readFileSync(playerModelUrl);
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const gltf = await new Promise((resolve, reject) => (
    new GLTFLoader().parse(arrayBuffer, "/", resolve, reject)
  ));
  const model = gltf.scene;
  fitCharacterModel(model, 1.8);
  const actor = new THREE.Group();
  actor.rotation.y = Math.PI;
  actor.add(model);

  const mixer = new THREE.AnimationMixer(model);
  const idle = gltf.animations.find((clip) => clip.name === "Idle");
  assert.ok(idle, "the player GLB should include its idle animation");
  mixer.clipAction(idle).play();
  mixer.update(0.5);
  actor.updateMatrixWorld(true);

  const rightHand = model.getObjectByName("FistR");
  const leftHand = model.getObjectByName("FistL");
  assert.ok(rightHand && leftHand, "the loaded player rig should expose both hand bones");
  const rightBefore = rightHand.getWorldPosition(new THREE.Vector3());
  const leftBefore = leftHand.getWorldPosition(new THREE.Vector3());

  assert.equal(applyWarRoomRangedWeaponReadyPose(model), true);
  actor.updateMatrixWorld(true);
  const rightReady = rightHand.getWorldPosition(new THREE.Vector3());
  const leftReady = leftHand.getWorldPosition(new THREE.Vector3());
  assert.ok(rightReady.y > rightBefore.y + 0.25, "the weapon hand should rise from the hip to chest level");
  assert.ok(rightReady.z < rightBefore.z - 0.08, "the weapon hand should move forward from the body");
  assert.ok(leftReady.y > leftBefore.y + 0.2, "the support hand should rise with the weapon");
  assert.ok(leftReady.z < leftBefore.z - 0.12, "the support hand should reach in front of the torso");

  mixer.setTime(0.8);
  actor.updateMatrixWorld(true);
  assert.equal(applyWarRoomRangedWeaponReadyPose(model), true);
  actor.updateMatrixWorld(true);
  const rightAfterIdleStep = rightHand.getWorldPosition(new THREE.Vector3());
  assert.ok(
    rightAfterIdleStep.distanceTo(rightReady) < 0.03,
    "idle animation should not pull the held weapon back down between frames",
  );

  assert.equal(restoreWarRoomRangedWeaponReadyPose(model), true);
  actor.updateMatrixWorld(true);
  assert.ok(
    rightHand.getWorldPosition(new THREE.Vector3()).distanceTo(rightBefore) < 0.03,
    "restoring the ready pose should return the arm to its animated baseline",
  );
});
