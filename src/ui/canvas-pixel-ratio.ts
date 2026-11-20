export type CanvasDpr = number | readonly [min: number, max: number];

type CanvasDprRequest = {
  dpr?: CanvasDpr;
};

const DEFAULT_CANVAS_DPR: readonly [number, number] = [1, 1.5];

export function resolveSharedCanvasDpr(
  requests: readonly CanvasDprRequest[],
  fallback: readonly [number, number] = DEFAULT_CANVAS_DPR,
): number | [number, number] {
  const fixedRatios: number[] = [];
  const ranges: Array<readonly [number, number]> = [];

  for (const request of requests) {
    const dpr = request.dpr;
    if (typeof dpr === "number") {
      if (Number.isFinite(dpr) && dpr > 0) fixedRatios.push(dpr);
      continue;
    }
    if (!dpr) continue;

    const [min, max] = dpr;
    if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min) {
      ranges.push([min, max]);
    }
  }

  if (fixedRatios.length > 0) {
    const rangeCap = ranges.length > 0
      ? Math.min(...ranges.map((range) => range[1]))
      : Number.POSITIVE_INFINITY;
    return Math.min(...fixedRatios, rangeCap);
  }

  if (ranges.length > 0) {
    const min = Math.max(...ranges.map((range) => range[0]));
    const max = Math.min(...ranges.map((range) => range[1]));
    return min <= max ? [min, max] : max;
  }

  return [fallback[0], fallback[1]];
}
