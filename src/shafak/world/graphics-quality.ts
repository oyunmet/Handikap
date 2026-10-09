export type GraphicsMode = "low" | "medium" | "high" | "auto";
export type RenderQuality = "low" | "balanced" | "high";

export function normalizeGraphicsMode(value: unknown): GraphicsMode {
  if (value === "low" || value === "medium" || value === "high" || value === "auto") {
    return value;
  }
  if (value === "balanced") return "medium";
  return "auto";
}

const SHADOW_BUDGET: Record<RenderQuality, number> = {
  low: 512,
  balanced: 1_024,
  high: 2_048,
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

export function getShadowMapSize(quality: RenderQuality, devicePixelRatio: number): number {
  const dpr = Number.isFinite(devicePixelRatio) ? Math.max(1, Math.min(4, devicePixelRatio)) : 1;
  const deviceScaledSize = Math.ceil((dpr * 512) / 256) * 256;
  return Math.min(SHADOW_BUDGET[quality], deviceScaledSize);
}
