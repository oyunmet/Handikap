import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  ensureKnightGeometryUVs,
  KNIGHT_SURFACE_MAPS,
  KNIGHT_SURFACE_NORMAL_SCALE,
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
