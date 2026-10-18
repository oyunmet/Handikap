import { WORLD_ROAD_WIDTH } from "./movement.ts";

export type WorldAssetKind = "rock" | "barrel" | "chest" | "vase" | "generic";
export type WorldCharacterSizeContext = "world" | "duel";

export type WorldModelSizeTarget = {
  targetHeight: number;
  maxDimension: number;
  representativeNode?: string;
  sourceDimensions?: { x: number; y: number; z: number };
};

export const WORLD_MODEL_SIZE_TARGETS = {
  rock: {
    targetHeight: 1.5,
    maxDimension: 2,
    sourceDimensions: { x: 0.169, y: 0.144, z: 0.32 },
  },
  barrel: {
    targetHeight: 1.05,
    maxDimension: 1.2,
    representativeNode: "wooden_barrels_01_barrel01",
  },
  chest: { targetHeight: 1, maxDimension: 1.5 },
  vase: { targetHeight: 0.95, maxDimension: 1.15 },
  generic: { targetHeight: 1.2, maxDimension: 1.8 },
  player: { targetHeight: 1.8, maxDimension: 2.7 },
  worldCharacter: { targetHeight: 1.8, maxDimension: 2.7 },
  worldBoss: { targetHeight: 1.95, maxDimension: 2.925 },
  duelCharacter: { targetHeight: 1.8, maxDimension: 2.7 },
  duelBoss: { targetHeight: 3.35, maxDimension: 4.6 },
} as const satisfies Record<string, WorldModelSizeTarget>;

export type WorldModelSizeTargetName = keyof typeof WORLD_MODEL_SIZE_TARGETS;
export type WorldAssetSizeTarget = WorldModelSizeTarget;

export const WORLD_CHARACTER_REFERENCE_HEIGHT = 1.7;
export const WORLD_MODEL_OVERSIZE_MULTIPLIER = 3;
export const WORLD_MAX_MODEL_DIMENSION = WORLD_ROAD_WIDTH / 2;

export function getWorldAssetKind(src: string): WorldAssetKind {
  const path = src.toLowerCase();
  if (path.includes("rock")) return "rock";
  if (path.includes("barrel")) return "barrel";
  if (path.includes("chest")) return "chest";
  if (path.includes("vase")) return "vase";
  return "generic";
}

export function getWorldAssetSizeTarget(src: string): WorldAssetSizeTarget {
  return WORLD_MODEL_SIZE_TARGETS[getWorldAssetKind(src)];
}

export function getWorldAssetRepresentativeNode(src: string) {
  return getWorldAssetSizeTarget(src).representativeNode;
}

export function getWorldCharacterSizeTarget(isBoss: boolean, context: WorldCharacterSizeContext) {
  return context === "world"
    ? WORLD_MODEL_SIZE_TARGETS[isBoss ? "worldBoss" : "worldCharacter"]
    : WORLD_MODEL_SIZE_TARGETS[isBoss ? "duelBoss" : "duelCharacter"];
}

export function getWorldModelFit(
  size: { x: number; y: number; z: number },
  target: Pick<WorldModelSizeTarget, "targetHeight" | "maxDimension">,
) {
  const safeHeight = Number.isFinite(target.targetHeight) ? Math.max(0.1, target.targetHeight) : 1.2;
  const configuredMaxDimension = Number.isFinite(target.maxDimension)
    ? Math.max(0.1, target.maxDimension)
    : safeHeight * 1.5;
  const safeMaxDimension = Math.min(configuredMaxDimension, WORLD_MAX_MODEL_DIMENSION);
  const height = Math.max(0.001, size.y);
  const largestDimension = Math.max(size.x, size.y, size.z, 0.001);
  const scale = Math.min(safeHeight / height, safeMaxDimension / largestDimension);
  return {
    scale,
    dimensions: {
      x: size.x * scale,
      y: size.y * scale,
      z: size.z * scale,
    },
    maxInstanceScale: Math.max(
      1,
      safeMaxDimension / Math.max(size.x * scale, size.y * scale, size.z * scale, 0.001),
    ),
  };
}

export function getWorldModelFitScale(
  size: { x: number; y: number; z: number },
  target: Pick<WorldModelSizeTarget, "targetHeight" | "maxDimension">,
) {
  return getWorldModelFit(size, target).scale;
}

export function getWorldCharacterFitScale(
  size: { x: number; y: number; z: number },
  target: Pick<WorldModelSizeTarget, "targetHeight" | "maxDimension"> = WORLD_MODEL_SIZE_TARGETS.player,
) {
  return getWorldModelFitScale(size, target);
}

const normalizedRockSize = getWorldModelFit(
  WORLD_MODEL_SIZE_TARGETS.rock.sourceDimensions,
  WORLD_MODEL_SIZE_TARGETS.rock,
).dimensions;
export const WORLD_ROCK_OBSTACLE_DIMENSIONS = {
  width: normalizedRockSize.x,
  depth: normalizedRockSize.z,
};
