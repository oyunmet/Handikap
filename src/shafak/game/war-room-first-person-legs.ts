export type WarRoomLegState = {
  x: number;
  z: number;
  floorHeight: number;
  jumpHeight: number;
  yaw: number;
  movement: number;
  walkPhase: number;
  crouched: boolean;
  prone: boolean;
};

export type WarRoomLegPoint = { x: number; y: number; z: number };

export type WarRoomFirstPersonLegPose = {
  hip: WarRoomLegPoint;
  knee: WarRoomLegPoint;
  ankle: WarRoomLegPoint;
  toe: WarRoomLegPoint;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export function shouldShowWarRoomFirstPersonLegs(cameraForwardY: number) {
  return Number.isFinite(cameraForwardY) && cameraForwardY < -0.22;
}

export function getWarRoomFirstPersonLegPose(
  state: WarRoomLegState,
  side: -1 | 1,
): WarRoomFirstPersonLegPose {
  const movement = clamp01(state.movement);
  const phase = state.walkPhase + (side < 0 ? Math.PI : 0);
  const stride = Math.sin(phase) * 0.24 * movement;
  const lift = Math.max(0, Math.cos(phase)) * 0.05 * movement;
  const forwardX = Math.sin(state.yaw);
  const forwardZ = -Math.cos(state.yaw);
  const rightX = Math.cos(state.yaw);
  const rightZ = Math.sin(state.yaw);
  const floor = state.floorHeight + state.jumpHeight;
  const hipHeight = state.prone ? 0.38 : state.crouched ? 0.62 : 0.82;
  const kneeHeight = state.prone ? 0.24 : state.crouched ? 0.36 : 0.47;
  const hipSide = side * 0.18;
  const ankleSide = side * 0.2;
  const hip = {
    x: state.x + rightX * hipSide,
    y: floor + hipHeight,
    z: state.z + rightZ * hipSide,
  };
  const knee = {
    x: state.x + rightX * side * 0.19 + forwardX * stride * 0.28,
    y: floor + kneeHeight + lift * 0.28,
    z: state.z + rightZ * side * 0.19 + forwardZ * stride * 0.28,
  };
  const ankle = {
    x: state.x + rightX * ankleSide + forwardX * stride,
    y: floor + 0.12 + lift,
    z: state.z + rightZ * ankleSide + forwardZ * stride,
  };
  return {
    hip,
    knee,
    ankle,
    toe: {
      x: ankle.x + forwardX * 0.34,
      y: ankle.y,
      z: ankle.z + forwardZ * 0.34,
    },
  };
}
