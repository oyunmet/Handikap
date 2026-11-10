import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MeshoptEncoder } from "meshoptimizer";

const outputDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/models/weapons");
const limitBytes = 150 * 1024;
const materialDefs = [
  { name: "Oiled walnut", color: [0.27, 0.13, 0.065, 1], metallic: 0.02, roughness: 0.78 },
  { name: "Forged iron", color: [0.105, 0.13, 0.145, 1], metallic: 0.82, roughness: 0.34 },
  { name: "Brass", color: [0.62, 0.39, 0.14, 1], metallic: 0.72, roughness: 0.3 },
  { name: "Leather wrap", color: [0.19, 0.105, 0.063, 1], metallic: 0, roughness: 0.92 },
  { name: "Bow cord", color: [0.78, 0.68, 0.49, 1], metallic: 0, roughness: 0.84 },
  { name: "Ash-green enamel", color: [0.12, 0.31, 0.27, 1], metallic: 0.46, roughness: 0.35 },
];
const materialIndex = new Map(materialDefs.map((material, index) => [material.name, index]));

function add(a, b) { return a.map((value, index) => value + b[index]); }
function subtract(a, b) { return a.map((value, index) => value - b[index]); }
function scale(a, amount) { return a.map((value) => value * amount); }
function dot(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function normalize(value) {
  const length = Math.hypot(...value);
  return length > 0 ? scale(value, 1 / length) : [0, 1, 0];
}
function rotate(point, rotation) {
  let [x, y, z] = point;
  const [rx, ry, rz] = rotation;
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  return [x, y, z];
}

function createWeapon(id, muzzle) {
  const parts = new Map();
  const groupFor = (part, material) => {
    if (!parts.has(part)) parts.set(part, new Map());
    const materials = parts.get(part);
    if (!materials.has(material)) materials.set(material, { positions: [], normals: [], indices: [] });
    return materials.get(material);
  };
  const triangle = (part, material, a, b, c) => {
    const normal = normalize(cross(subtract(b, a), subtract(c, a)));
    const geometry = groupFor(part, material);
    const base = geometry.positions.length / 3;
    for (const point of [a, b, c]) {
      geometry.positions.push(...point);
      geometry.normals.push(...normal);
    }
    geometry.indices.push(base, base + 1, base + 2);
  };
  const quad = (part, material, a, b, c, d) => {
    triangle(part, material, a, b, c);
    triangle(part, material, a, c, d);
  };
  const box = (part, material, center, dimensions, rotation = [0, 0, 0]) => {
    const [hx, hy, hz] = dimensions.map((value) => value / 2);
    const local = [
      [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz],
      [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz],
    ];
    const corners = local.map((point) => add(center, rotate(point, rotation)));
    for (const face of [
      [0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4],
      [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5],
    ]) {
      quad(part, material, ...face.map((index) => corners[index]));
    }
  };
  const beam = (part, material, start, end, radius, sides = 8) => {
    const axis = normalize(subtract(end, start));
    const reference = Math.abs(axis[1]) < 0.86 ? [0, 1, 0] : [1, 0, 0];
    const basisA = normalize(cross(axis, reference));
    const basisB = normalize(cross(axis, basisA));
    const startRing = [];
    const endRing = [];
    for (let index = 0; index < sides; index += 1) {
      const angle = (index / sides) * Math.PI * 2;
      const radial = add(scale(basisA, Math.cos(angle)), scale(basisB, Math.sin(angle)));
      startRing.push(add(start, scale(radial, radius)));
      endRing.push(add(end, scale(radial, radius)));
    }
    for (let index = 0; index < sides; index += 1) {
      const next = (index + 1) % sides;
      quad(part, material, startRing[index], startRing[next], endRing[next], endRing[index]);
      triangle(part, material, start, startRing[next], startRing[index]);
      triangle(part, material, end, endRing[index], endRing[next]);
    }
  };

  if (id === "kara-barut-rifle") {
    box("Receiver", "Forged iron", [0, -0.005, 0.01], [0.2, 0.16, 0.42]);
    box("Receiver", "Brass", [0, 0.091, -0.02], [0.13, 0.025, 0.28]);
    box("Receiver", "Oiled walnut", [0, -0.02, 0.34], [0.17, 0.17, 0.43], [0.08, 0, 0]);
    box("Receiver", "Oiled walnut", [0, -0.025, -0.31], [0.135, 0.115, 0.29]);
    beam("Receiver", "Forged iron", [0, 0.015, -0.18], [0, 0.015, -0.88], 0.035, 10);
    beam("Receiver", "Brass", [0, 0.015, -0.84], [0, 0.015, -0.89], 0.052, 10);
    box("Receiver", "Forged iron", [0, 0.11, -0.64], [0.08, 0.12, 0.045]);
    box("Magazine", "Forged iron", [0, 0, 0], [0.105, 0.31, 0.16], [-0.12, 0, 0]);
    box("Magazine", "Brass", [0, -0.07, -0.01], [0.11, 0.035, 0.18]);
    box("Bolt", "Forged iron", [0.126, 0.01, 0], [0.055, 0.055, 0.16]);
    box("Bolt", "Brass", [0.155, 0.01, -0.01], [0.025, 0.045, 0.075]);
    muzzle.splice(0, 3, 0, 0.015, -0.91);
  } else if (id === "spark-pistol") {
    box("Receiver", "Forged iron", [0, 0.005, -0.07], [0.17, 0.115, 0.35]);
    box("Receiver", "Brass", [0, 0.076, -0.1], [0.13, 0.025, 0.22]);
    box("Receiver", "Oiled walnut", [0, -0.095, 0.1], [0.14, 0.22, 0.13], [0.16, 0, 0]);
    beam("Receiver", "Forged iron", [0, 0.025, -0.18], [0, 0.025, -0.41], 0.035, 9);
    box("Receiver", "Brass", [0, 0.07, -0.34], [0.07, 0.035, 0.045]);
    box("Magazine", "Forged iron", [0, 0, 0], [0.09, 0.19, 0.11]);
    box("Bolt", "Forged iron", [0, 0.075, 0], [0.145, 0.035, 0.24]);
    box("Bolt", "Brass", [0.081, 0.07, 0.03], [0.025, 0.045, 0.08]);
    muzzle.splice(0, 3, 0, 0.025, -0.43);
  } else if (id === "brokenstone-shotgun") {
    box("Receiver", "Forged iron", [0, 0, 0.04], [0.23, 0.17, 0.34]);
    box("Receiver", "Brass", [0, 0.095, 0.03], [0.14, 0.025, 0.2]);
    box("Receiver", "Oiled walnut", [0, -0.015, 0.39], [0.2, 0.17, 0.48], [0.1, 0, 0]);
    box("Receiver", "Oiled walnut", [0, -0.065, -0.25], [0.18, 0.14, 0.24]);
    beam("Receiver", "Forged iron", [-0.055, 0.03, -0.13], [-0.055, 0.03, -0.91], 0.035, 9);
    beam("Receiver", "Forged iron", [0.055, 0.03, -0.13], [0.055, 0.03, -0.91], 0.035, 9);
    beam("Receiver", "Brass", [0, -0.045, -0.14], [0, -0.045, -0.75], 0.028, 8);
    box("Bolt", "Oiled walnut", [0, -0.055, 0], [0.19, 0.09, 0.24]);
    box("Bolt", "Brass", [0, -0.1, -0.04], [0.15, 0.025, 0.13]);
    box("Magazine", "Forged iron", [0, -0.15, 0.01], [0.09, 0.16, 0.12]);
    muzzle.splice(0, 3, 0, 0.03, -0.94);
  } else if (id === "ash-crossbow") {
    box("Receiver", "Oiled walnut", [0, -0.005, -0.01], [0.15, 0.17, 0.85]);
    box("Receiver", "Forged iron", [0, 0.08, -0.2], [0.22, 0.055, 0.48]);
    box("Receiver", "Brass", [0, 0.13, -0.16], [0.075, 0.04, 0.24]);
    beam("Receiver", "Oiled walnut", [-0.62, 0.1, -0.37], [0.62, 0.1, -0.37], 0.045, 10);
    beam("Receiver", "Bow cord", [-0.58, 0.1, -0.37], [-0.05, 0.1, -0.37], 0.018, 7);
    beam("Receiver", "Bow cord", [0.58, 0.1, -0.37], [0.05, 0.1, -0.37], 0.018, 7);
    beam("Receiver", "Bow cord", [-0.55, 0.1, -0.37], [0, 0.1, -0.78], 0.009, 5);
    beam("Receiver", "Bow cord", [0.55, 0.1, -0.37], [0, 0.1, -0.78], 0.009, 5);
    box("Bolt", "Forged iron", [0, -0.11, -0.23], [0.075, 0.08, 0.26]);
    box("Magazine", "Oiled walnut", [0, -0.01, 0], [0.12, 0.12, 0.22]);
    beam("Arrow", "Bow cord", [0, 0, 0.25], [0, 0, -0.36], 0.008, 5);
    beam("Arrow", "Forged iron", [0, 0, -0.31], [0, 0, -0.4], 0.018, 6);
    muzzle.splice(0, 3, 0, 0.1, -0.81);
  } else if (id === "dusk-longbow") {
    const points = [
      [0, -0.76, -0.08], [0.055, -0.56, -0.12], [0.04, -0.32, -0.15], [0, 0, -0.18],
      [-0.04, 0.32, -0.15], [-0.055, 0.56, -0.12], [0, 0.76, -0.08],
    ];
    for (let index = 0; index < points.length - 1; index += 1) {
      beam("Receiver", "Oiled walnut", points[index], points[index + 1], index === 2 || index === 3 ? 0.052 : 0.037, 7);
    }
    box("Receiver", "Leather wrap", [0, 0, -0.18], [0.09, 0.24, 0.1]);
    beam("Receiver", "Bow cord", [0, -0.76, -0.17], [0, 0.76, -0.17], 0.006, 5);
    beam("Arrow", "Bow cord", [0, 0, 0.2], [0, 0, -0.46], 0.009, 5);
    beam("Arrow", "Brass", [0, 0, -0.41], [0, 0, -0.48], 0.019, 6);
    box("Arrow", "Leather wrap", [0, 0.02, 0.14], [0.085, 0.09, 0.08]);
    muzzle.splice(0, 3, 0, 0.02, -0.68);
  } else if (id === "war-room-shovel") {
    beam("Receiver", "Oiled walnut", [0, -0.64, 0], [0, 0.35, 0], 0.047, 8);
    box("Receiver", "Leather wrap", [0, -0.43, 0], [0.105, 0.2, 0.105]);
    beam("Receiver", "Forged iron", [0, 0.27, 0], [0, 0.39, 0], 0.062, 7);
    const bladeFront = [
      [-0.09, 0.31, -0.065], [0.09, 0.31, -0.065], [0.23, 0.54, -0.065],
      [0.145, 0.76, -0.065], [-0.145, 0.76, -0.065], [-0.23, 0.54, -0.065],
    ];
    const bladeBack = bladeFront.map(([x, y, z]) => [x, y, z + 0.09]);
    const bladeCenterFront = [0, 0.53, -0.065];
    const bladeCenterBack = [0, 0.53, 0.025];
    for (let index = 0; index < bladeFront.length; index += 1) {
      const next = (index + 1) % bladeFront.length;
      triangle("Receiver", "Forged iron", bladeCenterFront, bladeFront[index], bladeFront[next]);
      triangle("Receiver", "Forged iron", bladeCenterBack, bladeBack[next], bladeBack[index]);
      quad("Receiver", "Forged iron", bladeFront[index], bladeFront[next], bladeBack[next], bladeBack[index]);
    }
    box("Receiver", "Brass", [0, 0.31, -0.012], [0.19, 0.045, 0.13]);
    muzzle.splice(0, 3, 0, 0.53, -0.065);
  } else {
    throw new Error(`Unknown War Room weapon model: ${id}`);
  }
  return parts;
}

function createGlb(id, parts, muzzle) {
  const binary = [];
  const views = [];
  const accessors = [];
  const meshes = [];
  const nodes = [{ name: "WarRoomWeapon", children: [] }];
  const padBinary = () => {
    while (binary.length % 4) binary.push(0);
  };
  const addCompressedView = (bytes, decodedLength, viewStride, count, mode, target, compressionStride = viewStride) => {
    padBinary();
    const offset = binary.length;
    binary.push(...bytes);
    const view = { buffer: 0, byteOffset: 0, byteLength: decodedLength };
    if (viewStride) view.byteStride = viewStride;
    if (target) view.target = target;
    view.extensions = {
      EXT_meshopt_compression: {
        buffer: 0,
        byteOffset: offset,
        byteLength: bytes.length,
        ...(compressionStride ? { byteStride: compressionStride } : {}),
        count,
        mode,
        filter: "NONE",
      },
    };
    views.push(view);
    return views.length - 1;
  };

  for (const [partName, groups] of parts) {
    const primitives = [];
    for (const [material, geometry] of groups) {
      const vertexCount = geometry.positions.length / 3;
      const interleaved = new Float32Array(vertexCount * 6);
      for (let vertex = 0; vertex < vertexCount; vertex += 1) {
        interleaved.set(geometry.positions.slice(vertex * 3, vertex * 3 + 3), vertex * 6);
        interleaved.set(geometry.normals.slice(vertex * 3, vertex * 3 + 3), vertex * 6 + 3);
      }
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (const point of geometry.positions.reduce((all, value, index) => {
        if (index % 3 === 0) all.push([value]);
        else all.at(-1).push(value);
        return all;
      }, [])) {
        point.forEach((value, axis) => {
          min[axis] = Math.min(min[axis], value);
          max[axis] = Math.max(max[axis], value);
        });
      }
      const attributeView = addCompressedView(
        MeshoptEncoder.encodeGltfBuffer(new Uint8Array(interleaved.buffer), vertexCount, 24, "ATTRIBUTES"),
        interleaved.byteLength,
        24,
        vertexCount,
        "ATTRIBUTES",
        34962,
      );
      const positionAccessor = accessors.length;
      accessors.push({ bufferView: attributeView, byteOffset: 0, componentType: 5126, count: vertexCount, type: "VEC3", min, max });
      const normalAccessor = accessors.length;
      accessors.push({ bufferView: attributeView, byteOffset: 12, componentType: 5126, count: vertexCount, type: "VEC3" });
      const indices = new Uint16Array(geometry.indices);
      const indexView = addCompressedView(
        MeshoptEncoder.encodeGltfBuffer(new Uint8Array(indices.buffer), indices.length, 2, "TRIANGLES"),
        indices.byteLength,
        0,
        indices.length,
        "TRIANGLES",
        34963,
        2,
      );
      const indexAccessor = accessors.length;
      accessors.push({ bufferView: indexView, componentType: 5123, count: indices.length, type: "SCALAR" });
      primitives.push({ attributes: { POSITION: positionAccessor, NORMAL: normalAccessor }, indices: indexAccessor, material: materialIndex.get(material), mode: 4 });
    }
    const meshIndex = meshes.push({ name: `${id}-${partName}`, primitives }) - 1;
    const partNodeIndex = nodes.push({ name: partName, children: [nodes.length + 1] }) - 1;
    nodes.push({ name: `${partName}Geometry`, mesh: meshIndex });
    nodes[0].children.push(partNodeIndex);
  }
  nodes[0].children.push(nodes.push({ name: "Muzzle", translation: muzzle }) - 1);
  const bin = Buffer.from(binary);
  const document = {
    asset: { version: "2.0", generator: "Shafak low-poly weapon generator" },
    extensionsUsed: ["EXT_meshopt_compression"],
    extensionsRequired: ["EXT_meshopt_compression"],
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes,
    meshes,
    materials: materialDefs.map((material) => ({
      name: material.name,
      pbrMetallicRoughness: {
        baseColorFactor: material.color,
        metallicFactor: material.metallic,
        roughnessFactor: material.roughness,
      },
    })),
    accessors,
    bufferViews: views,
    buffers: [{ byteLength: bin.length }],
  };
  const json = Buffer.from(JSON.stringify(document));
  const jsonPadded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
  const binPadded = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
  const totalLength = 12 + 8 + jsonPadded.length + 8 + binPadded.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonPadded.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binPadded.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, jsonPadded, binHeader, binPadded]);
}

const modelSpecs = [
  { file: "kara-barut-rifle.glb", id: "kara-barut-rifle", muzzle: [0, 0, -0.9] },
  { file: "spark-pistol.glb", id: "spark-pistol", muzzle: [0, 0, -0.4] },
  { file: "brokenstone-shotgun.glb", id: "brokenstone-shotgun", muzzle: [0, 0, -0.9] },
  { file: "ash-crossbow.glb", id: "ash-crossbow", muzzle: [0, 0, -0.8] },
  { file: "dusk-longbow.glb", id: "dusk-longbow", muzzle: [0, 0, -0.7] },
  { file: "war-room-shovel.glb", id: "war-room-shovel", muzzle: [0, 0.53, -0.065] },
];

await MeshoptEncoder.ready;
fs.mkdirSync(outputDir, { recursive: true });
for (const spec of modelSpecs) {
  const bytes = createGlb(spec.id, createWeapon(spec.id, spec.muzzle), spec.muzzle);
  if (bytes.length >= limitBytes) throw new Error(`${spec.file} exceeds ${limitBytes} bytes (${bytes.length})`);
  fs.writeFileSync(path.join(outputDir, spec.file), bytes);
  console.log(`${spec.file}: ${bytes.length.toLocaleString()} bytes (Meshopt)`);
}
