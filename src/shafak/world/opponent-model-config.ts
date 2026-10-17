import type { EquipmentVisual } from "../game/store-types";
import type { WorldBotArchetype, WorldBotProfile } from "./world-bot-profiles";

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
  shoulders: "leather" | "metal" | "fur";
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
  materialPalette: OpponentMaterialPalette;
  costume: OpponentCostumeStyle;
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
      skin: ["skin", "body", "face"],
      hair: ["hair"],
      clothing: ["shirt", "cloth"],
      pants: ["pants"],
      boots: ["boot", "shoe"],
    },
    materialPalette: {
      skin: "#a9856c",
      hair: "#30252a",
      clothing: "#302d3e",
      pants: "#191925",
      boots: "#191925",
      default: "#302d3e",
    },
    costume: { cape: true, hood: true, mask: true, helmet: false, horns: false, shoulders: "metal" },
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
  profile?: Pick<WorldBotProfile, "appearance" | "weapon" | "archetype" | "size">,
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
  const modelByArchetype: Record<WorldBotArchetype, string> = {
    "gate-warden": "/models/player-hero.glb",
    "iron-oath": "/models/human.glb",
    "ash-archer": "/models/base-character.glb",
    "shadow-knight": "/models/base-character.glb",
    "storm-lancer": "/models/human.glb",
    "rift-berserker": "/models/player-hero.glb",
    "ember-alchemist": "/models/base-character.glb",
    "venom-assassin": "/models/player-hero.glb",
    "frost-hunter": "/models/base-character.glb",
    "chapter-boss": "/models/fantasy_knight.glb",
  };
  const modelPath = isBoss ? modelByArchetype["chapter-boss"] : modelByArchetype[selectedArchetype];
  const heroAnimations = {
    idle: ["CharacterArmature|Idle", "Idle"],
    walk: ["CharacterArmature|Walk", "Walk"],
    run: ["CharacterArmature|Run", "Run"],
    attack: ["CharacterArmature|Dagger_Attack", "Dagger_Attack", "Punch"],
    block: ["CharacterArmature|Attacking_Idle", "Attacking_Idle"],
    dodge: ["CharacterArmature|Roll", "Roll"],
    hit: ["CharacterArmature|RecieveHit", "RecieveHit", "RecieveHit_Attacking"],
    castFire: ["CharacterArmature|Punch", "Punch"],
    castLightning: ["CharacterArmature|Roll", "Roll"],
    death: ["CharacterArmature|Death", "Death"],
    victory: ["CharacterArmature|Idle", "Idle"],
  } satisfies Partial<Record<OpponentModelAnimationState, readonly string[]>>;
  const humanAnimations = {
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
  } satisfies Partial<Record<OpponentModelAnimationState, readonly string[]>>;
  const baseAnimations = {
    idle: ["Rig|Idle_Loop"],
    walk: ["Rig|Walk_Loop", "Rig|Jog_Fwd_Loop"],
    run: ["Rig|Sprint_Loop", "Rig|Jog_Fwd_Loop"],
    attack: ["Rig|Sword_Attack", "Rig|Sword_Attack_RM", "Rig|Punch_Cross", "Rig|Punch_Jab"],
    block: ["Rig|Sword_Idle"],
    dodge: ["Rig|Roll", "Rig|Roll_RM"],
    hit: ["Rig|Hit_Chest", "Rig|Hit_Head"],
    castFire: ["Rig|Spell_Simple_Shoot"],
    castLightning: ["Rig|Spell_Simple_Shoot"],
    death: ["Rig|Death01"],
    victory: ["Rig|Dance_Loop"],
  } satisfies Partial<Record<OpponentModelAnimationState, readonly string[]>>;
  const materialNameAliases: ModelMaterialNameAliases = {
    cape: ["cape", "cloak", "mantle", "pelerin"],
    accent: ["trim", "accent", "rune", "highlight", "detail", "gold", "metal"],
    armor: ["armor", "leather", "m_main"],
    armorLight: ["steel_light", "armor_light", "fur"],
    armorDark: ["steel_dark", "leather_dark", "m_joints"],
    skin: ["skin", "body", "face", "m_joints"],
    hair: ["hair"],
    clothing: ["shirt", "undershirt", "cloth", "texture", "m_main"],
    pants: ["pants"],
    boots: ["boot", "shoe", "footwear"],
  };
  const appearance = {
    ...baseConfig.appearance,
    ...profile?.appearance,
    weaponStyle: weapon,
  };
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
    "chapter-boss": { cape: false, hood: false, mask: false, helmet: true, horns: true, shoulders: "metal" },
  };
  const colors = paletteByArchetype[selectedArchetype];
  const usePlayerHero = modelPath === "/models/player-hero.glb";
  const useHuman = modelPath === "/models/human.glb";
  return {
    ...baseConfig,
    modelPath,
    scale: isBoss ? 1 : Math.min(1.1, Math.max(0.95, profile?.size ?? 1)),
    modelFacing: usePlayerHero ? Math.PI : 0,
    rootBoneName: isBoss ? "world" : useHuman ? "Hips" : usePlayerHero ? "Root" : "root",
    targetHeight: isBoss ? 2.6 : 1.8,
    modelRotation: isBoss ? [-Math.PI / 2, 0, 0] as const : undefined,
    isBoss,
    tintColor: appearance.armorDark ?? (isBoss ? "#252a30" : "#523c31"),
    tintStrength: isBoss ? 0.92 : 0.68,
    animationClips: isBoss ? {} : usePlayerHero ? heroAnimations : useHuman ? humanAnimations : baseAnimations,
    weapon,
    appearance,
    materialNameAliases,
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
