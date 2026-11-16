import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { collectWorldV2CameraCollisionTargets } from "./world-camera-collision.ts";

const CAMERA_LAYER = 8;

test("world camera candidates include ordinary village scenery and gameplay blockers, not actors", () => {
  const scene = new THREE.Scene();
  const villageHouse = new THREE.Group();
  villageHouse.userData.cameraOccluder = true;
  const houseWall = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 0.3), new THREE.MeshBasicMaterial());
  villageHouse.add(houseWall);
  scene.add(villageHouse);

  const obstacle = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  obstacle.layers.enable(CAMERA_LAYER);
  scene.add(obstacle);

  const player = new THREE.Group();
  player.userData.cameraCollisionIgnore = true;
  player.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial()));
  scene.add(player);

  const targets = collectWorldV2CameraCollisionTargets(scene, CAMERA_LAYER);

  assert.ok(targets.includes(villageHouse));
  assert.ok(targets.includes(obstacle));
  assert.ok(!targets.includes(player));

  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(0, 1, 2),
    new THREE.Vector3(0, 0, -1),
    0,
    6,
  );
  raycaster.layers.set(0);
  raycaster.layers.enable(CAMERA_LAYER);
  const hit = raycaster.intersectObjects(targets, true)[0];
  assert.equal(hit?.object, houseWall);
});

test("hidden or explicitly ignored scenery is excluded from camera collision", () => {
  const scene = new THREE.Scene();
  const hidden = new THREE.Group();
  hidden.visible = false;
  hidden.userData.cameraOccluder = true;
  hidden.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
  scene.add(hidden);

  const ignored = new THREE.Group();
  ignored.userData.cameraCollisionIgnore = true;
  ignored.userData.worldModelCategory = "npc";
  ignored.userData.cameraOccluder = true;
  ignored.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
  scene.add(ignored);

  assert.deepEqual(collectWorldV2CameraCollisionTargets(scene, CAMERA_LAYER), []);
});
