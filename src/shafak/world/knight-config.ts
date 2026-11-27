import { PLAYER_CHARACTER_ANIMATION_CLIPS, PLAYER_CHARACTER_MODEL_PATH } from "./player-model";

export const KNIGHT_CONFIG = {
  modelPath: PLAYER_CHARACTER_MODEL_PATH,
  modelScale: 1,
  modelFacing: Math.PI,
  rootBoneName: "Hips",
  animationClips: PLAYER_CHARACTER_ANIMATION_CLIPS,
  colors: {
    armor: "#252832",
    armorLight: "#41444c",
    armorDark: "#15171d",
    gold: "#c99c52",
    goldLight: "#f0cc7d",
    cape: "#872e36",
    capeShadow: "#521d28",
    leather: "#342a29",
    steel: "#a9b0b8",
    visor: "#f2c876",
  },
  proportions: {
    height: 2.14,
    shoulderWidth: 0.92,
    torsoWidth: 0.59,
    torsoHeight: 0.68,
    headScale: 0.36,
    upperArm: 0.43,
    forearm: 0.39,
    thigh: 0.63,
    shin: 0.59,
    foot: 0.3,
    capeWidth: 0.76,
    capeLength: 1.02,
    swordLength: 0.94,
  },
} as const;

export function getKnightActorRootYaw(facingAngle: number) {
  return facingAngle - KNIGHT_CONFIG.modelFacing;
}

export type KnightConfig = typeof KNIGHT_CONFIG;
