export const KNIGHT_ACTOR_DEPTH_TO_WORLD_X = 5.2;

export function getKnightActorLocalPosition(
  depth: number,
  jumpHeight: number,
  positionedByParent = false,
): readonly [number, number, number] {
  if (positionedByParent) return [0, 0, 0];
  return [depth * KNIGHT_ACTOR_DEPTH_TO_WORLD_X, jumpHeight, 0];
}
