export const LEVEL_COUNT = 500;
export const LEVELS_PER_CHAPTER = 25;

const CHAPTER_NAMES = [
  "Şafak Kalesi",
  "Kristal Avlu",
  "Altın Galeri",
  "Ay Işığı Salonu",
  "Kuzey Burcu",
  "Gül Bahçesi",
  "Gökkuşağı Kulesi",
  "Taç Odası",
  "Kış Sarayı",
  "Güneş Terası",
  "Mücevher Mahzeni",
  "Şövalye Meydanı",
  "Bulut Köprüsü",
  "Alevli Kule",
  "Gümüş Liman",
  "Yıldız Salonu",
  "Mermer Avlu",
  "Zümrüt Kapı",
  "Kraliyet Zirvesi",
  "Efsane Tahtı",
];

const FEATURE_LABELS = {
  vault: "Kilitli kasalar",
  grass: "Çim örtüsü",
  bear: "Saklı ayıcıklar",
  hat: "Sihirli şapkalar",
  drill: "Matkap sıraları",
  rocket: "Roketler",
  propeller: "Pervaneler",
  tnt: "TNT",
  lightball: "Işık küresi",
};

const FEATURE_SETS = [
  ["vault"],
  ["vault", "grass"],
  ["grass", "bear"],
  ["hat"],
  ["drill"],
  ["vault", "grass", "bear"],
  ["vault", "hat"],
  ["grass", "drill"],
  ["vault", "grass", "hat"],
  ["vault", "grass", "bear", "hat", "drill"],
];

const FEATURE_DESCRIPTIONS = {
  vault: "Kasalara komşu eşleşmeler yaparak kilitlerini aç.",
  grass: "Çimlerin üstündeki eşleşmeler çimleri temizler.",
  bear: "Çimlerin altındaki ayıcıkları bul ve kurtar.",
  hat: "Sihirli şapkaları eşleşmeler ve güçlerle kaldır.",
  drill: "Matkabı çalıştır; tamamlanan matkap bir sırayı temizler.",
};

const clampLevel = (value) => Math.min(
  LEVEL_COUNT,
  Math.max(1, Math.floor(Number(value) || 1)),
);

export function getLevelDefinition(value = 1) {
  const level = clampLevel(value);
  const chapter = Math.ceil(level / LEVELS_PER_CHAPTER);
  const phase = (level - 1) % 10;
  const featureSetIndex = level <= FEATURE_SETS.length
    ? level - 1
    : (phase + Math.floor((level - 1) / LEVELS_PER_CHAPTER)) % FEATURE_SETS.length;
  const featureIds = [...FEATURE_SETS[featureSetIndex]];

  if (featureIds.includes("bear") && !featureIds.includes("grass")) {
    featureIds.push("grass");
  }

  const unlockedSpecials = [];
  if (level >= 2) unlockedSpecials.push("rocket");
  if (level >= 5) unlockedSpecials.push("propeller");
  if (level >= 9) unlockedSpecials.push("tnt");
  if (level >= 14) unlockedSpecials.push("lightball");

  const goals = {
    gems: 18 + Math.floor((level - 1) / 20) + (level % 5),
  };
  if (featureIds.includes("vault")) goals.vault = 2 + (level % 4);
  if (featureIds.includes("grass")) goals.grass = 2 + (level % 3);
  if (featureIds.includes("bear")) goals.bear = 1 + (level % 2);
  if (featureIds.includes("hat")) goals.hat = 2 + (level % 3);
  if (featureIds.includes("drill")) goals.drill = 1 + (level % 2);

  if (goals.bear) goals.grass = Math.max(goals.grass || 0, goals.bear + 1);

  const features = [
    ...featureIds,
    ...unlockedSpecials,
  ].map((id) => FEATURE_LABELS[id]);
  const description = featureIds
    .map((id) => FEATURE_DESCRIPTIONS[id])
    .join(" ");

  return {
    level,
    chapter,
    chapterName: CHAPTER_NAMES[chapter - 1],
    title: `${CHAPTER_NAMES[chapter - 1]} · ${level}`,
    featureIds,
    featureLabels: features,
    description,
    goals,
    moves: Math.max(22, 38 - Math.floor((level - 1) / 30) - (level % 3)),
    difficulty: Math.min(5, 1 + Math.floor((level - 1) / 100)),
    unlockedSpecials,
    layoutVariant: (level * 17 + Math.floor(level / 3)) % 16,
  };
}
