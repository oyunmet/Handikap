const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

export function solveTwoBoneLeg(
  targetY: number,
  targetZ: number,
  upperLength: number,
  lowerLength: number,
) {
  const distance = clamp(
    Math.hypot(targetY, targetZ),
    Math.abs(upperLength - lowerLength) + 0.001,
    upperLength + lowerLength - 0.001,
  );
  const targetAngle = Math.atan2(-targetZ, -targetY);
  const hipOffset = Math.acos(clamp(
    (upperLength ** 2 + distance ** 2 - lowerLength ** 2) / (2 * upperLength * distance),
    -1,
    1,
  ));
  const kneeCosine = clamp(
    (upperLength ** 2 + lowerLength ** 2 - distance ** 2) / (2 * upperLength * lowerLength),
    -1,
    1,
  );
  const kneeAngle = Math.PI - Math.acos(kneeCosine);
  const hipAngle = targetAngle + hipOffset;
  return {
    hip: hipAngle,
    knee: kneeAngle,
    ankle: -hipAngle - kneeAngle,
    reach: distance,
  };
}
