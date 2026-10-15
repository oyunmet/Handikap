export type WorldRouteSide = "left" | "right";
export type WorldRouteDifficulty = "easy" | "hard";
export type WorldRouteChoice = {
  chapterId: number;
  side: WorldRouteSide;
  difficulty: WorldRouteDifficulty;
};

export function getDoorDifficulty(
  playerId: string,
  chapterId: number,
  side: WorldRouteSide,
): WorldRouteDifficulty {
  const easyDoorIsLeft = (stableHash(`${playerId}:${chapterId}`) & 1) === 0;
  return (side === "left") === easyDoorIsLeft ? "easy" : "hard";
}

export function createWorldRouteChoice(playerId: string, chapterId: number, side: WorldRouteSide): WorldRouteChoice {
  return { chapterId, side, difficulty: getDoorDifficulty(playerId, chapterId, side) };
}

export function getWorldRouteSideFromInput(
  playerId: string,
  chapterId: number,
  depth: number,
  deadZone = 0.3,
): WorldRouteSide {
  if (Number.isFinite(depth) && depth <= -deadZone) return "left";
  if (Number.isFinite(depth) && depth >= deadZone) return "right";
  return (stableHash(`${playerId}:${chapterId}:route`) & 1) === 0 ? "left" : "right";
}

export function getWorldRoutePlayerId(userId?: string) {
  if (userId) return `account:${userId}`;
  const key = "shafak-route-player-id-v1";
  try {
    const existing = globalThis.localStorage?.getItem(key);
    if (existing) return `guest:${existing}`;
    const id = globalThis.crypto?.randomUUID?.()
      ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    globalThis.localStorage?.setItem(key, id);
    return `guest:${id}`;
  } catch {
    return "guest:private-session";
  }
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
