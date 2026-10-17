export type WorldLabelCandidate = {
  id: string;
  x: number;
  distance: number;
};

export const WORLD_LABEL_LIMIT = 6;
export const WORLD_LABEL_RANGE_METERS = 20;

export function getNearestWorldLabelIds(
  candidates: readonly WorldLabelCandidate[],
  playerX: number,
  playerDistance: number,
  limit = WORLD_LABEL_LIMIT,
  rangeMeters = WORLD_LABEL_RANGE_METERS,
): string[] {
  if (!Number.isFinite(playerX) || !Number.isFinite(playerDistance)) return [];

  const nearest = new Map<string, number>();
  for (const candidate of candidates) {
    if (!candidate.id || !Number.isFinite(candidate.x) || !Number.isFinite(candidate.distance)) continue;
    const distance = Math.hypot(candidate.x - playerX, candidate.distance - playerDistance);
    if (distance > rangeMeters) continue;
    const previous = nearest.get(candidate.id);
    if (previous === undefined || distance < previous) nearest.set(candidate.id, distance);
  }

  return Array.from(nearest, ([id, distance]) => ({ id, distance }))
    .sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id))
    .slice(0, Math.max(0, Math.floor(limit)))
    .map(({ id }) => id);
}
