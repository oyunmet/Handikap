import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  createFacetedArmorPlateGeometry,
  createFacetedBootGeometry,
  createFacetedProfileGeometry,
  createHumanHeadGeometry,
  createHumanJointGeometry,
  createHumanLimbGeometry,
  createHumanTorsoGeometry,
} from "./human-character-geometry.ts";

function ringWidthAt(geometry, y) {
  const positions = geometry.getAttribute("position");
  const xs = [];
  for (let index = 0; index < positions.count; index += 1) {
    if (Math.abs(positions.getY(index) - y) < 1e-6) xs.push(positions.getX(index));
  }
  return xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
}

test("anatomical profiles have tapered muscle groups and articulated joint transitions", () => {
  const thigh = createHumanLimbGeometry("thigh");
  const forearm = createHumanLimbGeometry("forearm");
  const joint = createHumanJointGeometry();
  for (const geometry of [thigh, forearm, joint]) {
    assert.ok(geometry instanceof THREE.BufferGeometry);
    assert.ok(geometry.getAttribute("position").count >= 40);
    assert.ok(geometry.getIndex().count >= 100);
    assert.ok(geometry.boundingBox);
  }
  assert.ok(ringWidthAt(thigh, 0.05) > ringWidthAt(thigh, -0.5));
  assert.ok(ringWidthAt(forearm, 0.02) > ringWidthAt(forearm, -0.5));
  assert.ok(ringWidthAt(joint, 0) > ringWidthAt(joint, 0.5));

  const indices = thigh.getIndex();
  const positions = thigh.getAttribute("position");
  const a = new THREE.Vector3().fromBufferAttribute(positions, indices.getX(0));
  const b = new THREE.Vector3().fromBufferAttribute(positions, indices.getX(1));
  const c = new THREE.Vector3().fromBufferAttribute(positions, indices.getX(2));
  const normal = b.sub(a).cross(c.sub(a));
  assert.ok(normal.x * a.x + normal.z * a.z > 0, "limb surfaces should face outward");
});

test("torso and head profiles form a shoulder/chest silhouette with a narrower jaw", () => {
  const torso = createHumanTorsoGeometry();
  const head = createHumanHeadGeometry();
  assert.ok(ringWidthAt(torso, 0.18) > ringWidthAt(torso, -0.5));
  assert.ok(ringWidthAt(head, -0.08) > ringWidthAt(head, -0.5));
  assert.ok(torso.getAttribute("position").count > 50);
  assert.ok(head.getAttribute("position").count > 50);
});

test("boots and armor panels use faceted silhouettes rather than stock box and sphere shapes", () => {
  const boot = createFacetedBootGeometry();
  const chest = createFacetedArmorPlateGeometry(0.35, 0.34, 0.035);
  assert.ok(boot.getAttribute("position").count > 20);
  assert.ok(boot.boundingBox);
  assert.ok(
    boot.boundingBox.getSize(new THREE.Vector3()).z
      > boot.boundingBox.getSize(new THREE.Vector3()).x,
    "a boot's footprint should be longer front-to-back than it is wide",
  );
  assert.ok(chest.getAttribute("position").count > 20);
  assert.ok(chest.boundingBox.getSize(new THREE.Vector3()).z > 0);
});

test("invalid faceted profiles fail clearly rather than producing collapsed geometry", () => {
  assert.throws(
    () => createFacetedProfileGeometry([{ y: 0, width: 1, depth: 1 }]),
    /at least two sections/,
  );
  assert.throws(
    () => createFacetedProfileGeometry([
      { y: 0.5, width: 1, depth: 1 },
      { y: -0.5, width: 1, depth: 1 },
    ]),
    /ordered from bottom to top/,
  );
});
