/**
 * Shared tuning values for War Room simulation, controls, and rendering.
 * Keep behavior-preserving defaults here; user-adjustable settings remain in
 * their dedicated persistence modules.
 */
export const WAR_ROOM_CONFIG = {
  player: {
    collisionRadius: 0.3,
    collisionStepDistance: 0.12,
  },
  camera: {
    fixedPitch: -0.12,
    pitchLimitDegrees: 85,
    firstPerson: { fov: 75, near: 0.05, far: 100 },
    viewModel: { fov: 63, near: 0.012, far: 18 },
  },
  input: {
    pointerJoystickDeadZone: 0.15,
    pointerLookMaxDeltaPixels: 80,
    touchJoystickRadius: 60,
    touchJoystickDeadZone: 0.12,
    touchLookMaxDeltaPixels: 120,
  },
  sensitivity: {
    horizontal: 0.007,
    vertical: 0.0045,
    referenceWidth: 720,
    referenceHeight: 420,
  },
  doors: {
    animationSeconds: 0.28,
    interactionDistance: 3.5,
    autoOpenDistance: 2.8,
    clearProgress: 0.65,
    occupancyBuffer: 0.5,
    playerRadius: 0.3,
    thickness: 0.18,
    minimumClearWidth: 1.3,
    height: 2.4,
  },
  performance: {
    drawCallBudget: 150,
    sampleIntervalMs: 60_000,
    maximumContinuousAttackGapMs: 1_500,
  },
} as const;
