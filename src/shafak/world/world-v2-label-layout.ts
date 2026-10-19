export type WorldV2ScreenRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type WorldV2ProjectedLabel = {
  id: number;
  distance: number;
  maxDistance: number;
  visibleInCamera: boolean;
  rect: WorldV2ScreenRect;
};

function overlaps(left: WorldV2ScreenRect, right: WorldV2ScreenRect, padding = 0) {
  return left.left < right.right + padding
    && left.right > right.left - padding
    && left.top < right.bottom + padding
    && left.bottom > right.top - padding;
}

export function selectWorldV2Labels(
  candidates: readonly WorldV2ProjectedLabel[],
  blockedRects: readonly WorldV2ScreenRect[] = [],
  limit = 3,
) {
  const selected: WorldV2ProjectedLabel[] = [];
  for (const candidate of [...candidates]
    .filter((item) => item.visibleInCamera && item.distance <= item.maxDistance)
    .sort((left, right) => left.distance - right.distance)) {
    if (selected.length >= limit) break;
    if (blockedRects.some((rect) => overlaps(candidate.rect, rect, 5))) continue;
    if (selected.some((item) => overlaps(candidate.rect, item.rect, 9))) continue;
    selected.push(candidate);
  }
  return selected;
}
