import type { EquipmentVisual } from "../game/store-types";
import type { WorldBotProfile } from "./world-bot-profiles";

export type ModelMaterialNameAliases = {
  cape: readonly string[];
  accent: readonly string[];
  armor: readonly string[];
  armorLight: readonly string[];
  armorDark: readonly string[];
};

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
  weapon: NonNullable<EquipmentVisual["weaponStyle"]>;
  appearance: EquipmentVisual;
  materialNameAliases: ModelMaterialNameAliases;
  animationClips: Partial<Record<OpponentModelAnimationState, readonly string[]>>;
};

const BASE_OPPONENT_MODEL_CONFIGS = {
  "Gölge Şövalyesi": {
    modelPath: "/models/gece-nobetcisi.glb",
    // Native bounds are Y=0..1.8, feet at ground, and forward is +Z.
    scale: 1,
    modelFacing: 0,
    rootBoneName: "Rig_Hips",
    weapon: "daggers",
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
      armor: ["leather"],
      armorLight: ["steel_light"],
      armorDark: ["steel_dark", "leather_dark"],
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

const NIGHT_WATCHER_MODEL: OpponentModelConfig = {
  ...BASE_OPPONENT_MODEL_CONFIGS["Gölge Şövalyesi"],
  weapon: "sword",
  appearance: {
    ...BASE_OPPONENT_MODEL_CONFIGS["Gölge Şövalyesi"].appearance,
    weaponStyle: "sword",
  },
};

export const OPPONENT_MODEL_CONFIGS = {
  ...BASE_OPPONENT_MODEL_CONFIGS,
  "Gece Nöbetçisi": NIGHT_WATCHER_MODEL,
} satisfies Record<string, OpponentModelConfig>;

export function getOpponentModelConfig(name: string | undefined) {
  return name ? OPPONENT_MODEL_CONFIGS[name as keyof typeof OPPONENT_MODEL_CONFIGS] : undefined;
}

export function getAnimatedRivalModelConfig(
  name: string | undefined,
  profile?: Pick<WorldBotProfile, "appearance" | "weapon">,
) {
  const namedConfig = name
    ? OPPONENT_MODEL_CONFIGS[name as keyof typeof OPPONENT_MODEL_CONFIGS]
    : undefined;
  if (!namedConfig && !profile) return undefined;

  const baseConfig = namedConfig ?? BASE_OPPONENT_MODEL_CONFIGS["Gölge Şövalyesi"];
  const weapon = profile?.weapon ?? baseConfig.weapon;
  return {
    ...baseConfig,
    weapon,
    appearance: {
      ...baseConfig.appearance,
      ...profile?.appearance,
      weaponStyle: weapon,
    },
  };
}
