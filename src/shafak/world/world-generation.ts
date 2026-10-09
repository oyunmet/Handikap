import {
  WORLD_GATE_INTERVAL_METERS,
  WORLD_CHUNK_LENGTH_METERS,
  WORLD_METERS_TO_PIXELS,
} from "./movement";

export const WORLD_SEED = 0x5afacafe;
export const WORLD_CHUNK_OBJECTS = 7;
export const MIN_WORLD_PARALLAX = 0.38;

export type WorldObjectKind =
  | "tower"
  | "ruin"
  | "arch"
  | "tree"
  | "flag"
  | "rock"
  | "torch"
  | "crystal"
  | "firepit"
  | "cart"
  | "bones";

export type WorldObject = {
  id: string;
  worldX: number;
  lane: number;
  kind: WorldObjectKind;
  scale: number;
  parallax: number;
  flickerSeed: number;
};

export type WorldChunk = {
  index: number;
  start: number;
  end: number;
  objects: WorldObject[];
};

export function createWorldChunk(index: number, seed = WORLD_SEED): WorldChunk {
  const random = seededRandom((seed ^ Math.imul(index, 0x9e3779b1)) >>> 0);
  const start = index * WORLD_CHUNK_LENGTH_METERS;
  const kinds: WorldObjectKind[] = [
    random() > 0.5 ? "tower" : "ruin",
    random() > 0.46 ? "tree" : "rock",
    "flag",
    random() > 0.5 ? "rock" : "tree",
    random() > 0.5 ? "ruin" : "tower",
    (["torch", "crystal", "firepit"] as const)[Math.floor(random() * 3)],
    random() > 0.5 ? "rock" : "tree",
    (["cart", "bones", "arch"] as const)[Math.floor(random() * 3)],
  ];

  const objects = kinds.map((kind, objectIndex): WorldObject => ({
    id: `${index}:${objectIndex}`,
    worldX: start + 2 + random() * (WORLD_CHUNK_LENGTH_METERS - 4),
    lane: (random() * 1.55) - 0.78,
    kind,
    scale: 0.72 + random() * 0.62,
    parallax: parallaxFor(kind),
    flickerSeed: Math.floor(random() * 10000),
  }));

  return {
    index,
    start,
    end: start + WORLD_CHUNK_LENGTH_METERS,
    objects,
  };
}

export function getVisibleWorldChunks(
  cameraX: number,
  viewportWidth: number,
  seed = WORLD_SEED,
  cache: Map<number, WorldChunk> = new Map(),
): WorldChunk[] {
  const safeWidth = Math.max(1, Number.isFinite(viewportWidth) ? viewportWidth : 1);
  const worldMargin = safeWidth / (WORLD_METERS_TO_PIXELS * MIN_WORLD_PARALLAX)
    + WORLD_CHUNK_LENGTH_METERS * 1.5;
  const center = Number.isFinite(cameraX) ? cameraX : 0;
  const first = Math.floor((center - worldMargin) / WORLD_CHUNK_LENGTH_METERS);
  const last = Math.floor((center + worldMargin) / WORLD_CHUNK_LENGTH_METERS);
  const chunks: WorldChunk[] = [];

  for (let index = first; index <= last; index += 1) {
    let chunk = cache.get(index);
    if (!chunk) {
      chunk = createWorldChunk(index, seed);
      cache.set(index, chunk);
    }
    chunks.push(chunk);
  }

  if (cache.size > 32) {
    const keepFrom = first - 2;
    const keepTo = last + 2;
    for (const index of cache.keys()) {
      if (index < keepFrom || index > keepTo) cache.delete(index);
    }
  }

  return chunks;
}

export function nextGateDistance(distance: number) {
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  return (Math.floor(safeDistance / WORLD_GATE_INTERVAL_METERS) + 1) * WORLD_GATE_INTERVAL_METERS;
}

function parallaxFor(kind: WorldObjectKind) {
  if (kind === "tower" || kind === "ruin" || kind === "arch") return 0.42;
  if (kind === "tree") return 0.58;
  if (kind === "flag") return 0.82;
  if (kind === "torch" || kind === "crystal" || kind === "firepit") return 0.9;
  return 1;
}

function seededRandom(initialSeed: number) {
  let seed = initialSeed >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
