import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { WAR_ROOM_WEAPONS } from "../game/war-room-data.ts";

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
  return { bytes, document };
}

test("all ranged War Room weapons use a model asset", () => {
  const ranged = WAR_ROOM_WEAPONS.filter((weapon) => weapon.weaponClass !== "melee");
  assert.ok(ranged.length > 0);
  for (const weapon of ranged) {
    assert.ok(weapon.modelFile, `${weapon.id} is missing its own rendered model`);
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
      assert.ok(gltf.scene.getObjectByName(part) instanceof THREE.Group, `${file} exposes ${part} as an animatable group`);
    }
  }
});
