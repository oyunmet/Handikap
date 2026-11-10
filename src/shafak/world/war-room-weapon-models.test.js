import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { WAR_ROOM_WEAPONS } from "../game/war-room-data.ts";
import { getWarRoomWeaponAnimationNode } from "./war-room-model-parts.ts";

const weaponDirectory = join(process.cwd(), "public", "models", "weapons");
const maxWeaponModelBytes = 150 * 1024;
const coreWeaponModels = [
  { id: "powder_rifle", file: "kara-barut-rifle.glb", movingParts: ["Magazine", "Bolt"] },
  { id: "sidearm", file: "spark-pistol.glb", movingParts: ["Magazine", "Bolt"] },
  { id: "scattergun", file: "brokenstone-shotgun.glb", movingParts: ["Magazine", "Bolt"] },
  { id: "crossbow", file: "ash-crossbow.glb", movingParts: ["Magazine", "Bolt", "Arrow"] },
  { id: "longbow", file: "dusk-longbow.glb", movingParts: ["Arrow"] },
];

function readGlb(file) {
  const bytes = readFileSync(join(weaponDirectory, file));
  assert.equal(bytes.toString("ascii", 0, 4), "glTF", `${file} has a GLB header`);
  assert.equal(bytes.readUInt32LE(4), 2, `${file} is GLB 2.0`);
  assert.equal(bytes.readUInt32LE(8), bytes.length, `${file} declares its byte length`);
  const jsonLength = bytes.readUInt32LE(12);
  const document = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
  const binaryStart = 20 + jsonLength + 8;
  return { bytes, document, binaryStart };
}

test("every War Room weapon uses a distinct model asset", () => {
  assert.ok(WAR_ROOM_WEAPONS.length > 0);
  assert.equal(
    new Set(WAR_ROOM_WEAPONS.map((weapon) => weapon.modelFile)).size,
    WAR_ROOM_WEAPONS.length,
    "every weapon has a distinct model file",
  );
  for (const weapon of WAR_ROOM_WEAPONS) {
    assert.ok(weapon.modelFile, `${weapon.id} is missing its own rendered model`);
  }
});

test("every weapon uses a compact Meshopt GLB with decodable geometry", async () => {
  await MeshoptDecoder.ready;
  for (const weapon of WAR_ROOM_WEAPONS) {
    const file = weapon.modelFile;
    assert.ok(file, `${weapon.id} needs a model file`);
    const modelPath = join(weaponDirectory, file);
    assert.ok(statSync(modelPath).size < maxWeaponModelBytes, `${file} stays below 150 KiB`);
    const { bytes, document, binaryStart } = readGlb(file);
    assert.ok(document.extensionsRequired?.includes("EXT_meshopt_compression"), `${file} uses Meshopt compression`);
    assert.ok(document.meshes?.length, `${file} contains visible geometry`);
    if (weapon.weaponClass !== "melee") {
      assert.ok(
        document.nodes.some((node) => /muzzle|barrel[_ -]?end/i.test(node.name ?? ""))
          || Number.isFinite(weapon.mount?.muzzleEnd),
        `${file} has an explicit muzzle marker or a configured muzzle endpoint`,
      );
    }
    const compressedViews = document.bufferViews.filter((view) => view.extensions?.EXT_meshopt_compression);
    assert.ok(compressedViews.length > 0, `${file} has compressed geometry streams`);
    for (const accessor of document.accessors) {
      if (accessor.bufferView == null) continue;
      assert.ok(
        document.bufferViews[accessor.bufferView]?.extensions?.EXT_meshopt_compression,
        `${file} keeps every geometry accessor in a compressed view`,
      );
    }
    for (const view of compressedViews) {
      const extension = view.extensions.EXT_meshopt_compression;
      const decoded = new Uint8Array(view.byteLength);
      const compressed = bytes.subarray(
        binaryStart + extension.byteOffset,
        binaryStart + extension.byteOffset + extension.byteLength,
      );
      assert.equal(compressed.length, extension.byteLength, `${file} compressed stream fits the GLB`);
      await MeshoptDecoder.decodeGltfBuffer(
        decoded,
        extension.count,
        extension.byteStride,
        compressed,
        extension.mode,
        extension.filter,
      );
      assert.ok(decoded.byteLength > 0, `${file} decodes to non-empty vertex/index data`);
    }
  }
});

test("core War Room weapons load Meshopt models with moving parts and muzzle markers", async () => {
  await MeshoptDecoder.ready;
  for (const { id, file, movingParts } of coreWeaponModels) {
    const weapon = WAR_ROOM_WEAPONS.find((entry) => entry.id === id);
    assert.equal(weapon?.modelFile, file, `${id} references its unique model`);
    assert.ok(statSync(join(weaponDirectory, file)).size < maxWeaponModelBytes, `${file} stays below 150 KiB`);

    const { bytes, document } = readGlb(file);
    assert.ok(document.extensionsRequired?.includes("EXT_meshopt_compression"), `${file} uses Meshopt compression`);
    assert.equal(document.images?.length ?? 0, 0, `${file} uses compact PBR materials instead of external textures`);
    assert.ok(document.meshes?.length, `${file} contains visible geometry`);
    for (const part of ["Muzzle", ...movingParts]) {
      assert.ok(document.nodes.some((node) => node.name === part), `${file} contains the ${part} node`);
    }

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const gltf = await new Promise((resolve, reject) => {
      loader.parse(arrayBuffer, "", resolve, reject);
    });
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    assert.ok(bounds.getSize(new THREE.Vector3()).length() > 0.1, `${file} decodes to non-empty 3D geometry`);
    assert.ok(gltf.scene.getObjectByName("Muzzle"), `${file} muzzle marker survives Meshopt decoding`);
    for (const part of movingParts) {
      const animationNode = gltf.scene.getObjectByName(part);
      assert.equal(getWarRoomWeaponAnimationNode(gltf.scene, part), animationNode);
      assert.ok(animationNode instanceof THREE.Object3D, `${file} exposes ${part} as an animation node`);
      assert.notEqual(animationNode.type, "Mesh", `${file} keeps ${part} separate from its visible geometry`);
      assert.ok(animationNode.children.length > 0, `${file} has movable children under ${part}`);
    }
  }
});
