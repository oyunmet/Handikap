export const WORLD_V2_CONFIG = {
  road: {
    width: 6,
    sectionLength: 120,
    tileLength: 12,
  },
  player: { targetHeight: 1.7 },
  npc: { targetHeight: 1.7 },
  rock: { targetMaxDim: 2 },
  spikeTrap: { width: 3, height: 0.5 },
  lowBeam: { width: 3, openingHeight: 1.4, beamHeight: 0.16 },
  lantern: { targetHeight: 2.5 },
  tower: { targetHeight: 8 },
  camera: {
    distanceBehind: 4.5,
    height: 2.2,
    targetHeight: 1.15,
    near: 0.2,
    far: 400,
    collisionMargin: 0.3,
    followSpeed: 5,
  },
  npcRoadOffset: 2.5,
  meshAuditLimit: 12,
  debugWarningLimit: 6,
} as const;

export type WorldV2AssetTarget =
  | { targetHeight: number; targetMaxDim?: never }
  | { targetMaxDim: number; targetHeight?: never };
