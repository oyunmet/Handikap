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

const CHAPTER_STORIES = [
  "Gölge Büyücüsü Veyran, Altın Taç’ın beş ışık taşını çalıp sarayı karanlık bir mühürle kapattı. Kral, taşları bulup mührü kırman için seni görevlendiriyor.",
  "Kristal Avlu’daki ayna, Veyran’ın izlerini Altın Galeri’ye taşıyor. Aynanın çatlaklarını temizle ve geçidi aç.",
  "Altın Galeri’nin portreleri büyücünün bir yıldız haritası aradığını söylüyor. Haritanın son parçası Ay Işığı Salonu’nda saklı.",
  "Ay Işığı Salonu’ndaki harita, ilk ışık taşını Kuzey Burcu’nun buz mühründe gösteriyor.",
  "Kuzey Burcu’nda buzları kırıp Cesaret Taşı’nı buluyorsun. Sarayın nöbetçileri yeniden canlanmaya başlıyor.",
  "Gül Bahçesi’nde dikenlerin ardında mahsur kalan saraylılara yardım et; onların sakladığı eski taç mührü sana yeni bir yol açacak.",
  "Gökkuşağı Kulesi, ışığı yedi renge ayırarak ikinci taşın yerini gösteriyor: Kış Sarayı.",
  "Taç Odası’nın kapısı açılıyor ama taht boş. Veyran, taşlarla herkesi güvende tutabileceğini söylüyor; ona güvenip güvenemeyeceğini çözmelisin.",
  "Kış Sarayı’nda Umut Taşı’nı buzdan kurtarıyorsun. Veyran’ın büyüsü zayıflıyor, fakat mühür hâlâ ayakta.",
  "Güneş Terası’nda iki taşın ışığı birleşiyor ve üçüncü izin Mücevher Mahzeni’ne uzandığı görülüyor.",
  "Mahzendeki kayıtlar Veyran’ın eski bir şövalye olduğunu anlatıyor. Bilgelik Taşı’nı buluyor ve onun herkesi kaybetmekten korktuğunu öğreniyorsun.",
  "Şövalye Meydanı’nda eski dostlar sana katılıyor; Birlik Taşı’nın anahtarı artık ekip çalışması.",
  "Bulut Köprüsü’nde rüzgârın içinden geç ve Birlik Taşı’nı geri al. Saray halkı yeniden sana güveniyor.",
  "Alevli Kule’nin ateşi büyüyü yakar ama Veyran’ı kurtarmak da mümkün. Son mührü çözmek için ilerliyorsun.",
  "Gümüş Liman’dan kraliyet gemileri yola çıkıyor. Son iz, Yıldız Salonu’nun üzerinde parlıyor.",
  "Yıldız Salonu’nda son ışık taşının yerini buluyorsun. Beş taş bir araya gelirse taç yeniden uyanacak.",
  "Mermer Avlu’da saraylılar ve şövalyeler etrafında toplanıyor. Birlikte, son kapıya doğru yürüyorsunuz.",
  "Zümrüt Kapı yalnızca merhametle açılıyor. Veyran’a karşı öfke yerine yardım teklif etmeye karar veriyorsun.",
  "Kraliyet Zirvesi’nde Veyran’la yüzleşiyorsun; tacı herkesi kaybetmekten korktuğu için çalmış.",
  "Efsane Tahtı’nda beş ışık taşı yeniden birleşiyor. Veyran büyüyü bozmana yardım ediyor; taç artık bütün krallığa ışık saçıyor.",
];

export function getChapterStory(chapterNumber = 1) {
  const chapter = Math.floor(Number(chapterNumber)) || 1;
  const index = Math.min(CHAPTER_STORIES.length - 1, Math.max(0, chapter - 1));
  return CHAPTER_STORIES[index];
}

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
    chapterStory: getChapterStory(chapter),
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
