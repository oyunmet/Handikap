import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { resolveCameraCollision } from "./world-v2-camera.ts";
import { WORLD_V2_CAMERA_COLLISION_LAYER } from "./world-v2-geometry.ts";

test("camera collision keeps the camera 0.3m on the player side of a wall", () => {
  const scene = new THREE.Scene();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.4), new THREE.MeshBasicMaterial());
  wall.position.set(0, 1.6, 3);
  wall.layers.enable(WORLD_V2_CAMERA_COLLISION_LAYER);
  scene.add(wall);
  scene.updateMatrixWorld(true);

  const origin = new THREE.Vector3(0, 1.05, 0);
  const desired = new THREE.Vector3(0, 2.2, 4.5);
  const direction = desired.clone().sub(origin);
  const distance = direction.length();
  direction.normalize();
  const raycaster = new THREE.Raycaster(origin, direction, 0, distance);
  raycaster.layers.set(WORLD_V2_CAMERA_COLLISION_LAYER);
  const hit = raycaster.intersectObjects(scene.children, true)[0];
  assert.ok(hit, "expected the camera path to intersect the wall");

  const resolved = resolveCameraCollision(origin, desired, hit.distance);
  assert.ok(resolved.distanceTo(origin) < hit.distance);
  assert.ok(resolved.z < wall.position.z - 0.2);
  assert.ok(Math.abs(resolved.distanceTo(origin) - (hit.distance - 0.3)) < 0.001);
});
