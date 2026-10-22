import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { getAnimatedRivalModelConfig } from "./opponent-model-config.ts";
import { getWorldBotProfileByArchetype } from "./world-bot-profiles.ts";
import { getWorldModelFit } from "./world-model-sizing.ts";

const modelPath = new URL("../../../public/models/demir-tac.glb", import.meta.url);

function readGlb(path) {
  const buffer = fs.readFileSync(path);
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").trim());
}

test("Demir Taç uses a dedicated upright, crowned iron model instead of the shared hero rig", () => {
  const gltf = readGlb(modelPath);
  const profile = getWorldBotProfileByArchetype("chapter-boss");
  const worldConfig = getAnimatedRivalModelConfig("Demir Taç", profile, "world");
  const duelConfig = getAnimatedRivalModelConfig("Demir Taç", profile, "duel");
  const nodes = gltf.nodes.map((node) => node.name);

  assert.equal(worldConfig.modelPath, "/models/demir-tac.glb");
  assert.deepEqual(worldConfig.modelRotation, [-Math.PI / 2, 0, 0]);
  assert.equal(worldConfig.targetHeight, 1.95);
  assert.equal(duelConfig.targetHeight, 3.35);
  for (const name of [
    "demir-tac-helmet",
    "demir-tac-crown-band",
    "demir-tac-crown-spikes",
    "demir-tac-red-visor",
    "demir-tac-crown-gem",
    "demir-tac-chest-sigil",
  ]) assert.ok(nodes.includes(name), `missing built-in feature ${name}`);

  const modelBounds = gltf.meshes.flatMap((mesh) => mesh.primitives)
    .map((primitive) => gltf.accessors[primitive.attributes.POSITION])
    .reduce((bounds, accessor) => ({
      min: bounds.min.map((value, axis) => Math.min(value, accessor.min[axis])),
      max: bounds.max.map((value, axis) => Math.max(value, accessor.max[axis])),
    }), { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
  const sourceSize = {
    x: modelBounds.max[0] - modelBounds.min[0],
    y: modelBounds.max[2] - modelBounds.min[2],
    z: modelBounds.max[1] - modelBounds.min[1],
  };
  const worldFit = getWorldModelFit(sourceSize, worldConfig);
  const duelFit = getWorldModelFit(sourceSize, duelConfig);
  assert.ok(Math.abs(worldFit.dimensions.y - 1.95) < 0.001);
  assert.ok(Math.abs(duelFit.dimensions.y - 3.35) < 0.001);
  assert.ok(Math.max(worldFit.dimensions.x, worldFit.dimensions.z) < 2.925);
});
