export type WorldActionState = {
  sprint: boolean;
  jumpPressed: boolean;
  crouch: boolean;
};

export type WorldMovementState =
  | "YERDE_DURUYOR"
  | "KOŞUYOR"
  | "SPRINT"
  | "ZIPLAMA_HAZIRLIK"
  | "HAVADA_YUKARI"
  | "HAVADA_AŞAĞI"
  | "İNİŞ"
  | "EĞİLİYOR"
  | "KAYIYOR";

export type WorldMovementMachine = {
  state: WorldMovementState;
  jumpBufferSeconds: number;
  coyoteSeconds: number;
  jumpPreparationSeconds: number;
  landingSeconds: number;
  slideSeconds: number;
  crouchHeld: boolean;
};

export type WorldMovementMachineFrame = WorldMovementMachine & {
  launchJump: boolean;
  crouching: boolean;
};

export const WORLD_JUMP_BUFFER_SECONDS = 0.12;
export const WORLD_COYOTE_SECONDS = 0.1;
export const WORLD_JUMP_PREPARATION_SECONDS = 0.08;
export const WORLD_LANDING_SECONDS = 0.12;
export const WORLD_SLIDE_SECONDS = 0.6;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function createWorldMovementMachine(): WorldMovementMachine {
  return {
    state: "YERDE_DURUYOR",
    jumpBufferSeconds: 0,
    coyoteSeconds: WORLD_COYOTE_SECONDS,
    jumpPreparationSeconds: 0,
    landingSeconds: 0,
    slideSeconds: 0,
    crouchHeld: false,
  };
}

export function advanceWorldMovementMachine(
  previous: WorldMovementMachine,
  actions: WorldActionState,
  context: {
    grounded: boolean;
    verticalVelocity: number;
    speed: number;
    deltaSeconds: number;
  },
): WorldMovementMachineFrame {
  const dt = clamp(Number.isFinite(context.deltaSeconds) ? context.deltaSeconds : 0, 0, 0.05);
  let jumpBufferSeconds = actions.jumpPressed
    ? WORLD_JUMP_BUFFER_SECONDS
    : Math.max(0, previous.jumpBufferSeconds - dt);
  let coyoteSeconds = context.grounded
    ? WORLD_COYOTE_SECONDS
    : Math.max(0, previous.coyoteSeconds - dt);
  let jumpPreparationSeconds = Math.max(0, previous.jumpPreparationSeconds - dt);
  let landingSeconds = Math.max(0, previous.landingSeconds - dt);
  let slideSeconds = Math.max(0, previous.slideSeconds - dt);
  let launchJump = previous.jumpPreparationSeconds > 0 && jumpPreparationSeconds <= 0;

  if (context.grounded && previous.state === "İNİŞ" && landingSeconds <= 0) {
    coyoteSeconds = WORLD_COYOTE_SECONDS;
  }
  if (actions.crouch && !previous.crouchHeld && context.speed >= 3.4 + (6.8 - 3.4) * 0.48) {
    slideSeconds = WORLD_SLIDE_SECONDS;
  }

  if (
    context.grounded
    && !actions.crouch
    && jumpBufferSeconds > 0
    && coyoteSeconds > 0
    && previous.jumpPreparationSeconds <= 0
  ) {
    jumpPreparationSeconds = WORLD_JUMP_PREPARATION_SECONDS;
    jumpBufferSeconds = 0;
    launchJump = false;
  }

  const crouching = actions.crouch || slideSeconds > 0;
  let state: WorldMovementState;
  if (jumpPreparationSeconds > 0) {
    state = "ZIPLAMA_HAZIRLIK";
  } else if (launchJump || !context.grounded) {
    state = context.verticalVelocity >= 0 ? "HAVADA_YUKARI" : "HAVADA_AŞAĞI";
    if (launchJump) coyoteSeconds = 0;
  } else if (landingSeconds > 0) {
    state = "İNİŞ";
  } else if (slideSeconds > 0) {
    state = "KAYIYOR";
  } else if (crouching) {
    state = "EĞİLİYOR";
  } else if (context.speed > 0.12) {
    state = actions.sprint ? "SPRINT" : "KOŞUYOR";
  } else {
    state = "YERDE_DURUYOR";
  }

  return {
    state,
    jumpBufferSeconds,
    coyoteSeconds,
    jumpPreparationSeconds,
    landingSeconds,
    slideSeconds,
    crouchHeld: actions.crouch,
    launchJump,
    crouching,
  };
}

export function markWorldMovementLanded(
  machine: WorldMovementMachineFrame,
): WorldMovementMachineFrame {
  return {
    ...machine,
    state: "İNİŞ",
    coyoteSeconds: WORLD_COYOTE_SECONDS,
    landingSeconds: WORLD_LANDING_SECONDS,
    jumpPreparationSeconds: 0,
    launchJump: false,
  };
}
