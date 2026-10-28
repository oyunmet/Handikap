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
    followSpeed: 10,
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
  // The player GLB faces native +Z; the model-axis group turns that to -Z.
  // Root yaw must then follow movement along (velocityX, -velocityY).
  return Math.atan2(-velocityX, velocityY);
}

export function getWorldV2CameraOffset(heading: number, distance: number) {
  const safeHeading = Number.isFinite(heading) ? heading : 0;
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  return {
    x: Math.sin(safeHeading) * safeDistance,
    z: Math.cos(safeHeading) * safeDistance,
  };
}

export function getWorldV2YawDelta(targetHeading: number, currentYaw: number) {
  return Math.atan2(
    Math.sin(targetHeading - currentYaw),
    Math.cos(targetHeading - currentYaw),
  );
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
