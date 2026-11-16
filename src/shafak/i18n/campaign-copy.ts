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
    introTagline: `${safeActCount} perde. ${safeChapterCount} bölüm. Dokuz mühür parçası. Tek bir şafak.`,
    openingDescription: `${CAMPAIGN_NARRATIVE.opening} ${firstRegion}'ndan ${finalRegion}'na uzanan ${safeActCount} perde ve ${safeChapterCount} bölüm boyunca her düşmanın sakladığı izi açığa çıkar.`,
    menuDescription: `${CAMPAIGN_NARRATIVE.princessName}'ın bıraktığı izi ${firstRegion}'ndan ${finalRegion}'na kadar takip et. Her 10 bölümde bir yemin sahibini yen; her perdede Şafak Mührü'nün yeni bir sırrını çöz.`,
    loadingTips: [
      `${CAMPAIGN_NARRATIVE.princessName}, Şafak Mührü'nü dokuz parçaya ayırdı.`,
      `Her 10. bölümde bir yemin sahibiyle; her 50. bölümde perde muhafızıyla yüzleş.`,
      `Son bölümde (${safeChapterCount}) ${CAMPAIGN_NARRATIVE.finalBossName}'nı yen ve mührün ardındaki gerçeği öğren.`,
    ],
    finalChapterLabel: `BÖLÜM ${safeChapterCount} · ŞAFAK MÜHRÜ`,
    endingSummary: `${safeChapterCount} bölüm boyunca dokuz yeminin izini sürdün. ${CAMPAIGN_NARRATIVE.princessName} bulundu; artık krallığın sabahını Kül Hükümdarı değil, sen belirliyorsun.`,
  } as const;
}

export const CAMPAIGN_COPY = getCampaignCopy();
