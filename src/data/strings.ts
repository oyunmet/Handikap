import {
  CAMPAIGN_ACT_COUNT,
  CAMPAIGN_LEVEL_COUNT,
  CAMPAIGN_NARRATIVE,
  CAMPAIGN_OPERATIONS,
  CAMPAIGN_STORY_RECORDS,
  type CampaignMissionKind,
} from "./story.ts";

export const CAMPAIGN_MISSION_LABELS: Readonly<Record<CampaignMissionKind, string>> = {
  "normal-combat": "İlk Temas",
  survival: "Mevzi Savunması",
  "target-hunt": "Hedef Takibi",
  siege: "Kontrol Noktası",
  exploration: "İstihbarat Toplama",
  "mini-boss": "Komutan Karşılaşması",
  "act-boss": "Operasyon Finali",
};

export const STORY_UI_STRINGS = {
  dialogue: {
    skip: "ATLA",
    eyebrow: "TELSİZ · HİKÂYE",
    openingTitle: "SON HAT",
    reportTitle: "SAHA RAPORU",
    actBossTitle: "OPERASYON FİNALİ",
    finalTitle: "SON ÇATIŞMA",
    objectivePrefix: "Bu bölümün hedefi:",
    chapterFallback: (regionName: string, heroName: string) =>
      `${regionName} bölgesinde ${heroName}'ın sinyalini takip et.`,
    chapterObjectiveFallback: (operationCount: number, levelNumber: number) =>
      `${operationCount} operasyonun ${levelNumber}. bölümündesin; kayıt dosyalarını güvene al.`,
    openingHint: (firstOperation: string, finalChapter: number) =>
      `İlk görev: ${firstOperation}. Son bölüm (${finalChapter}) ağı güvenli kanala taşıma fırsatı verecek.`,
    chapterHint: (operationNumber: number, operationName: string, levelNumber: number, totalLevels: number) =>
      `Operasyon ${operationNumber}/${CAMPAIGN_ACT_COUNT} · ${operationName} · Bölüm ${levelNumber}/${totalLevels}.`,
    npcHint: (operationNumber: number, levelNumber: number) =>
      `Operasyon ${operationNumber}/${CAMPAIGN_ACT_COUNT} · Bölüm ${levelNumber}/${CAMPAIGN_LEVEL_COUNT}.`,
    finalBossHint: "Karanlık Sancak komutanını yen; ardından Alaz ve Sema ile iletişim kur.",
    reportHint: "Bölgedeki telsiz kayıtlarını ve istihbarat dosyalarını incele.",
    showCompleteLine: "TAMAMINI GÖR",
    continue: "DEVAM",
    returnToField: "SAHAYA DÖN",
  },
  hub: {
    campaignTitle: "SEFER HARİTASI",
    campaignCategory: "ANA HİKÂYE · 9 OPERASYON",
    campaignDescription: "Dokuz operasyon boyunca kayıt parçalarını bul, Alaz'ın izini sür ve siviller için Doğuş Kapısı'nı aç.",
    archiveTitle: "KAYIT ARŞİVİ",
    archiveCategory: "AÇILAN HİKÂYE KAYITLARI",
    archiveDescription: "Operasyon finallerinde açtığın kayıt parçalarını ve sefer özetini incele.",
  },
  archive: {
    kicker: "SEFER VE KAYITLAR",
    title: "Kayıt Arşivi",
    operationLabel: "OPERASYON",
    chapterLabel: "BÖLÜM",
    progressLabel: "SEFER İLERLEMESİ",
    recordsHeading: "OPERASYON KAYITLARI",
    foundLabel: "AÇILDI",
    lockedLabel: "KİLİTLİ",
    lockedDescription: "Bu kayıt operasyon finalinde açılır.",
    emptyDescription: "İlk kayıt parçası, birinci operasyonun finalinde açılacak.",
    returnLabel: "ÜSSE DÖN",
    closeLabel: "Kayıt arşivini kapat",
  },
  operationResult: {
    eyebrow: "OPERASYON TAMAMLANDI",
    recordLabel: "YENİ KAYIT PARÇASI",
    nextOperationLabel: "SONRAKİ OPERASYON",
    finalOperationLabel: "SON OPERASYON",
  },
  ending: {
    title: "SEFER TAMAMLANDI",
    recordLabel: "SON KAYIT PARÇASI",
    rewardLabel: "SON OPERASYON ÖDÜLÜ",
  },
} as const;

export function getCampaignCopy(
  actCount = CAMPAIGN_ACT_COUNT,
  chapterCount = CAMPAIGN_LEVEL_COUNT,
) {
  const safeActCount = Math.max(1, Math.floor(actCount));
  const safeChapterCount = Math.max(1, Math.floor(chapterCount));
  const cityName = CAMPAIGN_NARRATIVE.cityName;
  const firstOperation = CAMPAIGN_OPERATIONS[0]?.name ?? "Son Hat";
  const finalOperation = CAMPAIGN_OPERATIONS.at(-1)?.name ?? "Doğuş Kapısı";
  return {
    menuKicker: `${cityName.toLocaleUpperCase("tr-TR")} · ${safeActCount} OPERASYON`,
    introTagline: `${safeActCount} operasyon · ${safeChapterCount} bölüm · ${CAMPAIGN_STORY_RECORDS.length} kayıt parçası`,
    openingDescription: `${cityName} kuşatma altında; haberleşme ağı çöktü ve sivil tahliye koridoru kapandı. ${CAMPAIGN_NARRATIVE.guideName}, ${CAMPAIGN_NARRATIVE.heroName}'u ${safeActCount} operasyona yayılan ${safeChapterCount} bölüm boyunca yönlendiriyor.`,
    menuDescription: `Kayıt parçalarını bul, ${CAMPAIGN_NARRATIVE.lostOfficerName}'ın izini sür ve siviller için ${finalOperation}'nı aç.`,
    loadingTips: [
      `${firstOperation}: son çalışan telsiz hattı buradan geliyor.`,
      `${CAMPAIGN_NARRATIVE.guideName}, her operasyon arasında yeni bir kayıt izi bulabilir.`,
      `Son bölümde (${safeChapterCount}) tahliye ağı güvenli kanala taşınacak.`,
    ],
    finalChapterLabel: `BÖLÜM ${safeChapterCount} · SON KAYIT PARÇASI`,
    endingSummary: CAMPAIGN_NARRATIVE.ending,
  } as const;
}

export const CAMPAIGN_COPY = getCampaignCopy();
