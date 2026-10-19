export type GraphicsMode = "low" | "medium" | "high" | "auto";
export type RenderQuality = "low" | "balanced" | "high";

export const AUTO_QUALITY_DOWN_FPS = 40;
export const AUTO_QUALITY_DOWN_AFTER_MS = 2_000;
export const AUTO_QUALITY_UP_FPS = 56;
export const AUTO_QUALITY_UP_AFTER_MS = 6_000;

const PIXEL_RATIO_CAP: Record<RenderQuality, number> = {
  low: 1,
  balanced: 1.5,
  high: 2,
};

export function normalizeGraphicsMode(value: unknown): GraphicsMode {
  if (value === "low" || value === "medium" || value === "high" || value === "auto") {
    return value;
  }
  if (value === "balanced") return "medium";
  return "auto";
}

const SHADOW_BUDGET: Record<RenderQuality, number> = {
  low: 1_024,
  balanced: 1_024,
  high: 1_024,
};

export function resolveRenderQuality(mode: GraphicsMode, automatic: RenderQuality): RenderQuality {
  if (mode === "auto") return automatic;
  if (mode === "medium") return "balanced";
  return mode;
}

export function stepAutoQuality(current: RenderQuality, direction: "down" | "up"): RenderQuality {
  if (direction === "down") {
    return current === "high" ? "balanced" : "low";
  }
  return current === "low" ? "balanced" : "high";
}

export function getAutoQualityAction(fps: number, sustainedForMs: number): "down" | "up" | null {
  if (!Number.isFinite(fps) || !Number.isFinite(sustainedForMs)) return null;
  if (fps < AUTO_QUALITY_DOWN_FPS && sustainedForMs >= AUTO_QUALITY_DOWN_AFTER_MS) return "down";
  if (fps > AUTO_QUALITY_UP_FPS && sustainedForMs >= AUTO_QUALITY_UP_AFTER_MS) return "up";
  return null;
}

export function getPixelRatioCap(quality: RenderQuality, touchDevice = false): number {
  void touchDevice;
  return PIXEL_RATIO_CAP[quality];
}

export function getWorldRenderPixelRatio(
  quality: RenderQuality,
  devicePixelRatio: number,
  touchDevice = false,
): number {
  const dpr = Number.isFinite(devicePixelRatio)
    ? Math.max(1, Math.min(4, devicePixelRatio))
    : 1;
  return Math.min(getPixelRatioCap(quality, touchDevice), dpr);
}

export function shouldEnableWorldShadows(quality: RenderQuality, touchDevice = false): boolean {
  void touchDevice;
  return quality !== "low";
}

export function getShadowMapSize(quality: RenderQuality, devicePixelRatio: number): number {
  void devicePixelRatio;
  return SHADOW_BUDGET[quality];
}
