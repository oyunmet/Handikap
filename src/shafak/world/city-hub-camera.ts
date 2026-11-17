import type { CityPosition } from "./city-hub-layout";

export type CityCameraVector = CityPosition & { y: number };

export type CityCameraFrame = {
  position: CityCameraVector;
  target: CityCameraVector;
};

const CAMERA_BACK_DISTANCE = 9.2;
const CAMERA_SIDE_OFFSET = 4.2;
const CAMERA_HEIGHT = 8.2;
const CAMERA_LOOK_AHEAD = 1.25;
const CAMERA_TARGET_HEIGHT = 1.15;

export function getCityCameraFrame(
  player: CityPosition,
  facing: CityPosition,
): CityCameraFrame {
  const facingLength = Math.hypot(facing.x, facing.z);
  const facingX = facingLength > 0.01 ? facing.x / facingLength : 0;
  const facingZ = facingLength > 0.01 ? facing.z / facingLength : -1;
  const rightX = -facingZ;
  const rightZ = facingX;

  return {
    position: {
      x: player.x - facingX * CAMERA_BACK_DISTANCE + rightX * CAMERA_SIDE_OFFSET,
      y: CAMERA_HEIGHT,
      z: player.z - facingZ * CAMERA_BACK_DISTANCE + rightZ * CAMERA_SIDE_OFFSET,
    },
    target: {
      x: player.x + facingX * CAMERA_LOOK_AHEAD,
      y: CAMERA_TARGET_HEIGHT,
      z: player.z + facingZ * CAMERA_LOOK_AHEAD,
    },
  };
}
