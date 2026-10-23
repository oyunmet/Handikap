import { KNIGHT_CONFIG } from "./knight-config";

export const WORLD_V2_CONFIG = {
  road: {
    width: 6,
    sectionLength: 120,
    tileLength: 12,
  },
  player: { targetHeight: 1.7 },
  npc: { targetHeight: 1.7 },
  // Normalize the GLB's native forward axis inside the actor's model wrapper.
  modelFacing: KNIGHT_CONFIG.modelFacing,
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

export function getWorldV2Heading(
  velocityX: number,
  velocityY: number,
  fallback = Math.PI,
) {
  if (!Number.isFinite(velocityX) || !Number.isFinite(velocityY)) return fallback;
  if (Math.hypot(velocityX, velocityY) < 0.12) return fallback;
  // The camera and road share world axes: joystick up is negative world Z.
  return Math.atan2(velocityX, -velocityY);
}

export type WorldV2AssetTarget =
  | {
      targetHeight: number;
      targetMaxDim?: never;
      maxDimension?: number;
      modelRotation?: readonly [number, number, number];
    }
  | {
      targetMaxDim: number;
      targetHeight?: never;
      maxDimension?: never;
      modelRotation?: readonly [number, number, number];
    };
