const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function calculateWorldLightRadius(
  viewportWidth: number,
  level: number,
  relicCount: number,
) {
  const width = Math.max(1, Number.isFinite(viewportWidth) ? viewportWidth : 1);
  const progressionBonus = Math.max(0, Math.min(30, level - 1)) * 4
    + Math.max(0, Math.min(30, relicCount)) * 11;
  return clamp(width * .64 + progressionBonus, width * .64, width * .96);
}
