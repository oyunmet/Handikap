import { WORLD_GATE_INTERVAL_METERS } from "./movement.ts";

export const WORLD_ROAD_TILE_COUNT = 6;

/**
 * Fill camera-relative Z positions for a short ring of road tiles.
 * The ring spans one gate interval behind and five ahead, so it remains
 * beyond the camera's far plane without relying on one giant clipped quad.
 */
export function fillWorldRoadTileZPositions(
  cameraX: number,
  distance: number,
  output: number[],
) {
  const safeCameraX = Number.isFinite(cameraX) ? cameraX : 0;
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  const gateStart = Math.floor(safeDistance / WORLD_GATE_INTERVAL_METERS) * WORLD_GATE_INTERVAL_METERS;
  const firstTileStart = gateStart - WORLD_GATE_INTERVAL_METERS;

  output.length = WORLD_ROAD_TILE_COUNT;
  for (let index = 0; index < WORLD_ROAD_TILE_COUNT; index += 1) {
    const tileCenter = firstTileStart + (index + 0.5) * WORLD_GATE_INTERVAL_METERS;
    output[index] = safeCameraX - tileCenter;
  }
  return output;
}
