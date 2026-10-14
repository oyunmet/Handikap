import assert from "node:assert/strict";
import test from "node:test";
import {
  fillWorldRoadTileZPositions,
  WORLD_ROAD_TILE_COUNT,
} from "./world-road-layout.ts";
import { WORLD_CAMERA_FAR } from "./camera-settings.ts";
import { WORLD_GATE_INTERVAL_METERS } from "./movement.ts";

test("camera-relative road tiles cover the full camera range through every gate", () => {
  const tilePositions = [];
  const cameraOffset = 8;
  const samples = [
    0,
    47.9,
    143.99,
    144,
    191.9,
    287.99,
    288,
    863.99,
    1023.99,
    1024,
    1152,
  ];

  for (const distance of samples) {
    const positions = fillWorldRoadTileZPositions(distance, distance, tilePositions);
    assert.equal(positions.length, WORLD_ROAD_TILE_COUNT);
    assert.ok(positions.every(Number.isFinite));
    for (let index = 1; index < positions.length; index += 1) {
      assert.ok(
        Math.abs(positions[index - 1] - positions[index] - WORLD_GATE_INTERVAL_METERS) < 1e-9,
      );
    }

    const nearestTileEdge = positions[0] + WORLD_GATE_INTERVAL_METERS / 2;
    const farthestTileEdge = positions.at(-1) - WORLD_GATE_INTERVAL_METERS / 2;
    assert.ok(nearestTileEdge >= cameraOffset, `road must extend behind the camera at ${distance} m`);
    assert.ok(
      farthestTileEdge <= -WORLD_CAMERA_FAR,
      `road must extend beyond the camera far plane at ${distance} m`,
    );
  }
});

test("road layout remains finite for invalid positions and reuses its output buffer", () => {
  const output = [999];
  const result = fillWorldRoadTileZPositions(Number.NaN, Number.POSITIVE_INFINITY, output);

  assert.equal(result, output);
  assert.equal(result.length, WORLD_ROAD_TILE_COUNT);
  assert.ok(result.every(Number.isFinite));
});
