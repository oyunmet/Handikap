import type { CityInput } from "./city-hub-layout";

export type CityCameraControl = {
  yaw: number;
  pitch: number;
};

export const CITY_CAMERA_MIN_PITCH = -0.38;
export const CITY_CAMERA_MAX_PITCH = 0.42;
export const CITY_CAMERA_LOOK_SENSITIVITY = 0.0052;
export const CITY_CAMERA_PITCH_SENSITIVITY = 0.004;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finiteOrZero = (value: number) => (Number.isFinite(value) ? value : 0);

export function normalizeCityCameraYaw(yaw: number) {
  const safeYaw = finiteOrZero(yaw);
  return Math.atan2(Math.sin(safeYaw), Math.cos(safeYaw));
}

export function stepCityCameraLook(
  current: CityCameraControl,
  deltaX: number,
  deltaY: number,
): CityCameraControl {
  const horizontalDelta = clamp(finiteOrZero(deltaX), -160, 160);
  const verticalDelta = clamp(finiteOrZero(deltaY), -160, 160);
  return {
    yaw: normalizeCityCameraYaw(
      finiteOrZero(current.yaw) + horizontalDelta * CITY_CAMERA_LOOK_SENSITIVITY,
    ),
    pitch: clamp(
      finiteOrZero(current.pitch) - verticalDelta * CITY_CAMERA_PITCH_SENSITIVITY,
      CITY_CAMERA_MIN_PITCH,
      CITY_CAMERA_MAX_PITCH,
    ),
  };
}

export function getCityMovementInput(input: CityInput, cameraYaw: number): CityInput {
  let x = clamp(finiteOrZero(input.x), -1, 1);
  let z = clamp(finiteOrZero(input.z), -1, 1);
  const magnitude = Math.hypot(x, z);
  if (magnitude > 1) {
    x /= magnitude;
    z /= magnitude;
  }

  const yaw = finiteOrZero(cameraYaw);
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  return {
    x: x * cosine - z * sine,
    z: x * sine + z * cosine,
  };
}
