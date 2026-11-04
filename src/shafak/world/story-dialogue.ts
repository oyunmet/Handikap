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
      "Kül Yolu'nda yanan her iz, Şafak Kapısı'nın kapanış gecesini yeniden anlatıyor.",
      "Şafak Savaşçıları seni yola çağırdı; mührün neden sende uyandığını henüz bilmiyorsun.",
    ],
    hint: "Yol üstündeki ödülleri topla; kırmızı saldırı uyarısında blokla ya da yana kaç.",
  },
  {
    title: "DONMUŞ GEÇİT",
    lines: [
      "Kül Yolu'ndan taşıdığın mühür, ayazın altında çatladı. Geçidin ardında biri seni tanıyor.",
      "Demir Yemin'in bıraktığı izler nöbetçilerin sırasını ve eski yeminin bedelini anlatıyor.",
    ],
    hint: "Saldırıdan önce kırmızı uyarıyı görürsen blokla ya da yana kaç.",
  },
  {
    title: "KIZIL BATAKLIK",
    lines: [
      "Kızıl ışıklar mühürdeki çatlağı tamamlıyor; nöbetçiler aynı sözü fısıldıyor: Kapı bir sözü tutar.",
      "Demir Yemin'in son durağı burada. Yolun neden döngüye girdiğini ondan öğreneceksin.",
    ],
    hint: "Gürz ve kalkan taşıyan yolcuya rastlarsan önce sözünü dinle.",
  },
] as const;

const NPC_LINES = [
  [
    "Kılıç kapıyı değil, geride bıraktıklarının adını korur. Mühür sende yanıyorsa ben de sınavın parçasıyım.",
    "Külü geride bırakma; buzun altında kendi yemininin sesini duyacaksın.",
  ],
  [
    "Buzun altındaki ses benim yeminim değil; kapı kapanırken adımı orada bıraktım.",
    "Çatlak büyüdükçe yol seni hatırlıyor. Kızıl ışıklara değil, mühürdeki işarete bak.",
  ],
  [
    "Bataklık düşenlerin adını saklar. Kapının döngüsü beni nöbetçi yaptı.",
    "Mührü taşıyan sensin; döngüyü durdurabilecek olan da. Artık nedenini biliyorsun.",
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
    title: "ŞAFAK SAVAŞÇILARI",
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
