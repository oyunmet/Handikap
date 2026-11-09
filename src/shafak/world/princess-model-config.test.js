import assert from "node:assert/strict";
import test from "node:test";
import {
  PRINCESS_BASE_MODEL_URL,
  PRINCESS_ENDING_MOOD_TIMELINE,
  getPrincessFacingYaw,
  getPrincessCameraFrame,
  resolvePrincessEndingMood,
  resolvePrincessAnimationName,
} from "./princess-model-config.ts";
import { PLAYER_CHARACTER_MODEL_PATH } from "./player-model.ts";

test("princess uses the existing skinned player asset instead of a separate GLB", () => {
  assert.equal(PRINCESS_BASE_MODEL_URL, PLAYER_CHARACTER_MODEL_PATH);
});

test("princess animations use the player clips and generated wave/talk gestures", () => {
  assert.equal(resolvePrincessAnimationName(["PrincessIdle"], "idle"), "PrincessIdle");
  assert.equal(resolvePrincessAnimationName(["PrincessWalk"], "walk"), "PrincessWalk");
  assert.equal(resolvePrincessAnimationName(["PrincessWave"], "wave"), "PrincessWave");
  assert.equal(resolvePrincessAnimationName(["PrincessTalk"], "talk"), "PrincessTalk");
  assert.equal(resolvePrincessAnimationName(["Talk"], "wave"), "Talk");
  assert.equal(resolvePrincessAnimationName(["Wave"], "talk"), "Wave");
  assert.equal(resolvePrincessAnimationName([], "idle"), undefined);
});

test("princess camera frames the face in portrait and landscape", () => {
  const portrait = getPrincessCameraFrame(402, 874);
  const landscape = getPrincessCameraFrame(874, 402);
  assert.ok(portrait.position[2] > landscape.position[2]);
  assert.equal(portrait.target[1], 1);
  assert.equal(landscape.target[1], 1);
  for (const frame of [portrait, landscape]) {
    const visibleHeight = 2 * frame.position[2] * Math.tan((frame.fov * Math.PI) / 360);
    assert.ok(visibleHeight > 1.9, `camera should keep the full princess visible, height=${visibleHeight}`);
  }
});

test("princess turns toward the camera's actual horizontal position", () => {
  assert.equal(getPrincessFacingYaw({ x: 0, z: 0 }, { x: 0, z: 3 }), 0);
  assert.equal(getPrincessFacingYaw({ x: 0, z: 0 }, { x: 3, z: 0 }), Math.PI / 2);
});

test("final scene shows walking arrival, wave, and then dialogue", () => {
  assert.equal(resolvePrincessEndingMood(0), "walk");
  assert.equal(resolvePrincessEndingMood(PRINCESS_ENDING_MOOD_TIMELINE[1].atMs - 1), "walk");
  assert.equal(resolvePrincessEndingMood(PRINCESS_ENDING_MOOD_TIMELINE[1].atMs), "wave");
  assert.equal(resolvePrincessEndingMood(PRINCESS_ENDING_MOOD_TIMELINE[2].atMs - 1), "wave");
  assert.equal(resolvePrincessEndingMood(PRINCESS_ENDING_MOOD_TIMELINE[2].atMs), "talk");
});
