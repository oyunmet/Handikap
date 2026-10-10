import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  getOpponentAnimationPlayback,
  isRootTranslationTrack,
  mapOpponentAnimationState,
  resolveGlbClipName,
} from "./model-animation.ts";
import { OPPONENT_MODEL_CONFIGS } from "./opponent-model-config.ts";

test("GLB clip names are resolved case-insensitively from one configurable map", () => {
  assert.equal(resolveGlbClipName("idle", ["mixamo.com", "BREATHING IDLE"]), "BREATHING IDLE");
  assert.equal(resolveGlbClipName("attack", ["Attack3", "HeavyAttack"]), "Attack3");
  assert.equal(resolveGlbClipName("hit", ["Hit Reaction"]), "Hit Reaction");
});

test("missing locomotion clips fall back to a usable idle or walking clip", () => {
  assert.equal(resolveGlbClipName("walk", ["Idle"]), "Idle");
  assert.equal(resolveGlbClipName("run", ["Walk"]), "Walk");
  assert.equal(resolveGlbClipName("block", ["Idle"]), null);
});

test("Gece Nöbetçisi maps every model state to its exact GLB clip", () => {
  const config = OPPONENT_MODEL_CONFIGS["Gece Nöbetçisi"];
  assert.equal(config.modelPath, "/models/gece-nobetcisi.glb");
  assert.equal(config.scale, 1);
  assert.equal(config.modelFacing, 0);
  assert.equal(config.rootBoneName, "Rig_Hips");
  const expected = {
    idle: "Idle",
    walk: "Walk",
    run: "Run",
    attack: "Attack1",
    block: "Block",
    dodge: "Dodge",
    hit: "HitReaction",
    castFire: "Cast_Fire",
    castLightning: "Cast_Lightning",
    death: "Death",
    victory: "Victory",
  };
  for (const [state, clip] of Object.entries(expected)) {
    assert.deepEqual(config.animationClips[state], [clip]);
    assert.equal(resolveGlbClipName(state, Object.values(expected), config.animationClips), clip);
  }
});

test("Gece Nöbetçisi GLB has its expected rig, feet-on-ground bounds, and clips", () => {
  const buffer = fs.readFileSync(new URL("../../../public/models/gece-nobetcisi.glb", import.meta.url));
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  assert.equal(buffer.readUInt32LE(16), 0x4e4f534a);
  const jsonLength = buffer.readUInt32LE(12);
  const model = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").replace(/\0+$/, "").trim());
  const config = OPPONENT_MODEL_CONFIGS["Gece Nöbetçisi"];
  const expectedClips = [
    "Idle", "Walk", "Run", "Attack1", "Block", "Dodge", "HitReaction",
    "Cast_Fire", "Cast_Lightning", "Death", "Victory",
  ];

  assert.deepEqual(model.animations.map((clip) => clip.name), expectedClips);
  assert.equal(model.skins.length, 1);
  assert.equal(model.nodes[model.skins[0].skeleton].name, config.rootBoneName);
  const rootIndex = model.skins[0].skeleton;
  const positionAccessors = model.meshes.flatMap((mesh) => mesh.primitives
    .map((primitive) => model.accessors[primitive.attributes.POSITION]));
  const minimumY = Math.min(...positionAccessors.map((accessor) => accessor.min[1]));
  const maximumY = Math.max(...positionAccessors.map((accessor) => accessor.max[1]));
  assert.ok(Math.abs(minimumY) < 0.001);
  assert.ok(Math.abs(maximumY - 1.8) < 0.001);
  assert.equal(model.animations.filter((clip) => clip.channels.some((channel) =>
    channel.target.node === rootIndex && channel.target.path === "translation")).length, 10);
});

test("opponent root translation is stripped without removing bone rotation tracks", () => {
  assert.equal(isRootTranslationTrack("Rig_Hips.position", "Rig_Hips"), true);
  assert.equal(isRootTranslationTrack(".bones[Rig_Hips].position", "Rig_Hips"), true);
  assert.equal(isRootTranslationTrack("Rig_Hips.quaternion", "Rig_Hips"), false);
  assert.equal(isRootTranslationTrack("Rig_Head.position", "Rig_Hips"), false);
});

test("opponent clips loop, return to idle, or hold their last frame by action", () => {
  for (const state of ["idle", "walk", "run"]) {
    assert.equal(getOpponentAnimationPlayback(state), "loop");
  }
  for (const state of ["attack", "dodge", "hit", "castFire", "castLightning"]) {
    assert.equal(getOpponentAnimationPlayback(state), "returnToIdle");
  }
  for (const state of ["block", "death", "victory"]) {
    assert.equal(getOpponentAnimationPlayback(state), "holdLastFrame");
  }
});

test("combat actions map to the opponent's specific clips", () => {
  assert.equal(mapOpponentAnimationState("walk"), "walk");
  assert.equal(mapOpponentAnimationState("run"), "run");
  assert.equal(mapOpponentAnimationState("heavyAttack", "attack"), "attack");
  assert.equal(mapOpponentAnimationState("heavyAttack", "skillOne"), "castFire");
  assert.equal(mapOpponentAnimationState("heavyAttack", "skillTwo"), "castLightning");
  assert.equal(mapOpponentAnimationState("die", "die"), "death");
});
