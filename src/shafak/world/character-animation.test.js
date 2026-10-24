import assert from "node:assert/strict";
import test from "node:test";
import {
  getProceduralAttackPose,
  getProceduralAttackDuration,
  getSpeakingGesturePose,
  getSpriteSheetFrame,
  resolveCharacterAnimationState,
  resolveWorldPlayerAnimationState,
} from "./character-animation.ts";

const clip = (startFrame, frames, loop = true) => ({
  startFrame,
  frames,
  framesPerSecond: 10,
  loop,
});

const manifest = {
  src: "/warrior-sheet.png",
  frameWidth: 128,
  frameHeight: 256,
  columns: 4,
  animations: {
    idle: clip(0, 4),
    walk: clip(4, 6),
    run: clip(10, 6),
    attack: clip(16, 5, false),
    block: clip(21, 4, false),
    dodge: clip(25, 5, false),
    backflip: clip(30, 5, false),
    jump: clip(35, 5, false),
    plunge: clip(40, 5, false),
    hit: clip(45, 3, false),
    die: clip(48, 6, false),
  },
};

test("character state mapping covers locomotion and reserved combat actions", () => {
  assert.equal(resolveCharacterAnimationState("idle"), "idle");
  assert.equal(resolveCharacterAnimationState("stopped"), "idle");
  assert.equal(resolveCharacterAnimationState("walking"), "walk");
  assert.equal(resolveCharacterAnimationState("running"), "run");
  assert.equal(resolveCharacterAnimationState("running", "block"), "block");
  assert.equal(resolveCharacterAnimationState("idle", "jump"), "jump");
  assert.equal(resolveCharacterAnimationState("idle", "backflip"), "backflip");
  assert.equal(resolveCharacterAnimationState("idle", "die"), "die");
});

test("world jump animation overrides locomotion but never masks an active combat action", () => {
  assert.equal(resolveWorldPlayerAnimationState("running", 0.8), "jump");
  assert.equal(resolveWorldPlayerAnimationState("walking", 0), "walk");
  assert.equal(resolveWorldPlayerAnimationState("running", 0.8, "heavyAttack"), "heavyAttack");
  assert.equal(resolveWorldPlayerAnimationState("idle", Number.NaN), "idle");
});

test("procedural weapon poses retract, then drive the hand and blade toward the opponent", () => {
  const windup = getProceduralAttackPose(0.05, "sword");
  const impact = getProceduralAttackPose(0.42, "sword");
  const daggerImpact = getProceduralAttackPose(0.42, "daggers");
  const spearImpact = getProceduralAttackPose(0.42, "spear", true);

  assert.ok(windup.rightShoulderX < 0);
  assert.ok(impact.rightShoulderX > 0.9);
  assert.ok(impact.rightElbowX < windup.rightElbowX);
  assert.ok(daggerImpact.leftShoulderX > 0.8);
  assert.ok(spearImpact.strike > 0.8);
  assert.ok(spearImpact.wristX < -0.8);
});

test("weapon strikes are still extended at their deterministic combat impact ticks", () => {
  const lightImpact = getProceduralAttackPose((8 / 60) / getProceduralAttackDuration("attack"), "sword");
  const heavyImpact = getProceduralAttackPose((15 / 60) / getProceduralAttackDuration("heavyAttack"), "sword", true);
  assert.ok(lightImpact.strike > 0.9);
  assert.ok(heavyImpact.strike > 0.95);
  assert.ok(lightImpact.rightShoulderX > 0.9);
  assert.ok(heavyImpact.rightShoulderX > 1);
});

test("speaking gesture moves both articulated arms forward instead of keeping the weapon hand behind", () => {
  const pose = getSpeakingGesturePose(0.4);
  assert.ok(pose.leftShoulderX > 0.6);
  assert.ok(pose.leftElbowX > 0.3);
  assert.ok(pose.rightShoulderX > 0.25);
  assert.ok(pose.rightElbowX > 0.15);
});

test("sprite-sheet frame selection loops movement clips and holds a completed action", () => {
  assert.deepEqual(getSpriteSheetFrame(manifest, "walk", 0.7), {
    frame: 5,
    column: 1,
    row: 1,
  });
  assert.deepEqual(getSpriteSheetFrame(manifest, "attack", 8), {
    frame: 20,
    column: 0,
    row: 5,
  });
});

test("sprite-sheet setup errors are explicit when a clip is invalid", () => {
  const invalid = {
    ...manifest,
    animations: { ...manifest.animations, hit: clip(30, 0) },
  };
  assert.throws(
    () => getSpriteSheetFrame(invalid, "hit", 0),
    /clip "hit" is missing or invalid/,
  );
});
