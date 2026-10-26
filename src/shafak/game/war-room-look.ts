export type WarRoomLookInput = { yaw: number; pitch: number };
export type WarRoomLookPointerType = "touch" | "mouse" | "pen";

export const WAR_ROOM_PITCH_MIN = -0.56;
export const WAR_ROOM_PITCH_MAX = 0.55;

export function applyWarRoomLookDelta(
  input: WarRoomLookInput,
  dx: number,
  dy: number,
  sensitivity: number,
  pointerType: WarRoomLookPointerType,
  invertTouchY = false,
) {
  input.yaw += dx * sensitivity;
  const touchPitchSign = invertTouchY ? 1 : -1;
  const pitchDelta = dy * sensitivity * (pointerType === "touch" ? touchPitchSign : 1);
  input.pitch = Math.max(WAR_ROOM_PITCH_MIN, Math.min(WAR_ROOM_PITCH_MAX, input.pitch + pitchDelta));
}
