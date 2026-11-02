const WAR_ROOM_LOOK_SENSITIVITY_KEY = "shafak.war-room-look-sensitivity";

export const WAR_ROOM_LOOK_SENSITIVITY_DEFAULT = 1;
export const WAR_ROOM_LOOK_SENSITIVITY_MIN = 0.6;
export const WAR_ROOM_LOOK_SENSITIVITY_MAX = 1.6;

export function normalizeWarRoomLookSensitivity(value: number) {
  return Number.isFinite(value)
    ? Math.max(WAR_ROOM_LOOK_SENSITIVITY_MIN, Math.min(WAR_ROOM_LOOK_SENSITIVITY_MAX, value))
    : WAR_ROOM_LOOK_SENSITIVITY_DEFAULT;
}

export function readWarRoomLookSensitivity() {
  if (typeof window === "undefined") return WAR_ROOM_LOOK_SENSITIVITY_DEFAULT;
  try {
    const stored = window.localStorage.getItem(WAR_ROOM_LOOK_SENSITIVITY_KEY);
    if (stored === null) return WAR_ROOM_LOOK_SENSITIVITY_DEFAULT;
    return normalizeWarRoomLookSensitivity(Number(stored));
  } catch {
    return WAR_ROOM_LOOK_SENSITIVITY_DEFAULT;
  }
}

export function writeWarRoomLookSensitivity(value: number) {
  const normalized = normalizeWarRoomLookSensitivity(value);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(WAR_ROOM_LOOK_SENSITIVITY_KEY, String(normalized));
    } catch {
      // The setting remains usable for the current session if storage is unavailable.
    }
  }
  return normalized;
}

export function getWarRoomPointerSensitivity(
  viewportWidth: number,
  viewportHeight: number,
  multiplier = WAR_ROOM_LOOK_SENSITIVITY_DEFAULT,
) {
  const width = Math.max(1, viewportWidth);
  const height = Math.max(1, viewportHeight);
  const scale = normalizeWarRoomLookSensitivity(multiplier);
  return {
    x: 0.007 * (720 / width) * scale,
    y: 0.0045 * (420 / height) * scale,
  };
}
