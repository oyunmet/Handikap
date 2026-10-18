export type TravelCameraSettings = {
  height: number;
  distanceBehind: number;
  targetHeight: number;
  targetDistanceAhead: number;
  fieldOfView: number;
  runShake: number;
};

export const WORLD_CAMERA_NEAR = 0.35;
export const WORLD_SKY_RADIUS = 260;
export const WORLD_CAMERA_FAR = WORLD_SKY_RADIUS + 80;
export const WORLD_CAMERA_COLLISION_MARGIN = 0.4;
export const WORLD_CAMERA_MIN_COLLISION_DISTANCE = 0.55;

export function getCameraClearanceDistance(
  cameraDistance: number,
  obstructionDistance?: number,
) {
  if (!Number.isFinite(cameraDistance) || cameraDistance <= 0) return 0;
  if (
    typeof obstructionDistance !== "number"
    || !Number.isFinite(obstructionDistance)
    || obstructionDistance >= cameraDistance
  ) {
    return cameraDistance;
  }
  return Math.max(
    WORLD_CAMERA_MIN_COLLISION_DISTANCE,
    obstructionDistance - WORLD_CAMERA_COLLISION_MARGIN,
  );
}

export function getTravelCameraSettings(speed: number, touchRenderer: boolean): TravelCameraSettings {
  const safeSpeed = Number.isFinite(speed) ? Math.min(7, Math.max(0, speed)) : 0;
  if (touchRenderer) {
    return {
      height: 2.2,
      distanceBehind: 4.5,
      targetHeight: 1.15,
      targetDistanceAhead: 11.5,
      fieldOfView: 74,
      runShake: 0,
    };
  }

  return {
    height: 2.2 + safeSpeed * 0.015,
    distanceBehind: 4.5 + safeSpeed * 0.04,
    targetHeight: 1.15,
    targetDistanceAhead: 11.5,
    fieldOfView: 74 + safeSpeed * 0.35,
    runShake: Math.min(1, Math.max(0, (safeSpeed - 4.2) / 2.2)),
  };
}
