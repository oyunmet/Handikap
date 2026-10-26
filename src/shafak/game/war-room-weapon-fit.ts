export type WarRoomWeaponAxis = "x" | "y" | "z";
export type WarRoomVector3 = readonly [number, number, number];

export type WarRoomWeaponFit = {
  axis: WarRoomWeaponAxis;
  scale: [number, number, number];
  offset: [number, number, number];
};

const AXIS_NAMES: readonly WarRoomWeaponAxis[] = ["x", "y", "z"];

export function fitWarRoomWeapon(
  min: WarRoomVector3,
  max: WarRoomVector3,
  targetLength: number,
  gripRatio = 0.5,
  minimumVisualThickness = 0,
): WarRoomWeaponFit {
  const size = min.map((value, index) => max[index] - value) as [number, number, number];
  if (
    size.some((value) => !Number.isFinite(value) || value <= 0)
    || !Number.isFinite(targetLength)
    || targetLength <= 0
  ) {
    throw new Error("War Room silah sınırları ve hedef uzunluğu pozitif olmalı.");
  }

  const axisIndex = size.indexOf(Math.max(...size));
  const axis = AXIS_NAMES[axisIndex];
  const lengthScale = targetLength / size[axisIndex];
  const scale = [lengthScale, lengthScale, lengthScale] as [number, number, number];
  const thicknessFloor = Number.isFinite(minimumVisualThickness)
    ? Math.max(0, minimumVisualThickness)
    : 0;

  if (thicknessFloor > 0) {
    for (let index = 0; index < 3; index += 1) {
      if (index === axisIndex) continue;
      scale[index] = Math.max(lengthScale, thicknessFloor / size[index]);
    }
  }

  const ratio = Number.isFinite(gripRatio) ? Math.max(0, Math.min(1, gripRatio)) : 0.5;
  const gripPoint = min.map((value, index) => (
    index === axisIndex
      ? value + size[index] * ratio
      : value + size[index] * 0.5
  )) as [number, number, number];

  return {
    axis,
    scale,
    offset: gripPoint.map((coordinate, index) => -coordinate * scale[index]) as [number, number, number],
  };
}
