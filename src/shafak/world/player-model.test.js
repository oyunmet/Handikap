import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  PLAYER_CHARACTER_MODEL_FACING,
  PLAYER_CHARACTER_MODEL_PATH,
  PLAYER_CHARACTER_MODEL_SCALE,
  shouldRenderPlayerModel,
} from "./player-model.ts";
import { getPlayerSkinInfluences } from "./player-skeletal-rig.ts";

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

test("the player GLB can use its generated rig when it contains no animation clips", () => {
  assert.equal(shouldRenderPlayerModel(true, 0), true);
  assert.equal(shouldRenderPlayerModel(true, 1), false);
  assert.equal(shouldRenderPlayerModel(false, 0), false);
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

  const positionView = model.bufferViews[bounds.bufferView];
  const positionOffset = 20 + glb.readUInt32LE(12) + 8 + positionView.byteOffset + bounds.byteOffset;
  const positionStride = positionView.byteStride ?? 12;
  const weightedBones = new Set();
  for (let vertex = 0; vertex < bounds.count; vertex += 1) {
    const offset = positionOffset + vertex * positionStride;
    const x = glb.readFloatLE(offset);
    const y = glb.readFloatLE(offset + 4);
    const influences = getPlayerSkinInfluences(x, y, { min: bounds.min, max: bounds.max });
    const total = influences.reduce((sum, influence) => sum + influence.weight, 0);
    assert.ok(Number.isFinite(total) && Math.abs(total - 1) < 1e-6);
    for (const influence of influences) {
      if (influence.weight > 0.02) weightedBones.add(influence.bone);
    }
  }
  for (const bone of [
    "Rig_LeftUpperArm", "Rig_LeftForearm", "Rig_LeftHand",
    "Rig_RightUpperArm", "Rig_RightForearm", "Rig_RightHand",
    "Rig_LeftThigh", "Rig_LeftShin", "Rig_LeftFoot",
    "Rig_RightThigh", "Rig_RightShin", "Rig_RightFoot",
    "Rig_Hips", "Rig_Spine", "Rig_Chest", "Rig_Neck", "Rig_Head",
  ]) {
    assert.ok(weightedBones.has(bone), `source player vertices should receive the ${bone} skin influence`);
  }
});
