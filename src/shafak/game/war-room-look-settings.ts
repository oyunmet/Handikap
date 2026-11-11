import { WAR_ROOM_CONFIG } from "./war-room-config";

const WAR_ROOM_LOOK_SENSITIVITY_KEY = "shafak.war-room-look-sensitivity";
const WAR_ROOM_LOOK_SENSITIVITY_X_KEY = `${WAR_ROOM_LOOK_SENSITIVITY_KEY}-horizontal`;
const WAR_ROOM_LOOK_SENSITIVITY_Y_KEY = `${WAR_ROOM_LOOK_SENSITIVITY_KEY}-vertical`;
const WAR_ROOM_AIM_ASSIST_KEY = "shafak.war-room-light-aim-assist";

export const WAR_ROOM_LOOK_SENSITIVITY_DEFAULT = 1;
export const WAR_ROOM_LOOK_SENSITIVITY_MIN = 0.6;
export const WAR_ROOM_LOOK_SENSITIVITY_MAX = 1.6;
export const WAR_ROOM_AIM_ASSIST_DEFAULT = true;

export function readWarRoomAimAssistEnabled() {
  if (typeof window === "undefined") return WAR_ROOM_AIM_ASSIST_DEFAULT;
  try {
    const stored = window.localStorage.getItem(WAR_ROOM_AIM_ASSIST_KEY);
    return stored === null ? WAR_ROOM_AIM_ASSIST_DEFAULT : stored === "true";
  } catch {
    return WAR_ROOM_AIM_ASSIST_DEFAULT;
  }
}

export function writeWarRoomAimAssistEnabled(enabled: boolean) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(WAR_ROOM_AIM_ASSIST_KEY, String(enabled));
    } catch {
      // The setting remains usable for the current session if storage is unavailable.
    }
  }
  return enabled;
}

export type WarRoomLookSensitivitySettings = {
  horizontal: number;
  vertical: number;
};

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

export function readWarRoomLookSensitivitySettings(): WarRoomLookSensitivitySettings {
  const legacy = readWarRoomLookSensitivity();
  if (typeof window === "undefined") return { horizontal: legacy, vertical: legacy };
  try {
    const horizontal = window.localStorage.getItem(WAR_ROOM_LOOK_SENSITIVITY_X_KEY);
    const vertical = window.localStorage.getItem(WAR_ROOM_LOOK_SENSITIVITY_Y_KEY);
    return {
      horizontal: horizontal === null ? legacy : normalizeWarRoomLookSensitivity(Number(horizontal)),
      vertical: vertical === null ? legacy : normalizeWarRoomLookSensitivity(Number(vertical)),
    };
  } catch {
    return { horizontal: legacy, vertical: legacy };
  }
}

export function writeWarRoomLookSensitivitySettings(
  settings: WarRoomLookSensitivitySettings,
): WarRoomLookSensitivitySettings {
  const normalized = {
    horizontal: normalizeWarRoomLookSensitivity(settings.horizontal),
    vertical: normalizeWarRoomLookSensitivity(settings.vertical),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(WAR_ROOM_LOOK_SENSITIVITY_X_KEY, String(normalized.horizontal));
      window.localStorage.setItem(WAR_ROOM_LOOK_SENSITIVITY_Y_KEY, String(normalized.vertical));
      window.localStorage.setItem(
        WAR_ROOM_LOOK_SENSITIVITY_KEY,
        String((normalized.horizontal + normalized.vertical) / 2),
      );
    } catch {
      // The setting remains usable for the current session if storage is unavailable.
    }
  }
  return normalized;
}

export function getWarRoomPointerSensitivity(
  viewportWidth: number,
  viewportHeight: number,
  multiplier: number | WarRoomLookSensitivitySettings = WAR_ROOM_LOOK_SENSITIVITY_DEFAULT,
) {
  const width = Math.max(1, viewportWidth);
  const height = Math.max(1, viewportHeight);
  const horizontal = normalizeWarRoomLookSensitivity(
    typeof multiplier === "number" ? multiplier : multiplier.horizontal,
  );
  const vertical = normalizeWarRoomLookSensitivity(
    typeof multiplier === "number" ? multiplier : multiplier.vertical,
  );
  return {
    x: WAR_ROOM_CONFIG.sensitivity.horizontal
      * (WAR_ROOM_CONFIG.sensitivity.referenceWidth / width)
      * horizontal,
    y: WAR_ROOM_CONFIG.sensitivity.vertical
      * (WAR_ROOM_CONFIG.sensitivity.referenceHeight / height)
      * vertical,
  };
}
