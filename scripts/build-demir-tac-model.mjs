import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "public/models/fantasy_knight.glb");
const outputPath = path.join(projectRoot, "public/models/demir-tac.glb");
const source = fs.readFileSync(sourcePath);

if (source.toString("ascii", 0, 4) !== "glTF" || source.readUInt32LE(4) !== 2) {
  throw new Error("Expected a binary glTF 2.0 source model.");
}

const jsonLength = source.readUInt32LE(12);
const gltf = JSON.parse(source.subarray(20, 20 + jsonLength).toString("utf8").trim());
const binaryHeaderOffset = 20 + jsonLength;
const binaryLength = source.readUInt32LE(binaryHeaderOffset);
const binaryStart = binaryHeaderOffset + 8;
let binary = Buffer.from(source.subarray(binaryStart, binaryStart + binaryLength));

const root = gltf.nodes[gltf.scenes[gltf.scene ?? 0].nodes[0]];
root.name = "demir-tac-root-z-up";
root.children ??= [];

const setMaterial = (index, name, color, metalness, roughness) => {
  const material = gltf.materials[index];
  material.name = name;
  material.pbrMetallicRoughness.baseColorFactor = [...color, 1];
  material.pbrMetallicRoughness.metallicFactor = metalness;
  material.pbrMetallicRoughness.roughnessFactor = roughness;
};

setMaterial(0, "steel_dark", [0.14, 0.15, 0.17], 0.58, 0.62);
setMaterial(1, "steel_light", [0.31, 0.34, 0.37], 0.7, 0.5);
setMaterial(2, "steel_dark", [0.18, 0.19, 0.21], 0.62, 0.56);
setMaterial(3, "steel_light", [0.38, 0.4, 0.42], 0.72, 0.46);
setMaterial(4, "skin", [0.24, 0.22, 0.21], 0.08, 0.84);
setMaterial(5, "hair", [0.06, 0.055, 0.06], 0.04, 0.9);
setMaterial(6, "hair", [0.07, 0.06, 0.065], 0.04, 0.9);
setMaterial(7, "cape", [0.28, 0.035, 0.05], 0.06, 0.92);

const crimson = gltf.materials.push({
  name: "accent_red",
  pbrMetallicRoughness: {
    baseColorFactor: [0.62, 0.055, 0.075, 1],
    metallicFactor: 0.34,
    roughnessFactor: 0.48,
  },
  doubleSided: true,
}) - 1;
const ruby = gltf.materials.push({
  name: "ruby_glow",
  pbrMetallicRoughness: {
    baseColorFactor: [0.72, 0.045, 0.065, 1],
    metallicFactor: 0.38,
    roughnessFactor: 0.36,
  },
  emissiveFactor: [0.42, 0.018, 0.028],
  doubleSided: true,
}) - 1;
const crownSteel = gltf.materials.push({
  name: "steel_light",
  pbrMetallicRoughness: {
    baseColorFactor: [0.42, 0.45, 0.48, 1],
    metallicFactor: 0.78,
    roughnessFactor: 0.42,
  },
  doubleSided: true,
}) - 1;

const triangles = [];
function addTriangle(a, b, c) {
  triangles.push(a, b, c);
}
function addQuad(a, b, c, d) {
  addTriangle(a, b, c);
  addTriangle(a, c, d);
}

function makeDome() {
  const latitudes = 8;
  const longitudes = 18;
  const centerZ = 2.11;
  const radiusX = 0.205;
  const radiusY = 0.18;
  const radiusZ = 0.245;
  const rings = [];
  for (let lat = 0; lat <= latitudes; lat += 1) {
    const phi = (lat / latitudes) * Math.PI / 2;
    const ring = [];
    for (let lon = 0; lon <= longitudes; lon += 1) {
      const theta = (lon / longitudes) * Math.PI * 2;
      ring.push([
        radiusX * Math.sin(phi) * Math.cos(theta),
        radiusY * Math.sin(phi) * Math.sin(theta),
        centerZ + radiusZ * Math.cos(phi),
      ]);
    }
    rings.push(ring);
  }
  for (let lat = 0; lat < latitudes; lat += 1) {
    for (let lon = 0; lon < longitudes; lon += 1) {
      addQuad(
        rings[lat][lon],
        rings[lat + 1][lon],
        rings[lat + 1][lon + 1],
        rings[lat][lon + 1],
      );
    }
  }
}

function makeCrownBand() {
  const sides = 24;
  const tubeSegments = 6;
  const radiusX = 0.205;
  const radiusY = 0.17;
  const tube = 0.032;
  const centerZ = 2.34;
  const rings = [];
  for (let side = 0; side <= sides; side += 1) {
    const theta = (side / sides) * Math.PI * 2;
    const ring = [];
    for (let segment = 0; segment <= tubeSegments; segment += 1) {
      const phi = (segment / tubeSegments) * Math.PI * 2;
      const radial = tube * Math.cos(phi);
      ring.push([
        (radiusX + radial) * Math.cos(theta),
        (radiusY + radial) * Math.sin(theta),
        centerZ + tube * Math.sin(phi),
      ]);
    }
    rings.push(ring);
  }
  for (let side = 0; side < sides; side += 1) {
    for (let segment = 0; segment < tubeSegments; segment += 1) {
      addQuad(
        rings[side][segment],
        rings[side + 1][segment],
        rings[side + 1][segment + 1],
        rings[side][segment + 1],
      );
    }
  }
}

function makeSpike(centerX, centerY, baseZ, height, radius, segments = 5) {
  const tip = [centerX, centerY, baseZ + height];
  const base = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    base.push([
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius,
      baseZ,
    ]);
  }
  for (let i = 0; i < segments; i += 1) {
    addTriangle(base[i], base[i + 1], tip);
    addTriangle([centerX, centerY, baseZ], base[i + 1], base[i]);
  }
}

function makeOctahedron(center, radius) {
  const [x, y, z] = center;
  const top = [x, y, z + radius];
  const bottom = [x, y, z - radius];
  const front = [x, y - radius, z];
  const back = [x, y + radius, z];
  const left = [x - radius, y, z];
  const right = [x + radius, y, z];
  for (const face of [
    [top, front, right], [top, right, back], [top, back, left], [top, left, front],
    [bottom, right, front], [bottom, back, right], [bottom, left, back], [bottom, front, left],
  ]) addTriangle(...face);
}

const generatedMeshes = [];
const addMesh = (name, material, buildGeometry) => {
  triangles.length = 0;
  buildGeometry();
  const positions = [];
  const normals = [];
  for (let index = 0; index < triangles.length; index += 3) {
    const a = triangles[index];
    const b = triangles[index + 1];
    const c = triangles[index + 2];
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normal = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    const magnitude = Math.hypot(...normal) || 1;
    const unit = normal.map((value) => value / magnitude);
    for (const point of [a, b, c]) {
      positions.push(...point);
      normals.push(...unit);
    }
  }
  generatedMeshes.push({ name, material, positions, normals });
};

addMesh("demir-tac-helmet", 2, makeDome);
addMesh("demir-tac-crown-band", crownSteel, makeCrownBand);
addMesh("demir-tac-crown-spikes", crownSteel, () => {
  [-0.16, -0.08, 0, 0.08, 0.16].forEach((x, index) => {
    const height = index === 2 ? 0.37 : index % 2 === 0 ? 0.24 : 0.29;
    makeSpike(x, -0.015, 2.345, height, index === 2 ? 0.053 : 0.04);
  });
});
addMesh("demir-tac-red-visor", crimson, () => {
  addQuad(
    [-0.155, -0.185, 2.096],
    [0.155, -0.185, 2.096],
    [0.155, -0.182, 2.128],
    [-0.155, -0.182, 2.128],
  );
});
addMesh("demir-tac-crown-gem", ruby, () => makeOctahedron([0, -0.196, 2.39], 0.065));
addMesh("demir-tac-chest-sigil", ruby, () => makeOctahedron([0, -0.225, 1.73], 0.105));
addMesh("demir-tac-breastplate-mark", crimson, () => {
  addQuad(
    [-0.035, -0.214, 1.48],
    [0.035, -0.214, 1.48],
    [0.035, -0.214, 1.77],
    [-0.035, -0.214, 1.77],
  );
});

const addAccessor = (values, type) => {
  while (binary.length % 4) binary = Buffer.concat([binary, Buffer.from([0])]);
  const bytes = Buffer.from(new Float32Array(values).buffer);
  const bufferView = gltf.bufferViews.push({
    buffer: 0,
    byteOffset: binary.length,
    byteLength: bytes.length,
    target: 34962,
  }) - 1;
  binary = Buffer.concat([binary, bytes]);
  const components = type === "VEC3" ? 3 : 1;
  const count = values.length / components;
  const accessor = {
    bufferView,
    componentType: 5126,
    count,
    type,
  };
  if (type === "VEC3") {
    const axes = [0, 1, 2];
    accessor.min = axes.map((axis) => Math.min(...values.filter((_, i) => i % 3 === axis)));
    accessor.max = axes.map((axis) => Math.max(...values.filter((_, i) => i % 3 === axis)));
  }
  return gltf.accessors.push(accessor) - 1;
};

for (const { name, material, positions, normals } of generatedMeshes) {
  const positionAccessor = addAccessor(positions, "VEC3");
  const normalAccessor = addAccessor(normals, "VEC3");
  const mesh = gltf.meshes.push({
    name,
    primitives: [{
      attributes: { POSITION: positionAccessor, NORMAL: normalAccessor },
      material,
      mode: 4,
    }],
  }) - 1;
  const node = gltf.nodes.push({ name, mesh }) - 1;
  root.children.push(node);
}

const overriddenMaterial = gltf.materials.push({
  name: "accent_red",
  pbrMetallicRoughness: {
    baseColorFactor: [0.62, 0.055, 0.075, 1],
    metallicFactor: 0.34,
    roughnessFactor: 0.48,
  },
  doubleSided: true,
}) - 1;
for (const node of gltf.nodes) {
  if (!Number.isInteger(node.mesh)) continue;
  if (!node.name.startsWith("gold_chest_rim") && !node.name.startsWith("pauldron_spike")) continue;
  for (const primitive of gltf.meshes[node.mesh].primitives) primitive.material = overriddenMaterial;
}

gltf.buffers[0].byteLength = binary.length;
const jsonBytes = Buffer.from(JSON.stringify(gltf));
const paddedJsonLength = Math.ceil(jsonBytes.length / 4) * 4;
const paddedBinaryLength = Math.ceil(binary.length / 4) * 4;
const jsonChunk = Buffer.alloc(paddedJsonLength, 0x20);
jsonBytes.copy(jsonChunk);
const binaryChunk = Buffer.alloc(paddedBinaryLength);
binary.copy(binaryChunk);
const totalLength = 12 + 8 + jsonChunk.length + 8 + binaryChunk.length;
const output = Buffer.alloc(totalLength);
output.write("glTF", 0, 4, "ascii");
output.writeUInt32LE(2, 4);
output.writeUInt32LE(totalLength, 8);
output.writeUInt32LE(jsonChunk.length, 12);
output.writeUInt32LE(0x4e4f534a, 16);
jsonChunk.copy(output, 20);
const outputBinaryHeaderOffset = 20 + jsonChunk.length;
output.writeUInt32LE(binaryChunk.length, outputBinaryHeaderOffset);
output.writeUInt32LE(0x004e4942, outputBinaryHeaderOffset + 4);
binaryChunk.copy(output, outputBinaryHeaderOffset + 8);
fs.writeFileSync(outputPath, output);
console.log(`Wrote ${path.relative(projectRoot, outputPath)} (${(output.length / 1024).toFixed(1)} KiB)`);
