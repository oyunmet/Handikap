export type WarRoomLookInput = { yaw: number; pitch: number };
export type WarRoomLookPointerType = "touch" | "mouse" | "pen";

export const WAR_ROOM_PITCH_MIN = -0.56;
export const WAR_ROOM_PITCH_MAX = 0.55;

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
  input.yaw += dx * sensitivityX;
  const touchPitchSign = invertTouchY ? 1 : -1;
  const pitchDelta = dy * sensitivityY * (pointerType === "touch" ? touchPitchSign : 1);
  input.pitch = Math.max(WAR_ROOM_PITCH_MIN, Math.min(WAR_ROOM_PITCH_MAX, input.pitch + pitchDelta));
}
