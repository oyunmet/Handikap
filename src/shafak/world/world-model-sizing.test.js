import assert from "node:assert/strict";
import test from "node:test";
import {
  getWorldAssetKind,
  getWorldAssetRepresentativeNode,
  getWorldAssetSizeTarget,
  getWorldCharacterFitScale,
  getWorldModelFit,
  getWorldModelFitScale,
  WORLD_MODEL_SIZE_TARGETS,
  WORLD_ROCK_OBSTACLE_DIMENSIONS,
} from "./world-model-sizing.ts";

test("world assets use one shared target table and select one barrel from the multi-prop bundle", () => {
  assert.equal(getWorldAssetKind("/assets/rock-wall.glb"), "rock");
  assert.equal(getWorldAssetKind("/assets/wooden-barrel.glb"), "barrel");
  assert.equal(getWorldAssetRepresentativeNode("/assets/wooden-barrel.glb"), "wooden_barrels_01_barrel01");
  assert.equal(getWorldAssetSizeTarget("/assets/treasure-chest.glb").maxDimension, 1.5);
  assert.equal(getWorldAssetSizeTarget("/assets/ceramic-vase.glb").targetHeight, 0.95);
});

test("rock dimensions are capped by the longest world-space axis, not just source height", () => {
  const fit = getWorldModelFit(
    { x: 0.169, y: 0.144, z: 0.32 },
    WORLD_MODEL_SIZE_TARGETS.rock,
  );
  assert.equal(fit.scale, 6.25);
  assert.deepEqual(
    [fit.dimensions.x, fit.dimensions.y, fit.dimensions.z].map((value) => Number(value.toFixed(3))),
    [1.056, 0.9, 2],
  );
  assert.equal(fit.maxInstanceScale, 1);
  assert.deepEqual(WORLD_ROCK_OBSTACLE_DIMENSIONS, {
    width: fit.dimensions.x,
    depth: fit.dimensions.z,
  });
});

test("character fitting keeps the target height unless an asset has an excessive footprint", () => {
  const target = WORLD_MODEL_SIZE_TARGETS.worldCharacter;
  assert.equal(getWorldCharacterFitScale({ x: 0.7, y: 1.8, z: 0.6 }, target), 1);
  assert.equal(getWorldCharacterFitScale({ x: 4.4, y: 1.8, z: 0.6 }, target), 0.6136363636363636);
});

test("all shared model targets stay within half the road width", () => {
  for (const target of Object.values(WORLD_MODEL_SIZE_TARGETS)) {
    assert.ok(target.maxDimension <= 4.6);
  }
  assert.equal(getWorldModelFitScale(
    { x: 8, y: 2, z: 0.3 },
    { targetHeight: 2, maxDimension: 8 },
  ), 4.6 / 8);
});
