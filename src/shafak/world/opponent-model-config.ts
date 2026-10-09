import type { EquipmentVisual } from "../game/store-types";

export type OpponentModelAnimationState =
  | "idle"
  | "run"
  | "attack"
  | "block"
  | "dodge"
  | "hit"
  | "death"
  | "victory";

export type OpponentModelConfig = {
  modelPath: string;
  scale: number;
  modelFacing: number;
  appearance: EquipmentVisual;
  materialNameAliases: {
    cape: readonly string[];
    accent: readonly string[];
  };
  animationClips: Partial<Record<OpponentModelAnimationState, readonly string[]>>;
};

export const OPPONENT_MODEL_CONFIGS = {
  "Gece Nöbetçisi": {
    modelPath: "/models/gece-nobetcisi.glb",
    scale: 1,
    modelFacing: 0,
    appearance: {
      armor: "#253946",
      armorLight: "#547987",
      armorDark: "#14252f",
      trim: "#86cfd4",
      cape: "#273b52",
      armorStyle: "watch",
      weaponStyle: "sword",
      weaponColor: "#a9dce0",
      auraColor: "#62c4c8",
    },
    materialNameAliases: {
      cape: ["cape", "cloak", "mantle", "pelerin"],
      accent: ["trim", "accent", "rune", "highlight", "vurgu"],
    },
    animationClips: {
      idle: ["Idle", "idle", "Breathing Idle", "Mixamo.com"],
      run: ["Run", "Running", "run", "Jog", "Jogging", "Walk", "Walking"],
      attack: ["Attack", "Attack1", "Attack2", "Attack3", "HeavyAttack"],
      block: ["Block", "Blocking", "block"],
      dodge: ["Dodge", "Roll", "dodge"],
      hit: ["HitReaction", "Hit Reaction", "Hit", "React"],
      death: ["Death", "Die", "death"],
      victory: ["Victory", "Win", "Victory Idle", "victory"],
    },
  },
} satisfies Record<string, OpponentModelConfig>;

export function getOpponentModelConfig(name: string | undefined) {
  return name ? OPPONENT_MODEL_CONFIGS[name as keyof typeof OPPONENT_MODEL_CONFIGS] : undefined;
}
