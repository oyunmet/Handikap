import assert from "node:assert/strict";
import test from "node:test";
import {
  PRINCESS_BASE_MODEL_URL,
  getPrincessCameraFrame,
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
  assert.equal(portrait.target[1], 0.92);
  assert.equal(landscape.target[1], 0.92);
});
