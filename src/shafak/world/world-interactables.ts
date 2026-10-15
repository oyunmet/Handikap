export type InteractableKind = "chest" | "breakable" | "rival";
export type InteractableState = "active" | "opened" | "destroyed";

export const RIVAL_DIALOGUE_RANGE_METERS = 4.8;
export const RIVAL_CHALLENGE_RANGE_METERS = 3.4;

export type InteractableMesh = {
  visible: boolean;
  parent: InteractableMesh | null;
};

export type WorldInteractable<T> = {
  id: string;
  kind: InteractableKind;
  x: number;
  distance: number;
  radius: number;
  lateralRadius: number;
  state: InteractableState;
  mesh: InteractableMesh;
  source: T;
};

export function getRivalDialoguePrompt(
  rivals: ReadonlyArray<Pick<WorldInteractable<unknown>, "id" | "distance">>,
  nearestRivalId: string | null,
  playerDistance: number,
) {
  const rival = nearestRivalId
    ? rivals.find((candidate) => candidate.id === nearestRivalId)
    : undefined;
  const gap = rival && Number.isFinite(playerDistance)
    ? Math.abs(rival.distance - playerDistance)
    : Number.POSITIVE_INFINITY;
  const talking = Boolean(rival && gap <= RIVAL_DIALOGUE_RANGE_METERS);
  return {
    rivalId: talking ? rival!.id : null,
    canChallenge: talking && gap <= RIVAL_CHALLENGE_RANGE_METERS,
  };
}

const BROKEN_OBSTACLES_KEY = "shafak-broken-obstacles-v1";
const brokenObstaclesStorageKey = (userId?: string) => `${BROKEN_OBSTACLES_KEY}:${userId || "guest"}`;

export function readBrokenObstacleIds(userId?: string) {
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(brokenObstaclesStorageKey(userId)) ?? "[]");
    if (!Array.isArray(saved)) return new Set<string>();
    return new Set(
      saved
        .filter((id): id is string => typeof id === "string" && /^ash-road:\d{1,8}:obstacle:(?:barrel|vase|barricade|treasure-chest)$/.test(id))
        .slice(-5_000),
    );
  } catch {
    return new Set<string>();
  }
}

export function saveBrokenObstacleIds(ids: ReadonlySet<string>, userId?: string) {
  try {
    globalThis.localStorage?.setItem(
      brokenObstaclesStorageKey(userId),
      JSON.stringify([...ids].slice(-5_000)),
    );
  } catch {
    // Browser storage is optional; world progress and rewards remain playable without it.
  }
}

export class WorldInteractableRegistry<T> {
  private readonly entries = new Map<string, WorldInteractable<T>>();

  register(entry: WorldInteractable<T>) {
    this.entries.set(entry.id, entry);
    return () => {
      if (this.entries.get(entry.id) === entry) this.entries.delete(entry.id);
    };
  }

  setState(id: string, state: InteractableState) {
    const entry = this.entries.get(id);
    if (entry) entry.state = state;
  }

  getAvailable(id: string) {
    const entry = this.entries.get(id);
    return entry && isAvailable(entry) ? entry : undefined;
  }

  findNearest(kind: InteractableKind, x: number, distance: number) {
    if (!Number.isFinite(x) || !Number.isFinite(distance)) return undefined;
    let nearest: WorldInteractable<T> | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const entry of this.entries.values()) {
      if (entry.kind !== kind || !isAvailable(entry)) continue;
      const dx = Math.abs(entry.x - x);
      const dz = Math.abs(entry.distance - distance);
      if (dx > entry.lateralRadius || dz > entry.radius) continue;
      const gap = Math.hypot(dx, dz);
      if (gap < nearestDistance) {
        nearest = entry;
        nearestDistance = gap;
      }
    }
    return nearest;
  }
}

function isAvailable<T>(entry: WorldInteractable<T>) {
  if (entry.state !== "active" || !entry.mesh.parent) return false;
  let node: InteractableMesh | null = entry.mesh;
  while (node) {
    if (!node.visible) return false;
    node = node.parent;
  }
  return true;
}
