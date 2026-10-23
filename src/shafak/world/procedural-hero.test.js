import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  animateProceduralHero,
  createProceduralHeroRig,
  disposeProceduralHeroRig,
  PROCEDURAL_HERO_HEIGHT,
} from "./procedural-hero.ts";

test("the rebuilt player rig stays upright throughout a full run cycle", () => {
  const rig = createProceduralHeroRig();
  const parent = new THREE.Group();
  parent.rotation.y = 0.73;
  const modelFacing = new THREE.Group();
  modelFacing.rotation.y = Math.PI;
  modelFacing.add(rig.root);
  parent.add(modelFacing);
  let maxLean = 0;
  let leftLegMoved = false;
  let rightLegMoved = false;

  for (let frame = 0; frame <= 120; frame += 1) {
    const phase = (frame / 120) * Math.PI * 2;
    animateProceduralHero(rig, {
      phase,
      moveWeight: 1,
      state: "run",
      actionProgress: 0,
      time: phase,
      crouching: false,
      motionReduced: false,
    });
    parent.updateMatrixWorld(true);
    const hips = rig.hips.getWorldPosition(new THREE.Vector3());
    const head = rig.head.getWorldPosition(new THREE.Vector3());
    const axis = head.sub(hips);
    const facing = parent.getWorldQuaternion(new THREE.Quaternion()).multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI),
    );
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(facing);
    maxLean = Math.max(maxLean, Math.abs(Math.atan2(axis.dot(right), axis.y)));
    leftLegMoved ||= Math.abs(rig.leftThigh.rotation.x) > 0.1;
    rightLegMoved ||= Math.abs(rig.rightThigh.rotation.x) > 0.1;

    assert.equal(rig.hips.rotation.x, 0);
    assert.equal(rig.hips.rotation.z, 0);
    assert.equal(rig.torso.rotation.x, 0);
    assert.equal(rig.torso.rotation.z, 0);
    assert.equal(rig.head.rotation.x, 0);
    assert.equal(rig.head.rotation.z, 0);
  }

  assert.ok(maxLean < THREE.MathUtils.degToRad(0.1), `run-cycle lean reached ${THREE.MathUtils.radToDeg(maxLean)}°`);
  assert.ok(leftLegMoved && rightLegMoved, "both legs should animate while the torso stays upright");
  assert.equal(rig.root.name, "Root");
  assert.equal(rig.hips.name, "Hips");
  assert.equal(rig.torso.name, "Torso");
  assert.equal(rig.head.name, "Head");
  const detailNames = new Set();
  rig.root.traverse((object) => detailNames.add(object.name));
  for (const name of [
    "hero-layered-chest-plate",
    "hero-chest-badge",
    "hero-layered-pauldron-left",
    "hero-forearm-bracer-right",
    "hero-articulated-knee-guard-left",
  ]) assert.ok(detailNames.has(name), `missing player detail ${name}`);
  const bounds = new THREE.Box3().setFromObject(rig.root, true);
  assert.ok(Math.abs(bounds.min.y) < 1e-6, `feet should rest at y=0, got ${bounds.min.y}`);
  assert.ok(Math.abs(bounds.getSize(new THREE.Vector3()).y - rig.height) < 1e-6);
  assert.ok(Math.abs(rig.root.userData.proceduralHeroHeight - rig.height) < 1e-6);
  assert.ok(rig.height > 1.5 && rig.height < 1.6);
  assert.equal(PROCEDURAL_HERO_HEIGHT, 1.7);

  rig.root.scale.setScalar(PROCEDURAL_HERO_HEIGHT / rig.height);
  rig.root.updateMatrixWorld(true);
  const fittedBounds = new THREE.Box3().setFromObject(rig.root, true);
  assert.ok(Math.abs(fittedBounds.min.y) < 1e-6);
  assert.ok(Math.abs(fittedBounds.max.y - PROCEDURAL_HERO_HEIGHT) < 1e-5);

  disposeProceduralHeroRig(rig);
});
