import assert from "node:assert/strict";
import test from "node:test";
import { resolveGlbClipName } from "./model-animation.ts";
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

test("Gece Nöbetçisi resolves its own model and animation aliases", () => {
  const config = OPPONENT_MODEL_CONFIGS["Gece Nöbetçisi"];
  assert.equal(config.modelPath, "/models/gece-nobetcisi.glb");
  assert.equal(resolveGlbClipName("idle", ["Mixamo.com"], config.animationClips), "Mixamo.com");
  assert.equal(resolveGlbClipName("run", ["Jog"], config.animationClips), "Jog");
  assert.equal(resolveGlbClipName("attack", ["Attack_2"], config.animationClips), "Attack_2");
  assert.equal(resolveGlbClipName("block", ["Blocking"], config.animationClips), "Blocking");
  assert.equal(resolveGlbClipName("dodge", ["Roll"], config.animationClips), "Roll");
  assert.equal(resolveGlbClipName("hit", ["Hit Reaction"], config.animationClips), "Hit Reaction");
  assert.equal(resolveGlbClipName("death", ["Die"], config.animationClips), "Die");
  assert.equal(resolveGlbClipName("victory", ["Victory Idle"], config.animationClips), "Victory Idle");
  assert.equal(resolveGlbClipName("dodge", ["Idle"], config.animationClips), null);
});
