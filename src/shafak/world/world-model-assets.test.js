import assert from "node:assert/strict";
import test from "node:test";
import { getWorldAssetFallbackKind } from "./WorldModel.tsx";

test("each bundled world model has a matching procedural fallback", () => {
  assert.equal(getWorldAssetFallbackKind("/assets/rock-wall.glb"), "rock");
  assert.equal(getWorldAssetFallbackKind("/assets/wooden-barrel.glb"), "barrel");
  assert.equal(getWorldAssetFallbackKind("/assets/treasure-chest.glb"), "chest");
  assert.equal(getWorldAssetFallbackKind("/assets/ceramic-vase.glb"), "vase");
  assert.equal(getWorldAssetFallbackKind("/assets/unlisted-prop.glb"), "generic");
});
