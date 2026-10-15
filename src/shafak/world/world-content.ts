import { WORLD_GATE_INTERVAL_METERS } from "./movement.ts";
import { WORLD_SEED } from "./world-generation.ts";
import { getWorldRivalProfile, type WorldBotArchetype, type WorldBotWeapon } from "./world-bot-profiles.ts";
import type { WorldRouteDifficulty } from "./route-difficulty.ts";
import type { CombatDifficulty } from "../game/combat-engine.ts";

export type PickupKind = "gold-small" | "gold-large" | "treasure-cache" | "diamond-small" | "iron-shard" | "ember-crystal" | "seal-fragment";

export type WorldPickup = {
  id: string;
  chapterId: number;
  kind: PickupKind;
  amount: number;
  x: number;
  distance: number;
  sourceObstacleId?: string;
};

export type WorldObstacleKind =
  | "rock"
  | "falling-rock-trap"
  | "spike-trap"
  | "low-bar"
  | "barrel"
  | "vase"
  | "barricade"
  | "treasure-chest";

export type WorldObstacle = {
  id: string;
  chapterId: number;
  kind: WorldObstacleKind;
  x: number;
  distance: number;
  width: number;
  health: number;
  hidden?: boolean;
  dropPickupId?: string;
};

export type WorldRival = {
  id: string;
  name: string;
  title: string;
  level: number;
  isBoss: boolean;
  isElite: boolean;
  winRate: number;
  loot: number;
  taunt: string;
  difficulty: "easy" | "medium" | "hard";
  chapterId: number;
  progressPercent: number;
  x: number;
  distance: number;
  armorTint: string;
  size: number;
  archetype: WorldBotArchetype;
  weapon: WorldBotWeapon;
};

export type WorldCollider = {
  id: string;
  x: number;
  distance: number;
  shape: "circle" | "box";
  radius: number;
  halfWidth: number;
  halfDepth: number;
  hidden?: boolean;
  breakableId?: string;
  requiredAction?: "crouch" | "jump";
};

export type WorldCollisionGrid = Map<number, Map<number, WorldCollider[]>>;

export type WorldChapterContent = {
  chapterId: number;
  pickups: WorldPickup[];
  obstacles: WorldObstacle[];
  rivals: WorldRival[];
};

export const PICKUP_MAGNET_RADIUS_METERS = 5.2;
export const PICKUP_RADIUS_METERS = 1.5;
export const WORLD_JUMP_CLEARANCE_METERS = 0.78;
export const HIDDEN_CHEST_REVEAL_METERS = 16;
export const MAX_PICKUPS_PER_CLAIM = 16;
export const MAX_CHAPTER_ID = 1_000_000;

const PICKUP_DISTANCES = [10, 19, 28, 34, 62, 69, 92, 99, 105, 123, 129, 138] as const;
const PICKUP_LANES = [-3.2, -1.6, 0, 1.6, 3.2] as const;
function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function chapterRandom(chapterId: number) {
  return seededRandom((WORLD_SEED ^ Math.imul(chapterId + 1, 0x45d9f3b)) >>> 0);
}

function createPickups(chapterId: number, random: () => number): WorldPickup[] {
  const chapterStart = chapterId * WORLD_GATE_INTERVAL_METERS;
  const regular = PICKUP_DISTANCES.map((offset, index): WorldPickup => {
    let kind: PickupKind;
    if ([0, 3, 5, 8, 10].includes(index)) kind = index === 3 || index === 10 ? "gold-large" : "gold-small";
    else if (index === 11 && chapterId % 3 === 2) kind = "seal-fragment";
    else if (index === 7 && chapterId % 2 === 0) kind = "diamond-small";
    else if (index === 6 && chapterId % 3 === 0) kind = "iron-shard";
    else kind = "ember-crystal";

    return {
      id: `ash-road:${chapterId}:pickup:${index}`,
      chapterId,
      kind,
      amount: kind === "gold-small"
        ? 6 + Math.floor(random() * 7)
        : kind === "gold-large"
          ? 22 + Math.floor(random() * 15)
          : kind === "diamond-small"
            ? 1
            : kind === "iron-shard"
              ? 1 + Math.floor(random() * 2)
          : kind === "seal-fragment"
            ? 1
            : 1 + Math.floor(random() * 2),
      x: PICKUP_LANES[Math.floor(random() * PICKUP_LANES.length)],
      distance: chapterStart + offset + (random() - 0.5) * 2,
    };
  });

  const barricadeId = `ash-road:${chapterId}:obstacle:barricade`;
  const drop: WorldPickup = {
    id: `ash-road:${chapterId}:pickup:barricade-drop`,
    chapterId,
    kind: "iron-shard",
    amount: 1 + Math.floor(random() * 2),
    x: 0,
    distance: chapterStart + 119,
    sourceObstacleId: barricadeId,
  };

  const treasureCache: WorldPickup = {
    id: `ash-road:${chapterId}:pickup:treasure-cache`,
    chapterId,
    kind: "treasure-cache",
    amount: 75 + Math.floor(random() * 26),
    x: 0,
    distance: chapterStart + 58,
    sourceObstacleId: `ash-road:${chapterId}:obstacle:treasure-chest`,
  };

  const barrelDrop: WorldPickup = {
    id: `ash-road:${chapterId}:pickup:barrel-drop`,
    chapterId,
    kind: "gold-small",
    amount: 16 + Math.floor(random() * 9),
    x: 3.2,
    distance: chapterStart + 24,
    sourceObstacleId: `ash-road:${chapterId}:obstacle:barrel`,
  };

  const vaseDrop: WorldPickup = {
    id: `ash-road:${chapterId}:pickup:vase-drop`,
    chapterId,
    kind: "gold-small",
    amount: 14 + Math.floor(random() * 11),
    x: -3.2,
    distance: chapterStart + 101,
    sourceObstacleId: `ash-road:${chapterId}:obstacle:vase`,
  };

  return [...regular, treasureCache, drop, barrelDrop, vaseDrop];
}

function createObstacles(chapterId: number): WorldObstacle[] {
  const chapterStart = chapterId * WORLD_GATE_INTERVAL_METERS;
  return [
    {
      id: `ash-road:${chapterId}:obstacle:rock`,
      chapterId,
      kind: "rock",
      x: -4.1,
      distance: chapterStart + 42,
      width: 2.1,
      health: 0,
    },
    {
      id: `ash-road:${chapterId}:obstacle:falling-rock`,
      chapterId,
      kind: "falling-rock-trap",
      x: -3.2,
      distance: chapterStart + 128,
      width: 2.4,
      health: 0,
    },
    {
      id: `ash-road:${chapterId}:obstacle:spikes`,
      chapterId,
      kind: "spike-trap",
      x: 0,
      distance: chapterStart + 77,
      width: 3.8,
      health: 0,
    },
    {
      id: `ash-road:${chapterId}:obstacle:low-bar`,
      chapterId,
      kind: "low-bar",
      x: 0,
      distance: chapterStart + 88,
      width: 5.2,
      health: 0,
    },
    {
      id: `ash-road:${chapterId}:obstacle:barrel`,
      chapterId,
      kind: "barrel",
      x: 3.2,
      distance: chapterStart + 24,
      width: 1.15,
      health: 1,
      dropPickupId: `ash-road:${chapterId}:pickup:barrel-drop`,
    },
    {
      id: `ash-road:${chapterId}:obstacle:vase`,
      chapterId,
      kind: "vase",
      x: -3.2,
      distance: chapterStart + 101,
      width: 0.95,
      health: 1,
      dropPickupId: `ash-road:${chapterId}:pickup:vase-drop`,
    },
    {
      id: `ash-road:${chapterId}:obstacle:barricade`,
      chapterId,
      kind: "barricade",
      x: 0,
      distance: chapterStart + 116,
      width: 2.5,
      health: 3,
      dropPickupId: `ash-road:${chapterId}:pickup:barricade-drop`,
    },
    {
      id: `ash-road:${chapterId}:obstacle:treasure-chest`,
      chapterId,
      kind: "treasure-chest",
      x: 0,
      distance: chapterStart + 58,
      width: 2.1,
      health: 1,
      hidden: true,
      dropPickupId: `ash-road:${chapterId}:pickup:treasure-cache`,
    },
  ];
}

function createRivals(chapterId: number, random: () => number, playerLevel: number): WorldRival[] {
  const chapterStart = chapterId * WORLD_GATE_INTERVAL_METERS;
  const safePlayerLevel = Math.max(1, Math.min(1_000, Math.floor(Number.isFinite(playerLevel) ? playerLevel : 1)));
  const rivalDistances = [52, 84, 109, 134, 139];
  return Array.from({ length: 5 }, (_, index) => {
    const profile = getWorldRivalProfile(chapterId, index);
    const isBoss = index === 4;
    const distance = chapterStart + rivalDistances[index] + (isBoss ? 0 : (random() - 0.5) * 2);
    const regionalLevel = 2 + chapterId * 2 + index * 2 + (isBoss ? 8 : 0);
    return {
      id: `ash-road:${chapterId}:rival:${index}`,
      name: profile.name,
      title: profile.title,
      archetype: profile.archetype,
      level: Math.min(1_000, Math.max(regionalLevel, Math.floor(safePlayerLevel * 0.65) + index + Math.floor(chapterId * 0.2))),
      isBoss,
      isElite: index === 3,
      winRate: isBoss ? 94 + Math.min(4, chapterId) : 42 + index * 9 + Math.min(24, chapterId * 2),
      loot: isBoss ? 180 + chapterId * 10 : 48 + index * 24 + chapterId * 6,
      taunt: profile.taunt,
      difficulty: profile.difficulty,
      chapterId,
      progressPercent: Math.max(0, Math.min(100, (distance - chapterStart) / WORLD_GATE_INTERVAL_METERS * 100)),
      x: isBoss ? 0 : index % 2 === 0 ? -3.6 : 3.4,
      distance,
      armorTint: profile.armorTint,
      size: profile.size + Math.min(0.12, chapterId * 0.005),
      weapon: profile.weapon,
    };
  });
}

export function isValidChapterId(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= MAX_CHAPTER_ID;
}

export function isWorldObstacleRevealed(obstacle: WorldObstacle, gap: number) {
  return !obstacle.hidden || gap <= HIDDEN_CHEST_REVEAL_METERS;
}

export function getWorldChapter(
  chapterId: number,
  routeDifficulty?: WorldRouteDifficulty,
  playerLevel = 1,
  combatDifficulty?: CombatDifficulty,
): WorldChapterContent {
  if (!isValidChapterId(chapterId)) throw new RangeError("chapterId is outside the supported range.");
  const random = chapterRandom(chapterId);
  const rivals = createRivals(chapterId, random, playerLevel);
  const routedRivals = routeDifficulty
    ? rivals.map((rival) => {
        const easy = routeDifficulty === "easy";
        return {
          ...rival,
          level: Math.max(1, Math.floor(rival.level * (easy ? 0.72 : 1.48))),
          winRate: Math.max(20, Math.min(98, rival.winRate + (easy ? -17 : 16))),
          loot: Math.floor(rival.loot * (easy ? 0.82 : 1.32)),
          difficulty: combatDifficulty ?? routeDifficulty,
        };
      })
    : rivals;
  const selectedRivals = combatDifficulty && !routeDifficulty
    ? routedRivals.map((rival) => ({ ...rival, difficulty: combatDifficulty }))
    : routedRivals;
  return {
    chapterId,
    pickups: createPickups(chapterId, random),
    obstacles: createObstacles(chapterId),
    rivals: selectedRivals,
  };
}

export function getWorldContentAround(distance: number, chapterRadius = 1) {
  const current = Math.max(0, Math.floor(distance / WORLD_GATE_INTERVAL_METERS));
  const start = Math.max(0, current - chapterRadius);
  const end = Math.min(MAX_CHAPTER_ID, current + chapterRadius + 1);
  return Array.from({ length: end - start + 1 }, (_, index) => getWorldChapter(start + index));
}

export function pickupRewardTotals(pickups: readonly WorldPickup[]) {
  return pickups.reduce(
    (totals, pickup) => {
      if (pickup.kind === "gold-small" || pickup.kind === "gold-large" || pickup.kind === "treasure-cache") {
        totals.gold += pickup.amount;
      }
      if (pickup.kind === "diamond-small") totals.diamonds += pickup.amount;
      if (pickup.kind === "ember-crystal") totals.materials.emberCrystals += pickup.amount;
      if (pickup.kind === "seal-fragment") totals.materials.sealFragments += pickup.amount;
      if (pickup.kind === "iron-shard") totals.materials.ironShards += pickup.amount;
      return totals;
    },
    { gold: 0, diamonds: 0, materials: { emberCrystals: 0, sealFragments: 0, ironShards: 0 } },
  );
}

export function resolveWorldObstacleCollision(
  previousDistance: number,
  previousX: number,
  nextDistance: number,
  nextX: number,
  obstacles: readonly WorldObstacle[],
  brokenObstacleIds: ReadonlySet<string>,
) {
  let resolvedDistance = nextDistance;
  for (const obstacle of obstacles) {
    const gap = obstacle.distance - nextDistance;
    if (
      obstacle.kind === "spike-trap"
      || obstacle.kind === "falling-rock-trap"
      || brokenObstacleIds.has(obstacle.id)
      || (obstacle.hidden && gap > HIDDEN_CHEST_REVEAL_METERS)
    ) continue;
    const halfWidth = obstacle.width / 2 + 0.45;
    if (Math.abs(nextX - obstacle.x) >= halfWidth) continue;
    const stopDistance = obstacle.distance - 1.25;
    if (previousDistance <= stopDistance && resolvedDistance > stopDistance) resolvedDistance = stopDistance;
    else if (previousDistance >= obstacle.distance + 1.25 && resolvedDistance < obstacle.distance + 1.25) {
      resolvedDistance = obstacle.distance + 1.25;
    }
  }
  return Math.abs(resolvedDistance - previousDistance) < 0.0001 && resolvedDistance !== nextDistance
    ? previousDistance
    : resolvedDistance;
}

const COLLISION_CELL_SIZE = 12;
const PLAYER_COLLISION_RADIUS = 0.42;

export function buildWorldCollisionGrid(chapters: readonly WorldChapterContent[]): WorldCollisionGrid {
  const grid: WorldCollisionGrid = new Map();
  const add = (collider: WorldCollider) => {
    const cellX = Math.floor(collider.x / COLLISION_CELL_SIZE);
    const cellDistance = Math.floor(collider.distance / COLLISION_CELL_SIZE);
    let row = grid.get(cellX);
    if (!row) {
      row = new Map();
      grid.set(cellX, row);
    }
    const cell = row.get(cellDistance);
    if (cell) cell.push(collider);
    else row.set(cellDistance, [collider]);
  };

  for (const chapter of chapters) {
    for (const obstacle of chapter.obstacles) {
      if (obstacle.kind === "spike-trap") continue;
      add({
        id: obstacle.id,
        x: obstacle.x,
        distance: obstacle.distance,
        shape: obstacle.kind === "rock" ? "circle" : "box",
        radius: obstacle.width * 0.58,
        halfWidth: obstacle.width / 2,
        halfDepth: obstacle.kind === "barricade" ? 0.3 : obstacle.kind === "low-bar" ? 0.38 : 0.5,
        hidden: obstacle.hidden,
        breakableId: ["barrel", "vase", "barricade", "treasure-chest"].includes(obstacle.kind)
          ? obstacle.id
          : undefined,
        requiredAction: obstacle.kind === "low-bar"
          ? "crouch"
          : obstacle.kind === "rock" || obstacle.kind === "falling-rock-trap" || obstacle.kind === "treasure-chest"
            ? "jump"
            : undefined,
      });
    }
  }
  return grid;
}

export function resolveWorldPathCollision(
  previousX: number,
  previousDistance: number,
  nextX: number,
  nextDistance: number,
  grid: WorldCollisionGrid,
  brokenObstacleIds: ReadonlySet<string>,
  target: { x: number; distance: number } = { x: 0, distance: 0 },
  clearance: { crouching?: boolean; jumpHeight?: number } = {},
) {
  const startX = Number.isFinite(previousX) ? previousX : 0;
  const startDistance = Number.isFinite(previousDistance) ? Math.max(0, previousDistance) : 0;
  const requestedX = Number.isFinite(nextX) ? nextX : startX;
  const requestedDistance = Number.isFinite(nextDistance) ? Math.max(0, nextDistance) : startDistance;
  const travelX = requestedX - startX;
  const travelDistance = requestedDistance - startDistance;
  const segments = Math.max(1, Math.min(128, Math.ceil(Math.hypot(travelX, travelDistance) / 0.35)));
  const stepX = travelX / segments;
  const stepDistance = travelDistance / segments;
  const minCellX = Math.floor((Math.min(startX, requestedX) - 2) / COLLISION_CELL_SIZE);
  const maxCellX = Math.floor((Math.max(startX, requestedX) + 2) / COLLISION_CELL_SIZE);
  const minCellDistance = Math.floor((Math.min(startDistance, requestedDistance) - 2) / COLLISION_CELL_SIZE);
  const maxCellDistance = Math.floor((Math.max(startDistance, requestedDistance) + 2) / COLLISION_CELL_SIZE);
  let x = startX;
  let distance = startDistance;

  for (let segment = 1; segment <= segments; segment += 1) {
    x += stepX;
    distance += stepDistance;
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      const row = grid.get(cellX);
      if (!row) continue;
      for (let cellDistance = minCellDistance; cellDistance <= maxCellDistance; cellDistance += 1) {
        const colliders = row.get(cellDistance);
        if (!colliders) continue;
        for (const collider of colliders) {
          const gap = collider.distance - distance;
          if ((collider.hidden && gap > HIDDEN_CHEST_REVEAL_METERS) || gap < -1.5) continue;
          if (collider.breakableId && brokenObstacleIds.has(collider.breakableId)) continue;
          if (collider.requiredAction === "crouch" && clearance.crouching) continue;
          if (collider.requiredAction === "jump" && (clearance.jumpHeight ?? 0) >= WORLD_JUMP_CLEARANCE_METERS) continue;
          if (collider.shape === "circle") {
            const dx = x - collider.x;
            const dz = distance - collider.distance;
            const minimum = collider.radius + PLAYER_COLLISION_RADIUS;
            const gapSquared = dx * dx + dz * dz;
            if (gapSquared >= minimum * minimum) continue;
            const gap = Math.sqrt(gapSquared);
            const nx = gap > 0.0001 ? dx / gap : (startX <= collider.x ? -1 : 1);
            const nz = gap > 0.0001 ? dz / gap : 0;
            const push = minimum - gap;
            x += nx * push;
            distance += nz * push;
          } else {
            const halfWidth = collider.halfWidth + PLAYER_COLLISION_RADIUS;
            const halfDepth = collider.halfDepth + PLAYER_COLLISION_RADIUS;
            const dx = x - collider.x;
            const dz = distance - collider.distance;
            if (Math.abs(dx) >= halfWidth || Math.abs(dz) >= halfDepth) continue;
            const pushX = halfWidth - Math.abs(dx);
            const pushZ = halfDepth - Math.abs(dz);
            if (pushX < pushZ) x += (dx < 0 ? -1 : 1) * pushX;
            else distance += (dz < 0 ? -1 : 1) * pushZ;
          }
        }
      }
    }
  }

  target.x = Math.max(-5.05, Math.min(5.05, x));
  target.distance = Math.max(0, distance);
  return target;
}

export function validatePickupIds(chapterId: number, pickupIds: unknown): WorldPickup[] | null {
  if (!isValidChapterId(chapterId) || !Array.isArray(pickupIds)) return null;
  if (pickupIds.length < 1 || pickupIds.length > MAX_PICKUPS_PER_CLAIM) return null;
  if (pickupIds.some((id) => typeof id !== "string" || id.length > 90) || new Set(pickupIds).size !== pickupIds.length) {
    return null;
  }
  const chapterPickups = new Map(getWorldChapter(chapterId).pickups.map((pickup) => [pickup.id, pickup]));
  const result = pickupIds.map((id) => chapterPickups.get(id as string));
  return result.every((pickup): pickup is WorldPickup => Boolean(pickup)) ? result : null;
}
