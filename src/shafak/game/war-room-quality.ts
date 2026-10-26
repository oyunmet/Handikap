import {
  WAR_ROOM_EFFECT_POOL_LIMIT,
  WAR_ROOM_EFFECT_POOL_SIZE,
  WAR_ROOM_SLASH_TRAIL_SEGMENTS,
} from "./war-room-fx";
import type { RenderQuality } from "../world/graphics-quality";

export type WarRoomQualityProfile = {
  particleMultiplier: number;
  maxActiveParticles: number;
  slashTrailSegments: number;
  pixelRatioCap: number;
};

const WAR_ROOM_QUALITY_PROFILES: Record<RenderQuality, WarRoomQualityProfile> = {
  low: {
    particleMultiplier: 0.4,
    maxActiveParticles: 28,
    slashTrailSegments: 4,
    pixelRatioCap: 1,
  },
  balanced: {
    particleMultiplier: 0.7,
    maxActiveParticles: 50,
    slashTrailSegments: 7,
    pixelRatioCap: 1.25,
  },
  high: {
    particleMultiplier: 1,
    maxActiveParticles: Math.min(WAR_ROOM_EFFECT_POOL_SIZE, WAR_ROOM_EFFECT_POOL_LIMIT),
    slashTrailSegments: WAR_ROOM_SLASH_TRAIL_SEGMENTS,
    pixelRatioCap: 1.6,
  },
};

export function getWarRoomQualityProfile(quality: RenderQuality): WarRoomQualityProfile {
  return WAR_ROOM_QUALITY_PROFILES[quality];
}

export function getWarRoomEffectCount(baseCount: number, quality: RenderQuality): number {
  if (!Number.isFinite(baseCount) || baseCount <= 0) return 0;
  return Math.min(
    getWarRoomQualityProfile(quality).maxActiveParticles,
    Math.round(baseCount * getWarRoomQualityProfile(quality).particleMultiplier),
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
