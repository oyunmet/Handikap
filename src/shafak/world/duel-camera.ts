import { normalizeYaw } from "../game/duel-direction";

type DuelCameraActor = {
  x: number;
  z: number;
  yaw?: number;
};

type DuelCameraFramingOptions = {
  player: DuelCameraActor;
  bot: DuelCameraActor;
  aspect: number;
  orbitYaw: number;
  lockOn: boolean;
};

export type DuelCameraFraming = {
  targetX: number;
  targetZ: number;
  yaw: number;
  distance: number;
  fov: number;
  gap: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finiteOr = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;

export function getDuelCameraFraming({
  player,
  bot,
  aspect,
  orbitYaw,
  lockOn,
}: DuelCameraFramingOptions): DuelCameraFraming {
  const playerX = finiteOr(player.x, 0);
  const playerZ = finiteOr(player.z, 0);
  const botX = finiteOr(bot.x, playerX);
  const botZ = finiteOr(bot.z, playerZ);
  const dx = botX - playerX;
  const dz = botZ - playerZ;
  const gap = Math.hypot(dx, dz);
  const targetX = (playerX + botX) * 0.5;
  const targetZ = (playerZ + botZ) * 0.5;
  const safeAspect = clamp(finiteOr(aspect, 1), 0.35, 3.5);
  const fov = safeAspect < 0.72 ? 60 : safeAspect < 1 ? 54 : 46;

  // In lock-on mode, keep the camera at a three-quarter side angle. A camera
  // directly behind the player stacks both fighters into one silhouette.
  const fightYaw = gap > 0.001
    ? Math.atan2(dx, dz)
    : finiteOr(player.yaw ?? 0, 0);
  const yaw = lockOn
    ? normalizeYaw(fightYaw - Math.PI * 0.68)
    : normalizeYaw(finiteOr(orbitYaw, 0));

  // Derive the zoom from horizontal FOV so both fighters remain visible on
  // narrow portrait screens, even when they move to opposite arena edges.
  const verticalHalfFov = (fov * Math.PI) / 360;
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * safeAspect);
  const framingHalfAngle = horizontalHalfFov * 0.74;
  const requiredDistance = (gap * 0.5 + 0.48) / Math.tan(framingHalfAngle);

  return {
    targetX,
    targetZ,
    yaw,
    distance: clamp(requiredDistance, 6.8, 22),
    fov,
    gap,
  };
}
