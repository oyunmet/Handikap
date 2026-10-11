import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { OPPONENT_MODEL_CONFIGS } from "./opponent-model-config.ts";
import { WORLD_BIOME_PALETTES } from "./world-biomes.ts";
import { WORLD_CHUNK_OBJECTS, createWorldChunk } from "./world-generation.ts";
import {
  MAX_WORLD_PIXEL_RATIO,
  NORMALIZED_FIGHTER_HEIGHT,
  WORLD_AMBIENT_LIGHT_INTENSITY,
  WORLD_DIRECTIONAL_LIGHT_INTENSITY,
  WORLD_RENDER_FALLBACK_BACKGROUND,
} from "./render-safety.ts";

const biomes = [
  { name: "ash-road", chunkIndex: 0 },
  { name: "frozen-pass", chunkIndex: 9 },
  { name: "red-marsh", chunkIndex: 18 },
];
const modelConfig = OPPONENT_MODEL_CONFIGS["Gölge Şövalyesi"];
const characters = [
  { name: "procedural-player", kind: "procedural" },
  { name: "procedural-road-rival", kind: "procedural" },
  { name: "Gölge Şövalyesi", kind: "rigged", modelPath: modelConfig.modelPath },
];

function loadGlbJson(modelPath) {
  const bytes = readFileSync(resolve("public", modelPath.slice(1)));
  assert.equal(bytes.toString("ascii", 0, 4), "glTF", `${modelPath} must be a binary GLB`);
  assert.equal(bytes.readUInt32LE(4), 2, `${modelPath} must use GLB 2`);
  let offset = 12;
  while (offset < bytes.length) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.toString("ascii", offset + 4, offset + 8);
    if (chunkType === "JSON") return JSON.parse(bytes.toString("utf8", offset + 8, offset + 8 + chunkLength));
    offset += 8 + chunkLength;
  }
  throw new Error(`${modelPath} has no JSON metadata chunk`);
}

for (const character of characters) {
  for (const biome of biomes) {
    test(`render matrix: ${character.name} × ${biome.name}`, () => {
      const palette = WORLD_BIOME_PALETTES[biome.name];
      const chunk = createWorldChunk(biome.chunkIndex);
      assert.ok(palette, `Biome palette ${biome.name} must exist`);
      assert.notEqual(WORLD_RENDER_FALLBACK_BACKGROUND, "#000000");
      assert.ok(WORLD_AMBIENT_LIGHT_INTENSITY > 0);
      assert.ok(WORLD_DIRECTIONAL_LIGHT_INTENSITY > 0);
      assert.ok(MAX_WORLD_PIXEL_RATIO <= 2);
      assert.equal(chunk.biome, biome.name);
      assert.ok(chunk.objects.length >= WORLD_CHUNK_OBJECTS);
      assert.ok(chunk.objects.every((object) => object.biome === biome.name));
      for (const color of [palette.skyTint, palette.horizon, palette.ground, palette.road, palette.fog]) {
        assert.match(color, /^#[0-9a-f]{6}$/i);
        assert.notEqual(color.toLowerCase(), "#000000");
      }
      if (character.kind === "rigged") {
        const glb = loadGlbJson(character.modelPath);
        assert.ok(glb.meshes?.length > 0, "configured rig must contain meshes");
        assert.ok(glb.skins?.length > 0, "configured rig must retain its skin");
        const clipNames = new Set((glb.animations ?? []).map((clip) => clip.name));
        for (const candidates of Object.values(modelConfig.animationClips)) {
          for (const clipName of candidates) {
            assert.ok(clipNames.has(clipName), `required animation ${clipName} must be present`);
          }
        }
        assert.ok(NORMALIZED_FIGHTER_HEIGHT > 0);
      }
    });
  }
}
