import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  PLAYER_CHARACTER_MODEL_FACING,
  PLAYER_CHARACTER_MODEL_PATH,
  PLAYER_CHARACTER_MODEL_SCALE,
  PLAYER_CHARACTER_ROOT_BONE,
  PLAYER_CHARACTER_TARGET_HEIGHT,
  shouldRenderPlayerModel,
} from "./player-model.ts";
import { resolveMappedGlbClipName } from "./model-animation.ts";
import { PLAYER_CHARACTER_ANIMATION_CLIPS } from "./player-model.ts";
import { findCharacterPoseBones } from "./character-pose.ts";
import {
  fitCharacterModel,
  getCharacterBounds,
  getCharacterScreenCoverage,
  inspectCharacterSceneGraph,
  prepareCharacterSkinnedMeshes,
  cloneCharacterResources,
  disposeCharacterResources,
} from "./character-model.ts";
import { getTravelCameraSettings } from "./camera-settings.ts";
import { createDuelWeapon, normalizeDuelWeaponWorldSize } from "./duel-weapon.ts";

const playerModelUrl = new URL(`../../../public${PLAYER_CHARACTER_MODEL_PATH}`, import.meta.url);

function readGlbJson(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  assert.equal(buffer.readUInt32LE(16), 0x4e4f534a);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").trim());
}

test("the player GLB can use its generated rig when it contains no animation clips", () => {
  assert.equal(shouldRenderPlayerModel(true, 0), true);
  assert.equal(shouldRenderPlayerModel(true, 1), false);
  assert.equal(shouldRenderPlayerModel(false, 0), false);
});

test("player model uses the animated Quaternius hero at the configured height and facing", async () => {
  assert.equal(
    new URL(PLAYER_CHARACTER_MODEL_PATH, "https://safak.invalid").pathname,
    "/models/player-hero.glb",
  );
  assert.equal(PLAYER_CHARACTER_MODEL_SCALE, 1);
  assert.equal(PLAYER_CHARACTER_MODEL_FACING, Math.PI);
  assert.equal(PLAYER_CHARACTER_TARGET_HEIGHT, 1.8);
  assert.equal(PLAYER_CHARACTER_ROOT_BONE, "Root");

  const playerGlb = fs.readFileSync(playerModelUrl);
  const playerModel = readGlbJson(playerGlb);
  assert.equal(playerModel.asset.version, "2.0");
  assert.ok(playerModel.skins?.length >= 1);
  const playerClips = new Set(playerModel.animations.map((clip) => clip.name));
  for (const clip of ["Idle", "Walk", "Run", "Dagger_Attack", "Dagger_Attack2", "Attacking_Idle", "Roll", "RecieveHit", "Death"]) {
    assert.ok(playerClips.has(clip), `the bundled knight model should include the ${clip} clip`);
  }
  const arrayBuffer = playerGlb.buffer.slice(
    playerGlb.byteOffset,
    playerGlb.byteOffset + playerGlb.byteLength,
  );
  const gltf = await new Promise((resolve, reject) =>
    new GLTFLoader().parse(arrayBuffer, "/", resolve, reject));
  const firstActor = cloneSkinned(gltf.scene);
  const secondActor = cloneSkinned(gltf.scene);
  const firstResources = cloneCharacterResources(firstActor);
  const secondResources = cloneCharacterResources(secondActor);
  const firstSkinnedMeshes = [];
  const secondSkinnedMeshes = [];
  firstActor.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) firstSkinnedMeshes.push(object);
  });
  secondActor.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) secondSkinnedMeshes.push(object);
  });
  assert.equal(firstSkinnedMeshes.length, 7);
  assert.equal(secondSkinnedMeshes.length, 7);
  firstSkinnedMeshes.forEach((mesh, index) => {
    assert.notEqual(mesh.skeleton, secondSkinnedMeshes[index].skeleton);
    assert.notEqual(mesh.skeleton.bones[0], secondSkinnedMeshes[index].skeleton.bones[0]);
    assert.notEqual(mesh.geometry, secondSkinnedMeshes[index].geometry);
    assert.notEqual(mesh.material, secondSkinnedMeshes[index].material);
  });
  const runClip = gltf.animations.find((clip) => clip.name.toLowerCase() === "run");
  const secondActorPose = secondSkinnedMeshes[0].skeleton.bones.map((bone) => [
    ...bone.position.toArray(),
    ...bone.quaternion.toArray(),
    ...bone.scale.toArray(),
  ]);
  const firstMixer = new THREE.AnimationMixer(firstActor);
  firstMixer.clipAction(runClip).play();
  firstMixer.update(runClip.duration * 0.5);
  assert.deepEqual(
    secondSkinnedMeshes[0].skeleton.bones.map((bone) => [
      ...bone.position.toArray(),
      ...bone.quaternion.toArray(),
      ...bone.scale.toArray(),
    ]),
    secondActorPose,
    "animating one actor must leave the other actor's bones unchanged",
  );
  firstMixer.stopAllAction();
  firstMixer.uncacheRoot(firstActor);
  disposeCharacterResources(firstResources);
  disposeCharacterResources(secondResources);
  const bones = findCharacterPoseBones(gltf.scene);
  for (const bone of ["Root", "Hips", "Head"]) {
    assert.ok(gltf.scene.getObjectByName(bone), `the player GLB should include the ${bone} skeleton bone`);
  }
  assert.ok(bones.leftUpperArm, "the left upper arm should bind to the fallback pose");
  assert.ok(bones.rightForearm, "the right forearm should bind to the fallback pose");
  assert.ok(bones.leftThigh, "the left thigh should bind to the fallback pose");
  assert.equal(
    resolveMappedGlbClipName("jump", [...playerClips], PLAYER_CHARACTER_ANIMATION_CLIPS),
    null,
    "jump should use the articulated procedural pose because the source model has no jump clip",
  );

  const model = cloneSkinned(gltf.scene);
  fitCharacterModel(model, PLAYER_CHARACTER_TARGET_HEIGHT);
  model.rotation.y = PLAYER_CHARACTER_MODEL_FACING;
  const normalizedBounds = getCharacterBounds(model);
  assert.ok(Math.abs(normalizedBounds.min.y) < 1e-5, "player feet should sit at y=0");
  assert.ok(
    Math.abs(normalizedBounds.max.y - PLAYER_CHARACTER_TARGET_HEIGHT) < 1e-5,
    "the bundled player should normalize to exactly 1.8 m",
  );
  assert.equal(prepareCharacterSkinnedMeshes(model), 7);
  const skinnedMeshes = [];
  model.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) skinnedMeshes.push(object);
  });
  assert.ok(skinnedMeshes.every((mesh) => !mesh.frustumCulled && mesh.boundingSphere?.radius > 0));

  const playerRoot = new THREE.Group();
  playerRoot.name = "player-actor-root";
  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 28),
    new THREE.MeshBasicMaterial({ color: "#080706" }),
  );
  contactShadow.name = "player-contact-shadow";
  playerRoot.add(contactShadow);
  playerRoot.add(model);
  const hand = model.getObjectByName("FistR");
  assert.ok(hand, "the player GLB should expose a hand bone for equipped weapons");
  const sword = createDuelWeapon({ weaponStyle: "sword" });
  hand.add(sword);
  normalizeDuelWeaponWorldSize(sword, 1);
  playerRoot.updateMatrixWorld(true);

  const diagnostics = inspectCharacterSceneGraph(playerRoot, model, PLAYER_CHARACTER_MODEL_PATH);
  const meshRows = diagnostics.filter((row) => row.isMesh);
  const devParts = meshRows.filter((row) =>
    Math.max(row.worldSizeM.x, row.worldSizeM.y, row.worldSizeM.z) > 3);
  assert.equal(meshRows.length, 18);
  assert.deepEqual(devParts, []);
  assert.ok(
    diagnostics.some((row) =>
      row.name === "equipped-duel-weapon" && row.source === "duel-weapon.ts: createDuelWeapon()"),
  );

  const cameraSettings = getTravelCameraSettings(0, true);
  const coverageByMode = {};
  for (const motionMode of ["idle", "run"]) {
    const animatedModel = cloneSkinned(gltf.scene);
    fitCharacterModel(animatedModel, PLAYER_CHARACTER_TARGET_HEIGHT);
    animatedModel.rotation.y = PLAYER_CHARACTER_MODEL_FACING;
    prepareCharacterSkinnedMeshes(animatedModel);
    const animatedHand = animatedModel.getObjectByName("FistR");
    const animatedSword = createDuelWeapon({ weaponStyle: "sword" });
    animatedHand.add(animatedSword);
    normalizeDuelWeaponWorldSize(animatedSword, 1);
    const mixer = new THREE.AnimationMixer(animatedModel);
    const clip = gltf.animations.find((animation) =>
      animation.name.toLowerCase() === (motionMode === "idle" ? "idle" : "run"));
    assert.ok(clip, `the player GLB should contain the ${motionMode} animation`);
    mixer.clipAction(clip).play();
    for (let frame = 0; frame < 24; frame += 1) mixer.update(1 / 30);
    animatedModel.updateMatrixWorld(true);

    const camera = new THREE.PerspectiveCamera(
      cameraSettings.fieldOfView,
      402 / 874,
      0.6,
      340,
    );
    camera.position.set(0, cameraSettings.height, cameraSettings.distanceBehind);
    camera.lookAt(0, cameraSettings.targetHeight, -cameraSettings.targetDistanceAhead);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const coverage = getCharacterScreenCoverage(animatedModel, camera, 402, 874);
    coverageByMode[motionMode] = {
      screenHeightPercent: Number((coverage.height * 100).toFixed(1)),
      screenAreaPercent: Number((coverage.area * 100).toFixed(1)),
    };
    assert.ok(
      coverage.height <= 0.35,
      `${motionMode} player should occupy at most 35% of screen height, got ${coverageByMode[motionMode].screenHeightPercent}%`,
    );
  }

  console.info("[shafak-model] Verified player scene", {
    meshCount: meshRows.length,
    skinnedMeshCount: skinnedMeshes.length,
    devParts: devParts.length,
    screenHeightPercent: coverageByMode,
  });
});
