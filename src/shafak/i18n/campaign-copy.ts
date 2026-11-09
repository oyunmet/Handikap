import {
  CAMPAIGN_ACT_COUNT,
  CAMPAIGN_LEVEL_COUNT,
  CAMPAIGN_REGIONS,
} from "../world/campaign-progression.ts";

export function getCampaignCopy(
  actCount = CAMPAIGN_ACT_COUNT,
  chapterCount = CAMPAIGN_LEVEL_COUNT,
) {
  const safeActCount = Math.max(1, Math.floor(actCount));
  const safeChapterCount = Math.max(1, Math.floor(chapterCount));
  const firstRegion = CAMPAIGN_REGIONS[0]?.name ?? "Başlangıç";
  const finalRegion = CAMPAIGN_REGIONS.at(-1)?.name ?? "Son perde";
  return {
    menuKicker: `${safeActCount} PERDE · ${safeChapterCount} BÖLÜM`,
    introTagline: `${safeActCount} perde. ${safeChapterCount} bölüm. Kayıp prenses. Mühür Parçalarını birleştir.`,
    openingDescription: `${firstRegion} perdesinden ${finalRegion} perdesine uzanan ${safeActCount} perdede, ${safeChapterCount} bölüm boyunca Mühür Parçalarını birleştir.`,
    menuDescription: `${firstRegion} perdesinden ${finalRegion} perdesine uzanan ${safeActCount} perdelik yolculukta Mühür Parçalarını birleştir ve prensesi bul.`,
    loadingTips: [
      "Karanlık krallığı ele geçirdi; prenses kayıp.",
      `${safeActCount} perdenin her birinde Mühür Parçalarını ara.`,
      `Son bölümde (${safeChapterCount}) Karanlık Hükümdar'ı yenerek prensesi bul.`,
    ],
    finalChapterLabel: `BÖLÜM ${safeChapterCount} · SON PERDE`,
    endingSummary: `${safeChapterCount} bölümlük yolculuk tamamlandı. ${safeActCount} perde boyunca toplanan Mühür Parçaları krallığı aydınlattı.`,
  } as const;
}

export const CAMPAIGN_COPY = getCampaignCopy();
