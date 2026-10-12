import type { EquipmentVisual } from "../game/store-types";

export type OpponentModelAnimationState =
  | "idle"
  | "walk"
  | "run"
  | "attack"
  | "block"
  | "dodge"
  | "hit"
  | "castFire"
  | "castLightning"
  | "death"
  | "victory";

export type OpponentModelConfig = {
  modelPath: string;
  scale: number;
  modelFacing: number;
  rootBoneName: string;
  appearance: EquipmentVisual;
  materialNameAliases: {
    cape: readonly string[];
    accent: readonly string[];
  };
  animationClips: Partial<Record<OpponentModelAnimationState, readonly string[]>>;
};

export const OPPONENT_MODEL_CONFIGS = {
  "Gölge Şövalyesi": {
    modelPath: "/models/gece-nobetcisi.glb",
    // Native bounds are Y=0..1.8, feet at ground, and forward is +Z.
    scale: 1,
    modelFacing: 0,
    rootBoneName: "Rig_Hips",
    appearance: {
      armor: "#302d3e",
      armorLight: "#68617e",
      armorDark: "#191925",
      trim: "#a88ce0",
      cape: "#403253",
      armorStyle: "shadow",
      weaponStyle: "daggers",
      weaponColor: "#bda9ec",
      auraColor: "#9d85e7",
    },
    materialNameAliases: {
      cape: ["cape", "cloak", "mantle", "pelerin"],
      accent: ["trim", "accent", "rune", "highlight", "vurgu", "gold", "metal"],
    },
    animationClips: {
      idle: ["Idle"],
      walk: ["Walk"],
      run: ["Run"],
      attack: ["Attack1"],
      block: ["Block"],
      dodge: ["Dodge"],
      hit: ["HitReaction"],
      castFire: ["Cast_Fire"],
      castLightning: ["Cast_Lightning"],
      death: ["Death"],
      victory: ["Victory"],
    },
  },
} satisfies Record<string, OpponentModelConfig>;

export function getOpponentModelConfig(name: string | undefined) {
  return name ? OPPONENT_MODEL_CONFIGS[name as keyof typeof OPPONENT_MODEL_CONFIGS] : undefined;
}
