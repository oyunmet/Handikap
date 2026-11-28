import {
  normalizeWarRoomSavedProgress,
  type WarRoomSavedProgress,
} from "./war-room-rooms";

export const WAR_ROOM_STORAGE_KEYS = {
  gold: "shafak-war-room-gold-v1",
  roomProgress: "shafak-war-room-room-progress-v1",
  dailyCompletion: "shafak-war-room-daily-completed-v1",
} as const;

export type WarRoomStorage = Pick<Storage, "getItem" | "setItem">;

export function getWarRoomStorage(): WarRoomStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function recordWarRoomGold(
  storage: WarRoomStorage | null,
  amount: number,
): number | null {
  if (!storage) return null;
  try {
    const prior = Number(storage.getItem(WAR_ROOM_STORAGE_KEYS.gold) ?? "0");
    const total = (Number.isFinite(prior) ? Math.max(0, prior) : 0) + amount;
    storage.setItem(WAR_ROOM_STORAGE_KEYS.gold, String(total));
    return total;
  } catch {
    return null;
  }
}

export function readWarRoomRoomProgress(
  storage: WarRoomStorage | null,
): WarRoomSavedProgress {
  try {
    const serialized = storage?.getItem(WAR_ROOM_STORAGE_KEYS.roomProgress);
    return normalizeWarRoomSavedProgress(serialized ? JSON.parse(serialized) : null);
  } catch {
    return normalizeWarRoomSavedProgress(null);
  }
}

export function writeWarRoomRoomProgress(
  storage: WarRoomStorage | null,
  progress: WarRoomSavedProgress,
) {
  try {
    storage?.setItem(WAR_ROOM_STORAGE_KEYS.roomProgress, JSON.stringify(progress));
  } catch {
    // Keep the current session's counter available even if storage is disabled.
  }
}

export function readWarRoomDailyCompletionDayKey(
  storage: WarRoomStorage | null,
): string | null {
  try {
    return storage?.getItem(WAR_ROOM_STORAGE_KEYS.dailyCompletion) ?? null;
  } catch {
    return null;
  }
}

export function writeWarRoomDailyCompletionDayKey(
  storage: WarRoomStorage | null,
  dayKey: string,
) {
  try {
    storage?.setItem(WAR_ROOM_STORAGE_KEYS.dailyCompletion, dayKey);
  } catch {
    // Keep today's completion visible during this session if storage is disabled.
  }
}
