import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import {
  SKY_BACKGROUND_DEPTH_STATE,
  syncSkyShellPositions,
} from "./world-sky-background.ts";

test("procedural sky and cloud shells stay centered on the moving camera", () => {
  const camera = new THREE.PerspectiveCamera();
  const center = new THREE.Vector3();
  const shells = [new THREE.Object3D(), new THREE.Object3D(), new THREE.Object3D()];
  const sync = () => syncSkyShellPositions(camera, center, shells[0], shells[1], shells[2]);
  const assertCentered = () => {
    const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
    shells.forEach((shell) => assert.ok(shell.position.distanceTo(cameraPosition) < 1e-8));
  };

  camera.position.set(4, 2, 9);
  sync();
  assertCentered();

  camera.position.set(-18, 5, -42);
  sync();
  assertCentered();
});

test("procedural sky never writes or tests against world depth", () => {
  assert.deepEqual(SKY_BACKGROUND_DEPTH_STATE, {
    depthTest: false,
    depthWrite: false,
  });
});
