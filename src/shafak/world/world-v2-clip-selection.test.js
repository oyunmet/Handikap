import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { resolveWorldActorClip } from "./world-v2-clip-selection.ts";

const clip = (name) => new THREE.AnimationClip(name, 1, []);

test("an idle actor never falls through to an unrelated first running clip", () => {
  const run = clip("CharacterArmature|Run");
  assert.equal(resolveWorldActorClip([run], "idle"), null);
});

test("missing locomotion clips hold a real idle pose instead of playing another action", () => {
  const run = clip("CharacterArmature|Run");
  const idle = clip("CharacterArmature|Idle");
  assert.equal(resolveWorldActorClip([run, idle], "walk"), idle);
});

test("configured aliases select the correct articulated movement clip", () => {
  const run = clip("CharacterArmature|Run");
  const walk = clip("CharacterArmature|Walk");
  assert.equal(
    resolveWorldActorClip([run, walk], "walk", { walk: ["CharacterArmature|Walk"] }),
    walk,
  );
});

test("default aliases remain available when a model-specific state has no mapping", () => {
  const idle = clip("Idle");
  assert.equal(
    resolveWorldActorClip([idle], "idle", {}, { idle: ["Idle"] }),
    idle,
  );
});
