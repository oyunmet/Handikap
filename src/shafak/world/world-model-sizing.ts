export type WorldAssetKind = "rock" | "barrel" | "chest" | "vase" | "generic";

export type WorldAssetSizeTarget = {
  targetHeight: number;
  maxDimension: number;
  representativeNode?: string;
};

export const WORLD_ASSET_SIZE_TARGETS: Record<WorldAssetKind, WorldAssetSizeTarget> = {
  rock: { targetHeight: 1.5, maxDimension: 2 },
  barrel: {
    targetHeight: 1.05,
    maxDimension: 1.2,
    representativeNode: "wooden_barrels_01_barrel01",
  },
  chest: { targetHeight: 1, maxDimension: 1.5 },
  vase: { targetHeight: 0.95, maxDimension: 1.15 },
  generic: { targetHeight: 1.2, maxDimension: 1.8 },
};

export const WORLD_CHARACTER_REFERENCE_HEIGHT = 1.7;
export const WORLD_CHARACTER_MAX_DIMENSION_MULTIPLIER = 1.5;
export const WORLD_MODEL_OVERSIZE_MULTIPLIER = 3;
export const WORLD_ROCK_OBSTACLE_DIMENSIONS = {
  width: 1.1,
  depth: 2,
} as const;

export function getWorldAssetKind(src: string): WorldAssetKind {
  const path = src.toLowerCase();
  if (path.includes("rock")) return "rock";
  if (path.includes("barrel")) return "barrel";
  if (path.includes("chest")) return "chest";
  if (path.includes("vase")) return "vase";
  return "generic";
}

export function getWorldAssetSizeTarget(src: string): WorldAssetSizeTarget {
  return WORLD_ASSET_SIZE_TARGETS[getWorldAssetKind(src)];
}

export function getWorldAssetRepresentativeNode(src: string) {
  return getWorldAssetSizeTarget(src).representativeNode;
}

export function getWorldModelFitScale(
  size: { x: number; y: number; z: number },
  targetHeight: number,
  maxDimension: number,
) {
  const safeHeight = Number.isFinite(targetHeight) ? Math.max(0.1, targetHeight) : 1.2;
  const safeMaxDimension = Number.isFinite(maxDimension)
    ? Math.max(0.1, maxDimension)
    : safeHeight * 1.5;
  const height = Math.max(0.001, size.y);
  const largestDimension = Math.max(size.x, size.y, size.z, 0.001);
  return Math.min(safeHeight / height, safeMaxDimension / largestDimension);
}

export function getWorldCharacterFitScale(
  size: { x: number; y: number; z: number },
  targetHeight: number,
) {
  const safeHeight = Number.isFinite(targetHeight) ? Math.max(0.1, targetHeight) : 1.7;
  return getWorldModelFitScale(
    size,
    safeHeight,
    safeHeight * WORLD_CHARACTER_MAX_DIMENSION_MULTIPLIER,
  );
}
