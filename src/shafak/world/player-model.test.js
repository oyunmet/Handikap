import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  PLAYER_CHARACTER_MODEL_FACING,
  PLAYER_CHARACTER_MODEL_PATH,
  PLAYER_CHARACTER_MODEL_SCALE,
  shouldRenderStaticPlayerModel,
} from "./player-model.ts";

const assetUrl = new URL(
  "../../../attached_assets/steampunk_toad_warrior_1792140030602.glb",
  import.meta.url,
);

function readGlbJson(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  assert.equal(buffer.readUInt32LE(16), 0x4e4f534a);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").trim());
}

test("static player GLB renders without an animation clip, but other models retain clip gating", () => {
  assert.equal(shouldRenderStaticPlayerModel(true, 0), true);
  assert.equal(shouldRenderStaticPlayerModel(true, 1), false);
  assert.equal(shouldRenderStaticPlayerModel(false, 0), false);
});

test("player model path references the supplied source GLB and has an intentional game fit", () => {
  assert.equal(new URL(PLAYER_CHARACTER_MODEL_PATH).pathname, assetUrl.pathname);
  assert.ok(PLAYER_CHARACTER_MODEL_SCALE > 2.5 && PLAYER_CHARACTER_MODEL_SCALE < 3);
  assert.equal(PLAYER_CHARACTER_MODEL_FACING, Math.PI);

  const glb = fs.readFileSync(assetUrl);
  const model = readGlbJson(glb);
  const mesh = model.meshes.find((entry) => entry.name === "FrogWarrior");
  const primitive = mesh?.primitives[0];
  const bounds = model.accessors[primitive.attributes.POSITION];

  assert.ok(mesh, "the supplied player model contains its FrogWarrior mesh");
  assert.equal(model.asset.version, "2.0");
  assert.equal(model.skins?.length ?? 0, 0);
  assert.equal(model.animations?.length ?? 0, 0);
  assert.ok(model.images.some((image) => image.mimeType === "image/png" && image.bufferView !== undefined));
  assert.deepEqual(bounds.min, [-0.2802956700325012, 0, -0.22021245956420898]);
  assert.ok(Math.abs(bounds.max[1] - 0.7) < 0.001);
  assert.equal(bounds.count, 27_035);
  assert.equal(model.accessors[primitive.indices].count / 3, 39_200);
});
