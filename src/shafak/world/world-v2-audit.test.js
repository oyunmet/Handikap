import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { auditWorldMeshSizes } from "./world-v2-audit.ts";
import {
  createWorldRoadEnvironment,
  positionWorldRoadEnvironment,
  WORLD_ROAD_TILE_LENGTH,
} from "./world-road-environment.ts";

function countInstances(root, name) {
  let total = 0;
  root.traverse((object) => {
    if (object instanceof THREE.InstancedMesh && object.name === name) total += object.count;
  });
  return total;
}

test("rebuilt 3D road environment has a recycled, size-audited scene ring", () => {
  const environment = createWorldRoadEnvironment();
  const lowQualityEnvironment = createWorldRoadEnvironment(true, "low");
  try {
    const issues = auditWorldMeshSizes(environment.root);
    assert.equal(environment.segments.length, 17);
    assert.equal(environment.mountainLayers.length, 3);
    assert.deepEqual(issues, []);

    positionWorldRoadEnvironment(environment, WORLD_ROAD_TILE_LENGTH * 4.25, 51, 1.5);
    assert.equal(environment.segments[2].root.position.z, -3);
    assert.ok(Math.abs(environment.mountainLayers[0].root.position.x - 1.05) < 1e-9);
    environment.updatePalette(450, "rain");
    assert.ok(environment.root.children.some((child) => child.name === "world-horizon-layer-2"));
    assert.ok(countInstances(environment.segments[0].root, "world-road-tree-trunks")
      > countInstances(lowQualityEnvironment.segments[0].root, "world-road-tree-trunks"));
    assert.ok(countInstances(environment.segments[0].root, "world-roadside-rocks")
      > countInstances(lowQualityEnvironment.segments[0].root, "world-roadside-rocks"));
    assert.ok(countInstances(environment.segments[0].root, "world-roadside-grass")
      > countInstances(lowQualityEnvironment.segments[0].root, "world-roadside-grass"));
    assert.ok(environment.segments.some(({ root }) => root.getObjectByName("world-road-broken-fence")));
  } finally {
    environment.dispose();
    lowQualityEnvironment.dispose();
  }
});

test("world-size audit checks each InstancedMesh scale", () => {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial();
  const instances = new THREE.InstancedMesh(geometry, material, 1);
  const matrix = new THREE.Matrix4().makeScale(13, 1, 1);
  instances.setMatrixAt(0, matrix);
  root.add(instances);

  const issues = auditWorldMeshSizes(root);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].instanceId, 0);
  assert.equal(issues[0].error, true);
  assert.equal(issues[0].maxDimension, 13);
  geometry.dispose();
  material.dispose();
});
