export const KNIGHT_CONFIG = {
  modelPath: "/models/player-hero.glb",
  modelScale: 1,
  modelFacing: Math.PI,
  animationClips: {
    idle: ["Idle", "CharacterArmature|Idle"],
    walk: ["Walk", "CharacterArmature|Walk"],
    run: ["Run", "CharacterArmature|Run"],
    attack: ["Dagger_Attack", "CharacterArmature|Dagger_Attack", "Punch"],
    heavyAttack: ["Dagger_Attack2", "CharacterArmature|Dagger_Attack2"],
    block: ["Attacking_Idle", "CharacterArmature|Attacking_Idle"],
    dodge: ["Roll", "CharacterArmature|Roll"],
    jump: [],
    backflip: ["Roll", "CharacterArmature|Roll"],
    plunge: ["Dagger_Attack2", "CharacterArmature|Dagger_Attack2"],
    hit: ["RecieveHit", "CharacterArmature|RecieveHit", "RecieveHit_Attacking"],
    die: ["Death", "CharacterArmature|Death"],
  },
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
