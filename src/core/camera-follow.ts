export interface MutableVector3 {
  x: number;
  y: number;
  z: number;
}

export function smoothFollow(
  current: MutableVector3,
  target: MutableVector3,
  deltaSeconds: number,
  smoothing: number,
  maxDeltaSeconds = 0.1,
): MutableVector3 {
  const delta = Number.isFinite(deltaSeconds)
    ? Math.min(Math.max(deltaSeconds, 0), maxDeltaSeconds)
    : 0;
  const amount = 1 - Math.exp(-Math.max(0, smoothing) * delta);
  current.x += (target.x - current.x) * amount;
  current.y += (target.y - current.y) * amount;
  current.z += (target.z - current.z) * amount;
  return current;
}
