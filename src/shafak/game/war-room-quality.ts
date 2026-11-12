import {
  WAR_ROOM_DECAL_POOL_SIZE,
  WAR_ROOM_EFFECT_POOL_LIMIT,
  WAR_ROOM_EFFECT_POOL_SIZE,
  WAR_ROOM_SLASH_TRAIL_SEGMENTS,
} from "./war-room-fx";
import type { RenderQuality } from "../world/graphics-quality";
import { getWorldRenderPixelRatio } from "../world/graphics-quality";
import { WAR_ROOM_QUALITY_ENABLED } from "./war-room-features";
import { WAR_ROOM_CONFIG } from "./war-room-config";

export type WarRoomQualityProfile = {
  particleMultiplier: number;
  maxActiveParticles: number;
  slashTrailSegments: number;
  pixelRatioCap: number;
  touchPixelRatioCap: number;
};

export const WAR_ROOM_PERFORMANCE_SAMPLE_MS = WAR_ROOM_CONFIG.performance.sampleIntervalMs;
export const WAR_ROOM_CONTINUOUS_ATTACK_MAX_GAP_MS =
  WAR_ROOM_CONFIG.performance.maximumContinuousAttackGapMs;
export const WAR_ROOM_DRAW_CALL_BUDGET = WAR_ROOM_CONFIG.performance.drawCallBudget;

export type WarRoomFrameStats = {
  drawCalls: number;
  fps: number;
  frameTimeMs: number;
  triangles: number;
};

export function getWarRoomFrameStats(
  drawCalls: number,
  deltaSeconds: number,
  triangles = 0,
): WarRoomFrameStats {
  return {
    drawCalls: Number.isFinite(drawCalls) ? Math.max(0, Math.floor(drawCalls)) : 0,
    fps: Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? 1 / deltaSeconds : 0,
    frameTimeMs: Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? deltaSeconds * 1_000 : 0,
    triangles: Number.isFinite(triangles) ? Math.max(0, Math.floor(triangles)) : 0,
  };
}

export type WarRoomAdaptiveDprState = {
  pixelRatio: number;
  levelIndex: number;
  slowWindows: number;
  fastWindows: number;
  frameTimesMs: Float32Array;
  sortedFrameTimesMs: Float32Array;
  sampleCount: number;
  samplesSinceEvaluation: number;
  writeIndex: number;
  lastScaleChangeAtMs: number;
};

export const WAR_ROOM_ADAPTIVE_DPR_WINDOW_FRAMES = 30;
export const WAR_ROOM_ADAPTIVE_DPR_SCALE_LEVELS = [1, 0.85, 0.7, 0.6] as const;
export const WAR_ROOM_ADAPTIVE_DPR_CHANGE_COOLDOWN_MS = 1_000;

export function createWarRoomAdaptiveDprState(pixelRatio: number): WarRoomAdaptiveDprState {
  const safePixelRatio = Number.isFinite(pixelRatio)
    ? Math.max(0.75, Math.min(2, pixelRatio))
    : 1;
  return {
    pixelRatio: safePixelRatio,
    levelIndex: 0,
    slowWindows: 0,
    fastWindows: 0,
    frameTimesMs: new Float32Array(WAR_ROOM_ADAPTIVE_DPR_WINDOW_FRAMES),
    sortedFrameTimesMs: new Float32Array(WAR_ROOM_ADAPTIVE_DPR_WINDOW_FRAMES),
    sampleCount: 0,
    samplesSinceEvaluation: 0,
    writeIndex: 0,
    lastScaleChangeAtMs: Number.NEGATIVE_INFINITY,
  };
}

export function sampleWarRoomAdaptiveDpr(
  state: WarRoomAdaptiveDprState,
  maxPixelRatio: number,
  frameTimeMs: number,
  nowMs: number,
) {
  const maximum = Number.isFinite(maxPixelRatio) ? Math.max(0.75, Math.min(2, maxPixelRatio)) : 1;
  if (
    !Number.isFinite(frameTimeMs)
    || frameTimeMs <= 0
    || !Number.isFinite(nowMs)
  ) return state.pixelRatio;

  state.frameTimesMs[state.writeIndex] = frameTimeMs;
  state.writeIndex = (state.writeIndex + 1) % WAR_ROOM_ADAPTIVE_DPR_WINDOW_FRAMES;
  state.sampleCount = Math.min(state.sampleCount + 1, WAR_ROOM_ADAPTIVE_DPR_WINDOW_FRAMES);
  state.samplesSinceEvaluation += 1;
  if (
    state.sampleCount < WAR_ROOM_ADAPTIVE_DPR_WINDOW_FRAMES
    || state.samplesSinceEvaluation < WAR_ROOM_ADAPTIVE_DPR_WINDOW_FRAMES
  ) return state.pixelRatio;
  state.samplesSinceEvaluation = 0;

  let totalFrameTimeMs = 0;
  for (let index = 0; index < WAR_ROOM_ADAPTIVE_DPR_WINDOW_FRAMES; index += 1) {
    const sample = state.frameTimesMs[index]!;
    state.sortedFrameTimesMs[index] = sample;
    totalFrameTimeMs += sample;
  }
  state.sortedFrameTimesMs.sort();
  const averageFrameTimeMs = totalFrameTimeMs / WAR_ROOM_ADAPTIVE_DPR_WINDOW_FRAMES;
  const p95FrameTimeMs = state.sortedFrameTimesMs[
    Math.ceil(WAR_ROOM_ADAPTIVE_DPR_WINDOW_FRAMES * 0.95) - 1
  ]!;
  const frameRateHz = averageFrameTimeMs > 0 ? 1_000 / averageFrameTimeMs : 0;
  const targetFrameTimeMs = frameRateHz >= 25 && frameRateHz <= 35
    ? 1_000 / 30
    : 1_000 / 60;
  const isSlow = averageFrameTimeMs > targetFrameTimeMs * 1.1
    || p95FrameTimeMs > targetFrameTimeMs * 1.5;
  const isFast = averageFrameTimeMs <= targetFrameTimeMs * 0.9
    && p95FrameTimeMs <= targetFrameTimeMs * 1.25;

  if (isSlow) {
    state.slowWindows += 1;
    state.fastWindows = 0;
  } else if (isFast) {
    state.fastWindows += 1;
    state.slowWindows = 0;
  } else {
    state.slowWindows = 0;
    state.fastWindows = 0;
  }

  if (nowMs - state.lastScaleChangeAtMs < WAR_ROOM_ADAPTIVE_DPR_CHANGE_COOLDOWN_MS) {
    return state.pixelRatio;
  }

  if (state.slowWindows >= 2 && state.levelIndex < WAR_ROOM_ADAPTIVE_DPR_SCALE_LEVELS.length - 1) {
    state.levelIndex += 1;
    state.slowWindows = 0;
    state.fastWindows = 0;
    state.lastScaleChangeAtMs = nowMs;
  } else if (state.fastWindows >= 4 && state.levelIndex > 0) {
    state.levelIndex -= 1;
    state.slowWindows = 0;
    state.fastWindows = 0;
    state.lastScaleChangeAtMs = nowMs;
  } else {
    return state.pixelRatio;
  }

  state.pixelRatio = Math.round(
    Math.max(0.6, Math.min(maximum, maximum * WAR_ROOM_ADAPTIVE_DPR_SCALE_LEVELS[state.levelIndex]!))
      * 100,
  ) / 100;
  return state.pixelRatio;
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
    touchPixelRatioCap: 1,
  },
  balanced: {
    particleMultiplier: 0.7,
    maxActiveParticles: 50,
    slashTrailSegments: 7,
    pixelRatioCap: 1.5,
    touchPixelRatioCap: 1.5,
  },
  high: {
    particleMultiplier: 1,
    maxActiveParticles: Math.min(WAR_ROOM_EFFECT_POOL_SIZE, WAR_ROOM_EFFECT_POOL_LIMIT),
    slashTrailSegments: WAR_ROOM_SLASH_TRAIL_SEGMENTS,
    pixelRatioCap: 2,
    touchPixelRatioCap: 2,
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
