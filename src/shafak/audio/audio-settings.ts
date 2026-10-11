export const DEFAULT_SOUND_VOLUME = 0.78;
export const DEFAULT_MUSIC_VOLUME = 0.45;

export function normalizeAudioVolume(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}
