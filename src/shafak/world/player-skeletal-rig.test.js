import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { getPlayerSkinInfluences, posePlayerRig, rigPlayerModel } from "./player-skeletal-rig.ts";

const bounds = {
  min: [-0.2803, 0, -0.2203],
  max: [0.2803, 0.7, 0.2203],
};

function dominantBone(influences) {
  return influences.reduce((best, influence) => influence.weight > best.weight ? influence : best).bone;
}

test("source character vertices map to the matching left/right joints", () => {
  assert.equal(dominantBone(getPlayerSkinInfluences(-0.21, 0.4, bounds)), "Rig_LeftUpperArm");
  assert.equal(dominantBone(getPlayerSkinInfluences(0.21, 0.4, bounds)), "Rig_RightUpperArm");
  assert.equal(dominantBone(getPlayerSkinInfluences(-0.08, 0.1, bounds)), "Rig_LeftShin");
  assert.equal(dominantBone(getPlayerSkinInfluences(0.08, 0.02, bounds)), "Rig_RightFoot");
  assert.equal(dominantBone(getPlayerSkinInfluences(0, 0.66, bounds)), "Rig_Head");
});

test("an unrigged mesh gains normalized skin weights without changing its bind pose", () => {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    0, 0.1, 0,
    -0.21, 0.4, 0,
    0.21, 0.4, 0,
    0, 0.66, 0,
    -0.08, 0.1, 0,
    0.08, 0.02, 0,
    -0.2803, 0, -0.2203,
    0.2803, 0.7, 0.2203,
  ]);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  const source = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  const model = new THREE.Group();
  model.add(source);

  const rig = rigPlayerModel(model);
  assert.ok(rig);
  assert.equal(rig.mesh.isSkinnedMesh, true);
  assert.equal(rig.skeleton.bones.length, 18);
  assert.deepEqual(
    ["Rig_Hips", "Rig_Spine", "Rig_Chest", "Rig_Head", "Rig_LeftThigh", "Rig_RightThigh"]
      .map((name) => rig.skeleton.bones.some((bone) => bone.name === name)),
    [true, true, true, true, true, true],
  );

  const skinWeight = rig.mesh.geometry.getAttribute("skinWeight");
  const actual = new THREE.Vector3();
  for (let vertex = 0; vertex < vertices.length / 3; vertex += 1) {
    const total = skinWeight.getX(vertex) + skinWeight.getY(vertex)
      + skinWeight.getZ(vertex) + skinWeight.getW(vertex);
    assert.ok(Math.abs(total - 1) < 1e-6, `vertex ${vertex} should have normalized weights`);
    rig.mesh.getVertexPosition(vertex, actual);
    assert.ok(
      actual.distanceTo(new THREE.Vector3(vertices[vertex * 3], vertices[vertex * 3 + 1], vertices[vertex * 3 + 2])) < 1e-5,
      `vertex ${vertex} should remain in its source bind position`,
    );
  }
});

test("the generated joints animate legs, arms, and reduced-motion gait", () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    -0.28, 0, -0.22,
    0.28, 0.7, 0.22,
    -0.2, 0.4, 0,
    0.2, 0.4, 0,
  ], 3));
  const model = new THREE.Group();
  model.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
  const rig = rigPlayerModel(model);
  assert.ok(rig);

  posePlayerRig(rig, 5.2, Math.PI / 2, "run", 0, false, 1);
  const fullStride = rig.bones.Rig_LeftThigh.rotation.x;
  assert.ok(fullStride < -0.3);
  assert.ok(rig.bones.Rig_RightThigh.rotation.x > 0.3);

  posePlayerRig(rig, 5.2, Math.PI / 2, "run", 0, true, 1);
  assert.ok(Math.abs(rig.bones.Rig_LeftThigh.rotation.x) < Math.abs(fullStride));

  posePlayerRig(rig, 0, 0, "heavyAttack", 0.5, false, 1);
  assert.ok(rig.bones.Rig_RightUpperArm.rotation.x < -1.4);
});
