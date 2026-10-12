export type TraversalState = {
  jumpHeight: number;
  verticalVelocity: number;
  grounded: boolean;
  jumpsUsed: number;
  coyoteTime: number;
  jumpBuffer: number;
  stamina: number;
  dashTime: number;
  dashCooldown: number;
  activity: "resting" | "running" | "jumping" | "dashing";
};

export type TraversalInput = {
  sprintHeld: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  dashPressed: boolean;
  moving: boolean;
};

export type TraversalStep = {
  state: TraversalState;
  sprintEnabled: boolean;
  dashActive: boolean;
  landed: boolean;
};

const MAX_STAMINA = 100;
const COYOTE_SECONDS = 0.1;
const JUMP_BUFFER_SECONDS = 0.12;
const JUMP_SPEED = 6.25;
const DOUBLE_JUMP_SPEED = 5.7;
const GRAVITY = 18;
const SPRINT_COST_PER_SECOND = 24;
const STAMINA_REGEN_PER_SECOND = 18;
const DASH_COST = 24;
const DASH_DURATION = 0.2;
const DASH_COOLDOWN = 0.92;
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));
const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;

export function createTraversalState(): TraversalState {
  return {
    jumpHeight: 0,
    verticalVelocity: 0,
    grounded: true,
    jumpsUsed: 0,
    coyoteTime: COYOTE_SECONDS,
    jumpBuffer: 0,
    stamina: MAX_STAMINA,
    dashTime: 0,
    dashCooldown: 0,
    activity: "resting",
  };
}

export function stepTraversal(
  previous: TraversalState,
  input: TraversalInput,
  deltaSeconds: number,
): TraversalStep {
  const dt = clamp(finite(deltaSeconds), 0, 0.05);
  const state: TraversalState = {
    ...previous,
    jumpHeight: Math.max(0, finite(previous.jumpHeight)),
    verticalVelocity: finite(previous.verticalVelocity),
    grounded: previous.grounded !== false,
    jumpsUsed: clamp(Math.floor(finite(previous.jumpsUsed)), 0, 2),
    coyoteTime: clamp(finite(previous.coyoteTime), 0, COYOTE_SECONDS),
    jumpBuffer: input.jumpPressed
      ? JUMP_BUFFER_SECONDS
      : Math.max(0, finite(previous.jumpBuffer) - dt),
    stamina: clamp(finite(previous.stamina, MAX_STAMINA), 0, MAX_STAMINA),
    dashTime: Math.max(0, finite(previous.dashTime) - dt),
    dashCooldown: Math.max(0, finite(previous.dashCooldown) - dt),
  };
  const wasGrounded = state.grounded;

  if (state.grounded) {
    state.coyoteTime = COYOTE_SECONDS;
    state.jumpsUsed = 0;
  } else {
    state.coyoteTime = Math.max(0, state.coyoteTime - dt);
  }

  if (
    state.jumpBuffer > 0
    && (state.grounded || state.coyoteTime > 0 || state.jumpsUsed < 2)
  ) {
    const doubleJump = !state.grounded && state.coyoteTime <= 0;
    state.verticalVelocity = doubleJump ? DOUBLE_JUMP_SPEED : JUMP_SPEED;
    state.grounded = false;
    state.jumpsUsed = doubleJump ? 2 : 1;
    state.coyoteTime = 0;
    state.jumpBuffer = 0;
  }

  if (!state.grounded) {
    const gravity = input.jumpHeld && state.verticalVelocity > 0 ? GRAVITY * 0.62 : GRAVITY;
    state.verticalVelocity -= gravity * dt;
    state.jumpHeight += state.verticalVelocity * dt;
    if (state.jumpHeight <= 0) {
      state.jumpHeight = 0;
      state.verticalVelocity = 0;
      state.grounded = true;
    }
  }
  const landed = !wasGrounded && state.grounded;

  if (input.dashPressed && state.dashCooldown <= 0 && state.stamina >= DASH_COST) {
    state.dashTime = DASH_DURATION;
    state.dashCooldown = DASH_COOLDOWN;
    state.stamina -= DASH_COST;
  }

  const sprintEnabled = input.sprintHeld && input.moving && state.stamina > 0;
  if (sprintEnabled) {
    state.stamina = Math.max(0, state.stamina - SPRINT_COST_PER_SECOND * dt);
  } else if (state.dashTime <= 0) {
    state.stamina = Math.min(MAX_STAMINA, state.stamina + STAMINA_REGEN_PER_SECOND * dt);
  }

  const dashActive = state.dashTime > 0;
  state.activity = dashActive
    ? "dashing"
    : !state.grounded
      ? "jumping"
      : sprintEnabled
        ? "running"
        : "resting";
  return { state, sprintEnabled, dashActive, landed };
}

