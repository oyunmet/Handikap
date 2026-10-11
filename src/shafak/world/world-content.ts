import { WORLD_GATE_INTERVAL_METERS } from "./movement";
import { WORLD_SEED } from "./world-generation";
import { createWorldChunk } from "./world-generation";
import { getWorldRivalProfile, type WorldBotArchetype, type WorldBotWeapon } from "./world-bot-profiles";

export type PickupKind = "gold-small" | "gold-large" | "diamond-small" | "iron-shard" | "ember-crystal" | "seal-fragment";

export type WorldPickup = {
  id: string;
  chapterId: number;
  kind: PickupKind;
  amount: number;
  x: number;
  distance: number;
  sourceObstacleId?: string;
};

export type WorldObstacleKind = "rock" | "spike-trap" | "barricade";

export type WorldObstacle = {
  id: string;
  chapterId: number;
  kind: WorldObstacleKind;
  x: number;
  distance: number;
  width: number;
  health: number;
  dropPickupId?: string;
};

export type WorldRival = {
  id: string;
  name: string;
  title: string;
  level: number;
  winRate: number;
  loot: number;
  taunt: string;
  difficulty: "easy" | "medium" | "hard";
  chapterId: number;
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
  breakableId?: string;
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
export const MAX_PICKUPS_PER_CLAIM = 14;
export const MAX_CHAPTER_ID = 1_000_000;

const PICKUP_DISTANCES = [10, 19, 28, 34, 62, 69, 92, 99, 105, 123, 129, 138] as const;
const PICKUP_LANES = [-4.8, -3.2, 0, 3.2, 4.8] as const;
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

  return [...regular, drop];
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
      id: `ash-road:${chapterId}:obstacle:spikes`,
      chapterId,
      kind: "spike-trap",
      x: 0,
      distance: chapterStart + 77,
      width: 3.8,
      health: 0,
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
  ];
}

function createRivals(chapterId: number, random: () => number): WorldRival[] {
  const chapterStart = chapterId * WORLD_GATE_INTERVAL_METERS;
  return Array.from({ length: 4 }, (_, index) => {
    const profile = getWorldRivalProfile(chapterId, index);
    return {
      id: `ash-road:${chapterId}:rival:${index}`,
      name: profile.name,
      title: profile.title,
      archetype: profile.archetype,
      level: Math.min(1000, 2 + chapterId * 2 + index * 2),
      winRate: 42 + index * 9 + Math.min(24, chapterId * 2),
      loot: 48 + index * 24 + chapterId * 6,
      taunt: profile.taunt,
      difficulty: profile.difficulty,
      chapterId,
      x: index % 2 === 0 ? -3.6 : 3.4,
      distance: chapterStart + [52, 84, 109, 134][index] + (random() - 0.5) * 2,
      armorTint: profile.armorTint,
      size: profile.size + Math.min(0.12, chapterId * 0.005),
      weapon: profile.weapon,
    };
  });
}

export function isValidChapterId(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= MAX_CHAPTER_ID;
}

export function getWorldChapter(chapterId: number): WorldChapterContent {
  if (!isValidChapterId(chapterId)) throw new RangeError("chapterId is outside the supported range.");
  const random = chapterRandom(chapterId);
  return {
    chapterId,
    pickups: createPickups(chapterId, random),
    obstacles: createObstacles(chapterId),
    rivals: createRivals(chapterId, random),
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
      if (pickup.kind === "gold-small" || pickup.kind === "gold-large") totals.gold += pickup.amount;
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
    if (obstacle.kind === "spike-trap" || brokenObstacleIds.has(obstacle.id)) continue;
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
        halfDepth: obstacle.kind === "barricade" ? 0.3 : 0.5,
        breakableId: obstacle.kind === "barricade" ? obstacle.id : undefined,
      });
    }

    for (let index = chapter.chapterId * 3; index < chapter.chapterId * 3 + 3; index += 1) {
      const chunk = createWorldChunk(index);
      for (const object of chunk.objects) {
        const centerX = object.lane * 9.3;
        const scale = object.scale;
        const yaw = (object.flickerSeed % 628) / 100;
        const addOffsetCircle = (offsetX: number, radius: number, suffix: string) => {
          add({
            id: `${object.id}:${suffix}`,
            x: centerX + Math.cos(yaw) * offsetX * scale,
            distance: object.worldX + Math.sin(yaw) * offsetX * scale,
            shape: "circle",
            radius: radius * scale,
            halfWidth: radius * scale,
            halfDepth: radius * scale,
          });
        };

        if (object.kind === "tower") addOffsetCircle(0, 1.2, "tower");
        else if (object.kind === "ruin") {
          addOffsetCircle(-0.82, 0.42, "pillar-a");
          addOffsetCircle(0.82, 0.44, "pillar-b");
        } else if (object.kind === "arch") {
          addOffsetCircle(-1.45, 0.48, "arch-a");
          addOffsetCircle(1.45, 0.48, "arch-b");
        } else if (object.kind === "rock" || object.kind === "ice-crystal") {
          addOffsetCircle(0, object.kind === "rock" ? 1.18 : 0.58, object.kind);
        } else if (object.kind === "tree" || object.kind === "mangrove") {
          addOffsetCircle(0, object.kind === "tree" ? 0.34 : 0.46, object.kind);
        } else if (object.kind === "cart") {
          add({
            id: `${object.id}:cart`,
            x: centerX,
            distance: object.worldX,
            shape: "box",
            radius: 0,
            halfWidth: 0.95 * scale,
            halfDepth: 0.55 * scale,
          });
        }
      }
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
          if (collider.breakableId && brokenObstacleIds.has(collider.breakableId)) continue;
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
