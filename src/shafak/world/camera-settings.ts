export type TravelCameraSettings = {
  height: number;
  distanceBehind: number;
  targetHeight: number;
  targetDistanceAhead: number;
  fieldOfView: number;
  runShake: number;
};

export const WORLD_CAMERA_NEAR = 0.6;
export const WORLD_SKY_RADIUS = 260;
export const WORLD_CAMERA_FAR = WORLD_SKY_RADIUS + 80;

export function getTravelCameraSettings(speed: number, touchRenderer: boolean): TravelCameraSettings {
  const safeSpeed = Number.isFinite(speed) ? Math.min(7, Math.max(0, speed)) : 0;
  if (touchRenderer) {
    // Keep the mobile camera ahead of the central spike trap when the player
    // reaches it, and avoid speed-dependent framing that moves the camera
    // back into the trap's geometry while running.
    return {
      height: 4.15,
      distanceBehind: 6.5,
      targetHeight: 1.25,
      targetDistanceAhead: 11.5,
      fieldOfView: 54,
      runShake: 0,
    };
  }

  return {
    height: 4.15 + safeSpeed * 0.045,
    distanceBehind: 10.2 + safeSpeed * 0.18,
    targetHeight: 1.25,
    targetDistanceAhead: 11.5,
    fieldOfView: 54 + safeSpeed * 0.7,
    runShake: Math.min(1, Math.max(0, (safeSpeed - 4.2) / 2.2)),
  };
}
