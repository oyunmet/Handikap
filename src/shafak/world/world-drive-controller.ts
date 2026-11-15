export const WORLD_DRIVE_STICK_DEADZONE = 0.12;
export const WORLD_DRIVE_TURN_SPEED = 4.8;
export const WORLD_CAMERA_TURN_FOLLOW = 22;

export type WorldStickCommand = {
  turn: number;
  forward: number;
  magnitude: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finiteOrZero = (value: number) => Number.isFinite(value) ? value : 0;

export function readWorldStickCommand(axes: { x: number; y: number }): WorldStickCommand {
  const x = finiteOrZero(axes.x);
  const y = finiteOrZero(axes.y);
  const rawMagnitude = Math.hypot(x, y);
  if (rawMagnitude <= WORLD_DRIVE_STICK_DEADZONE) return { turn: 0, forward: 0, magnitude: 0 };

  const magnitude = Math.min(1, rawMagnitude);
  const strength = (magnitude - WORLD_DRIVE_STICK_DEADZONE) / (1 - WORLD_DRIVE_STICK_DEADZONE);
  return {
    turn: x / rawMagnitude * strength,
    forward: y / rawMagnitude * strength,
    magnitude,
  };
}

export function stepWorldFacingYaw(yaw: number, turn: number, deltaSeconds: number) {
  const dt = clamp(finiteOrZero(deltaSeconds), 0, 0.05);
  const current = finiteOrZero(yaw);
  const steering = clamp(finiteOrZero(turn), -1, 1);
  return normalizeAngle(current - steering * WORLD_DRIVE_TURN_SPEED * dt);
}

export function stepWorldCameraHeading(
  currentHeading: number,
  facingYaw: number,
  deltaSeconds: number,
  followRate = WORLD_CAMERA_TURN_FOLLOW,
) {
  const dt = clamp(finiteOrZero(deltaSeconds), 0, 0.05);
  const current = finiteOrZero(currentHeading);
  const target = finiteOrZero(facingYaw);
  const difference = normalizeAngle(target - current);
  const blend = 1 - Math.exp(-dt * Math.max(0, finiteOrZero(followRate)));
  return normalizeAngle(current + difference * blend);
}

export function getWorldDriveVelocity(
  heading: number,
  strafe: number,
  forward: number,
  speed: number,
) {
  const safeHeading = finiteOrZero(heading);
  const safeStrafe = finiteOrZero(strafe);
  const safeForward = finiteOrZero(forward);
  const safeSpeed = finiteOrZero(speed);
  return {
    x: (-Math.sin(safeHeading) * safeForward + Math.cos(safeHeading) * safeStrafe) * safeSpeed,
    y: (Math.cos(safeHeading) * safeForward + Math.sin(safeHeading) * safeStrafe) * safeSpeed,
  };
}

function normalizeAngle(value: number) {
  return Math.atan2(Math.sin(value), Math.cos(value));
}
