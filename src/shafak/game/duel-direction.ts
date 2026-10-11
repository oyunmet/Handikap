export type DirectionZone = "front" | "left" | "right" | "rear";

export function duel360EnabledFromSearch(search: string) {
  return new URLSearchParams(search).get("duel360") !== "0";
}

export type DuelPosition = {
  x: number;
  z: number;
};

export const ATTACK_HALF_ANGLE_RADIANS = Math.PI * 0.35;
export const SHIELD_HALF_ANGLE_RADIANS = Math.PI / 2;

export function normalizeYaw(yaw: number) {
  if (!Number.isFinite(yaw)) return 0;
  const fullTurn = Math.PI * 2;
  const wrapped = ((yaw + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI;
  return wrapped === -Math.PI && yaw > 0 ? Math.PI : wrapped;
}

export function quantizeDuelYaw(yaw: number) {
  return Math.round(normalizeYaw(yaw) * 1_000) / 1_000;
}

export function yawToward(source: DuelPosition, target: DuelPosition) {
  return normalizeYaw(Math.atan2(target.x - source.x, target.z - source.z));
}

export function signedYawDifference(from: number, to: number) {
  return normalizeYaw(normalizeYaw(to) - normalizeYaw(from));
}

export function turnYawToward(current: number, desired: number, maxStep: number) {
  const safeStep = Number.isFinite(maxStep) ? Math.max(0, maxStep) : 0;
  const difference = signedYawDifference(current, desired);
  return normalizeYaw(current + Math.max(-safeStep, Math.min(safeStep, difference)));
}

export function isWithinFacingCone(
  source: DuelPosition,
  target: DuelPosition,
  sourceYaw: number,
  halfAngle = ATTACK_HALF_ANGLE_RADIANS,
) {
  const difference = Math.abs(signedYawDifference(sourceYaw, yawToward(source, target)));
  return difference <= Math.max(0, halfAngle);
}

export function getDirectionZone(defender: DuelPosition & { yaw: number }, attacker: DuelPosition): DirectionZone {
  const relative = signedYawDifference(defender.yaw, yawToward(defender, attacker));
  const angle = Math.abs(relative);
  if (angle <= Math.PI / 4) return "front";
  if (angle >= Math.PI * 3 / 4) return "rear";
  return relative > 0 ? "right" : "left";
}

export function getDirectionalDamageMultiplier(zone: DirectionZone) {
  if (zone === "rear") return 1.35;
  if (zone === "left" || zone === "right") return 1.15;
  return 1;
}
