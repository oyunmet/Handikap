export type TimeOfDayMode = "auto" | "day" | "sunset" | "night";

export const TIME_OF_DAY_CYCLE_MS = 6 * 60 * 1_000;
export const TIME_OF_DAY_SETTING_EVENT = "shafak-time-of-day-change";
export const TIME_OF_DAY_STAR_COUNT = 120;
const TIME_OF_DAY_STORAGE_KEY = "shafak-world-time-of-day";

let currentMode: TimeOfDayMode = "auto";

export function getNextTimeOfDayMode(mode: TimeOfDayMode): TimeOfDayMode {
  if (mode === "auto") return "day";
  if (mode === "day") return "night";
  return "auto";
}

export function normalizeTimeOfDayMode(value: unknown): TimeOfDayMode {
  return value === "day" || value === "sunset" || value === "night" ? value : "auto";
}

export function getTimeOfDayModeOverride(search: string): TimeOfDayMode | null {
  const raw = new URLSearchParams(search).get("time")?.trim().toLocaleLowerCase("tr-TR");
  if (!raw) return null;
  if (raw === "gece" || raw === "night") return "night";
  if (raw === "gunduz" || raw === "gündüz" || raw === "day") return "day";
  if (raw === "gunbatimi" || raw === "günbatımı" || raw === "sunset") return "sunset";
  if (raw === "otomatik" || raw === "auto") return "auto";
  return null;
}

export function resolveTimeOfDayMode(search: string, savedMode: unknown): TimeOfDayMode {
  return getTimeOfDayModeOverride(search) ?? normalizeTimeOfDayMode(savedMode);
}

export function getTimeOfDayPhase(nowMs: number, mode: TimeOfDayMode): number {
  if (mode === "day") return 0.04;
  if (mode === "sunset") return 0.25;
  if (mode === "night") return 0.5;
  const elapsed = ((Number.isFinite(nowMs) ? nowMs : 0) % TIME_OF_DAY_CYCLE_MS + TIME_OF_DAY_CYCLE_MS)
    % TIME_OF_DAY_CYCLE_MS;
  return elapsed / TIME_OF_DAY_CYCLE_MS;
}

export function getTimeOfDaySunAltitude(phase: number): number {
  return Math.sin(phase * Math.PI * 2 + Math.PI / 2);
}

export function getTimeOfDayDaylight(phase: number): number {
  return (getTimeOfDaySunAltitude(phase) + 1) / 2;
}

export function getTimeOfDayTwilight(phase: number): number {
  const wrapped = ((phase % 1) + 1) % 1;
  const sunset = Math.max(0, 1 - Math.abs(wrapped - 0.25) / 0.12);
  const dawn = Math.max(0, 1 - Math.abs(wrapped - 0.75) / 0.12);
  return Math.max(sunset, dawn);
}

export function getTimeOfDayLabel(phase: number): "GÜNDÜZ" | "GÜN BATIMI" | "GECE" | "ŞAFAK" {
  const wrapped = ((phase % 1) + 1) % 1;
  if (wrapped < 0.25) return "GÜNDÜZ";
  if (wrapped < 0.5) return "GÜN BATIMI";
  if (wrapped < 0.75) return "GECE";
  return "ŞAFAK";
}

export function getTimeOfDayLightingState(phase: number) {
  const wrapped = ((Number.isFinite(phase) ? phase : 0) % 1 + 1) % 1;
  const daylight = getTimeOfDayDaylight(wrapped);
  const twilight = getTimeOfDayTwilight(wrapped);
  const altitude = getTimeOfDaySunAltitude(wrapped);
  const angle = wrapped * Math.PI * 2;
  const horizonDistance = Math.sqrt(Math.max(0, 1 - altitude * altitude));
  return {
    phase: wrapped,
    daylight,
    twilight,
    night: 1 - daylight,
    altitude,
    lightScale: {
      directional: 0.8 + daylight * 0.2,
      hemisphere: 0.9 + daylight * 0.1,
      ambient: 0.92 + daylight * 0.08,
    },
    sunDirection: {
      x: Math.cos(angle) * horizonDistance,
      y: altitude,
      z: Math.sin(angle) * horizonDistance,
    },
    fogColor: {
      r: 0.13 + daylight * 0.48 + twilight * 0.2,
      g: 0.2 + daylight * 0.38 + twilight * 0.12,
      b: 0.32 + daylight * 0.28 - twilight * 0.04,
    },
  };
}

export function getCurrentTimeOfDayMode(): TimeOfDayMode {
  if (typeof window !== "undefined") {
    try {
      const savedMode = window.localStorage.getItem(TIME_OF_DAY_STORAGE_KEY);
      if (savedMode) currentMode = normalizeTimeOfDayMode(savedMode);
    } catch {
      // The active mode still works for this session when storage is unavailable.
    }
  }
  return currentMode;
}

export function setCurrentTimeOfDayMode(value: unknown): TimeOfDayMode {
  currentMode = normalizeTimeOfDayMode(value);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(TIME_OF_DAY_STORAGE_KEY, currentMode);
    } catch {
      // Keep the in-memory setting and notify the scene even if it cannot persist.
    }
    window.dispatchEvent(new CustomEvent(TIME_OF_DAY_SETTING_EVENT, { detail: currentMode }));
  }
  return currentMode;
}

export function subscribeToTimeOfDayMode(listener: (mode: TimeOfDayMode) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handleChange = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail;
    listener(normalizeTimeOfDayMode(detail));
  };
  window.addEventListener(TIME_OF_DAY_SETTING_EVENT, handleChange);
  return () => window.removeEventListener(TIME_OF_DAY_SETTING_EVENT, handleChange);
}
