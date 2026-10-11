export type StoryDialogue = {
  id: string;
  kind: "opening" | "chapter" | "npc";
  title: string;
  speaker: string;
  lines: string[];
  hint: string;
};

const CHAPTER_STORIES = [
  {
    title: "KÜL YOLU",
    lines: [
      "Şafak sökmeden üç kapıyı aşmalısın. Külün altında eski bir iz, her adımda yeniden beliriyor.",
      "Kuzey kapısı açılırsa, buzun içinde hâlâ yanabilen bir şey bulacaksın.",
    ],
    hint: "Yolda parlayan ganimetleri topla; mavi çubuk dayanıklılığını gösterir.",
  },
  {
    title: "DONMUŞ GEÇİT",
    lines: [
      "Buz, sesi uzağa taşır. Burada atılan her adım seni de takip edenleri de ele verir.",
      "Geçidin ardında bataklık ışıkları yanıyor; hiçbirine yolunu çizmesi için güvenme.",
    ],
    hint: "Saldırıdan önce kırmızı uyarıyı görürsen blokla ya da yana kaç.",
  },
  {
    title: "KIZIL BATAKLIK",
    lines: [
      "Kızıl sisin içinden gelen fısıltılar eski yeminleri uyandırıyor.",
      "Bir sonraki kapıda, sana yolun neden tekrarlandığını bilen biri bekliyor.",
    ],
    hint: "Gürz ve kalkan taşıyan yolcuya rastlarsan önce sözünü dinle.",
  },
] as const;

const NPC_LINES = [
  [
    "Bu kılıç kapıyı korumuyor; ardında kalanların adını koruyor.",
    "Külü geride bırakma. Buz, unuttuğun her şeyi saklar.",
  ],
  [
    "Buzun altındaki ses benim yeminim değil. Kapıyı açarken onu uyandırma.",
    "Kızıl ışıklar yol göstermez; yalnızca baktığını hatırlar.",
  ],
  [
    "Bataklık, düşenlerin adını saklar. Benimkini henüz bulamadı.",
    "Bir sonraki kapının ardında cevap yok; yalnızca daha eski bir soru var.",
  ],
] as const;

function chapterIndex(chapterId: number) {
  const safeChapter = Number.isFinite(chapterId) ? Math.max(0, Math.floor(chapterId)) : 0;
  return safeChapter % CHAPTER_STORIES.length;
}

export function getOpeningStoryDialogue(): StoryDialogue {
  const opening = CHAPTER_STORIES[0];
  return {
    id: "story-opening",
    kind: "opening",
    title: opening.title,
    speaker: "YOL KILAVUZU",
    lines: [...opening.lines],
    hint: opening.hint,
  };
}

export function getChapterStoryDialogue(chapterId: number): StoryDialogue {
  const chapter = CHAPTER_STORIES[chapterIndex(chapterId)];
  return {
    id: `story-chapter-${Math.max(0, Math.floor(Number.isFinite(chapterId) ? chapterId : 0))}`,
    kind: "chapter",
    title: chapter.title,
    speaker: "YOL KILAVUZU",
    lines: [...chapter.lines],
    hint: chapter.hint,
  };
}

export function getNpcStoryDialogue(name: string, chapterId: number): StoryDialogue | null {
  if (name !== "Demir Yemin") return null;
  const safeChapter = Number.isFinite(chapterId) ? Math.max(0, Math.floor(chapterId)) : 0;
  return {
    id: `story-demir-yemin-${safeChapter}`,
    kind: "npc",
    title: "YEMİNİN AĞIRLIĞI",
    speaker: "DEMİR YEMİN",
    lines: [...NPC_LINES[chapterIndex(safeChapter)]],
    hint: "Yol ayrımında dur. Bir sonraki kapı sessiz geçilmeyecek.",
  };
}
