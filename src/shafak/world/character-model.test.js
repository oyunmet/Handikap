import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { fitCharacterModel } from "./character-model.ts";
import { findCharacterPoseBones, poseCharacterWithoutClip } from "./character-pose.ts";

test("character models fit the requested height with their lowest point on the floor", () => {
  const model = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 0.5), new THREE.MeshStandardMaterial());
  body.position.y = 0.25;
  model.add(body);
  const scale = fitCharacterModel(model, 1.8);
  const bounds = new THREE.Box3().setFromObject(model, true);

  assert.ok(Math.abs(scale - 0.75) < 1e-6);
  assert.ok(Math.abs(bounds.min.y) < 1e-6);
  assert.ok(Math.abs(bounds.max.y - 1.8) < 1e-6);
});

test("character models with a Z-up source can be upright before fitting", () => {
  const model = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 2.3), new THREE.MeshStandardMaterial());
  body.position.z = 1.15;
  model.add(body);
  model.rotation.x = -Math.PI / 2;
  fitCharacterModel(model, 2.6);
  const bounds = new THREE.Box3().setFromObject(model, true);

  assert.ok(Math.abs(bounds.min.y) < 1e-6);
  assert.ok(Math.abs(bounds.max.y - 2.6) < 1e-6);
  assert.ok(bounds.max.y - bounds.min.y > bounds.max.z - bounds.min.z);
});

test("rigged Quaternius bone names support procedural jump, block, and crouch poses", () => {
  const model = new THREE.Group();
  const names = ["Hips", "Torso", "UpperArmL", "LowerArmL", "UpperArmR", "LowerArmR", "UpperLegL", "LowerLegL"];
  for (const name of names) {
    const bone = new THREE.Bone();
    bone.name = name;
    model.add(bone);
  }
  const bones = findCharacterPoseBones(model);
  poseCharacterWithoutClip(bones, "jump", 0, 0, 0.5, false, false, 1, false);
  assert.notEqual(bones.leftUpperArm.rotation.x, 0);
  assert.notEqual(bones.leftThigh.rotation.x, 0);

  poseCharacterWithoutClip(bones, "block", 0, 0, 0.5, false, false, 1, true);
  assert.ok(bones.leftForearm.rotation.x < 0);
  poseCharacterWithoutClip(bones, "walk", 2, 1, 0, true, false, 1, true);
  assert.ok(bones.leftThigh.rotation.x > 0);
  assert.ok(bones.leftShin.rotation.x < 0);
});
