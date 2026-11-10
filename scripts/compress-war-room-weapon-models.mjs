import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MeshoptEncoder } from "meshoptimizer";
import { WAR_ROOM_WEAPONS } from "../src/shafak/game/war-room-data.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const weaponDirectory = path.join(root, "public/models/weapons");
const maxBytes = 150 * 1024;
const MESHOPT_EXTENSION = "EXT_meshopt_compression";
const componentBytes = new Map([[5121, 1], [5123, 2], [5125, 4]]);

function readGlb(filePath) {
  const bytes = fs.readFileSync(filePath);
  if (bytes.toString("ascii", 0, 4) !== "glTF" || bytes.readUInt32LE(4) !== 2) {
    throw new Error(`${filePath} is not a GLB 2.0 file`);
  }
  if (bytes.readUInt32LE(8) !== bytes.length || bytes.toString("ascii", 16, 20) !== "JSON") {
    throw new Error(`${filePath} has an invalid GLB header`);
  }
  const jsonLength = bytes.readUInt32LE(12);
  const binaryHeader = 20 + jsonLength;
  if (bytes.toString("ascii", binaryHeader + 4, binaryHeader + 8) !== "BIN\u0000") {
    throw new Error(`${filePath} is missing its GLB binary chunk`);
  }
  const binaryLength = bytes.readUInt32LE(binaryHeader);
  const binaryStart = binaryHeader + 8;
  const document = JSON.parse(bytes.toString("utf8", 20, binaryHeader));
  return {
    bytes,
    document,
    binary: bytes.subarray(binaryStart, binaryStart + binaryLength),
  };
}

function createGlb(document, binary) {
  document.buffers[0].byteLength = binary.length;
  const json = Buffer.from(JSON.stringify(document));
  const paddedJson = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
  const paddedBinary = Buffer.concat([binary, Buffer.alloc((4 - binary.length % 4) % 4)]);
  const totalLength = 12 + 8 + paddedJson.length + 8 + paddedBinary.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(paddedJson.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binaryHeader = Buffer.alloc(8);
  binaryHeader.writeUInt32LE(paddedBinary.length, 0);
  binaryHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, paddedJson, binaryHeader, paddedBinary]);
}

function getViewUses(document) {
  const uses = new Map();
  const add = (accessorIndex, kind) => {
    const accessor = document.accessors[accessorIndex];
    if (!accessor || accessor.bufferView == null) return;
    const previous = uses.get(accessor.bufferView) ?? { kind, accessors: [] };
    if (previous.kind !== kind) throw new Error(`Buffer view ${accessor.bufferView} mixes ${previous.kind} and ${kind}`);
    previous.accessors.push(accessor);
    uses.set(accessor.bufferView, previous);
  };
  for (const mesh of document.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      for (const accessorIndex of Object.values(primitive.attributes ?? {})) add(accessorIndex, "attributes");
      if (primitive.indices != null) add(primitive.indices, "indices");
    }
  }
  return uses;
}

function compressGlb(source, fileName) {
  const { bytes: sourceBytes, document, binary: sourceBinary } = readGlb(source);
  if (document.extensionsRequired?.includes(MESHOPT_EXTENSION)) return null;
  if (document.buffers?.length !== 1 || document.buffers[0].uri) {
    throw new Error(`${fileName} must have a single embedded GLB buffer`);
  }

  const viewUses = getViewUses(document);
  const packed = [];
  let packedLength = 0;
  const append = (value) => {
    const padding = (4 - packedLength % 4) % 4;
    if (padding) {
      packed.push(Buffer.alloc(padding));
      packedLength += padding;
    }
    const offset = packedLength;
    const chunk = Buffer.from(value);
    packed.push(chunk);
    packedLength += chunk.length;
    return offset;
  };

  let compressedCount = 0;
  document.bufferViews = document.bufferViews.map((view, index) => {
    if (view.buffer !== 0) throw new Error(`${fileName} uses a non-GLB buffer view`);
    const sourceOffset = view.byteOffset ?? 0;
    const sourceView = sourceBinary.subarray(sourceOffset, sourceOffset + view.byteLength);
    if (sourceView.length !== view.byteLength) throw new Error(`${fileName} has an out-of-range buffer view`);
    const use = viewUses.get(index);
    if (!use) {
      return {
        ...view,
        buffer: 0,
        byteOffset: append(sourceView),
      };
    }

    const count = use.accessors[0].count;
    if (!Number.isInteger(count) || count < 1 || use.accessors.some((accessor) => accessor.count !== count)) {
      throw new Error(`${fileName} has inconsistent accessor counts in view ${index}`);
    }

    let encodedSource = sourceView;
    let stride;
    let mode;
    let decodedLength = sourceView.length;
    if (use.kind === "attributes") {
      stride = view.byteStride ?? sourceView.length / count;
      mode = "ATTRIBUTES";
      if (!Number.isInteger(stride) || stride < 1 || stride * count !== sourceView.length) {
        throw new Error(`${fileName} has an invalid attribute stride in view ${index}`);
      }
    } else {
      mode = "TRIANGLES";
      const componentType = use.accessors[0].componentType;
      const sourceStride = componentBytes.get(componentType);
      if (!sourceStride || sourceView.length !== count * sourceStride || count % 3 !== 0) {
        throw new Error(`${fileName} has unsupported triangle indices in view ${index}`);
      }
      const values = new DataView(sourceView.buffer, sourceView.byteOffset, sourceView.byteLength);
      const output = Buffer.alloc(count * 2);
      let minIndex = Infinity;
      let maxIndex = 0;
      for (let item = 0; item < count; item += 1) {
        const value = sourceStride === 1
          ? values.getUint8(item)
          : sourceStride === 2
            ? values.getUint16(item * 2, true)
            : values.getUint32(item * 4, true);
        if (value > 65535) throw new Error(`${fileName} exceeds the 16-bit mesh index limit`);
        output.writeUInt16LE(value, item * 2);
        minIndex = Math.min(minIndex, value);
        maxIndex = Math.max(maxIndex, value);
      }
      for (const accessor of use.accessors) {
        accessor.componentType = 5123;
        accessor.min = [minIndex];
        accessor.max = [maxIndex];
      }
      encodedSource = output;
      stride = 2;
      decodedLength = output.length;
    }

    const compressed = MeshoptEncoder.encodeGltfBuffer(
      new Uint8Array(encodedSource.buffer, encodedSource.byteOffset, encodedSource.byteLength),
      count,
      stride,
      mode,
    );
    const compressedOffset = append(compressed);
    compressedCount += 1;
    return {
      ...view,
      buffer: 0,
      byteOffset: 0,
      byteLength: decodedLength,
      ...(use.kind === "indices" ? { byteStride: undefined } : { byteStride: stride }),
      extensions: {
        ...view.extensions,
        [MESHOPT_EXTENSION]: {
          buffer: 0,
          byteOffset: compressedOffset,
          byteLength: compressed.byteLength,
          byteStride: stride,
          count,
          mode,
          filter: "NONE",
        },
      },
    };
  });

  if (!compressedCount) throw new Error(`${fileName} contains no compressible geometry`);
  document.extensionsUsed = [...new Set([...(document.extensionsUsed ?? []), MESHOPT_EXTENSION])];
  document.extensionsRequired = [...new Set([...(document.extensionsRequired ?? []), MESHOPT_EXTENSION])];
  const output = createGlb(document, Buffer.concat(packed, packedLength));
  if (output.length >= maxBytes) {
    throw new Error(`${fileName} is ${output.length} bytes, over the 150 KiB limit`);
  }
  return { sourceBytes, output };
}

await MeshoptEncoder.ready;
const models = WAR_ROOM_WEAPONS.filter((weapon) => weapon.modelFile);
const duplicateModel = models.find((weapon, index) =>
  models.findIndex((candidate) => candidate.modelFile === weapon.modelFile) !== index);
if (duplicateModel) throw new Error(`Multiple weapons use ${duplicateModel.modelFile}`);

for (const weapon of models) {
  const fileName = weapon.modelFile;
  const filePath = path.join(weaponDirectory, fileName);
  const result = compressGlb(filePath, fileName);
  if (!result) {
    console.log(`${fileName}: already Meshopt`);
    continue;
  }
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, result.output);
  fs.renameSync(temporaryPath, filePath);
  console.log(`${fileName}: ${result.sourceBytes.length.toLocaleString()} → ${result.output.length.toLocaleString()} bytes (Meshopt)`);
}
