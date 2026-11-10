import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const environmentModels = [
  { file: "rock-wall.glb", node: "rock_07" },
  { file: "wooden-barrel.glb", node: "wooden_barrels_01_barrel01" },
  { file: "treasure-chest.glb", node: "treasure_chest_bottom" },
  { file: "ceramic-vase.glb", node: "ceramic_vase_01" },
];
const maxEnvironmentAssetBytes = 6 * 1024 * 1024;
const maxEnvironmentTextureDimension = 512;

test("road environment models stay within the 6 MiB asset budget", () => {
  const sizes = environmentModels.map(({ file }) => ({
    name: file,
    bytes: statSync(join(process.cwd(), "public", "assets", file)).size,
  }));
  const totalBytes = sizes.reduce((total, asset) => total + asset.bytes, 0);

  assert.ok(
    totalBytes < maxEnvironmentAssetBytes,
    `Environment models exceed 6 MiB: ${sizes.map((asset) => `${asset.name}=${asset.bytes}`).join(", ")}`,
  );
});

function readGlb(path) {
  const bytes = readFileSync(path);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, `${path} has a GLB header`);
  assert.equal(bytes.readUInt32LE(4), 2, `${path} uses GLB version 2`);
  assert.equal(bytes.readUInt32LE(8), bytes.length, `${path} declares its full byte length`);

  let offset = 12;
  let document = null;
  let binaryLength = 0;
  while (offset + 8 <= bytes.length) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    offset += 8;
    const chunk = bytes.subarray(offset, offset + chunkLength);
    offset += chunkLength;
    if (chunkType === 0x4e4f534a) {
      document = JSON.parse(chunk.toString("utf8").replace(/\0+$/u, "").trimEnd());
    } else if (chunkType === 0x004e4942) {
      binaryLength = chunkLength;
    }
  }
  assert.ok(document, `${path} contains a JSON chunk`);
  return { document, binaryLength };
}

function getJpegDimensions(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, "embedded image is a JPEG");
  const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    const segmentLength = bytes.readUInt16BE(offset);
    if (frameMarkers.has(marker)) {
      return {
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  throw new Error("Embedded JPEG has no frame dimensions.");
}

test("optimized environment GLBs retain the rendered nodes and valid buffer references", () => {
  for (const { file, node: requiredNode } of environmentModels) {
    const path = join(process.cwd(), "public", "assets", file);
    const { document, binaryLength } = readGlb(path);
    const { accessors = [], bufferViews = [], buffers = [], images = [], meshes = [], nodes = [], scenes = [], textures = [] } = document;

    assert.equal(document.asset?.version, "2.0", `${file} is glTF 2.0`);
    assert.ok(nodes.some((node) => node.name === requiredNode), `${file} retains ${requiredNode}`);
    assert.ok(scenes.length > 0, `${file} has a scene`);
    assert.equal(buffers[0]?.byteLength <= binaryLength, true, `${file} buffer fits its BIN chunk`);
    if (file === "wooden-barrel.glb") {
      assert.deepEqual(nodes.map((entry) => entry.name), [requiredNode], "unused barrel bundle nodes are removed");
    }

    for (const node of nodes) {
      if (node.mesh !== undefined) assert.ok(meshes[node.mesh], `${file} node mesh index is valid`);
      for (const child of node.children ?? []) assert.ok(nodes[child], `${file} child node index is valid`);
    }
    for (const scene of scenes) {
      for (const node of scene.nodes ?? []) assert.ok(nodes[node], `${file} scene node index is valid`);
    }
    for (const view of bufferViews) {
      const buffer = buffers[view.buffer ?? 0];
      assert.ok(buffer, `${file} bufferView has a buffer`);
      assert.ok((view.byteOffset ?? 0) + view.byteLength <= buffer.byteLength, `${file} bufferView is in range`);
    }
    for (const accessor of accessors) {
      if (accessor.bufferView !== undefined) {
        assert.ok(bufferViews[accessor.bufferView], `${file} accessor bufferView index is valid`);
      }
    }
    for (const texture of textures) {
      if (texture.source !== undefined) assert.ok(images[texture.source], `${file} texture image index is valid`);
    }
    for (const image of images) {
      if (image.uri?.startsWith("data:")) {
        assert.match(image.uri, /^data:image\/jpeg;base64,/u, `${file} keeps embedded JPEG textures`);
        const dimensions = getJpegDimensions(Buffer.from(image.uri.slice(image.uri.indexOf(",") + 1), "base64"));
        assert.ok(
          Math.max(dimensions.width, dimensions.height) <= maxEnvironmentTextureDimension,
          `${file} texture is at most ${maxEnvironmentTextureDimension} pixels per edge`,
        );
      } else if (image.bufferView !== undefined) {
        assert.ok(bufferViews[image.bufferView], `${file} image bufferView index is valid`);
      }
    }
  }
});
