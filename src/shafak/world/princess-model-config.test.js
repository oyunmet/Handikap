import assert from "node:assert/strict";
import test from "node:test";
import {
  isPrincessModelResponseUsable,
  PRINCESS_MODEL_MAX_BYTES,
  PRINCESS_MODEL_URL,
  resolvePrincessAnimationName,
} from "./princess-model-config.ts";

test("princess upload path and response size are bounded", () => {
  assert.equal(PRINCESS_MODEL_URL, "/models/princess.glb");
  assert.equal(isPrincessModelResponseUsable(200, "model/gltf-binary", "1024"), true);
  assert.equal(isPrincessModelResponseUsable(200, "text/html", "1024"), false);
  assert.equal(isPrincessModelResponseUsable(404, "model/gltf-binary", null), false);
  assert.equal(isPrincessModelResponseUsable(200, "model/gltf-binary", String(PRINCESS_MODEL_MAX_BYTES + 1)), false);
  assert.equal(isPrincessModelResponseUsable(200, "model/gltf-binary", "0"), false);
});

test("princess animation clips resolve common names and wave/talk fallbacks", () => {
  assert.equal(resolvePrincessAnimationName(["Armature|Idle"], "idle"), "Armature|Idle");
  assert.equal(resolvePrincessAnimationName(["mixamo.com|Walk"], "walk"), "mixamo.com|Walk");
  assert.equal(resolvePrincessAnimationName(["Greet"], "wave"), "Greet");
  assert.equal(resolvePrincessAnimationName(["Speaking"], "talk"), "Speaking");
  assert.equal(resolvePrincessAnimationName(["Talk"], "wave"), "Talk");
  assert.equal(resolvePrincessAnimationName(["Wave"], "talk"), "Wave");
  assert.equal(resolvePrincessAnimationName([], "idle"), undefined);
});
