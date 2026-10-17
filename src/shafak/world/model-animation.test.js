import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  getOpponentAnimationPlayback,
  isRootTranslationTrack,
  mapOpponentAnimationState,
  resolveGlbClipName,
} from "./model-animation.ts";
import {
  getAnimatedRivalModelConfig,
  getOpponentModelConfig,
  OPPONENT_MODEL_CONFIGS,
} from "./opponent-model-config.ts";
import { getWorldBotProfileByArchetype } from "./world-bot-profiles.ts";
import {
  PLAYER_CHARACTER_ANIMATION_CLIPS,
  PLAYER_CHARACTER_ROOT_BONE,
} from "./player-model.ts";

test("GLB clip names are resolved case-insensitively from one configurable map", () => {
  assert.equal(resolveGlbClipName("idle", ["mixamo.com", "BREATHING IDLE"]), "BREATHING IDLE");
  assert.equal(resolveGlbClipName("attack", ["Attack3", "HeavyAttack"]), "Attack3");
  assert.equal(resolveGlbClipName("hit", ["Hit Reaction"]), "Hit Reaction");
});

test("missing locomotion clips fall back to a usable idle or walking clip", () => {
  assert.equal(resolveGlbClipName("walk", ["Idle"]), "Idle");
  assert.equal(resolveGlbClipName("run", ["Walk"]), "Walk");
  assert.equal(resolveGlbClipName("block", ["Idle"]), "Idle");
  assert.equal(resolveGlbClipName("attack", ["Walk"]), null);
});

test("Gölge Şövalyesi maps every model state to its exact GLB clip", () => {
  const config = OPPONENT_MODEL_CONFIGS["Gölge Şövalyesi"];
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

test("Gece Nöbetçisi resolves to the GLB's sword config while keeping other names intact", () => {
  const config = getOpponentModelConfig("Gece Nöbetçisi");
  assert.ok(config);
  assert.equal(config.modelPath, "/models/gece-nobetcisi.glb");
  assert.equal(config.weapon, "sword");
  assert.equal(config.appearance.weaponStyle, "sword");
  assert.equal(getOpponentModelConfig("Gölge Şövalyesi")?.weapon, "daggers");
  assert.equal(getOpponentModelConfig("Demir Taç"), undefined);
});

test("player animations map to the bundled knight clips and strip duplicate root travel", () => {
  const buffer = fs.readFileSync(new URL("../../../public/models/gece-nobetcisi.glb", import.meta.url));
  const jsonLength = buffer.readUInt32LE(12);
  const model = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").trim());
  const clips = model.animations.map((clip) => clip.name);
  const expected = {
    idle: "Idle",
    walk: "Walk",
    run: "Run",
    attack: "Attack1",
    heavyAttack: "Attack1",
    block: "Block",
    dodge: "Dodge",
    jump: "Dodge",
    backflip: "Dodge",
    plunge: "Attack1",
    hit: "HitReaction",
    die: "Death",
  };

  assert.equal(PLAYER_CHARACTER_ROOT_BONE, "Rig_Hips");
  for (const [state, clip] of Object.entries(expected)) {
    assert.deepEqual(PLAYER_CHARACTER_ANIMATION_CLIPS[state], [clip]);
    assert.equal(resolveGlbClipName(state, clips, PLAYER_CHARACTER_ANIMATION_CLIPS), clip);
  }
  assert.ok(model.animations.some((clip) => clip.channels.some((channel) =>
    channel.target.node === model.skins[0].skeleton
    && channel.target.path === "translation")));
});

test("all road rivals and chapter bosses can use the animated model with their own palette", () => {
  const profiles = [
    ...Array.from({ length: 9 }, (_, index) => getWorldBotProfileByArchetype([
      "gate-warden",
      "iron-oath",
      "ash-archer",
      "shadow-knight",
      "storm-lancer",
      "rift-berserker",
      "ember-alchemist",
      "venom-assassin",
      "frost-hunter",
    ][index])),
    getWorldBotProfileByArchetype("chapter-boss"),
  ];
  for (const profile of profiles) {
    const config = getAnimatedRivalModelConfig(profile.name, profile);
    assert.ok(config);
    assert.equal(config.modelPath, "/models/gece-nobetcisi.glb");
    assert.equal(config.weapon, profile.weapon);
    assert.equal(config.appearance.armor, profile.appearance.armor);
    assert.equal(config.appearance.cape, profile.appearance.cape);
    assert.deepEqual(config.animationClips.attack, ["Attack1"]);
  }
  assert.equal(
    getAnimatedRivalModelConfig("Kül Tahtı", getWorldBotProfileByArchetype("chapter-boss"))?.appearance.trim,
    "#f0bd69",
  );
});

test("Gölge Şövalyesi GLB has its expected rig, feet-on-ground bounds, and clips", () => {
  const buffer = fs.readFileSync(new URL("../../../public/models/gece-nobetcisi.glb", import.meta.url));
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  assert.equal(buffer.readUInt32LE(16), 0x4e4f534a);
  const jsonLength = buffer.readUInt32LE(12);
  const model = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").replace(/\0+$/, "").trim());
  const config = OPPONENT_MODEL_CONFIGS["Gölge Şövalyesi"];
  const expectedClips = [
    "Idle", "Walk", "Run", "Attack1", "Block", "Dodge", "HitReaction",
    "Cast_Fire", "Cast_Lightning", "Death", "Victory",
  ];
  const goldAccent = model.materials.find((material) => material.name === "Gold_Accent");

  assert.deepEqual(model.animations.map((clip) => clip.name), expectedClips);
  assert.ok(goldAccent, "the configured opponent GLB should contain its gold accent material");
  assert.ok(config.materialNameAliases.accent.some((alias) =>
    goldAccent.name.toLowerCase().includes(alias.toLowerCase())));
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
  assert.ok(model.nodes.some((node) => node.name === "sword_blade"));
  const triangleCount = model.meshes.reduce((total, mesh) => total + mesh.primitives.reduce((meshTotal, primitive) => {
    const accessor = primitive.indices === undefined
      ? model.accessors[primitive.attributes.POSITION]
      : model.accessors[primitive.indices];
    return meshTotal + Math.floor(accessor.count / 3);
  }, 0), 0);
  assert.ok(triangleCount < 50_000, `the configured model has ${triangleCount} triangles`);
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
