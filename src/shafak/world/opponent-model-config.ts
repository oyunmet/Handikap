import type { EquipmentVisual } from "../game/store-types";
import type { WorldBotArchetype, WorldBotProfile } from "./world-bot-profiles";
import {
  getWorldCharacterSizeTarget,
  type WorldCharacterSizeContext,
} from "./world-model-sizing.ts";
import {
  PLAYER_CHARACTER_MODEL_FACING,
  PLAYER_CHARACTER_MODEL_PATH,
} from "./player-model";

export type ModelMaterialNameAliases = {
  cape: readonly string[];
  accent: readonly string[];
  armor: readonly string[];
  armorLight: readonly string[];
  armorDark: readonly string[];
  skin: readonly string[];
  hair: readonly string[];
  clothing: readonly string[];
  pants: readonly string[];
  boots: readonly string[];
};

export type OpponentMaterialPalette = {
  skin: string;
  hair: string;
  clothing: string;
  pants: string;
  boots: string;
  default: string;
};

export type OpponentCostumeStyle = {
  cape: boolean;
  hood: boolean;
  mask: boolean;
  helmet: boolean;
  horns: boolean;
  shoulders: "leather" | "metal" | "fur" | "none";
};

export type OpponentModelConfig = {
  modelPath: string;
  scale: number;
  modelFacing: number;
  preserveOriginalMaterialAliases?: readonly string[];
  targetHeight?: number;
  maxDimension?: number;
  modelRotation?: readonly [number, number, number];
  tintColor?: string;
  tintStrength?: number;
  isBoss?: boolean;
  isDemirTac?: boolean;
  weapon: NonNullable<EquipmentVisual["weaponStyle"]>;
  appearance: EquipmentVisual;
  materialNameAliases: ModelMaterialNameAliases;
  materialPalette: OpponentMaterialPalette;
  costume: OpponentCostumeStyle;
};

const PLAYER_HERO_MATERIAL_ALIASES: ModelMaterialNameAliases = {
  cape: ["cape", "cloak", "mantle", "pelerin"],
  accent: ["trim", "accent", "rune", "highlight", "detail", "gold", "metal", "material.006"],
  armor: ["armor", "leather", "m_main"],
  armorLight: ["steel_light", "armor_light", "fur"],
  armorDark: ["steel_dark", "leather_dark", "m_joints"],
  skin: ["skin", "body", "face"],
  hair: ["hair"],
  clothing: ["shirt", "undershirt", "cloth", "texture", "m_main"],
  pants: ["pants"],
  boots: ["boot", "shoe", "footwear"],
};

const BASE_OPPONENT_MODEL_CONFIGS = {
  "Gölge Şövalyesi": {
    modelPath: PLAYER_CHARACTER_MODEL_PATH,
    scale: 1,
    modelFacing: PLAYER_CHARACTER_MODEL_FACING,
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
    materialNameAliases: PLAYER_HERO_MATERIAL_ALIASES,
    materialPalette: {
      skin: "#a9856c",
      hair: "#30252a",
      clothing: "#302d3e",
      pants: "#191925",
      boots: "#191925",
      default: "#302d3e",
    },
    costume: { cape: true, hood: true, mask: true, helmet: false, horns: false, shoulders: "metal" },
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

export function getRivalModelConfig(
  name: string | undefined,
  profile?: Pick<WorldBotProfile, "appearance" | "weapon" | "archetype" | "size">,
  sizeContext: WorldCharacterSizeContext = "duel",
) {
  const namedConfig = name
    ? OPPONENT_MODEL_CONFIGS[name as keyof typeof OPPONENT_MODEL_CONFIGS]
    : undefined;
  if (!namedConfig && !profile) return undefined;

  const baseConfig = namedConfig ?? BASE_OPPONENT_MODEL_CONFIGS["Gölge Şövalyesi"];
  const archetype = profile?.archetype;
  const isBoss = archetype === "chapter-boss" || name === "Demir Taç";
  const selectedArchetype = archetype ?? (isBoss ? "chapter-boss" : "gate-warden");
  const visualWeaponByArchetype: Record<WorldBotArchetype, NonNullable<EquipmentVisual["weaponStyle"]>> = {
    "gate-warden": "sword",
    "iron-oath": "daggers",
    "ash-archer": "bow",
    "shadow-knight": "daggers",
    "storm-lancer": "spear",
    "rift-berserker": "axe",
    "ember-alchemist": "staff",
    "venom-assassin": "daggers",
    "frost-hunter": "bow",
    "chapter-boss": "greatsword",
  };
  const weapon = archetype ? visualWeaponByArchetype[archetype] : baseConfig.weapon;
  const useDemirTac = name === "Demir Taç";
  const modelPath = PLAYER_CHARACTER_MODEL_PATH;
  const sizeTarget = getWorldCharacterSizeTarget(isBoss, sizeContext);
  const profileAppearance = {
    ...baseConfig.appearance,
    ...profile?.appearance,
    ...(useDemirTac
      ? {
          armorLight: "#a8b1b8",
          trim: "#d7b16a",
          cape: "#681f2c",
        }
      : {}),
    weaponStyle: weapon,
  };
  const appearance = profileAppearance;
  const paletteByArchetype: Record<WorldBotArchetype, { skin: string; hair: string }> = {
    "gate-warden": { skin: "#ba9675", hair: "#49352e" },
    "iron-oath": { skin: "#a98376", hair: "#302631" },
    "ash-archer": { skin: "#b17d66", hair: "#392629" },
    "shadow-knight": { skin: "#a9907e", hair: "#292638" },
    "storm-lancer": { skin: "#b58d70", hair: "#332a26" },
    "rift-berserker": { skin: "#a77660", hair: "#472b25" },
    "ember-alchemist": { skin: "#c09472", hair: "#49302b" },
    "venom-assassin": { skin: "#a98e76", hair: "#26342a" },
    "frost-hunter": { skin: "#c5b29d", hair: "#d0d5d3" },
    "chapter-boss": { skin: "#77716a", hair: "#25282d" },
  };
  const costumeByArchetype: Record<WorldBotArchetype, OpponentCostumeStyle> = {
    "gate-warden": { cape: true, hood: true, mask: false, helmet: false, horns: false, shoulders: "leather" },
    "iron-oath": { cape: true, hood: true, mask: true, helmet: false, horns: false, shoulders: "metal" },
    "ash-archer": { cape: true, hood: true, mask: false, helmet: false, horns: false, shoulders: "leather" },
    "shadow-knight": { cape: true, hood: true, mask: true, helmet: false, horns: false, shoulders: "metal" },
    "storm-lancer": { cape: false, hood: false, mask: false, helmet: true, horns: false, shoulders: "metal" },
    "rift-berserker": { cape: false, hood: false, mask: false, helmet: true, horns: true, shoulders: "leather" },
    "ember-alchemist": { cape: true, hood: true, mask: false, helmet: false, horns: false, shoulders: "leather" },
    "venom-assassin": { cape: true, hood: true, mask: true, helmet: false, horns: false, shoulders: "leather" },
    "frost-hunter": { cape: true, hood: true, mask: false, helmet: false, horns: false, shoulders: "fur" },
    "chapter-boss": { cape: true, hood: false, mask: true, helmet: true, horns: false, shoulders: "metal" },
  };
  const colors = paletteByArchetype[selectedArchetype];
  return {
    ...baseConfig,
    modelPath,
    scale: isBoss ? 1 : Math.min(1.1, Math.max(0.95, profile?.size ?? 1)),
    modelFacing: PLAYER_CHARACTER_MODEL_FACING,
    modelRotation: undefined,
    preserveOriginalMaterialAliases: undefined,
    targetHeight: sizeTarget.targetHeight,
    maxDimension: sizeTarget.maxDimension,
    isBoss,
    isDemirTac: useDemirTac,
    tintColor: appearance.armorDark ?? (isBoss ? "#252a30" : "#523c31"),
    tintStrength: useDemirTac ? 0 : isBoss ? 0.22 : 0.68,
    weapon,
    appearance,
    materialNameAliases: PLAYER_HERO_MATERIAL_ALIASES,
    materialPalette: {
      skin: colors.skin,
      hair: colors.hair,
      clothing: appearance.armor ?? "#493d35",
      pants: appearance.armorDark ?? "#29282a",
      boots: appearance.armorDark ?? "#29282a",
      default: appearance.armor ?? "#493d35",
    },
    costume: costumeByArchetype[selectedArchetype],
  };
}
