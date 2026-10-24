import assert from "node:assert/strict";
import test from "node:test";
import { getAnimatedRivalModelConfig } from "./opponent-model-config.ts";
import {
  getWorldBotProfileByArchetype,
  getWorldRivalProfile,
} from "./world-bot-profiles.ts";

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

test("rival archetypes select fitted, independently skinned hero bases and bounded scales", () => {
  const configs = archetypes.map((archetype) => {
    const profile = getWorldBotProfileByArchetype(archetype);
    return getAnimatedRivalModelConfig(profile.name, profile);
  });

  assert.deepEqual(new Set(configs.map((config) => config.modelPath)), new Set([
    "/models/player-hero.glb",
    "/models/human.glb",
    "/models/base-character.glb",
    "/models/gece-nobetcisi.glb",
  ]));
  for (const config of configs.slice(0, -1)) {
    assert.ok(config.scale >= 0.95 && config.scale <= 1.1);
    assert.equal(config.targetHeight, 1.8);
    assert.ok(config.materialPalette.skin);
    assert.ok(config.materialPalette.hair);
    assert.ok(config.materialPalette.clothing);
    assert.ok(config.costume);
    assert.ok(config.animationClips.idle?.length);
    assert.ok(config.animationClips.attack?.length);
    assert.ok(config.animationClips.death?.length);
  }
});

test("the named chapter rivals keep their titles and get the requested visual kits", () => {
  const ashSentinel = getWorldRivalProfile(4, 2);
  const purpleDagger = getWorldRivalProfile(4, 3);
  const crimsonCloak = getWorldRivalProfile(4, 0);
  const frostSeal = getWorldRivalProfile(4, 1);
  const ironCrown = getWorldRivalProfile(4, 4);

  assert.deepEqual([ashSentinel.name, ashSentinel.title], ["Kül Gezgini", "NÖBETÇİ"]);
  assert.deepEqual([purpleDagger.name, purpleDagger.title], ["Mor Hançer", "YEMİNLİ SAVAŞÇI"]);
  assert.deepEqual([crimsonCloak.name, crimsonCloak.title], ["Kızıl Pelerin", "ZEHİR SUİKASTÇİSİ"]);
  assert.deepEqual([frostSeal.name, frostSeal.title], ["Taş Mühür", "AYAZ AVCISI"]);
  assert.equal(ironCrown.name, "Demir Taç");

  const purpleConfig = getAnimatedRivalModelConfig(purpleDagger.name, getWorldBotProfileByArchetype(purpleDagger.archetype));
  const venomConfig = getAnimatedRivalModelConfig(crimsonCloak.name, getWorldBotProfileByArchetype(crimsonCloak.archetype));
  const frostConfig = getAnimatedRivalModelConfig(frostSeal.name, getWorldBotProfileByArchetype(frostSeal.archetype));
  const bossConfig = getAnimatedRivalModelConfig(ironCrown.name, getWorldBotProfileByArchetype(ironCrown.archetype));
  const worldBossConfig = getAnimatedRivalModelConfig(
    ironCrown.name,
    getWorldBotProfileByArchetype(ironCrown.archetype),
    "world",
  );

  assert.equal(purpleConfig.weapon, "daggers");
  assert.equal(purpleConfig.appearance.cape, "#624574");
  assert.equal(purpleConfig.costume.mask, true);
  assert.equal(venomConfig.appearance.cape, "#8f2f3b");
  assert.equal(venomConfig.appearance.armor, "#2f4539");
  assert.equal(venomConfig.weapon, "daggers");
  assert.equal(frostConfig.appearance.armorLight, "#c8e1e5");
  assert.equal(frostConfig.weapon, "bow");
  assert.equal(bossConfig.modelPath, "/models/player-hero.glb");
  assert.equal(bossConfig.targetHeight, 3.35);
  assert.equal(worldBossConfig.targetHeight, 1.95);
  assert.equal(bossConfig.rootBoneName, "Root");
  assert.equal(bossConfig.modelFacing, Math.PI);
  assert.equal(bossConfig.modelRotation, undefined);
  assert.equal(bossConfig.tintStrength, 0);
  assert.equal(bossConfig.weapon, "greatsword");
  assert.ok(bossConfig.animationClips.run?.includes("CharacterArmature|Run"));
  assert.ok(bossConfig.animationClips.attack?.includes("CharacterArmature|Dagger_Attack"));
  assert.equal(bossConfig.isDemirTac, true);
  assert.equal(bossConfig.materialNameAliases.cape.includes("cape"), true);
  assert.equal(bossConfig.isBoss, true);
  assert.equal(bossConfig.costume.helmet, true);
  assert.equal(bossConfig.costume.cape, true);
  assert.equal(bossConfig.costume.horns, false);
  assert.ok(getAnimatedRivalModelConfig("Kül Tahtı", getWorldBotProfileByArchetype("chapter-boss"))?.animationClips.attack?.length);
});
