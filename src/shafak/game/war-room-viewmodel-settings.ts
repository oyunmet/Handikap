export type WarRoomWeaponSwayLevel = "off" | "low" | "normal";

export const WAR_ROOM_WEAPON_SWAY_KEY = "shafak.war-room-weapon-sway";
export const WAR_ROOM_ARMS_VISIBLE_KEY = "shafak.war-room-arms-visible";
export const WAR_ROOM_DEBUG_KEY = "shafak.war-room-debug";
export const WAR_ROOM_WEAPON_SWAY_DEFAULT: WarRoomWeaponSwayLevel = "low";
export const WAR_ROOM_ARMS_VISIBLE_DEFAULT = true;

export function readWarRoomArmsVisible() {
  if (typeof window === "undefined") return WAR_ROOM_ARMS_VISIBLE_DEFAULT;
  try {
    return window.localStorage.getItem(WAR_ROOM_ARMS_VISIBLE_KEY) !== "off";
  } catch {
    return WAR_ROOM_ARMS_VISIBLE_DEFAULT;
  }
}

export function writeWarRoomArmsVisible(visible: boolean) {
  const normalized = Boolean(visible);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(WAR_ROOM_ARMS_VISIBLE_KEY, normalized ? "on" : "off");
    } catch {
      // Keep the preference usable for this session if browser storage is unavailable.
    }
  }
  return normalized;
}

export function normalizeWarRoomWeaponSway(value: unknown): WarRoomWeaponSwayLevel {
  return value === "off" || value === "normal" || value === "low"
    ? value
    : WAR_ROOM_WEAPON_SWAY_DEFAULT;
}

export function readWarRoomWeaponSway(): WarRoomWeaponSwayLevel {
  if (typeof window === "undefined") return WAR_ROOM_WEAPON_SWAY_DEFAULT;
  try {
    return normalizeWarRoomWeaponSway(window.localStorage.getItem(WAR_ROOM_WEAPON_SWAY_KEY));
  } catch {
    return WAR_ROOM_WEAPON_SWAY_DEFAULT;
  }
}

export function writeWarRoomWeaponSway(value: unknown): WarRoomWeaponSwayLevel {
  const normalized = normalizeWarRoomWeaponSway(value);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(WAR_ROOM_WEAPON_SWAY_KEY, normalized);
    } catch {
      // Keep the preference usable for this session if browser storage is unavailable.
    }
  }
  return normalized;
}

export function readWarRoomDebugEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(WAR_ROOM_DEBUG_KEY) === "on";
  } catch {
    return false;
  }
}

export function writeWarRoomDebugEnabled(enabled: boolean) {
  const normalized = Boolean(enabled);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(WAR_ROOM_DEBUG_KEY, normalized ? "on" : "off");
    } catch {
      // Keep the toggle usable in this session if browser storage is unavailable.
    }
  }
  return normalized;
}
