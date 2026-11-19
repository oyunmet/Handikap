import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  applyCharacterSurfaceDetail,
  CHARACTER_SURFACE_MAPS,
  ensureKnightGeometryUVs,
  KNIGHT_SURFACE_MAPS,
  KNIGHT_SURFACE_NORMAL_SCALE,
  resolveCharacterSurfaceKind,
} from "./knight-surface-detail.ts";

test("armor surface maps provide color, normal, and roughness detail", () => {
  assert.equal(KNIGHT_SURFACE_MAPS.color.image.width, 128);
  assert.equal(KNIGHT_SURFACE_MAPS.normal.image.width, 128);
  assert.equal(KNIGHT_SURFACE_MAPS.roughness.image.width, 128);
  assert.equal(KNIGHT_SURFACE_MAPS.color.colorSpace, THREE.SRGBColorSpace);
  assert.ok(KNIGHT_SURFACE_NORMAL_SCALE > 0);
});

test("missing character UVs are projected from mesh normals and bounds", () => {
  const geometry = new THREE.BoxGeometry(2, 3, 4);
  geometry.deleteAttribute("uv");

  assert.equal(ensureKnightGeometryUVs(geometry), true);
  assert.equal(geometry.getAttribute("uv").count, geometry.getAttribute("position").count);
  for (let index = 0; index < geometry.getAttribute("uv").count; index += 1) {
    const uv = geometry.getAttribute("uv");
    assert.ok(Number.isFinite(uv.getX(index)));
    assert.ok(Number.isFinite(uv.getY(index)));
    assert.ok(uv.getX(index) >= 0 && uv.getX(index) <= 1);
    assert.ok(uv.getY(index) >= 0 && uv.getY(index) <= 1);
  }
  assert.equal(ensureKnightGeometryUVs(geometry), false);
});

test("UV projection safely ignores geometry without positions", () => {
  assert.equal(ensureKnightGeometryUVs(new THREE.BufferGeometry()), false);
});

test("animated character materials receive the correct surface details", () => {
  assert.equal(resolveCharacterSurfaceKind("Hair"), "hair");
  assert.equal(resolveCharacterSurfaceKind("Leather_Boots"), "leather");
  assert.equal(resolveCharacterSurfaceKind("Armor"), "metal");
  assert.equal(resolveCharacterSurfaceKind("Eye_White"), null);

  const geometry = new THREE.BoxGeometry(1, 2, 1);
  geometry.deleteAttribute("uv");
  const authoredMap = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({
    map: authoredMap,
    roughness: 0.2,
    metalness: 0.5,
  });
  const initialMaterialVersion = material.version;

  assert.equal(applyCharacterSurfaceDetail(geometry, material, "cloth"), true);
  assert.ok(geometry.getAttribute("uv"));
  assert.equal(material.map, authoredMap, "authored color maps must be preserved");
  assert.equal(material.normalMap, CHARACTER_SURFACE_MAPS.cloth.normal);
  assert.equal(material.roughnessMap, CHARACTER_SURFACE_MAPS.cloth.roughness);
  assert.equal(material.roughness, 0.7);
  assert.equal(material.metalness, 0.08);
  assert.ok(material.version > initialMaterialVersion);

  geometry.dispose();
  material.dispose();
  authoredMap.dispose();
});
