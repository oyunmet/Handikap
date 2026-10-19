export type DuelArenaBackdropMountain = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  color: string;
};

export function createDuelArenaBackdropMountains(wallColors: readonly string[]): DuelArenaBackdropMountain[] {
  if (wallColors.length === 0) {
    throw new RangeError("Duel arena backdrop needs at least one wall color.");
  }

  return Array.from({ length: 9 }, (_, index) => ({
    x: (index - 4) * 12.2,
    y: -3.6 + (index % 3) * 0.35,
    z: -48 - (index % 2) * 3,
    sx: 8.5 + (index % 4) * 1.8,
    sy: 5.2 + (index % 5) * 0.35,
    sz: 6.4 + (index % 3) * 1.1,
    color: wallColors[index % wallColors.length],
  }));
}
