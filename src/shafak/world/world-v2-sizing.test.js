import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { WORLD_V2_CONFIG } from "./world-v2-config.ts";
import { clearWorldV2AssetCacheForTests, loadAsset } from "./world-v2-assets.ts";
import { fitObjectToTarget } from "./world-v2-sizing.ts";

function fittedHeight(root, targetHeight) {
  const fitted = fitObjectToTarget(root, { targetHeight });
  const measured = fitted.bounds.getSize(new THREE.Vector3()).y;
  assert.ok(
    Math.abs(measured - targetHeight) <= targetHeight * 0.1,
    `expected ${measured.toFixed(3)}m to be within 10% of ${targetHeight}m`,
  );
  return measured;
}

test("animation-aware fitting puts a normal GLB at the configured player/NPC height", () => {
  const source = new THREE.Group();
  source.name = "player-hero";
  source.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.65, 0.45), new THREE.MeshBasicMaterial()));
  assert.ok(Math.abs(fittedHeight(source, WORLD_V2_CONFIG.player.targetHeight) - 1.7) < 0.01);
});

test("loadAsset applies animation frame zero before returning a fitted GLB", async () => {
  const scene = new THREE.Group();
  const animatedMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1, 0.5), new THREE.MeshBasicMaterial());
  animatedMesh.name = "AnimatedMesh";
  scene.add(animatedMesh);
  const firstFrameScale = new THREE.VectorKeyframeTrack(
    "AnimatedMesh.scale",
    [0, 1],
    [2, 2, 2, 3, 3, 3],
  );
  const gltf = {
    scene,
    animations: [new THREE.AnimationClip("first-frame-test", 1, [firstFrameScale])],
  };

  clearWorldV2AssetCacheForTests();
  const prepared = await loadAsset("synthetic-player.glb", WORLD_V2_CONFIG.player, {
    loadAsync: async () => gltf,
  });
  assert.ok(Math.abs(prepared.dimensions.y - WORLD_V2_CONFIG.player.targetHeight) < 0.01);
  assert.ok(Math.abs(scene.scale.y - 0.85) < 0.01, "the pre-fit source was measured at animation frame zero");
  clearWorldV2AssetCacheForTests();
});

test("centimeter and 0.01 armature root scales are normalized before fitting", () => {
  const centimeterRoot = new THREE.Group();
  centimeterRoot.name = "Root";
  centimeterRoot.scale.setScalar(100);
  centimeterRoot.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.7, 0.5), new THREE.MeshBasicMaterial()));
  assert.ok(Math.abs(fittedHeight(centimeterRoot, 1.7) - 1.7) < 0.01);

  const smallUnitRoot = new THREE.Group();
  smallUnitRoot.name = "Armature";
  smallUnitRoot.scale.setScalar(0.01);
  smallUnitRoot.add(new THREE.Mesh(new THREE.BoxGeometry(50, 170, 40), new THREE.MeshBasicMaterial()));
  assert.ok(Math.abs(fittedHeight(smallUnitRoot, 1.7) - 1.7) < 0.01);
});

test("max-dimension sizing caps a generated asset at the configured rock size", () => {
  const rock = new THREE.Group();
  rock.add(new THREE.Mesh(new THREE.BoxGeometry(3, 2, 4), new THREE.MeshBasicMaterial()));
  const fitted = fitObjectToTarget(rock, { targetMaxDim: WORLD_V2_CONFIG.rock.targetMaxDim });
  const largest = Math.max(fitted.dimensions.x, fitted.dimensions.y, fitted.dimensions.z);
  assert.ok(Math.abs(largest - WORLD_V2_CONFIG.rock.targetMaxDim) < 0.01);
});
