import { WORLD_GATE_INTERVAL_METERS } from "./movement";
import { WORLD_SEED } from "./world-generation";

export type PickupKind = "gold-small" | "gold-large" | "ember-crystal" | "seal-fragment";

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
  weapon: "sword" | "axe" | "spear" | "mace";
};

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
const RIVAL_NAMES = ["Kül İzci", "Demir Yemin", "Gece Nöbetçisi", "Kapı Muhafızı"] as const;
const RIVAL_TINTS = ["#a44e47", "#4e6f85", "#71619a", "#9b763d"] as const;
const WEAPONS = ["sword", "axe", "spear", "mace"] as const;
const TAUNTS = [
  "Kül Yolu'nda ilerlemek kolay değil.",
  "Bu geçitten sağ çıkabilecek misin?",
  "Kapıya yaklaşmana izin vermeyeceğim.",
  "Son adımını dikkatli at, yolcu.",
] as const;

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
    else kind = "ember-crystal";

    return {
      id: `ash-road:${chapterId}:pickup:${index}`,
      chapterId,
      kind,
      amount: kind === "gold-small"
        ? 6 + Math.floor(random() * 7)
        : kind === "gold-large"
          ? 22 + Math.floor(random() * 15)
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
    kind: "gold-large",
    amount: 28 + Math.floor(random() * 13),
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
  return RIVAL_NAMES.map((name, index) => ({
    id: `ash-road:${chapterId}:bot:${index}`,
    name,
    level: Math.min(1000, 2 + chapterId * 2 + index * 2),
    winRate: 42 + index * 9 + Math.min(24, chapterId * 2),
    loot: 48 + index * 24 + chapterId * 6,
    taunt: TAUNTS[index],
    difficulty: index === 0 ? "easy" : index === 3 ? "hard" : "medium",
    chapterId,
    x: index % 2 === 0 ? -3.6 : 3.4,
    distance: chapterStart + [52, 84, 109, 134][index] + (random() - 0.5) * 2,
    armorTint: RIVAL_TINTS[index],
    size: 0.92 + index * 0.055,
    weapon: WEAPONS[index],
  }));
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
      if (pickup.kind === "ember-crystal") totals.materials.emberCrystals += pickup.amount;
      if (pickup.kind === "seal-fragment") totals.materials.sealFragments += pickup.amount;
      return totals;
    },
    { gold: 0, materials: { emberCrystals: 0, sealFragments: 0 } },
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
