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
  targetHeight?: number;
  modelRotation?: readonly [number, number, number];
  tintColor?: string;
  tintStrength?: number;
  isBoss?: boolean;
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
  profile?: Pick<WorldBotProfile, "appearance" | "weapon" | "archetype">,
) {
  const namedConfig = name
    ? OPPONENT_MODEL_CONFIGS[name as keyof typeof OPPONENT_MODEL_CONFIGS]
    : undefined;
  if (!namedConfig && !profile) return undefined;

  const baseConfig = namedConfig ?? BASE_OPPONENT_MODEL_CONFIGS["Gölge Şövalyesi"];
  const weapon = profile?.weapon ?? baseConfig.weapon;
  const archetype = profile?.archetype;
  const isBoss = archetype === "chapter-boss" || name === "Demir Taç";
  const useHumanModel = new Set(["gate-warden", "iron-oath", "ash-archer", "storm-lancer"])
    .has(archetype ?? "");
  const modelPath = isBoss
    ? "/models/fantasy_knight.glb"
    : useHumanModel
      ? "/models/human.glb"
      : "/models/base-character.glb";
  const tintByArchetype: Record<string, string> = {
    "gate-warden": "#533a2d",
    "iron-oath": "#46372f",
    "ash-archer": "#783a31",
    "shadow-knight": "#354339",
    "storm-lancer": "#4e382d",
    "rift-berserker": "#7a382d",
    "ember-alchemist": "#683b30",
    "venom-assassin": "#2d4738",
    "frost-hunter": "#3d4938",
    "chapter-boss": "#252a30",
  };
  return {
    ...baseConfig,
    modelPath,
    scale: 1,
    modelFacing: 0,
    rootBoneName: isBoss ? "world" : useHumanModel ? "Hips" : "root",
    targetHeight: isBoss ? 2.6 : 1.8,
    modelRotation: isBoss ? [-Math.PI / 2, 0, 0] as const : undefined,
    isBoss,
    tintColor: tintByArchetype[archetype ?? ""] ?? (isBoss ? "#252a30" : "#523c31"),
    tintStrength: isBoss ? 0.92 : 0.68,
    animationClips: isBoss
      ? {}
      : useHumanModel
        ? {
          idle: ["Human Armature|Idle"],
          walk: ["Human Armature|Walk"],
          run: ["Human Armature|Run"],
          attack: ["Human Armature|Punch"],
          block: ["Human Armature|Punch"],
          dodge: ["Human Armature|Jump"],
          hit: ["Human Armature|ArmatureAction.002"],
          castFire: ["Human Armature|Punch"],
          castLightning: ["Human Armature|Jump"],
          death: ["Human Armature|Death"],
          victory: ["Human Armature|Working"],
        }
        : {
          idle: ["Rig|Idle_Loop"],
          walk: ["Rig|Walk_Loop"],
          run: ["Rig|Sprint_Loop"],
          attack: ["Rig|Sword_Attack", "Rig|Sword_Attack_RM"],
          block: ["Rig|Sword_Idle"],
          dodge: ["Rig|Roll", "Rig|Roll_RM"],
          hit: ["Rig|Hit_Chest", "Rig|Hit_Head"],
          castFire: ["Rig|Spell_Simple_Shoot"],
          castLightning: ["Rig|Spell_Simple_Shoot"],
          death: ["Rig|Death01"],
          victory: ["Rig|Dance_Loop"],
        },
    weapon,
    appearance: {
      ...baseConfig.appearance,
      ...profile?.appearance,
      weaponStyle: weapon,
    },
  };
}
