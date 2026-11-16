import {
  CAMPAIGN_ACT_COUNT,
  CAMPAIGN_LEVEL_COUNT,
  CAMPAIGN_REGIONS,
} from "../world/campaign-progression.ts";
import { CAMPAIGN_NARRATIVE } from "../world/campaign-narrative.ts";

export function getCampaignCopy(
  actCount = CAMPAIGN_ACT_COUNT,
  chapterCount = CAMPAIGN_LEVEL_COUNT,
) {
  const safeActCount = Math.max(1, Math.floor(actCount));
  const safeChapterCount = Math.max(1, Math.floor(chapterCount));
  const firstRegion = CAMPAIGN_REGIONS[0]?.name ?? "Başlangıç";
  const finalRegion = CAMPAIGN_REGIONS.at(-1)?.name ?? "Son perde";
  return {
    menuKicker: `${CAMPAIGN_NARRATIVE.sagaTitle.toLocaleUpperCase("tr-TR")} · ${safeActCount} PERDE`,
    introTagline: `${safeActCount} perde. ${safeChapterCount} bölüm. Dokuz hatıra. Bir şehir, aynı şafakta.`,
    openingDescription: `${CAMPAIGN_NARRATIVE.opening} ${safeActCount} perde ve ${safeChapterCount} bölümde bu şehrin tekrarını kır.`,
    menuDescription: `${CAMPAIGN_NARRATIVE.princessName}'ın izini ${firstRegion} ile ${finalRegion} arasında takip et. Her 10 bölümde bir yemin sahibiyle yüzleş; her perdede döngünün kayıp bir hatırasını açığa çıkar.`,
    loadingTips: [
      `${CAMPAIGN_NARRATIVE.princessName}, Şafak Mührü'nü dokuz hatıraya böldü.`,
      `Her 10. bölümde bir yemin sahibiyle; her 50. bölümde perde muhafızıyla yüzleş.`,
      `Son bölümde (${safeChapterCount}) ${CAMPAIGN_NARRATIVE.finalBossName}'nı yen ve mührün ardındaki gerçeği öğren.`,
    ],
    finalChapterLabel: `BÖLÜM ${safeChapterCount} · ŞAFAK MÜHRÜ`,
    endingSummary: `${safeChapterCount} bölüm boyunca dokuz hatıranın izini sürdün. ${CAMPAIGN_NARRATIVE.princessName} bulundu; artık şehrin sabahını Kül Hükümdarı değil, yaşayanlar belirliyor.`,
  } as const;
}

export const CAMPAIGN_COPY = getCampaignCopy();
