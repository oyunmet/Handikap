import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const weapons = [
  { file: "war-room-staff.glb", inferredName: "Kül Asası (Staff)" },
  { file: "war-room-spear.glb", inferredName: "Surlu Mızrağı (Spear)" },
  { file: "war-room-pickaxe.glb", inferredName: "Surlu Kazması (Pickaxe)" },
];

function readGlb(filePath) {
  const bytes = fs.readFileSync(filePath);
  if (bytes.toString("ascii", 0, 4) !== "glTF" || bytes.readUInt32LE(4) !== 2) {
    throw new Error(`${filePath} is not a GLB 2.0 file`);
  }
  const jsonLength = bytes.readUInt32LE(12);
  return { bytes, document: JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength)) };
}

function normalizedExtent(accessor) {
  if (!accessor.min || !accessor.max) return null;
  const signedScale = accessor.normalized && accessor.componentType === 5122 ? 32767 : 1;
  return accessor.max.map((maximum, axis) => Math.abs(maximum - accessor.min[axis]) / signedScale);
}

function imageDimensions(bytes, image, document) {
  const view = document.bufferViews?.[image.bufferView];
  if (!view) return null;
  const binaryChunkStart = 20 + bytes.readUInt32LE(12) + 8;
  const source = bytes.subarray(binaryChunkStart + (view.byteOffset ?? 0), binaryChunkStart + (view.byteOffset ?? 0) + view.byteLength);
  if (image.mimeType === "image/webp" && source.toString("ascii", 0, 4) === "RIFF") {
    const kind = source.toString("ascii", 12, 16);
    if (kind === "VP8X" && source.length >= 30) {
      return [1 + source.readUIntLE(24, 3), 1 + source.readUIntLE(27, 3)];
    }
    if (kind === "VP8 " && source.length >= 30) {
      return [source.readUInt16LE(26) & 0x3fff, source.readUInt16LE(28) & 0x3fff];
    }
    if (kind === "VP8L" && source.length >= 25) {
      const bits = source.readUInt32LE(21);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
  }
  if (image.mimeType === "image/png" && source.toString("ascii", 1, 4) === "PNG" && source.length >= 24) {
    return [source.readUInt32BE(16), source.readUInt32BE(20)];
  }
  return null;
}

const results = weapons.map(({ file, inferredName }) => {
  const filePath = path.join(root, "public/models/weapons", file);
  const { bytes, document } = readGlb(filePath);
  const meshNames = (document.meshes ?? []).map((mesh) => mesh.name ?? "(adsız)");
  let triangles = 0;
  const extents = [];
  for (const mesh of document.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const positionAccessor = document.accessors[primitive.attributes.POSITION];
      const extent = normalizedExtent(positionAccessor);
      if (extent) extents.push(extent);
      const indexCount = primitive.indices == null
        ? positionAccessor.count
        : document.accessors[primitive.indices].count;
      triangles += Math.floor(indexCount / 3);
    }
  }
  const nodeScale = (document.nodes ?? [])
    .filter((node) => node.mesh != null)
    .map((node) => node.scale ?? [1, 1, 1]);
  const scale = nodeScale[0] ?? [1, 1, 1];
  const bounds = extents.length
    ? [0, 1, 2].map((axis) => +(Math.max(...extents.map((extent) => extent[axis])) * Math.abs(scale[axis])).toFixed(3))
    : null;
  const textures = (document.images ?? []).map((image) => ({
    mimeType: image.mimeType ?? "unknown",
    dimensions: imageDimensions(bytes, image, document),
    bytes: document.bufferViews?.[image.bufferView]?.byteLength ?? null,
  }));
  return {
    inferredName,
    file,
    bytes: bytes.length,
    meshNames,
    boundsMeters: bounds,
    triangles,
    textures,
    nodeNames: (document.nodes ?? []).map((node) => node.name).filter(Boolean),
  };
});

console.log(JSON.stringify(results, null, 2));
