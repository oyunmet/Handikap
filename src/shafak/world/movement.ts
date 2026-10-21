export type WorldMotion = {
  velocityX: number;
  velocityY: number;
  jumpHeight: number;
  jumpVelocity: number;
  jumpHeld: boolean;
  crouching: boolean;
  depth: number;
  distance: number;
  originDistance: number;
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
  jump: boolean;
  crouch: boolean;
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
export const WORLD_ROAD_WIDTH = 9.2;
export const WORLD_PLAYER_EDGE_MARGIN_METERS = 0.6;
export const WORLD_PLAYER_LATERAL_LIMIT_METERS = WORLD_ROAD_WIDTH / 2 - WORLD_PLAYER_EDGE_MARGIN_METERS;
export const WORLD_PLAYER_DEPTH_LIMIT = WORLD_PLAYER_LATERAL_LIMIT_METERS / 5.2;
export const WORLD_CHUNK_LENGTH_METERS = 48;
export const WORLD_GATE_INTERVAL_METERS = 144;
export const WORLD_ORIGIN_REBASE_INTERVAL_METERS = 1024;
export const WORLD_JOYSTICK_X_DEADZONE = 0.2;

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
    jumpHeight: 0,
    jumpVelocity: 0,
    jumpHeld: false,
    crouching: false,
    depth: clamp(finiteOrZero(depth), -WORLD_PLAYER_DEPTH_LIMIT, WORLD_PLAYER_DEPTH_LIMIT),
    distance: initialDistance,
    originDistance: getWorldOriginDistance(initialDistance),
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
  const analogX = finiteOrZero(analog.x);
  const analogY = finiteOrZero(analog.y);
  const x = hasKeyboardDirection
    ? keyX
    : Math.abs(analogX) < WORLD_JOYSTICK_X_DEADZONE ? 0 : analogX;
  const y = hasKeyboardDirection ? keyY : analogY;
  const magnitude = Math.hypot(x, y);
  const scale = magnitude > 1 ? 1 / magnitude : 1;

  return {
    x: x * scale,
    y: y * scale,
    sprint: keys.has("shift"),
    jump: keys.has("space"),
    crouch: keys.has("control") || keys.has("c"),
    analogMagnitude: hasKeyboardDirection ? 0 : clamp(magnitude, 0, 1),
  };
}

export function stepWorldMotion(
  state: WorldMotion,
  input: WorldInput,
  deltaSeconds: number,
  speedMultiplier = 1,
  target?: WorldMotionFrame,
  handlingMultiplier = 1,
): WorldMotionFrame {
  const dt = clamp(finiteOrZero(deltaSeconds), 0, 0.05);
  const magnitude = clamp(Math.hypot(input.x, input.y), 0, 1);
  const analogRun = smoothstep(0.58, 1, clamp(input.analogMagnitude, 0, 1));
  let jumpVelocity = state.jumpVelocity;
  let jumpHeight = state.jumpHeight;
  const jumpPressed = input.jump && !state.jumpHeld;
  if (jumpPressed && !input.crouch && jumpHeight <= 0.001) jumpVelocity = 7.2;
  if (jumpVelocity !== 0 || jumpHeight > 0) {
    jumpVelocity -= 19.5 * dt;
    jumpHeight = Math.max(0, jumpHeight + jumpVelocity * dt);
    if (jumpHeight === 0) jumpVelocity = 0;
  }
  const crouching = input.crouch && jumpHeight <= 0.05;
  const runBlend = crouching ? 0 : input.sprint ? 1 : analogRun;
  const targetSpeed = magnitude * (WALK_SPEED + (RUN_SPEED - WALK_SPEED) * runBlend)
    * (crouching ? 0.56 : 1)
    * clamp(finiteOrZero(speedMultiplier) || 1, 0.88, 1.14);
  const directionScale = magnitude > 0 ? 1 / magnitude : 0;
  const targetX = input.x * directionScale * targetSpeed;
  const targetY = input.y * directionScale * targetSpeed;
  const handling = clamp(finiteOrZero(handlingMultiplier) || 1, 0.6, 1);
  const timeConstant = (targetSpeed > 0 ? ACCELERATION_SECONDS : DECELERATION_SECONDS) / handling;
  const response = 1 - Math.exp(-dt / timeConstant);
  let velocityX = state.velocityX + (targetX - state.velocityX) * response;
  let velocityY = state.velocityY + (targetY - state.velocityY) * response;
  const requestedDistance = state.distance + velocityY * dt;
  const distance = Math.max(0, requestedDistance);
  if (requestedDistance <= 0) velocityY = 0;
  const speed = Math.hypot(velocityX, velocityY);
  const isMoving = speed > 0.12;
  const stopTime = isMoving ? 0 : state.stopTime + dt;
  const originDistance = getWorldOriginDistance(distance);
  const requestedDepth = state.depth + velocityX * dt / LANE_METERS_PER_UNIT;
  const depth = clamp(requestedDepth, -WORLD_PLAYER_DEPTH_LIMIT, WORLD_PLAYER_DEPTH_LIMIT);
  if (requestedDepth < -WORLD_PLAYER_DEPTH_LIMIT && velocityX < 0) {
    velocityX = Math.max(0.35, -velocityX * 0.12);
  } else if (requestedDepth > WORLD_PLAYER_DEPTH_LIMIT && velocityX > 0) {
    velocityX = Math.min(-0.35, -velocityX * 0.12);
  }
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
  const cameraTarget = distance + velocityY * 0.22;
  const cameraX = state.cameraX + (cameraTarget - state.cameraX) * cameraResponse;
  const cameraLead = clamp((distance - cameraX) * WORLD_METERS_TO_PIXELS, -18, 18);
  const lean = clamp(velocityX / RUN_SPEED, -1, 1) * 2.6;
  const footImpact = (1 + Math.cos(stepPhase)) / 2;
  const squash = isMoving ? footImpact * (0.012 + speedFactor * 0.008) : 0;
  const shadowScale = 1 + speedFactor * 0.24 - squash * 2;
  const facing = Math.abs(velocityX) > .12 ? (velocityX < 0 ? -1 : 1) : state.facing;
  const frame = target ?? {} as WorldMotionFrame;
  frame.velocityX = velocityX;
  frame.velocityY = velocityY;
  frame.jumpHeight = jumpHeight;
  frame.jumpVelocity = jumpVelocity;
  frame.jumpHeld = input.jump;
  frame.crouching = crouching;
  frame.depth = depth;
  frame.distance = distance;
  frame.originDistance = originDistance;
  frame.cameraX = cameraX;
  frame.stepPhase = stepPhase;
  frame.stepCount = stepCount;
  frame.stopTime = stopTime;
  frame.hasMoved = state.hasMoved || isMoving;
  frame.zoom = zoom;
  frame.cameraLead = cameraLead;
  frame.facing = facing;
  frame.speed = speed;
  frame.bob = isMoving ? movingBob : idleBreath;
  frame.lean = isMoving ? lean : 0;
  frame.weightShift = weightShift;
  frame.squash = squash;
  frame.shadowScale = shadowScale;
  frame.footsteps = footsteps;
  frame.motion = isMoving
    ? speed > WALK_SPEED + (RUN_SPEED - WALK_SPEED) * 0.48 ? "running" : "walking"
    : state.hasMoved && stopTime < 0.45 ? "stopped" : "idle";
  return frame;
}

export function interpolateWorldMotion(
  previous: WorldMotion,
  current: WorldMotion,
  alpha: number,
  target: WorldMotion,
) {
  const amount = clamp(finiteOrZero(alpha), 0, 1);
  const lerp = (from: number, to: number) => from + (to - from) * amount;
  target.velocityX = lerp(previous.velocityX, current.velocityX);
  target.velocityY = lerp(previous.velocityY, current.velocityY);
  target.jumpHeight = lerp(previous.jumpHeight, current.jumpHeight);
  target.jumpVelocity = current.jumpVelocity;
  target.jumpHeld = current.jumpHeld;
  target.crouching = current.crouching;
  target.depth = lerp(previous.depth, current.depth);
  target.distance = lerp(previous.distance, current.distance);
  target.originDistance = current.originDistance;
  target.cameraX = lerp(previous.cameraX, current.cameraX);
  target.stepPhase = lerp(previous.stepPhase, current.stepPhase);
  target.stopTime = lerp(previous.stopTime, current.stopTime);
  target.zoom = lerp(previous.zoom, current.zoom);
  target.cameraLead = lerp(previous.cameraLead, current.cameraLead);
  target.stepCount = current.stepCount;
  target.hasMoved = current.hasMoved;
  target.facing = current.facing;
}

export function getWorldOriginDistance(distance: number) {
  const finiteDistance = finiteOrZero(distance);
  return finiteDistance > 0
    ? Math.floor(finiteDistance / WORLD_ORIGIN_REBASE_INTERVAL_METERS) * WORLD_ORIGIN_REBASE_INTERVAL_METERS
    : 0;
}

function finiteOrZero(value: number) {
  return Number.isFinite(value) ? value : 0;
}
