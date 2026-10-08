export type WorldMotion = {
  velocityX: number;
  velocityY: number;
  depth: number;
  distance: number;
  cameraX: number;
  stepPhase: number;
  stepCount: number;
  stopTime: number;
  hasMoved: boolean;
  zoom: number;
  cameraLead: number;
  facing: -1 | 1;
};

export type WorldInput = {
  x: number;
  y: number;
  sprint: boolean;
  analogMagnitude: number;
};

export type WorldMotionFrame = WorldMotion & {
  speed: number;
  bob: number;
  lean: number;
  weightShift: number;
  squash: number;
  shadowScale: number;
  footsteps: number;
  motion: "idle" | "walking" | "running" | "stopped";
};

export const WORLD_METERS_TO_PIXELS = 38;
export const LANE_METERS_PER_UNIT = 7;
export const WORLD_CHUNK_LENGTH_METERS = 30;
export const WORLD_GATE_INTERVAL_METERS = 144;

const WALK_SPEED = 3.4;
const RUN_SPEED = 6.8;
const STRIDE_LENGTH = 1.38;
const ACCELERATION_SECONDS = 0.19;
const DECELERATION_SECONDS = 0.31;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const smoothstep = (start: number, end: number, value: number) => {
  const amount = clamp((value - start) / (end - start), 0, 1);
  return amount * amount * (3 - 2 * amount);
};

export function createWorldMotion(distance = 0, depth = 0): WorldMotion {
  const initialDistance = finiteOrZero(distance);
  return {
    velocityX: 0,
    velocityY: 0,
    depth: clamp(finiteOrZero(depth), -1, 1),
    distance: initialDistance,
    cameraX: initialDistance,
    stepPhase: 0,
    stepCount: 0,
    stopTime: 0,
    hasMoved: false,
    zoom: 1,
    cameraLead: 0,
    facing: 1,
  };
}

export function readWorldInput(
  keys: ReadonlySet<string>,
  analog: { x: number; y: number },
): WorldInput {
  const keyX = Number(keys.has("arrowright") || keys.has("d"))
    - Number(keys.has("arrowleft") || keys.has("a"));
  const keyY = Number(keys.has("arrowup") || keys.has("w"))
    - Number(keys.has("arrowdown") || keys.has("s"));
  const hasKeyboardDirection = keyX !== 0 || keyY !== 0;
  const x = hasKeyboardDirection ? keyX : finiteOrZero(analog.x);
  const y = hasKeyboardDirection ? keyY : finiteOrZero(analog.y);
  const magnitude = Math.hypot(x, y);
  const scale = magnitude > 1 ? 1 / magnitude : 1;

  return {
    x: x * scale,
    y: y * scale,
    sprint: keys.has("shift"),
    analogMagnitude: hasKeyboardDirection ? 0 : clamp(magnitude, 0, 1),
  };
}

export function stepWorldMotion(
  state: WorldMotion,
  input: WorldInput,
  deltaSeconds: number,
): WorldMotionFrame {
  const dt = clamp(finiteOrZero(deltaSeconds), 0, 0.05);
  const magnitude = clamp(Math.hypot(input.x, input.y), 0, 1);
  const analogRun = smoothstep(0.58, 1, clamp(input.analogMagnitude, 0, 1));
  const runBlend = input.sprint ? 1 : analogRun;
  const targetSpeed = magnitude * (WALK_SPEED + (RUN_SPEED - WALK_SPEED) * runBlend);
  const directionScale = magnitude > 0 ? 1 / magnitude : 0;
  const targetX = input.x * directionScale * targetSpeed;
  const targetY = input.y * directionScale * targetSpeed / LANE_METERS_PER_UNIT;
  const timeConstant = targetSpeed > 0 ? ACCELERATION_SECONDS : DECELERATION_SECONDS;
  const response = 1 - Math.exp(-dt / timeConstant);
  const velocityX = state.velocityX + (targetX - state.velocityX) * response;
  const velocityY = state.velocityY + (targetY - state.velocityY) * response;
  const speed = Math.hypot(velocityX, velocityY * LANE_METERS_PER_UNIT);
  const isMoving = speed > 0.12;
  const stopTime = isMoving ? 0 : state.stopTime + dt;
  const distance = state.distance + velocityX * dt;
  const depth = clamp(state.depth + velocityY * dt, -1, 1);
  const stepPhase = state.stepPhase + speed * dt / STRIDE_LENGTH * Math.PI * 2;
  const stepCount = Math.floor(stepPhase / Math.PI);
  const footsteps = Math.max(0, stepCount - state.stepCount);
  const speedFactor = clamp(speed / RUN_SPEED, 0, 1);
  const movingBob = Math.abs(Math.sin(stepPhase)) * (3.5 + speedFactor * 4);
  const idleBreath = isMoving ? 0 : Math.sin(state.stepPhase * 0.08 + stopTime * 0.85) * 1.8;
  const weightShift = isMoving
    ? Math.sin(stepPhase / 2) * (1 + speedFactor * 1.3)
    : Math.sin(stopTime * 1.35) * .7;
  const targetZoom = 1 - speedFactor * 0.028;
  const cameraResponse = 1 - Math.exp(-dt / (isMoving ? 0.34 : 0.52));
  const zoom = state.zoom + (targetZoom - state.zoom) * cameraResponse;
  const cameraTarget = distance + velocityX * 0.22;
  const cameraX = state.cameraX + (cameraTarget - state.cameraX) * cameraResponse;
  const cameraLead = clamp((distance - cameraX) * WORLD_METERS_TO_PIXELS, -18, 18);
  const lean = clamp(velocityX / RUN_SPEED, -1, 1) * 2.6;
  const footImpact = (1 + Math.cos(stepPhase)) / 2;
  const squash = isMoving ? footImpact * (0.012 + speedFactor * 0.008) : 0;
  const shadowScale = 1 + speedFactor * 0.24 - squash * 2;
  const facing = velocityX > .12 ? -1 : velocityX < -.12 ? 1 : state.facing;
  const nextState: WorldMotion = {
    velocityX,
    velocityY,
    depth,
    distance,
    cameraX,
    stepPhase,
    stepCount,
    stopTime,
    hasMoved: state.hasMoved || isMoving,
    zoom,
    cameraLead,
    facing,
  };

  return {
    ...nextState,
    speed,
    bob: isMoving ? movingBob : idleBreath,
    lean: isMoving ? lean : 0,
    weightShift,
    squash,
    shadowScale,
    footsteps,
    motion: isMoving
      ? speed > WALK_SPEED + (RUN_SPEED - WALK_SPEED) * 0.48 ? "running" : "walking"
      : state.hasMoved && stopTime < 0.45 ? "stopped" : "idle",
  };
}

function finiteOrZero(value: number) {
  return Number.isFinite(value) ? value : 0;
}
