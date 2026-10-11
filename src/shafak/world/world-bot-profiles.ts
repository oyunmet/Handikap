import type { EquipmentVisual } from "../game/store-types";

export type WorldBotArchetype = "gate-warden" | "iron-oath" | "ash-archer" | "shadow-knight";
export type WorldBotWeapon = "sword" | "axe" | "spear" | "mace" | "bow" | "greatsword";

export type WorldBotProfile = {
  name: string;
  archetype: WorldBotArchetype;
  weapon: WorldBotWeapon;
  difficulty: "easy" | "medium" | "hard";
  armorTint: string;
  size: number;
  appearance: EquipmentVisual;
  taunt: string;
};

export const WORLD_BOT_PROFILES: readonly WorldBotProfile[] = [
  {
    name: "Kapı Muhafızı",
    archetype: "gate-warden",
    weapon: "greatsword",
    difficulty: "easy",
    armorTint: "#9b763d",
    size: 1.1,
    appearance: {
      armor: "#59483d",
      armorLight: "#a77b42",
      armorDark: "#332b2b",
      trim: "#e7bd73",
      cape: "#6e302d",
      armorStyle: "royal",
      weaponStyle: "greatsword",
      weaponColor: "#eacb89",
      auraColor: "#f2a05b",
    },
    taunt: "Bu kapının ardında yalnızca cesurlar yürür.",
  },
  {
    name: "Demir Yemin",
    archetype: "iron-oath",
    weapon: "mace",
    difficulty: "medium",
    armorTint: "#4e6f85",
    size: 1.04,
    appearance: {
      armor: "#344957",
      armorLight: "#6b8990",
      armorDark: "#1e2a34",
      trim: "#c3a568",
      cape: "#354552",
      armorStyle: "watch",
      weaponStyle: "mace",
      weaponColor: "#adc4cb",
      auraColor: "#92bfce",
    },
    taunt: "Yeminim demiri bile senden önce eğdirir.",
  },
  {
    name: "Kül Okçusu",
    archetype: "ash-archer",
    weapon: "bow",
    difficulty: "medium",
    armorTint: "#a44e47",
    size: 0.96,
    appearance: {
      armor: "#55353b",
      armorLight: "#a95849",
      armorDark: "#30252e",
      trim: "#d59b66",
      cape: "#813c35",
      armorStyle: "ash",
      weaponStyle: "bow",
      weaponColor: "#e0a35f",
      auraColor: "#df7954",
    },
    taunt: "Rüzgâr adını fısıldadı; oku çoktan yola çıktı.",
  },
  {
    name: "Gölge Şövalyesi",
    archetype: "shadow-knight",
    weapon: "spear",
    difficulty: "hard",
    armorTint: "#71619a",
    size: 1.01,
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
    taunt: "Gölgem seni buldu; şafak seni kurtaramaz.",
  },
];

export function getWorldBotProfile(index: number) {
  return WORLD_BOT_PROFILES[((Math.floor(index) % WORLD_BOT_PROFILES.length) + WORLD_BOT_PROFILES.length) % WORLD_BOT_PROFILES.length];
}

export function getWorldBotProfileByName(name: string) {
  return WORLD_BOT_PROFILES.find((profile) => profile.name === name);
}
