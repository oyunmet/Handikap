import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  fitCharacterModel,
  getCharacterBounds,
  getCharacterScreenCoverage,
  inspectCharacterSceneGraph,
  prepareCharacterSkinnedMeshes,
} from "./character-model.ts";
import { findCharacterPoseBones, poseCharacterWithoutClip } from "./character-pose.ts";

test("character models fit the requested height with their lowest point on the floor", () => {
  const model = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 0.5), new THREE.MeshStandardMaterial());
  body.position.set(1, 0.25, -1);
  model.scale.setScalar(6);
  model.position.set(100, -20, 30);
  model.add(body);
  const scale = fitCharacterModel(model, 1.8);
  const bounds = getCharacterBounds(model);

  assert.ok(Math.abs(scale - 0.75) < 1e-6);
  assert.ok(Math.abs(bounds.min.y) < 1e-6);
  assert.ok(Math.abs(bounds.max.y - 1.8) < 1e-6);
  assert.ok(Math.abs(bounds.getCenter(new THREE.Vector3()).x) < 1e-6);
  assert.ok(Math.abs(bounds.getCenter(new THREE.Vector3()).z) < 1e-6);
});

test("skinned character bounds include the current bone deformation when fitting", () => {
  const model = new THREE.Group();
  const bone = new THREE.Bone();
  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const vertexCount = geometry.getAttribute("position").count;
  const skinIndices = new Uint16Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);
  for (let index = 0; index < vertexCount; index += 1) skinWeights[index * 4] = 1;
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
  model.add(bone);
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
  model.add(mesh);
  model.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([bone]));
  bone.position.y = 4;

  fitCharacterModel(model, 1.8);
  const bounds = getCharacterBounds(model);

  assert.ok(Math.abs(bounds.min.y) < 1e-6);
  assert.ok(Math.abs(bounds.max.y - 1.8) < 1e-6);
});

test("skinned character meshes refresh their bounds and disable frustum culling", () => {
  const model = new THREE.Group();
  const bone = new THREE.Bone();
  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const vertexCount = geometry.getAttribute("position").count;
  const skinIndices = new Uint16Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);
  for (let index = 0; index < vertexCount; index += 1) skinWeights[index * 4] = 1;
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
  model.add(bone);
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
  mesh.frustumCulled = true;
  model.add(mesh);
  model.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([bone]));

  assert.equal(prepareCharacterSkinnedMeshes(model), 1);
  assert.equal(mesh.frustumCulled, false);
  assert.ok(mesh.boundingSphere);
  assert.ok(mesh.boundingSphere.radius > 0);
});

test("player hierarchy diagnostics report each mesh and identify oversized geometry", () => {
  const root = new THREE.Group();
  root.name = "player-actor-root";
  const model = new THREE.Group();
  model.name = "Root_Scene";
  root.add(model);
  const smallMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.8, 0.5),
    new THREE.MeshStandardMaterial({ color: "#b9a17b" }),
  );
  model.add(smallMesh);
  const oversizedMesh = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.2, 0.2),
    new THREE.MeshStandardMaterial({ color: "#aa9977" }),
  );
  oversizedMesh.name = "oversized-test-mesh";
  model.add(oversizedMesh);

  const diagnostics = inspectCharacterSceneGraph(root, model, "/models/player-hero.glb");
  const meshRows = diagnostics.filter((row) => row.isMesh);
  const oversized = meshRows.filter((row) =>
    Math.max(row.worldSizeM.x, row.worldSizeM.y, row.worldSizeM.z) > 3);

  assert.equal(meshRows.length, 2);
  assert.equal(oversized.length, 1);
  assert.equal(oversized[0].name, "oversized-test-mesh");
  assert.equal(oversized[0].source, "/models/player-hero.glb: prepareModel()");
  assert.equal(oversized[0].parent, "Root_Scene");
  assert.deepEqual(oversized[0].materialColors, ["#aa9977"]);
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

test("the mobile camera keeps a normalized player below 35% of portrait screen height", () => {
  const model = new THREE.Group();
  model.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.45), new THREE.MeshStandardMaterial()));
  fitCharacterModel(model, 1.8);

  const camera = new THREE.PerspectiveCamera(66, 402 / 874, 0.1, 300);
  camera.position.set(0, 2.2, 4.5);
  camera.lookAt(0, 1.15, -11.5);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  const coverage = getCharacterScreenCoverage(model, camera, 402, 874);

  assert.ok(coverage.height <= 0.35, `screen height coverage should be <= 35%, got ${coverage.height * 100}%`);
});

test("rigged Quaternius bone names support procedural jump, block, and crouch poses", () => {
  const model = new THREE.Group();
  const names = [
    "Hips", "Spine", "Torso", "Head",
    "UpperArmL", "LowerArmL", "UpperArmR", "LowerArmR",
    "UpperLegL", "LowerLegL", "UpperLegR", "LowerLegR", "FootL", "FootR",
  ];
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
  assert.ok(bones.spine.rotation.x > 0);
  assert.ok(bones.chest.rotation.x > 0);
  assert.ok(bones.head.rotation.x < 0);
  assert.ok(bones.leftUpperArm.rotation.x < 0);
  assert.ok(bones.leftForearm.rotation.x < 0);
  assert.ok(bones.leftFoot.rotation.x > 0);
});
