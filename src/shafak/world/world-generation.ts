import {
  WORLD_GATE_INTERVAL_METERS,
  WORLD_CHUNK_LENGTH_METERS,
  WORLD_METERS_TO_PIXELS,
  WORLD_ROAD_WIDTH,
} from "./movement.ts";
import { getBiomeForDistance, type WorldBiome } from "./world-biomes.ts";

export const WORLD_SEED = 0x5afacafe;
export const WORLD_CHUNK_OBJECTS = 7;
export const MIN_WORLD_PARALLAX = 0.38;
export const WORLD_SCENERY_LATERAL_SCALE = 9.7;

export type WorldObjectKind =
  | "tower"
  | "column"
  | "ruin"
  | "arch"
  | "tree"
  | "pine-tree"
  | "skeletal-tree"
  | "flag"
  | "rock"
  | "torch"
  | "firepit"
  | "cart"
  | "bones"
  | "reed"
  | "mangrove"
  | "fern"
  | "moss-bush";

export type WorldObject = {
  id: string;
  worldX: number;
  lane: number;
  kind: WorldObjectKind;
  biome: WorldBiome;
  scale: number;
  parallax: number;
  flickerSeed: number;
};

export type WorldChunk = {
  index: number;
  start: number;
  end: number;
  biome: WorldBiome;
  objects: WorldObject[];
};

const WORLD_OBJECT_HALF_WIDTH: Record<WorldObjectKind, number> = {
  tower: 1.45,
  column: 0.8,
  ruin: 2.1,
  arch: 1.7,
  tree: 1.7,
  "pine-tree": 2.2,
  "skeletal-tree": 1.8,
  flag: 1,
  rock: 1.35,
  torch: 0.55,
  firepit: 0.6,
  cart: 1.15,
  bones: 1,
  reed: 0.6,
  mangrove: 1.35,
  fern: 0.85,
  "moss-bush": 0.8,
};

export function getMinimumWorldSceneryAxisOffset(kind: WorldObjectKind, scale = 1) {
  const safeScale = Number.isFinite(scale) ? Math.max(0.1, scale) : 1;
  return WORLD_ROAD_WIDTH / 2 + WORLD_OBJECT_HALF_WIDTH[kind] * safeScale + 0.65;
}

/** Moves any too-close scenery beyond the road and camera corridor, preserving its side. */
export function normalizeWorldObjectPlacement<T extends Pick<WorldObject, "kind" | "lane" | "scale">>(object: T): T {
  const minimumAxisOffset = getMinimumWorldSceneryAxisOffset(object.kind, object.scale);
  const currentAxisOffset = Math.abs(object.lane * WORLD_SCENERY_LATERAL_SCALE);
  if (currentAxisOffset >= minimumAxisOffset) return object;
  const side = object.lane < 0 ? -1 : 1;
  return {
    ...object,
    lane: side * minimumAxisOffset / WORLD_SCENERY_LATERAL_SCALE,
  };
}

export function createWorldChunk(index: number, seed = WORLD_SEED): WorldChunk {
  const random = seededRandom((seed ^ Math.imul(index, 0x9e3779b1)) >>> 0);
  const treeKind = (): WorldObjectKind => {
    const variants = ["tree", "pine-tree", "skeletal-tree"] as const;
    return variants[Math.floor(random() * variants.length)];
  };
  const start = index * WORLD_CHUNK_LENGTH_METERS;
  const biome = getBiomeForDistance(start + WORLD_CHUNK_LENGTH_METERS / 2);
  const kinds: WorldObjectKind[] = biome === "frozen-pass"
    ? [
      random() > 0.5 ? "tower" : "column",
      "pine-tree",
      "flag",
      random() > 0.5 ? "ruin" : treeKind(),
      random() > 0.5 ? "ruin" : "arch",
      random() > 0.5 ? "torch" : "firepit",
      random() > 0.5 ? "moss-bush" : "fern",
      random() > 0.5 ? "cart" : "tree",
    ]
    : biome === "red-marsh"
      ? [
        random() > 0.5 ? "column" : "tower",
        "mangrove",
        "flag",
        random() > 0.5 ? "reed" : treeKind(),
        random() > 0.5 ? "arch" : "ruin",
        random() > 0.5 ? "firepit" : "torch",
        random() > 0.5 ? "reed" : treeKind(),
        random() > 0.5 ? "mangrove" : "moss-bush",
      ]
      : [
        random() > 0.5 ? "tower" : "column",
        random() > 0.46 ? treeKind() : "rock",
        "flag",
        "fern",
        random() > 0.5 ? "ruin" : "tower",
       (["torch", "firepit", "cart"] as const)[Math.floor(random() * 3)],
        "moss-bush",
        (["cart", "ruin", "arch"] as const)[Math.floor(random() * 3)],
      ];

  const objects = kinds.map((kind, objectIndex): WorldObject => {
    const worldX = start + 3.8 + objectIndex * 5.65 + random() * 0.8;
    const side = (index + objectIndex) % 2 === 0 ? -1 : 1;
    // Alternate deliberate roadside landmarks so the route feels framed rather
    // than filled with props scattered over a random grid.
    const isLandmark = kind === "tower" || kind === "column" || kind === "ruin" || kind === "arch";
    const roadsideLane = side * (isLandmark
      ? 1 + random() * 0.12
      : 0.84 + random() * 0.14);
    const landmarkScale = objectIndex === 0 || objectIndex === 4
      ? 0.94 + random() * 0.24
      : 0.7 + random() * 0.3;

    return normalizeWorldObjectPlacement({
      id: `${index}:${objectIndex}`,
      worldX,
      lane: roadsideLane,
      kind,
      biome,
      scale: landmarkScale,
      parallax: parallaxFor(kind),
      flickerSeed: Math.floor(random() * 10000),
    });
  });

  return {
    index,
    start,
    end: start + WORLD_CHUNK_LENGTH_METERS,
    biome,
    objects,
  };
}

export function getVisibleWorldChunks(
  cameraX: number,
  viewportWidth: number,
  seed = WORLD_SEED,
  cache: Map<number, WorldChunk> = new Map(),
  output: WorldChunk[] = [],
): WorldChunk[] {
  const safeWidth = Math.max(1, Number.isFinite(viewportWidth) ? viewportWidth : 1);
  const worldMargin = safeWidth / (WORLD_METERS_TO_PIXELS * MIN_WORLD_PARALLAX)
    + WORLD_CHUNK_LENGTH_METERS * 1.5;
  const center = Number.isFinite(cameraX) ? cameraX : 0;
  const first = Math.floor((center - worldMargin) / WORLD_CHUNK_LENGTH_METERS);
  const last = Math.floor((center + worldMargin) / WORLD_CHUNK_LENGTH_METERS);
  const chunks = output;
  chunks.length = 0;

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

export function fillWorldObjects(chunks: readonly WorldChunk[], output: WorldObject[] = []): WorldObject[] {
  output.length = 0;
  for (const chunk of chunks) {
    for (const object of chunk.objects) output.push(object);
  }
  return output;
}

export function nextGateDistance(distance: number) {
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  return (Math.floor(safeDistance / WORLD_GATE_INTERVAL_METERS) + 1) * WORLD_GATE_INTERVAL_METERS;
}

export function nextGateDistanceForCamera(cameraX: number, distanceBehind: number) {
  const safeCameraX = Number.isFinite(cameraX) ? Math.max(0, cameraX) : 0;
  const safeDistanceBehind = Number.isFinite(distanceBehind) ? Math.max(0, distanceBehind) : 0;
  return nextGateDistance(Math.max(0, safeCameraX - safeDistanceBehind));
}

function parallaxFor(kind: WorldObjectKind) {
  if (kind === "tower" || kind === "column" || kind === "ruin" || kind === "arch") return 0.42;
  if (kind === "tree") return 0.58;
  if (kind === "flag") return 0.82;
  if (kind === "torch" || kind === "firepit") return 0.9;
  if (kind === "mangrove") return 0.58;
  if (kind === "reed") return 0.84;
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
