export type WarRoomViewModelState = {
  time: number;
  movement: number;
  aiming: boolean;
  recoil: number;
  reloadProgress: number;
  chargeProgress: number;
  meleeProgress: number | null;
  meleeStyle: "slash" | "thrust";
  comboIndex: number;
  motionReduced: boolean;
};

export type WarRoomViewModelPose = {
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export type WarRoomViewModelConfig = {
  scale: number;
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
};

export function getWarRoomViewModelHorizontalFactor(aspect: number) {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1.75;
  return Math.max(0.2, Math.min(1, safeAspect / 1.75));
}

export function getWarRoomViewModelScaleFactor(aspect: number) {
  return 0.84 + getWarRoomViewModelHorizontalFactor(aspect) * 0.16;
}

const RIFLE_VIEW_MODEL: WarRoomViewModelConfig = {
  scale: 0.56, position: [0, 0, 0], rotation: [0, 0, 0],
};

export const WAR_ROOM_VIEW_MODEL_CONFIG: Readonly<Record<string, WarRoomViewModelConfig>> = {
  powder_rifle: RIFLE_VIEW_MODEL,
  sidearm: { scale: 0.72, position: [0.035, 0.015, 0.025], rotation: [0.02, 0, -0.015] },
  scattergun: { scale: 0.52, position: [-0.025, -0.02, -0.015], rotation: [0.025, 0, 0.01] },
  crossbow: { scale: 0.46, position: [-0.015, -0.015, -0.02], rotation: [0, 0, 0.025] },
  longbow: { scale: 0.56, position: [0.02, 0.015, 0], rotation: [0.015, 0, -0.04] },
  melee_knife: { scale: 0.7, position: [0.015, -0.015, 0], rotation: [0, 0, -0.08] },
  melee_axe: { scale: 0.7, position: [-0.025, -0.015, -0.03], rotation: [0, 0, -0.04] },
  melee_cudgel: { scale: 0.7, position: [0, -0.025, -0.02], rotation: [0, 0, -0.03] },
  melee_spear: { scale: 0.62, position: [0, -0.025, -0.05], rotation: [-0.12, 0, 0] },
  melee_shovel: { scale: 0.62, position: [-0.02, -0.025, -0.025], rotation: [0, 0, -0.035] },
  melee_staff: { scale: 0.64, position: [0.015, -0.025, -0.02], rotation: [0, 0, -0.025] },
  melee_war_spear: { scale: 0.6, position: [0, -0.025, -0.05], rotation: [-0.12, 0, 0] },
  melee_pickaxe: { scale: 0.62, position: [-0.02, -0.02, -0.02], rotation: [0, 0, -0.06] },
};

export function getWarRoomViewModelConfig(weaponId: string, melee: boolean): WarRoomViewModelConfig {
  return WAR_ROOM_VIEW_MODEL_CONFIG[weaponId] ?? (melee
    ? { scale: 0.68, position: [0, -0.02, -0.02], rotation: [0, 0, -0.04] }
    : RIFLE_VIEW_MODEL);
}

export function getWarRoomViewModelPose(state: WarRoomViewModelState, aspect = 1.75): WarRoomViewModelPose {
  const horizontalFactor = getWarRoomViewModelHorizontalFactor(aspect);
  const movement = clamp01(state.movement);
  const aim = state.aiming ? 1 : 0;
  const recoil = clamp01(state.recoil) * (state.motionReduced ? 0 : 1);
  const reload = Math.sin(Math.PI * clamp01(state.reloadProgress));
  const charge = clamp01(state.chargeProgress);
  const motion = state.motionReduced ? 0 : 1;
  const idleBreath = Math.sin(state.time * 1.7) * 0.008 * motion;
  const walkBob = Math.sin(state.time * 10.5) * movement * 0.018 * motion;
  const walkRoll = Math.cos(state.time * 5.25) * movement * 0.018 * motion;

  let swingX = 0;
  let swingY = 0;
  let swingZ = 0;
  let swingPitch = 0;
  let swingYaw = 0;
  let swingRoll = 0;
  if (state.meleeProgress !== null) {
    const progress = clamp01(state.meleeProgress);
    const prepare = Math.max(0, Math.min(1, progress / 0.3));
    const strikeProgress = Math.max(0, Math.min(1, (progress - 0.3) / 0.48));
    const strike = Math.sin(Math.PI * strikeProgress);
    const direction = state.comboIndex % 2 === 0 ? 1 : -1;
    if (state.meleeStyle === "thrust") {
      swingZ = -prepare * 0.08 - strike * 0.28;
      swingPitch = -prepare * 0.12 + strike * 0.38;
      swingYaw = direction * strike * 0.04;
    } else {
      swingX = direction * (prepare * 0.11 - strike * 0.25);
      swingY = prepare * 0.1;
      swingZ = -strike * 0.08;
      swingPitch = -prepare * 0.34 + strike * 0.34;
      swingYaw = direction * strike * 0.36;
      swingRoll = -direction * (prepare * 0.18 + strike * 0.82);
    }
  }

  return {
    position: [
      (0.42 + (0.06 - 0.42) * aim + swingX + recoil * 0.025) * horizontalFactor,
      -0.31 + (0.06 + 0.31) * aim - walkBob + idleBreath + swingY - reload * 0.11 - charge * 0.025,
      -0.58 - aim * 0.12 + swingZ + recoil * 0.12 + reload * 0.04 - charge * 0.08,
    ],
    rotation: [
      0.04 + recoil * 0.12 + reload * 0.22 - charge * 0.12 + swingPitch,
      -0.06 + swingYaw,
      -0.045 + walkRoll + idleBreath * 0.7 + swingRoll,
    ],
  };
}
