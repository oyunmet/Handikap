import assert from "node:assert/strict";
import test from "node:test";
import { disposeWarRoomSceneResources } from "./war-room-dispose.ts";

function createRenderable({ instanced = false, materialCount = 1 } = {}) {
  const counts = { object: 0, geometry: 0, materials: Array(materialCount).fill(0) };
  const materials = counts.materials.map((_, index) => ({
    dispose: () => { counts.materials[index] += 1; },
  }));
  return {
    counts,
    object: {
      isInstancedMesh: instanced,
      dispose: () => { counts.object += 1; },
      geometry: { dispose: () => { counts.geometry += 1; } },
      material: materialCount === 1 ? materials[0] : materials,
    },
  };
}

test("room cleanup disposes pooled objects, their owned geometry, and every material", () => {
  const instanced = createRenderable({ instanced: true, materialCount: 2 });
  const line = createRenderable();
  disposeWarRoomSceneResources([
    { object: instanced.object },
    { object: line.object },
  ]);
  assert.deepEqual(instanced.counts, { object: 1, geometry: 1, materials: [1, 1] });
  assert.deepEqual(line.counts, { object: 0, geometry: 1, materials: [1] });
});

test("room cleanup preserves deliberately shared crack geometry", () => {
  const crack = createRenderable({ instanced: true });
  disposeWarRoomSceneResources([{ object: crack.object, disposeGeometry: false }]);
  assert.deepEqual(crack.counts, { object: 1, geometry: 0, materials: [1] });
});
