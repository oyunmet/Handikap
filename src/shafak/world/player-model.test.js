import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  PLAYER_CHARACTER_MATERIAL_ALIASES,
  PLAYER_CHARACTER_MODEL_FACING,
  PLAYER_CHARACTER_MODEL_PATH,
  PLAYER_CHARACTER_MODEL_SCALE,
  PLAYER_CHARACTER_ROOT_BONE,
  PLAYER_CHARACTER_TARGET_HEIGHT,
  shouldRenderProceduralPlayerModel,
  shouldRenderPlayerModel,
} from "./player-model.ts";
import {
  createPlayerLocomotionClip,
  isRootTranslationTrack,
  resolveMappedGlbClipName,
} from "./model-animation.ts";
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

test("duels select the same GLB hero as the road instead of the procedural stand-in", () => {
  assert.equal(shouldRenderProceduralPlayerModel(true, false), true);
  assert.equal(shouldRenderProceduralPlayerModel(true, true), false);
  assert.equal(shouldRenderProceduralPlayerModel(false, true), false);
  assert.equal(PLAYER_CHARACTER_TARGET_HEIGHT, 1.7);
});

test("player equipment color aliases match materials in the game hero GLB", () => {
  const normalize = (name) => name.toLocaleLowerCase().replace(/[^a-z0-9ğüşöçıİ]/gi, "");
  const materialNames = new Set(
    readGlbJson(fs.readFileSync(playerModelUrl)).materials.map((material) => normalize(material.name)),
  );
  const matches = (role, materialName) => PLAYER_CHARACTER_MATERIAL_ALIASES[role]
    .some((alias) => normalize(alias) === normalize(materialName));

  for (const [role, materialName] of [
    ["armor", "Shirt"],
    ["armorDark", "UnderShirt"],
    ["accent", "Detail"],
  ]) {
    assert.ok(materialNames.has(normalize(materialName)));
    assert.ok(matches(role, materialName), `${role} should map to ${materialName}`);
  }
});

test("player model uses the animated Quaternius hero at the configured height and facing", async () => {
  assert.equal(
    new URL(PLAYER_CHARACTER_MODEL_PATH, "https://safak.invalid").pathname,
    "/models/player-hero.glb",
  );
  assert.equal(PLAYER_CHARACTER_MODEL_SCALE, 1);
  assert.equal(PLAYER_CHARACTER_MODEL_FACING, Math.PI);
  assert.equal(PLAYER_CHARACTER_TARGET_HEIGHT, 1.7);
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
  gltf.scene.updateMatrixWorld(true);
  const faceBounds = new THREE.Box3();
  let faceMeshCount = 0;
  gltf.scene.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    if (!materials.some((material) => ["Eye", "Pupil", "White"].includes(material.name))) return;
    faceBounds.union(new THREE.Box3().setFromObject(node, true));
    faceMeshCount += 1;
  });
  assert.ok(faceMeshCount > 0, "the player GLB should expose its face meshes");
  assert.ok(
    faceBounds.getCenter(new THREE.Vector3()).z > 0.25,
    "the source GLB's visible face is on native +Z before the model-axis correction",
  );
  assert.deepEqual(
    gltf.animations.filter((clip) => /strafe|side.?step|run.?left|run.?right/i.test(clip.name)).map((clip) => clip.name),
    [],
    "the world player asset has no separate lateral run/strafe clips to blend",
  );
  const runSourceClip = gltf.animations.find((clip) => clip.name === "Run");
  assert.ok(runSourceClip, "the player GLB should contain a Run clip");
  const runTorsoTrack = runSourceClip.tracks.find((track) => track.name === "Torso.quaternion");
  assert.ok(runTorsoTrack, "the player Run clip should animate the torso");
  const uprightRunClip = createPlayerLocomotionClip(runSourceClip);
  const uprightTorsoTrack = uprightRunClip.tracks.find((track) => track.name === "Torso.quaternion");
  assert.ok(uprightTorsoTrack);
  let sourceTorsoRoll = 0;
  for (let offset = 0; offset + 3 < runTorsoTrack.values.length; offset += 4) {
    const sourceEuler = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().fromArray(runTorsoTrack.values, offset),
      "XYZ",
    );
    sourceTorsoRoll = Math.max(sourceTorsoRoll, Math.abs(sourceEuler.z));
  }
  assert.ok(sourceTorsoRoll > 0.05, "the source Run clip contains a sideways torso roll");
  const walkSourceClip = gltf.animations.find((clip) => clip.name === "Walk");
  assert.ok(walkSourceClip, "the player GLB should contain a Walk clip");
  const uprightWalkClip = createPlayerLocomotionClip(walkSourceClip);
  assert.notEqual(uprightWalkClip, walkSourceClip);
  const idleSourceClip = gltf.animations.find((clip) => clip.name === "Idle");
  assert.ok(idleSourceClip, "the player GLB should contain an Idle clip");
  const uprightIdleClip = createPlayerLocomotionClip(idleSourceClip);
  const uprightClips = [uprightIdleClip, uprightWalkClip, uprightRunClip];
  for (const locomotionClip of uprightClips) {
    const rotationTracks = new Set();
    for (const track of locomotionClip.tracks) {
      const pathSegments = track.name.split(/[.[\]]+/).filter(Boolean);
      if (
        pathSegments.at(-1)?.toLowerCase() !== "quaternion"
        || !["body", "abdomen", "torso", "neck", "head"].includes(
          pathSegments.at(-2)?.toLowerCase() ?? "",
        ) && pathSegments.at(-2)?.toLowerCase() !== "hips"
      ) continue;
      const boneName = pathSegments.at(-2)?.toLowerCase();
      rotationTracks.add(boneName);
      const angles = [[], [], []];
      for (let offset = 0; offset + 3 < track.values.length; offset += 4) {
        const euler = new THREE.Euler().setFromQuaternion(
          new THREE.Quaternion().fromArray(track.values, offset),
          "XYZ",
        );
        angles[0].push(euler.x);
        angles[1].push(euler.y);
        angles[2].push(euler.z);
      }
      for (const axisAngles of angles) {
        const mean = Math.atan2(
          axisAngles.reduce((sum, value) => sum + Math.sin(value), 0),
          axisAngles.reduce((sum, value) => sum + Math.cos(value), 0),
        );
        assert.ok(Math.abs(mean) < 1e-5, `${track.name} should not retain a bind-pose tilt`);
      }
    }
    for (const boneName of ["body", "hips", "abdomen", "torso", "neck", "head"]) {
      assert.ok(rotationTracks.has(boneName), `${locomotionClip.name} should neutralize ${boneName}`);
    }
  }
  const maxHipsToHeadLean = (clip) => {
    const actor = cloneSkinned(gltf.scene);
    const mixer = new THREE.AnimationMixer(actor);
    mixer.clipAction(clip).play();
    const hips = actor.getObjectByName("Hips");
    const head = actor.getObjectByName("Head");
    let maxLean = 0;
    const frameCount = Math.ceil(clip.duration * 60);
    for (let frame = 0; frame <= frameCount; frame += 1) {
      mixer.setTime(clip.duration * frame / frameCount);
      actor.updateMatrixWorld(true);
      const bodyAxis = head.getWorldPosition(new THREE.Vector3())
        .sub(hips.getWorldPosition(new THREE.Vector3()));
      maxLean = Math.max(
        maxLean,
        Math.atan2(Math.hypot(bodyAxis.x, bodyAxis.z), bodyAxis.y),
      );
    }
    mixer.stopAllAction();
    mixer.uncacheRoot(actor);
    return THREE.MathUtils.radToDeg(maxLean);
  };
  const sourceRunLean = maxHipsToHeadLean(runSourceClip);
  const correctedRunLean = maxHipsToHeadLean(uprightRunClip);
  assert.ok(sourceRunLean > 15, `the source Run clip leans ${sourceRunLean.toFixed(1)}° in 3D`);
  assert.ok(correctedRunLean < 3, `corrected Run should stay upright, got ${correctedRunLean.toFixed(1)}°`);
  assert.ok(maxHipsToHeadLean(uprightWalkClip) < 1, "corrected Walk should stay upright");
  assert.ok(maxHipsToHeadLean(uprightIdleClip) < 1, "corrected Idle should keep the same neutral pose");

  const transitionActor = cloneSkinned(gltf.scene);
  const transitionMixer = new THREE.AnimationMixer(transitionActor);
  const idleAction = transitionMixer.clipAction(uprightIdleClip);
  idleAction.play();
  for (let frame = 0; frame < 18; frame += 1) transitionMixer.update(1 / 60);
  const runAction = transitionMixer.clipAction(uprightRunClip);
  runAction.reset().fadeIn(0.16).play();
  idleAction.fadeOut(0.16);
  let transitionLean = 0;
  const transitionHips = transitionActor.getObjectByName("Hips");
  const transitionHead = transitionActor.getObjectByName("Head");
  for (let frame = 0; frame < 36; frame += 1) {
    transitionMixer.update(1 / 60);
    transitionActor.updateMatrixWorld(true);
    const transitionAxis = transitionHead.getWorldPosition(new THREE.Vector3())
      .sub(transitionHips.getWorldPosition(new THREE.Vector3()));
    transitionLean = Math.max(
      transitionLean,
      Math.atan2(Math.hypot(transitionAxis.x, transitionAxis.z), transitionAxis.y),
    );
  }
  assert.ok(
    THREE.MathUtils.radToDeg(transitionLean) < 3,
    `Idle-to-Run crossfade should not restore the bind-pose lean, got ${THREE.MathUtils.radToDeg(transitionLean).toFixed(1)}°`,
  );
  transitionMixer.stopAllAction();
  transitionMixer.uncacheRoot(transitionActor);
  for (const boneName of ["Root", "Hips"]) {
    const bone = gltf.scene.getObjectByName(boneName);
    assert.ok(bone, `the player GLB should contain ${boneName}`);
    assert.ok(Math.abs(bone.rotation.y) < 1e-6, `${boneName} should have no bind-pose yaw offset`);
    assert.ok(Math.abs(bone.rotation.z) < 1e-6, `${boneName} should have no bind-pose roll offset`);
  }
  assert.ok(
    Math.abs(gltf.scene.getObjectByName("Hips").rotation.x) > 0.1,
    "the source GLB has a forward-leaning Hips bind pose that locomotion clips must override",
  );
  const rootMotionTracks = runSourceClip.tracks.filter((track) =>
    isRootTranslationTrack(track.name, "Root")
    || isRootTranslationTrack(track.name, "Hips"),
  );
  assert.deepEqual(rootMotionTracks, [], "the Run clip has no Root/Hips translation to strip");
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
