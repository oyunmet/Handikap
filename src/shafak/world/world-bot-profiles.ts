import type { EquipmentVisual } from "../game/store-types.ts";
import type { CombatBotArchetype } from "../game/combat-engine.ts";

export type WorldBotArchetype = CombatBotArchetype;
export type WorldBotWeapon = "sword" | "daggers" | "axe" | "spear" | "mace" | "bow" | "greatsword";

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

const RIVAL_TITLES = [
  "NÖBETÇİ",
  "YEMİNLİ SAVAŞÇI",
  "KÜL GEZGİNİ",
  "GÖLGE SAVAŞÇISI",
  "FIRTINA MIZRAKÇISI",
  "YARIK BERSERKERİ",
  "KÜL SİMYACISI",
  "ZEHİR SUİKASTÇİSİ",
  "AYAZ AVCISI",
] as const;

const CHAPTER_BOSS_NAMES = [
  "Kül Tahtı", "Kızıl Hükümdar", "Karanlık Mareşal", "Yarık Efendisi",
  "Demir Taç", "Ateş Muhafızı", "Gece İmparatoru", "Kırık Kral",
  "Ayaz Hanı", "Sis Komutanı", "Son Yemin", "Şafak Celladı",
] as const;

const WORLD_ARCHETYPE_PROFILES: readonly Omit<WorldBotProfile, "title">[] = [
  {
    name: "Kapı Muhafızı",
    archetype: "gate-warden",
    weapon: "greatsword",
    difficulty: "easy",
    armorTint: "#9b763d",
    size: 1.1,
    appearance: {
      armor: "#5a514a",
      armorLight: "#a19a91",
      armorDark: "#332e2b",
      trim: "#d0b894",
      cape: "#aaa398",
      armorStyle: "royal",
      weaponStyle: "greatsword",
      weaponColor: "#bdb5a8",
      auraColor: "#c2a77d",
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
      armor: "#403744",
      armorLight: "#76677f",
      armorDark: "#28242d",
      trim: "#c3a8df",
      cape: "#624574",
      armorStyle: "watch",
      weaponStyle: "mace",
      weaponColor: "#c5a7e6",
      auraColor: "#a77bd4",
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
  {
    name: "Fırtına Mızrakçısı",
    archetype: "storm-lancer",
    weapon: "spear",
    difficulty: "medium",
    armorTint: "#4c8495",
    size: 1.03,
    appearance: {
      armor: "#314d5c",
      armorLight: "#5e9dae",
      armorDark: "#20303c",
      trim: "#b8e4df",
      cape: "#355866",
      armorStyle: "watch",
      weaponStyle: "spear",
      weaponColor: "#9fe3e5",
      auraColor: "#57c6d0",
    },
    taunt: "Mızrağımın menzili, kaçış yolundan uzun.",
  },
  {
    name: "Yarık Berserkeri",
    archetype: "rift-berserker",
    weapon: "axe",
    difficulty: "hard",
    armorTint: "#a64a43",
    size: 1.08,
    appearance: {
      armor: "#573538",
      armorLight: "#a34a3e",
      armorDark: "#30252b",
      trim: "#e0a05a",
      cape: "#6d2c32",
      armorStyle: "ash",
      weaponStyle: "axe",
      weaponColor: "#e87e4e",
      auraColor: "#ec5a3f",
    },
    taunt: "Bir darbe yeter; gerisi taşların işi.",
  },
  {
    name: "Kül Simyacısı",
    archetype: "ember-alchemist",
    weapon: "mace",
    difficulty: "medium",
    armorTint: "#bd7140",
    size: 1,
    appearance: {
      armor: "#554033",
      armorLight: "#bd7445",
      armorDark: "#342b28",
      trim: "#ffd184",
      cape: "#7c3d2d",
      armorStyle: "ash",
      weaponStyle: "mace",
      weaponColor: "#ffb35c",
      auraColor: "#ff793d",
    },
    taunt: "Külün altında hâlâ yanan bir şey var.",
  },
  {
    name: "Zehir Suikastçısı",
    archetype: "venom-assassin",
    weapon: "daggers",
    difficulty: "hard",
    armorTint: "#5e9664",
    size: 0.94,
    appearance: {
      armor: "#2f4539",
      armorLight: "#648c60",
      armorDark: "#202b29",
      trim: "#b4d77b",
      cape: "#8f2f3b",
      armorStyle: "shadow",
      weaponStyle: "daggers",
      weaponColor: "#a7e077",
      auraColor: "#79c66b",
    },
    taunt: "Bir çizik bile seni bu yoldan alıkoyar.",
  },
  {
    name: "Ayaz Avcısı",
    archetype: "frost-hunter",
    weapon: "bow",
    difficulty: "hard",
    armorTint: "#6d9fb3",
    size: 0.98,
    appearance: {
      armor: "#8f999d",
      armorLight: "#c8e1e5",
      armorDark: "#515d64",
      trim: "#96e4ef",
      cape: "#d4d9d8",
      armorStyle: "watch",
      weaponStyle: "bow",
      weaponColor: "#a3efff",
      auraColor: "#53d9f0",
    },
    taunt: "Ayazın sessizliği oku benden önce ulaştırır.",
  },
];

export const WORLD_BOT_PROFILES: readonly WorldBotProfile[] = WORLD_ARCHETYPE_PROFILES.map((profile, index) => ({
  ...profile,
  title: RIVAL_TITLES[index],
}));

const CHAPTER_BOSS_PROFILE: Omit<WorldBotProfile, "title"> = {
  name: "Kül Tahtı",
  archetype: "chapter-boss",
  weapon: "greatsword",
  difficulty: "hard",
  armorTint: "#8e383b",
  size: 1.2,
  appearance: {
    armor: "#292d34",
    armorLight: "#515761",
    armorDark: "#181c22",
    trim: "#bd5a56",
    cape: "#54262e",
    armorStyle: "royal",
    weaponStyle: "greatsword",
    weaponColor: "#ffcf78",
    auraColor: "#f15a4f",
  },
  taunt: "Bu yolun son hükmünü ben veririm.",
};

export function getWorldBotProfile(index: number) {
  return WORLD_BOT_PROFILES[((Math.floor(index) % WORLD_BOT_PROFILES.length) + WORLD_BOT_PROFILES.length) % WORLD_BOT_PROFILES.length];
}

export function getWorldRivalProfile(chapterId: number, rivalIndex: number) {
  const safeChapterId = Math.max(0, Math.floor(chapterId));
  const safeRivalIndex = Math.floor(rivalIndex);
  if (safeRivalIndex === 4) {
    return {
      ...CHAPTER_BOSS_PROFILE,
      name: CHAPTER_BOSS_NAMES[safeChapterId % CHAPTER_BOSS_NAMES.length],
      title: "BÖLÜM BOSSU",
    };
  }
  const archetypeIndex = ((safeChapterId * 4 + safeRivalIndex) % WORLD_ARCHETYPE_PROFILES.length
    + WORLD_ARCHETYPE_PROFILES.length) % WORLD_ARCHETYPE_PROFILES.length;
  const nameIndex = ((safeChapterId * 4 + safeRivalIndex) % WORLD_RIVAL_NAMES.length
    + WORLD_RIVAL_NAMES.length) % WORLD_RIVAL_NAMES.length;
  return {
    ...WORLD_ARCHETYPE_PROFILES[archetypeIndex],
    name: WORLD_RIVAL_NAMES[nameIndex],
    title: RIVAL_TITLES[archetypeIndex],
  };
}

export function getWorldBotProfileByArchetype(archetype: WorldBotArchetype) {
  if (archetype === "chapter-boss") return CHAPTER_BOSS_PROFILE;
  return WORLD_ARCHETYPE_PROFILES.find((profile) => profile.archetype === archetype) ?? WORLD_ARCHETYPE_PROFILES[0];
}

export function getWorldBotProfileByName(name: string) {
  const bossIndex = CHAPTER_BOSS_NAMES.indexOf(name as (typeof CHAPTER_BOSS_NAMES)[number]);
  if (bossIndex >= 0) return { ...CHAPTER_BOSS_PROFILE, name: CHAPTER_BOSS_NAMES[bossIndex] };
  const nameIndex = WORLD_RIVAL_NAMES.indexOf(name as (typeof WORLD_RIVAL_NAMES)[number]);
  if (nameIndex < 0) return undefined;
  return getWorldRivalProfile(Math.floor(nameIndex / 4), nameIndex % 4);
}
