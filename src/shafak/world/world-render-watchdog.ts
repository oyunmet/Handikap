export type WorldRenderWatchdogTimeouts = {
  firstFrameMs: number;
  renderStallMs: number;
};

export function getWorldRenderWatchdogTimeouts(rendererName: string): WorldRenderWatchdogTimeouts {
  if (/swiftshader|llvmpipe|software rasterizer/i.test(rendererName)) {
    return { firstFrameMs: 30_000, renderStallMs: 15_000 };
  }
  return { firstFrameMs: 8_000, renderStallMs: 5_000 };
}
