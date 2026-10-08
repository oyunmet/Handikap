import assert from "node:assert/strict";
import test from "node:test";
import { getSpriteSheetFrame, resolveCharacterAnimationState } from "./character-animation.ts";

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
    hit: clip(30, 3, false),
    die: clip(33, 6, false),
  },
};

test("character state mapping covers locomotion and reserved combat actions", () => {
  assert.equal(resolveCharacterAnimationState("idle"), "idle");
  assert.equal(resolveCharacterAnimationState("stopped"), "idle");
  assert.equal(resolveCharacterAnimationState("walking"), "walk");
  assert.equal(resolveCharacterAnimationState("running"), "run");
  assert.equal(resolveCharacterAnimationState("running", "block"), "block");
  assert.equal(resolveCharacterAnimationState("idle", "die"), "die");
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
