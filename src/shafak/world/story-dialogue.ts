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
import { CAMPAIGN_NARRATIVE } from "./campaign-narrative.ts";

const NPC_STORY_BEATS = [
  "Bu kontrol noktasında, Taç Birliği'nin kapattığı başka bir tahliye hattı var.",
  "Alaz'ın son sinyali bu bölgede kesildi; telsiz kayıtlarını kontrol et.",
  "Bir sonraki operasyona hazırlan. Sivillerin güvenli çıkışı hâlâ mümkün.",
] as const;

export function getOpeningStoryDialogue(): StoryDialogue {
  return {
    id: "story-opening",
    kind: "opening",
    title: "KAYIP SİNYAL",
    speaker: "KUZGUN İRTİBATI",
    lines: [
      `${CAMPAIGN_NARRATIVE.cityName} yakınında tahliye konvoyu kesildi; Kuzgun Timi lideri ${CAMPAIGN_NARRATIVE.squadLeadName} kayıp.`,
      `Taç Birliği, ${CAMPAIGN_NARRATIVE.sealName} üzerindeki kontrolü ele geçirdi. Dokuz kayıt parçası, sivil yardım çağrılarının nasıl hedef koordinatlarına çevrildiğini gösterecek.`,
      `${CAMPAIGN_ACT_COUNT} operasyonda kayıt parçalarını topla, Alaz'ı bul ve ${CAMPAIGN_NARRATIVE.finalBossName} ile yüzleş.`,
    ],
    hint: `İlk görev: ${CAMPAIGN_REGIONS[0].name}. Son bölüm (${CAMPAIGN_LEVEL_COUNT}) ağı güvenli kanala taşıma fırsatı verecek.`,
  };
}

export function getChapterStoryDialogue(
  chapterId: number,
  storySummary?: string,
  objective?: string,
): StoryDialogue {
  const safeChapter = clampCampaignChapterId(chapterId);
  const actNumber = Math.floor(safeChapter / CAMPAIGN_LEVELS_PER_ACT) + 1;
  const levelNumber = getCampaignLevelNumber(safeChapter);
  const region = getCampaignRegion(safeChapter);
  return {
    id: `story-chapter-${safeChapter}`,
    kind: "chapter",
    title: `${region.name.toLocaleUpperCase("tr-TR")} · OPERASYON ${actNumber} · BÖLÜM ${levelNumber}`,
    speaker: "KUZGUN İRTİBATI",
    lines: [
      storySummary?.trim() || `${region.name} bölgesinde Alaz'ın sinyalini takip et.`,
      objective?.trim()
        ? `Bu bölümün hedefi: ${objective.trim()}`
        : `${CAMPAIGN_ACT_COUNT} operasyonun ${levelNumber}. bölümündesin; istihbarat dosyalarını güvene al.`,
    ],
    hint: `Operasyon ${actNumber}/${CAMPAIGN_ACT_COUNT} · Bölüm ${levelNumber}/${CAMPAIGN_LEVEL_COUNT}.`,
  };
}

const RIVAL_STORIES: Readonly<Record<string, readonly [string, string, string]>> = {
  "gate-warden": [
    "Kontrol noktası kapalı. Geri çekil ya da telsizini bırak.",
    "Konvoy güzergâhı değişti; merkezden gelen emri sorgulama.",
    "Bu mevziyi tutmamın nedeni emir. Başka bir seçenek bırakmadılar.",
  ],
  "iron-oath": [
    "Bölgeyi teslim etmem için yazılı emir gerekiyor.",
    "Merkez ağı susturuyor; kendi birimlerimizle bile bağlantı kuramıyoruz.",
    "Bu hattı savunuyorum çünkü sivillerin çıkışı başka yerde kapalı.",
  ],
  "ash-archer": [
    "Gözlem noktasından bütün geçitler görünüyor.",
    "Telsiz sessiz. Konumunu açık kanalda verme.",
    "Sis kalkmadan bu yamacı geçemezsin.",
  ],
  "shadow-knight": [
    "Termal kamerada tek bir hareket bile kaçmaz.",
    "İşaret fişeği göründüğünde konumun belli olacak.",
    "Karanlıkta telsiz kullanma. Sinyal seni ele verir.",
  ],
  "storm-lancer": [
    "Hava desteği yok. Bu mevzide yalnızız.",
    "Anten hasarlı; batı kanadından sinyal alamıyoruz.",
    "Fırtına dinince tahliye koridorunu tekrar açacağız.",
  ],
  "rift-berserker": [
    "Zırhlı araç desteği olmadan bu hat düşmez.",
    "Her takviye talebi merkezde bekletiliyor.",
    "Emir değişti. Kimse nedenini söylemiyor.",
  ],
  "ember-alchemist": [
    "Kontrol odasındaki güç dağıtımı hâlâ çalışıyor.",
    "Yedek sunucu yeraltı tünelinde. Ana hattı kapatmadan oraya ulaş.",
    "Bu cihazlar yardım sinyalini komuta ağına yönlendiriyor.",
  ],
  "venom-assassin": [
    "Telsizini kapat. Bu frekans dinleniyor.",
    "İçeriden bilgi sızdıran kişiyi bulmadan merkeze girmeyin.",
    "Yanlış çağrı kodunu kullandın. Burada kimse sana güvenmez.",
  ],
  "frost-hunter": [
    "Kar, araç izlerini kapatır ama ayak izlerini değil.",
    "Radar kaydı, konvoyun kuzey tüneline girdiğini gösteriyor.",
    "Sinyali buldun. Şimdi göndericinin kim olduğunu öğren.",
  ],
  "chapter-boss": [
    "Dosyaları teslim et. Merkezde neler olduğunu hâlâ bilmiyorsun.",
    "Alaz ağı durdurmak istedi; ben de bu hattı korumak için onu susturdum.",
    "Demir Taç'ın emriyle bütün iletişim kanalları kapatılacak.",
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
    title: "SAHA RAPORU",
    speaker: "DEMİR YEMİN",
    lines: [
      `${region.name} bölgesinde Alaz'ın son yayınını takip ediyoruz.`,
      NPC_STORY_BEATS[safeChapter % NPC_STORY_BEATS.length],
    ],
    hint: `Operasyon ${actNumber}/${CAMPAIGN_ACT_COUNT} · Bölüm ${getCampaignLevelNumber(safeChapter)}/${CAMPAIGN_LEVEL_COUNT}.`,
  };
}

export function getWorldRivalStoryDialogue(rival: {
  name: string;
  archetype: string;
  chapterId: number;
  taunt: string;
}): StoryDialogue {
  if (rival.name === CAMPAIGN_NARRATIVE.finalBossName || rival.name === "Karanlık Hükümdar") {
    return {
      id: "story-final-boss",
      kind: "npc",
      title: "SON ÇATIŞMA",
      speaker: CAMPAIGN_NARRATIVE.finalBossName.toLocaleUpperCase("tr-TR"),
      lines: [
        rival.taunt,
        "Alaz ağı kapatmak istedi; bu koridoru korumak için onu merkezden uzak tuttum.",
        "Dosyaları teslim et. Bu üssün kime ait olduğuna birazdan sen karar vereceksin.",
      ],
      hint: "Demir Taç'ı yen; ardından Alaz'la iletişim kur.",
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
    title: rival.name === CAMPAIGN_NARRATIVE.finalBossName ? "SON ÇATIŞMA" : "SAHA RAPORU",
    speaker: rival.name.toLocaleUpperCase("tr-TR"),
    lines: [
      rival.taunt,
      voice[offset],
      voice[(offset + 1) % voice.length],
    ],
    hint: "Bölgedeki telsiz kayıtlarını ve istihbarat dosyalarını incele.",
  };
}
