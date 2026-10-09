import assert from "node:assert/strict";
import test from "node:test";
import { resolveGlbClipName } from "./model-animation.ts";

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
