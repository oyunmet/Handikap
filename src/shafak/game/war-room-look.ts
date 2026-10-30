export type WarRoomLookInput = { yaw: number; pitch: number };
export type WarRoomLookPointerType = "touch" | "mouse" | "pen";

export const WAR_ROOM_PITCH_MIN = -0.4;
export const WAR_ROOM_PITCH_MAX = 1;

export function normalizeWarRoomCameraYaw(yaw: number) {
  if (!Number.isFinite(yaw)) return 0;
  if (yaw >= -Math.PI && yaw <= Math.PI) return yaw;
  return Math.atan2(Math.sin(yaw), Math.cos(yaw));
}

export function clampWarRoomCameraPitch(pitch: number) {
  return Number.isFinite(pitch)
    ? Math.max(WAR_ROOM_PITCH_MIN, Math.min(WAR_ROOM_PITCH_MAX, pitch))
    : 0;
}

export function getWarRoomCameraAngles(yaw: number, pitch: number) {
  return {
    yaw: normalizeWarRoomCameraYaw(yaw),
    pitch: clampWarRoomCameraPitch(pitch),
  };
}

export function applyWarRoomLookDelta(
  input: WarRoomLookInput,
  dx: number,
  dy: number,
  sensitivity: number | { x: number; y: number },
  pointerType: WarRoomLookPointerType,
  invertTouchY = false,
) {
  const sensitivityX = typeof sensitivity === "number" ? sensitivity : sensitivity.x;
  const sensitivityY = typeof sensitivity === "number" ? sensitivity : sensitivity.y;
  input.yaw = normalizeWarRoomCameraYaw(input.yaw + dx * sensitivityX);
  const touchPitchSign = invertTouchY ? 1 : -1;
  const pitchDelta = dy * sensitivityY * (pointerType === "touch" ? touchPitchSign : 1);
  input.pitch = clampWarRoomCameraPitch(input.pitch + pitchDelta);
}
