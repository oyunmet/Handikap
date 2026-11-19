export const KNIGHT_CONFIG = {
  modelPath: "/models/kuzgun-soldier.glb",
  rootBoneName: "Hips",
  modelScale: 1,
  modelFacing: Math.PI,
  animationClips: {
    idle: ["idle"],
    walk: ["walk"],
    run: ["run"],
  },
  colors: {
    armor: "#3a4540",
    armorLight: "#667269",
    armorDark: "#202927",
    gold: "#c99c52",
    goldLight: "#d7c18e",
    cape: "#252c2b",
    capeShadow: "#171d1c",
    leather: "#322f28",
    steel: "#818b86",
    visor: "#292f32",
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
  animation: {
    walkStrideMeters: 1.38,
    walkLegSwing: 0.46,
    runLegSwing: 0.74,
    walkKneeBend: 0.52,
    runKneeBend: 0.94,
    capeSpring: 24,
    capeDamping: 7.2,
  },
} as const;

export function getKnightActorRootYaw(facingAngle: number) {
  return facingAngle - KNIGHT_CONFIG.modelFacing;
}

export type KnightConfig = typeof KNIGHT_CONFIG;
