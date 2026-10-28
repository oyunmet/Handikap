import {
  WAR_ROOM_DECAL_POOL_SIZE,
  WAR_ROOM_EFFECT_POOL_LIMIT,
  WAR_ROOM_EFFECT_POOL_SIZE,
  WAR_ROOM_SLASH_TRAIL_SEGMENTS,
} from "./war-room-fx";
import type { RenderQuality } from "../world/graphics-quality";
import { getWorldRenderPixelRatio } from "../world/graphics-quality";
import { WAR_ROOM_QUALITY_ENABLED } from "./war-room-features";

export type WarRoomQualityProfile = {
  particleMultiplier: number;
  maxActiveParticles: number;
  slashTrailSegments: number;
  pixelRatioCap: number;
  touchPixelRatioCap: number;
};

export const WAR_ROOM_PERFORMANCE_SAMPLE_MS = 60_000;
export const WAR_ROOM_CONTINUOUS_ATTACK_MAX_GAP_MS = 1_500;
export const WAR_ROOM_DRAW_CALL_BUDGET = 150;

export type WarRoomFrameStats = {
  drawCalls: number;
  fps: number;
};

export function getWarRoomFrameStats(drawCalls: number, deltaSeconds: number): WarRoomFrameStats {
  return {
    drawCalls: Number.isFinite(drawCalls) ? Math.max(0, Math.floor(drawCalls)) : 0,
    fps: Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? 1 / deltaSeconds : 0,
  };
}

export function isWithinWarRoomDrawCallBudget(drawCalls: number) {
  return Number.isFinite(drawCalls)
    && drawCalls >= 0
    && drawCalls <= WAR_ROOM_DRAW_CALL_BUDGET;
}

const WAR_ROOM_QUALITY_PROFILES: Record<RenderQuality, WarRoomQualityProfile> = {
  low: {
    particleMultiplier: 0.4,
    maxActiveParticles: 28,
    slashTrailSegments: 4,
    pixelRatioCap: 1,
    touchPixelRatioCap: 0.75,
  },
  balanced: {
    particleMultiplier: 0.7,
    maxActiveParticles: 50,
    slashTrailSegments: 7,
    pixelRatioCap: 1.25,
    touchPixelRatioCap: 0.9,
  },
  high: {
    particleMultiplier: 1,
    maxActiveParticles: Math.min(WAR_ROOM_EFFECT_POOL_SIZE, WAR_ROOM_EFFECT_POOL_LIMIT),
    slashTrailSegments: WAR_ROOM_SLASH_TRAIL_SEGMENTS,
    pixelRatioCap: 1.6,
    touchPixelRatioCap: 1,
  },
};

export function getWarRoomQualityProfile(
  quality: RenderQuality,
  qualityEnabled = WAR_ROOM_QUALITY_ENABLED,
): WarRoomQualityProfile {
  return qualityEnabled ? WAR_ROOM_QUALITY_PROFILES[quality] : WAR_ROOM_QUALITY_PROFILES.high;
}

export function getWarRoomEffectCount(
  baseCount: number,
  quality: RenderQuality,
  qualityEnabled = WAR_ROOM_QUALITY_ENABLED,
): number {
  if (!Number.isFinite(baseCount) || baseCount <= 0) return 0;
  if (!qualityEnabled) return Math.min(baseCount, getWarRoomQualityProfile(quality, false).maxActiveParticles);
  return Math.min(
    getWarRoomQualityProfile(quality, true).maxActiveParticles,
    Math.round(baseCount * getWarRoomQualityProfile(quality, true).particleMultiplier),
  );
}

export function getWarRoomPixelRatio(
  quality: RenderQuality,
  devicePixelRatio: number,
  touchDevice = false,
  qualityEnabled = WAR_ROOM_QUALITY_ENABLED,
): number {
  const safeDevicePixelRatio = Number.isFinite(devicePixelRatio)
    ? Math.max(0.75, Math.min(4, devicePixelRatio))
    : 1;
  if (!qualityEnabled) {
    return touchDevice
      ? Math.min(safeDevicePixelRatio, 1)
      : getWorldRenderPixelRatio(quality, safeDevicePixelRatio);
  }
  const profile = getWarRoomQualityProfile(quality);
  return Math.min(
    safeDevicePixelRatio,
    touchDevice ? profile.touchPixelRatioCap : profile.pixelRatioCap,
  );
}

export function countActiveWarRoomParticles(
  particles: readonly { born: number; lifetime: number }[],
  now: number,
): number {
  let active = 0;
  for (const particle of particles) {
    if (particle.born >= 0 && now - particle.born < particle.lifetime) active += 1;
  }
  return active;
}

export function countOccupiedWarRoomDecals(
  decals: readonly { kind: "bullet" | "crack" | null }[],
): number {
  let occupied = 0;
  for (const decal of decals) {
    if (decal.kind !== null) occupied += 1;
  }
  return occupied;
}

export function isWarRoomAttackRunContinuous(
  attackCount: number,
  largestGapMs: number,
  finalGapMs: number,
): boolean {
  return attackCount >= 60
    && Number.isFinite(largestGapMs)
    && Number.isFinite(finalGapMs)
    && largestGapMs <= WAR_ROOM_CONTINUOUS_ATTACK_MAX_GAP_MS
    && finalGapMs <= WAR_ROOM_CONTINUOUS_ATTACK_MAX_GAP_MS;
}

export function getWarRoomPoolLimits() {
  return {
    particles: Math.min(WAR_ROOM_EFFECT_POOL_SIZE, WAR_ROOM_EFFECT_POOL_LIMIT),
    decals: WAR_ROOM_DECAL_POOL_SIZE,
    slashTrailSegments: WAR_ROOM_SLASH_TRAIL_SEGMENTS,
  } as const;
}
