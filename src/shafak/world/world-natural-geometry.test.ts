import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import {
  createConnectedRidgeGeometry,
  createRoadShoulderGeometry,
  getLandmarkGeometry,
  getNaturalRockGeometry,
  getNaturalTreeGeometry,
  WORLD_RIDGE_BASE_DISTANCE_METERS,
  WORLD_RIDGE_LAYER_SPACING_METERS,
} from "./world-natural-geometry.ts";

function assertFiniteAttribute(attribute: THREE.BufferAttribute) {
  for (let index = 0; index < attribute.count; index += 1) {
    assert.ok(Number.isFinite(attribute.getX(index)));
    if (attribute.itemSize > 1) assert.ok(Number.isFinite(attribute.getY(index)));
    if (attribute.itemSize > 2) assert.ok(Number.isFinite(attribute.getZ(index)));
  }
}

test("connected mountain geometry stays a distant skyline instead of filling the camera view", () => {
  const geometry = createConnectedRidgeGeometry(0x45a21, 2);
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;
  geometry.computeBoundingBox();

  assertFiniteAttribute(positions);
  assert.ok(normals.getZ(0) > 0, "the terrain front should face the camera");
  assert.ok(geometry.index);
  assert.equal(geometry.index.count / 3, 384);
  assert.ok(geometry.boundingBox);
  assert.ok(geometry.boundingBox.min.y >= -3.5);
  assert.ok(geometry.boundingBox.max.y < 11.2);
  assert.ok(geometry.boundingBox.max.z - geometry.boundingBox.min.z < 12);
  assert.ok(geometry.boundingBox.max.x - geometry.boundingBox.min.x > 419);

  const camera = new THREE.PerspectiveCamera(60, 0.5, 0.35, 1_200);
  camera.position.set(0, 2.2, 4.5);
  camera.lookAt(0, 1.15, -11.5);
  camera.updateMatrixWorld(true);
  const ridge = new THREE.Mesh(geometry);
  ridge.position.z = -WORLD_RIDGE_BASE_DISTANCE_METERS - 2 * WORLD_RIDGE_LAYER_SPACING_METERS;
  ridge.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(ridge);
  const projectedHeights = [
    new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
    new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
    new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
    new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
    new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
    new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
    new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
    new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z),
  ].map((corner) => corner.project(camera).y);
  const projectedCoverage = (Math.max(...projectedHeights) - Math.min(...projectedHeights)) / 2;
  assert.ok(projectedCoverage < 0.15, `ridge covers ${projectedCoverage.toFixed(3)} of the screen height`);

  const repeated = createConnectedRidgeGeometry(0x45a21, 1);
  const different = createConnectedRidgeGeometry(0x92a51, 1);
  assert.deepEqual(
    Array.from(positions.array),
    Array.from(repeated.getAttribute("position").array),
    "the connected skyline should be stable across renders",
  );
  assert.notDeepEqual(
    Array.from(positions.array),
    Array.from(different.getAttribute("position").array),
    "different biome layers should use distinct terrain profiles",
  );
  const balanced = createConnectedRidgeGeometry(0x45a21, 1, "balanced");
  const low = createConnectedRidgeGeometry(0x45a21, 1, "low");
  assert.ok(balanced.index && low.index);
  assert.ok(low.index.count < balanced.index.count);
  assert.ok(balanced.index.count < geometry.index.count);
  geometry.dispose();
  repeated.dispose();
  different.dispose();
  balanced.dispose();
  low.dispose();
});

test("tree species and biome variants produce bounded, colored single-mesh geometry", () => {
  const species = ["ash", "pine", "skeletal", "mangrove"] as const;
  const biomes = ["ash-road", "frozen-pass", "red-marsh"] as const;

  for (const tree of species) {
    for (const biome of biomes) {
      const geometry = getNaturalTreeGeometry(tree, biome);
      const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
      const colors = geometry.getAttribute("color") as THREE.BufferAttribute;
      assert.ok(positions.count > 100);
      assert.ok(positions.count < 2_500);
      assert.equal(colors.count, positions.count);
      assert.ok(geometry.index);
      assertFiniteAttribute(positions);
      assertFiniteAttribute(colors);
    }
  }

  const pine = getNaturalTreeGeometry("pine", "frozen-pass");
  pine.computeBoundingBox();
  assert.ok(pine.boundingBox);
  assert.ok(pine.boundingBox.max.y > 4.8);
  assert.equal(
    getNaturalTreeGeometry("pine", "frozen-pass"),
    pine,
    "identical scenery variants should reuse their cached geometry",
  );
  assert.notEqual(
    getNaturalTreeGeometry("ash", "ash-road"),
    getNaturalTreeGeometry("ash", "red-marsh"),
    "biome variants should retain separate baked foliage palettes",
  );
});

test("procedural rock fallbacks are rounded, high-detail, finite, and reused by variant", () => {
  const rock = getNaturalRockGeometry(2);
  const positions = rock.getAttribute("position") as THREE.BufferAttribute;
  const normals = rock.getAttribute("normal") as THREE.BufferAttribute;
  const otherVariant = getNaturalRockGeometry(3);
  rock.computeBoundingBox();

  assert.ok(positions.count >= 800);
  assert.ok(rock.index);
  assert.ok(rock.index.count / 3 > 1_400);
  assert.ok(rock.boundingBox);
  assert.ok(rock.boundingBox.min.y < -0.8);
  assert.ok(rock.boundingBox.max.y > 0.8);
  assertFiniteAttribute(positions);
  assertFiniteAttribute(normals);
  for (let index = 0; index < normals.count; index += 1) {
    const length = Math.hypot(normals.getX(index), normals.getY(index), normals.getZ(index));
    assert.ok(length > 0.98 && length < 1.02);
  }
  assert.equal(getNaturalRockGeometry(2), rock);
  assert.notEqual(otherVariant, rock);
  assert.notDeepEqual(Array.from(otherVariant.getAttribute("position").array), Array.from(positions.array));
});

test("towers, carved columns, broken ruins and arches have weathered profiles per biome", () => {
  const kinds = ["tower", "column", "ruin", "arch"] as const;
  const biomes = ["ash-road", "frozen-pass", "red-marsh"] as const;
  const bounds = new Map<string, THREE.Box3>();

  for (const kind of kinds) {
    for (const biome of biomes) {
      const geometry = getLandmarkGeometry(kind, biome);
      const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
      const colors = geometry.getAttribute("color") as THREE.BufferAttribute;
      assert.ok(positions.count > 100);
      if (kind === "tower") assert.ok(geometry.index);
      assert.equal(colors.count, positions.count);
      assertFiniteAttribute(positions);
      assertFiniteAttribute(colors);
      geometry.computeBoundingBox();
      assert.ok(geometry.boundingBox);
      bounds.set(kind, geometry.boundingBox);
    }
  }

  const tower = bounds.get("tower");
  const ruin = bounds.get("ruin");
  const arch = bounds.get("arch");
  assert.ok(tower && ruin && arch);
  assert.ok(tower.max.y > 4.5);
  assert.ok(ruin.max.y < 4);
  assert.ok(arch.max.y > 4.4);
  assert.ok(ruin.max.x - ruin.min.x > arch.max.x - arch.min.x);
  assert.notEqual(getLandmarkGeometry("tower", "ash-road"), getLandmarkGeometry("ruin", "ash-road"));
  assert.equal(getLandmarkGeometry("arch", "frozen-pass"), getLandmarkGeometry("arch", "frozen-pass"));
});

test("road-edge shoulder geometry follows the quality budget and stays outside the lane", () => {
  const low = createRoadShoulderGeometry("low");
  const balanced = createRoadShoulderGeometry("balanced");
  const high = createRoadShoulderGeometry("high");

  assert.ok(low.index && balanced.index && high.index);
  assert.ok(low.index.count < balanced.index.count);
  assert.ok(balanced.index.count < high.index.count);
  for (const geometry of [low, balanced, high]) {
    const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
    const colors = geometry.getAttribute("color") as THREE.BufferAttribute;
    const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
    assert.equal(colors.count, positions.count);
    assert.equal(uv.count, positions.count);
    assertFiniteAttribute(positions);
    assertFiniteAttribute(colors);
    for (let index = 0; index < positions.count; index += 1) {
      assert.ok(Math.abs(positions.getX(index)) >= 7.09);
    }
    geometry.dispose();
  }
});
