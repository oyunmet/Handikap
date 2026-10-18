export type WorldLabelCandidate = {
  id: string;
  x: number;
  distance: number;
};

export const WORLD_LABEL_LIMIT = 5;
export const WORLD_LABEL_RANGE_METERS = 25;
export const WORLD_LABEL_MIN_DISTANCE_METERS = 3;
export const WORLD_LABEL_FADE_DISTANCE_METERS = 4.5;
export const WORLD_LABEL_MIN_SEPARATION_METERS = 3.5;

export function getWorldLabelOpacity(distance: number) {
  if (!Number.isFinite(distance) || distance <= WORLD_LABEL_MIN_DISTANCE_METERS) return 0;
  if (distance >= WORLD_LABEL_FADE_DISTANCE_METERS) return 1;
  const progress = (distance - WORLD_LABEL_MIN_DISTANCE_METERS)
    / (WORLD_LABEL_FADE_DISTANCE_METERS - WORLD_LABEL_MIN_DISTANCE_METERS);
  return progress * progress * (3 - 2 * progress);
}

export function getNearestWorldLabelIds(
  candidates: readonly WorldLabelCandidate[],
  playerX: number,
  playerDistance: number,
  limit = WORLD_LABEL_LIMIT,
  rangeMeters = WORLD_LABEL_RANGE_METERS,
): string[] {
  if (!Number.isFinite(playerX) || !Number.isFinite(playerDistance)) return [];

  const nearest = new Map<string, { distance: number; x: number; routeDistance: number }>();
  for (const candidate of candidates) {
    if (!candidate.id || !Number.isFinite(candidate.x) || !Number.isFinite(candidate.distance)) continue;
    const distance = Math.hypot(candidate.x - playerX, candidate.distance - playerDistance);
    if (distance < WORLD_LABEL_MIN_DISTANCE_METERS || distance > rangeMeters) continue;
    const previous = nearest.get(candidate.id);
    if (previous === undefined || distance < previous.distance) {
      nearest.set(candidate.id, { distance, x: candidate.x, routeDistance: candidate.distance });
    }
  }

  const ordered = Array.from(nearest, ([id, candidate]) => ({ id, ...candidate }))
    .sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id))
    .slice(0, Math.max(0, Math.floor(limit)) * 3);
  const selected: typeof ordered = [];
  for (const candidate of ordered) {
    const crowdsAnotherLabel = selected.some((other) => Math.hypot(
      candidate.x - other.x,
      candidate.routeDistance - other.routeDistance,
    ) < WORLD_LABEL_MIN_SEPARATION_METERS);
    if (!crowdsAnotherLabel) selected.push(candidate);
    if (selected.length >= Math.max(0, Math.floor(limit))) break;
  }
  return selected.map(({ id }) => id);
}
