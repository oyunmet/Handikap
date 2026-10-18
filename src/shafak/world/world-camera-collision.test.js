import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  collectCameraOccluders,
  inspectCameraOccluders,
  isCameraCollisionIgnored,
  WORLD_CAMERA_OCCLUSION_OPACITY,
  WorldCameraOcclusionFader,
} from "./world-camera-collision.ts";

test("camera ray candidates include marked scenery but exclude actors and their children", () => {
  const scene = new THREE.Scene();
  const scenery = new THREE.Group();
  scenery.userData.cameraOccluder = true;
  const sceneryMesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  scenery.add(sceneryMesh);
  const actor = new THREE.Group();
  actor.userData.cameraOccluder = true;
  actor.userData.cameraCollisionIgnore = true;
  actor.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  scene.add(scenery, actor);

  assert.deepEqual(collectCameraOccluders(scene), [scenery]);
  assert.equal(isCameraCollisionIgnored(actor.children[0]), true);
});

test("fading an occluder clones its material and never changes a shared material", () => {
  const sharedMaterial = new THREE.MeshStandardMaterial({ color: "#556677", opacity: 0.7 });
  const fadedMesh = new THREE.Mesh(new THREE.BoxGeometry(), sharedMaterial);
  const untouchedMesh = new THREE.Mesh(new THREE.BoxGeometry(), sharedMaterial);
  const fader = new WorldCameraOcclusionFader();

  fader.update([fadedMesh]);
  const fadedMaterial = fadedMesh.material;
  assert.notEqual(fadedMaterial, sharedMaterial);
  assert.equal(fadedMaterial.opacity, WORLD_CAMERA_OCCLUSION_OPACITY);
  assert.equal(fadedMaterial.depthWrite, false);
  assert.equal(untouchedMesh.material, sharedMaterial);
  assert.equal(sharedMaterial.opacity, 0.7);

  fader.clear();
  assert.equal(fadedMesh.material, sharedMaterial);
  assert.equal(untouchedMesh.material, sharedMaterial);
});

test("occluder diagnostics report camera intrusion and large projected coverage", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.35, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  const nearMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  nearMesh.name = "camera-near-prop";
  nearMesh.position.z = 4.8;
  nearMesh.userData.cameraOccluder = true;
  const wideMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 1), new THREE.MeshBasicMaterial());
  wideMesh.name = "camera-wide-prop";
  wideMesh.position.z = -2;
  wideMesh.userData.cameraOccluder = true;
  scene.add(nearMesh, wideMesh);
  scene.updateMatrixWorld(true);

  const issues = inspectCameraOccluders(collectCameraOccluders(scene), camera);
  assert.ok(issues.some((issue) => issue.name === nearMesh.name && issue.cameraInside));
  assert.ok(issues.some((issue) => issue.name === wideMesh.name && issue.screenArea >= 0.4));
});
