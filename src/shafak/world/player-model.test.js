import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
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
});
