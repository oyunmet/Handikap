import assert from "node:assert/strict";
import test from "node:test";
import { getWorldAssetInitialPoseClip } from "./world-v2-assets.ts";

test("world assets use an idle clip as their initial fitted pose", () => {
  const idle = { name: "Armature|Idle" };
  const walk = { name: "Armature|Walk" };
  assert.equal(getWorldAssetInitialPoseClip([walk, idle]), idle);
});

test("world assets never freeze a locomotion frame as the idle pose", () => {
  assert.equal(
    getWorldAssetInitialPoseClip([{ name: "Armature|Walk" }, { name: "Run" }]),
    null,
  );
});
