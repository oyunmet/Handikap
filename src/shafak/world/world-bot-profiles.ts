import type { EquipmentVisual } from "../game/store-types";

export type WorldBotArchetype = "gate-warden" | "iron-oath" | "ash-archer" | "shadow-knight";
export type WorldBotWeapon = "sword" | "axe" | "spear" | "mace" | "bow" | "greatsword";

export type WorldBotProfile = {
  name: string;
  title: string;
  archetype: WorldBotArchetype;
  weapon: WorldBotWeapon;
  difficulty: "easy" | "medium" | "hard";
  armorTint: string;
  size: number;
  appearance: EquipmentVisual;
  taunt: string;
};

const WORLD_RIVAL_NAMES = [
  "Kapı Muhafızı", "Demir Yemin", "Kül Okçusu", "Gölge Şövalyesi",
  "Kızıl Hisar", "Bozkır Yeminlisi", "Kül İzci", "Sessiz Gölge",
  "Taş Nöbetçi", "Kara Kılıç", "Duman Avcısı", "Gece Nöbetçisi",
  "Kalkanlı Aras", "Çelik Ant", "Yitik İzci", "Karanlık Miğfer",
  "Kızıl Pelerin", "Taş Mühür", "Kül Gezgini", "Mor Hançer",
  "Kuzey Kapısı", "Demir Pençe", "Uzak Atıcı", "Gece Kargası",
  "Geçit Bekçisi", "Bakır Yemin", "Kırık Yay", "Sessiz Cellat",
  "Karanlık Sancak", "Yitik Şövalye", "Kor İzci", "Ayaz Gölgesi",
  "Son Kale Bekçisi", "Ateş Yemini", "Sis Avcısı", "Ay Işığı Kılıcı",
  "Gümüş Kapı", "Kara Kalkan", "Kül Muhafızı", "Dilsiz Nöbetçi",
  "Uçurum Bekçisi", "Yitik Ant", "Sessiz Okçu", "Gece Savaşçısı",
  "Kızıl Mızrak", "Donmuş Yemin", "Kül Pençesi", "Solgun Kılıç",
] as const;

const RIVAL_TITLES = ["NÖBETÇİ", "YEMİNLİ SAVAŞÇI", "KÜL GEZGİNİ", "GÖLGE SAVAŞÇISI"] as const;

const WORLD_ARCHETYPE_PROFILES: readonly Omit<WorldBotProfile, "title">[] = [
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

export const WORLD_BOT_PROFILES: readonly WorldBotProfile[] = WORLD_ARCHETYPE_PROFILES.map((profile, index) => ({
  ...profile,
  title: RIVAL_TITLES[index],
}));

export function getWorldBotProfile(index: number) {
  return WORLD_BOT_PROFILES[((Math.floor(index) % WORLD_BOT_PROFILES.length) + WORLD_BOT_PROFILES.length) % WORLD_BOT_PROFILES.length];
}

export function getWorldRivalProfile(chapterId: number, rivalIndex: number) {
  const archetypeIndex = ((Math.floor(rivalIndex) % WORLD_ARCHETYPE_PROFILES.length) + WORLD_ARCHETYPE_PROFILES.length)
    % WORLD_ARCHETYPE_PROFILES.length;
  const nameIndex = ((Math.floor(chapterId) * WORLD_ARCHETYPE_PROFILES.length + archetypeIndex) % WORLD_RIVAL_NAMES.length
    + WORLD_RIVAL_NAMES.length) % WORLD_RIVAL_NAMES.length;
  return {
    ...WORLD_ARCHETYPE_PROFILES[archetypeIndex],
    name: WORLD_RIVAL_NAMES[nameIndex],
    title: RIVAL_TITLES[archetypeIndex],
  };
}

export function getWorldBotProfileByName(name: string) {
  const nameIndex = WORLD_RIVAL_NAMES.indexOf(name as (typeof WORLD_RIVAL_NAMES)[number]);
  if (nameIndex < 0) return undefined;
  const archetypeIndex = nameIndex % WORLD_ARCHETYPE_PROFILES.length;
  return {
    ...WORLD_ARCHETYPE_PROFILES[archetypeIndex],
    name: WORLD_RIVAL_NAMES[nameIndex],
    title: RIVAL_TITLES[archetypeIndex],
  };
}
