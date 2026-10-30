import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomPlayerAnimationPlaybackScale,
  resolveWarRoomPlayerAnimationState,
} from "./war-room-player-animation.ts";

const baseInput = {
  hp: 100,
  damageAge: 1,
  shotFeedbackUntil: 0,
  meleeUntil: 0,
  clockTime: 1,
  jumpHeight: 0,
  crouched: false,
  prone: false,
  movement: 0,
  sprinting: false,
};

test("player animation priority preserves death, hit, and attack reactions", () => {
  assert.equal(resolveWarRoomPlayerAnimationState({ ...baseInput, hp: 0, jumpHeight: 1 }), "death");
  assert.equal(resolveWarRoomPlayerAnimationState({ ...baseInput, damageAge: 0.1, jumpHeight: 1 }), "hit");
  assert.equal(resolveWarRoomPlayerAnimationState({
    ...baseInput,
    meleeUntil: 2,
    clockTime: 1,
    jumpHeight: 1,
  }), "attack");
});

test("player animation selects jump, crouch, idle, walk, and run from live movement", () => {
  assert.equal(resolveWarRoomPlayerAnimationState({ ...baseInput, jumpHeight: 0.4 }), "jump");
  assert.equal(resolveWarRoomPlayerAnimationState({ ...baseInput, crouched: true }), "crouch");
  assert.equal(resolveWarRoomPlayerAnimationState({ ...baseInput, prone: true }), "crouch");
  assert.equal(resolveWarRoomPlayerAnimationState({ ...baseInput, movement: 0.12 }), "idle");
  assert.equal(resolveWarRoomPlayerAnimationState({ ...baseInput, movement: 0.45 }), "walk");
  assert.equal(resolveWarRoomPlayerAnimationState({ ...baseInput, movement: 0.7 }), "run");
  assert.equal(resolveWarRoomPlayerAnimationState({ ...baseInput, movement: 0.3, sprinting: true }), "run");
});

test("locomotion playback scales to movement speed and reverses for backward travel", () => {
  assert.equal(getWarRoomPlayerAnimationPlaybackScale("walk", "forward", 6.1), 1);
  assert.equal(getWarRoomPlayerAnimationPlaybackScale("run", "forward", 6.1), 6.1 / 8.2);
  assert.equal(getWarRoomPlayerAnimationPlaybackScale("run", "backward", 8.2), -1);
  assert.equal(getWarRoomPlayerAnimationPlaybackScale("walk", "right", 6.1), 0.78);
  assert.equal(getWarRoomPlayerAnimationPlaybackScale("crouch", "forward", 3.05), 1);
});
