export type StoryDialogue = {
  id: string;
  kind: "opening" | "chapter" | "npc";
  title: string;
  speaker: string;
  lines: string[];
  hint: string;
};

import {
  CAMPAIGN_ACT_COUNT,
  CAMPAIGN_LEVEL_COUNT,
  CAMPAIGN_LEVELS_PER_ACT,
  CAMPAIGN_REGIONS,
  clampCampaignChapterId,
  getCampaignLevelNumber,
  getCampaignRegion,
} from "./campaign-progression.ts";

const NPC_STORY_BEATS = [
  "Mührün ışığı, burada saklanan eski bir yemini yeniden görünür kılıyor.",
  "Prensesin izi bu perdede kaybolmadı; yalnızca yeni bir sınava dönüştü.",
  "Bir sonraki eşiğe hazırlan. Krallığın kaderi hâlâ değişebilir.",
] as const;

export function getOpeningStoryDialogue(): StoryDialogue {
  return {
    id: "story-opening",
    kind: "opening",
    title: "KAYIP PRENSES",
    speaker: "YOL KILAVUZU",
    lines: [
      "Karanlık krallığı ele geçirirken prenses kayboldu.",
      `${CAMPAIGN_ACT_COUNT} perdelik yolculukta Mühür Parçalarını birleştir; her perde prensesin izini biraz daha belirginleştirir.`,
      `${CAMPAIGN_REGIONS[0].name} yolundan ${CAMPAIGN_REGIONS.at(-1)?.name ?? "son perde"} sarayına ilerle.`,
    ],
    hint: `Her perdede Mühür Parçalarını ara. Son bölüm (${CAMPAIGN_LEVEL_COUNT}) Karanlık Hükümdar'a giden yolu açar.`,
  };
}

export function getChapterStoryDialogue(chapterId: number, storySummary?: string): StoryDialogue {
  const safeChapter = clampCampaignChapterId(chapterId);
  const actNumber = Math.floor(safeChapter / CAMPAIGN_LEVELS_PER_ACT) + 1;
  const levelNumber = getCampaignLevelNumber(safeChapter);
  const region = getCampaignRegion(safeChapter);
  return {
    id: `story-chapter-${safeChapter}`,
    kind: "chapter",
    title: `${region.name.toLocaleUpperCase("tr-TR")} · PERDE ${actNumber} · BÖLÜM ${levelNumber}`,
    speaker: "YOL KILAVUZU",
    lines: [
      storySummary?.trim() || `${region.name} yolunda prensesin izini sür.`,
      `${CAMPAIGN_ACT_COUNT} perdelik yolculuğun ${levelNumber}. bölümündesin; Mühür Parçalarını koru.`,
    ],
    hint: `Perde ${actNumber}/${CAMPAIGN_ACT_COUNT} · Bölüm ${levelNumber}/${CAMPAIGN_LEVEL_COUNT}. Mühür Parçalarını birleştir.`,
  };
}

const RIVAL_STORIES: Readonly<Record<string, readonly [string, string, string]>> = {
  "gate-warden": [
    "Kapıdan geçmek için önce içeride bıraktığın kişiyi hatırlamalısın.",
    "Nöbet tuttuğum gecenin sabahı hiç gelmedi. Senin mührün bunu değiştirebilir.",
    "Taşlar adını biliyor; ben de artık kimin dönmesini beklediğimi biliyorum.",
  ],
  "iron-oath": [
    "Yeminimi tutmak için herkesi geride bıraktım. Şimdi yemin, beni burada tutuyor.",
    "Kılıcımın ağırlığı demirden değil; verdiğim sözün içinde kalanlardan.",
    "Kapı açılırsa benden geriye ne kalacağını bilmiyorum. Yine de çekilmem.",
  ],
  "ash-archer": [
    "Külün üstünde yürüyenlerin gölgesi yoktur. Seninki neden iki tane?",
    "Oku kapıya değil, seni izleyen şeye attım. Sesini duydun mu?",
    "Mühür parladığında hedefim kayboluyor; sanki gelecekten birini vuruyorum.",
  ],
  "shadow-knight": [
    "Zırhımda yüzüm yok; kapının ardında bıraktığım yüz var.",
    "Gölgem senden önce geçti. Bir sonraki kapıda seni kimin beklediğini biliyor.",
    "Kılıcımı indirirsem karanlık beni geri çağırır. Beni susturabilir misin?",
  ],
  "storm-lancer": [
    "Fırtınanın içinde tek bir ses duydum: kapının bu kez içeriden açılacağını söyledi.",
    "Mızrağım yolu değil, yolu kapatan şeyi arıyor. Mühür sende olduğu için seni seçti.",
    "Şimşek her çaktığında bir isim siliniyor. Benimki sıradaki olabilir.",
  ],
  "rift-berserker": [
    "Yarık açıldığında içinden ben çıktım. Ama beni oraya kimin gönderdiğini hatırlamıyorum.",
    "Öfkem bana ait değil; her darbede kapının içinden biri daha uyanıyor.",
    "Beni yenmek kolay. Uyanan şeyi durdurmak için sonraki eşiğe ulaşmalısın.",
  ],
  "ember-alchemist": [
    "Külün içindeki ateşi söndürmedim; son hatırayı korumak için sakladım.",
    "Her Mühür Parçası başka bir anı yakıyor. Sence bu anılar kime ait?",
    "Tılsımın ışığına bakma. Işık sana bakıyorsa, artık seni tanımıştır.",
  ],
  "venom-assassin": [
    "Seni zehirlemedim. Kapının seni hatırlamasını sağlayan şeyi kanına bıraktım.",
    "Sessizliğim korkudan değil; adımı söylersem kapı hemen açılır.",
    "Dikkat et, yolcu. Burada en tehlikeli şey duyduğun ses değil, cevap verdiğin ses.",
  ],
  "frost-hunter": [
    "Ayaz, izleri silmez; onları bir sonraki kişinin görebileceği kadar dondurur.",
    "Buzun altında bir savaş sürüyor. Her ok, içeridekilerin kalp atışına göre yön değiştiriyor.",
    "Bir sonraki eşiğin önünde durma. Seni bekleyen kişi kendi sesinle konuşacak.",
  ],
  "chapter-boss": [
    "Beni son düşmanın sanıyorsun. Oysa ben, kapının dışarıda tuttuğu son hatırayım.",
    "Her döngüde buraya geldin; her döngüde cevabı unutup yeniden başladın.",
    "Mührü tamamla. Son kapının ardında aradığın düşman değil, kendi seçimin var.",
  ],
};

export function getNpcStoryDialogue(name: string, chapterId: number): StoryDialogue | null {
  if (name !== "Demir Yemin") return null;
  const safeChapter = clampCampaignChapterId(chapterId);
  const actNumber = Math.floor(safeChapter / CAMPAIGN_LEVELS_PER_ACT) + 1;
  const region = getCampaignRegion(safeChapter);
  return {
    id: `story-demir-yemin-${safeChapter}`,
    kind: "npc",
    title: "YEMİNİN AĞIRLIĞI",
    speaker: "DEMİR YEMİN",
    lines: [
      `${region.name} yolunda prensesin izi, eski yeminleri yeniden uyandırıyor.`,
      NPC_STORY_BEATS[safeChapter % NPC_STORY_BEATS.length],
    ],
    hint: `Perde ${actNumber}/${CAMPAIGN_ACT_COUNT} · Bölüm ${getCampaignLevelNumber(safeChapter)}/${CAMPAIGN_LEVEL_COUNT}.`,
  };
}

export function getWorldRivalStoryDialogue(rival: {
  name: string;
  archetype: string;
  chapterId: number;
  taunt: string;
}): StoryDialogue {
  if (rival.name === "Karanlık Hükümdar") {
    return {
      id: "story-final-boss",
      kind: "npc",
      title: "SON KAPI",
      speaker: "KARANLIK HÜKÜMDAR",
      lines: [
        rival.taunt,
        "Prensesi susturmadım; onu kapının ardında, krallığı koruyabilsin diye sakladım.",
        "Mühür tamamlandı. Bu düellonun sonunda saklanan gerçeği duyacaksın.",
      ],
      hint: "Son bossu yen; ardından prensesle konuşacaksın.",
    };
  }
  const special = getNpcStoryDialogue(rival.name, rival.chapterId);
  if (special) return special;
  const safeChapter = Number.isFinite(rival.chapterId) ? Math.max(0, Math.floor(rival.chapterId)) : 0;
  const voice = RIVAL_STORIES[rival.archetype] ?? RIVAL_STORIES["gate-warden"];
  const offset = (safeChapter + rival.name.length) % voice.length;
  return {
    id: `story-rival-${rival.archetype}-${safeChapter}`,
    kind: "npc",
    title: rival.name === "Kül Tahtı" ? "SON KAPI" : "KIRIK YEMİNLER",
    speaker: rival.name.toLocaleUpperCase("tr-TR"),
    lines: [
      rival.taunt,
      voice[offset],
      voice[(offset + 1) % voice.length],
    ],
    hint: "Her yolcu kapının başka bir anısını koruyor. Konuş, sonra karar verip düelloya gir.",
  };
}
