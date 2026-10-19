import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as THREE from "three";
import {
  createUprightTorsoClip,
  getOpponentAnimationPlayback,
  isRootTranslationTrack,
  mapOpponentAnimationState,
  resolveMappedGlbClipName,
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

test("upright locomotion keeps torso pitch and yaw but removes sideways lean", () => {
  const tilted = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, -0.08, 0.16, "XYZ"));
  const track = new THREE.QuaternionKeyframeTrack(
    "Torso.quaternion",
    [0],
    tilted.toArray(),
  );
  const clip = new THREE.AnimationClip("Run", 1, [track]);
  const upright = createUprightTorsoClip(clip);
  const originalRotation = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion().fromArray(clip.tracks[0].values),
    "XYZ",
  );
  const fixedRotation = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion().fromArray(upright.tracks[0].values),
    "XYZ",
  );

  assert.notEqual(upright, clip);
  assert.ok(Math.abs(fixedRotation.z) < 1e-6);
  assert.ok(Math.abs(fixedRotation.x - originalRotation.x) < 1e-6);
  assert.ok(Math.abs(fixedRotation.y - originalRotation.y) < 1e-6);
  assert.ok(Math.abs(originalRotation.z - 0.16) < 1e-6, "the source clip remains unchanged");
});

test("GLB clip names are resolved case-insensitively from one configurable map", () => {
  const clips = {
    idle: ["Breathing Idle"],
    attack: ["Attack3", "HeavyAttack"],
    hit: ["Hit Reaction"],
  };
  assert.equal(resolveGlbClipName("idle", ["mixamo.com", "BREATHING IDLE"], clips), "BREATHING IDLE");
  assert.equal(resolveGlbClipName("attack", ["Attack3", "HeavyAttack"], clips), "Attack3");
  assert.equal(resolveGlbClipName("hit", ["Hit Reaction"], clips), "Hit Reaction");
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

test("player animation states map to the Quaternius hero clips and leave jump to the rig pose", () => {
  const buffer = fs.readFileSync(new URL("../../../public/models/player-hero.glb", import.meta.url));
  const jsonLength = buffer.readUInt32LE(12);
  const model = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").trim());
  const clips = model.animations.map((clip) => clip.name);
  const expected = {
    idle: "Idle",
    walk: "Walk",
    run: "Run",
    attack: "Dagger_Attack",
    heavyAttack: "Dagger_Attack2",
    block: "Attacking_Idle",
    dodge: "Roll",
    jump: null,
    backflip: "Roll",
    plunge: "Dagger_Attack2",
    hit: "RecieveHit",
    die: "Death",
  };

  assert.equal(PLAYER_CHARACTER_ROOT_BONE, "Root");
  for (const [state, clip] of Object.entries(expected)) {
    if (clip) {
      assert.ok(PLAYER_CHARACTER_ANIMATION_CLIPS[state].includes(clip));
      assert.equal(resolveMappedGlbClipName(state, clips, PLAYER_CHARACTER_ANIMATION_CLIPS), clip);
    } else {
      assert.deepEqual(PLAYER_CHARACTER_ANIMATION_CLIPS[state], []);
      assert.equal(resolveMappedGlbClipName(state, clips, PLAYER_CHARACTER_ANIMATION_CLIPS), null);
    }
  }
  const rootIndex = model.nodes.findIndex((node) => node.name === PLAYER_CHARACTER_ROOT_BONE);
  assert.ok(rootIndex >= 0, "the animated hero should include the configured root bone");
  assert.ok(model.animations.some((clip) => clip.channels.some((channel) =>
    channel.target.node !== rootIndex
    && channel.target.path === "rotation")));
});

test("rivals and chapter bosses use animated player-like rigs with distinct boss scale", () => {
  const archetypes = [
    "gate-warden",
    "iron-oath",
    "ash-archer",
    "shadow-knight",
    "storm-lancer",
    "rift-berserker",
    "ember-alchemist",
    "venom-assassin",
    "frost-hunter",
    "chapter-boss",
  ];
  const profiles = archetypes.map((archetype) => getWorldBotProfileByArchetype(archetype));
  const expectedModels = {
    "gate-warden": ["/models/player-hero.glb", "sword", ["CharacterArmature|Dagger_Attack", "Dagger_Attack", "Punch"]],
    "iron-oath": ["/models/player-hero.glb", "daggers", ["CharacterArmature|Dagger_Attack", "Dagger_Attack", "Punch"]],
    "ash-archer": ["/models/base-character.glb", "bow", ["Rig|Sword_Attack", "Rig|Sword_Attack_RM", "Rig|Punch_Cross", "Rig|Punch_Jab"]],
    "shadow-knight": ["/models/base-character.glb", "daggers", ["Rig|Sword_Attack", "Rig|Sword_Attack_RM", "Rig|Punch_Cross", "Rig|Punch_Jab"]],
    "storm-lancer": ["/models/human.glb", "spear", ["Human Armature|Punch"]],
    "rift-berserker": ["/models/player-hero.glb", "axe", ["CharacterArmature|Dagger_Attack", "Dagger_Attack", "Punch"]],
    "ember-alchemist": ["/models/base-character.glb", "staff", ["Rig|Sword_Attack", "Rig|Sword_Attack_RM", "Rig|Punch_Cross", "Rig|Punch_Jab"]],
    "venom-assassin": ["/models/player-hero.glb", "daggers", ["CharacterArmature|Dagger_Attack", "Dagger_Attack", "Punch"]],
    "frost-hunter": ["/models/base-character.glb", "bow", ["Rig|Sword_Attack", "Rig|Sword_Attack_RM", "Rig|Punch_Cross", "Rig|Punch_Jab"]],
  };
  for (const profile of profiles) {
    const config = getAnimatedRivalModelConfig(profile.name, profile);
    assert.ok(config);
    assert.equal(config.appearance.armor, profile.appearance.armor);
    assert.equal(config.appearance.cape, profile.appearance.cape);
    assert.ok(config.tintColor);
    if (profile.archetype === "chapter-boss") {
      assert.equal(config.modelPath, "/models/player-hero.glb");
      assert.equal(config.targetHeight, 3.35);
      assert.equal(config.rootBoneName, "Root");
      assert.equal(config.modelRotation, undefined);
      assert.ok(config.animationClips.attack?.includes("Dagger_Attack"));
      assert.equal(config.isBoss, true);
    } else {
      const [modelPath, weapon, attackClips] = expectedModels[profile.archetype];
      assert.equal(config.modelPath, modelPath);
      assert.equal(config.targetHeight, 1.8);
      assert.equal(config.weapon, weapon);
      assert.deepEqual(config.animationClips.attack, attackClips);
    }
  }
  assert.equal(
    getAnimatedRivalModelConfig("Kül Tahtı", getWorldBotProfileByArchetype("chapter-boss"))?.appearance.trim,
    "#c7463f",
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
