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
  const cityName = CAMPAIGN_NARRATIVE.cityName;
  return {
    menuKicker: `${cityName.toLocaleUpperCase("tr-TR")} · ${safeActCount} PERDE`,
    introTagline: `${safeActCount} perde · ${safeChapterCount} bölüm · 9 hatıra · tek bir hikâye`,
    openingDescription: `Prenses Alaz kaybolduğundan beri ${cityName} her sabah aynı çanla uyanıyor. Dokuz hatırayı bul; ${safeActCount} perde ve ${safeChapterCount} bölümde döngüyü çöz.`,
    menuDescription: `${cityName} her sabah aynı çanla uyanıyor. Dokuz hatırayı bul, döngünün nedenini çöz. Her kapı aynı mührün başka bir yankısını sınar; sefer bu izleri tek hikâyede birleştirir.`,
    loadingTips: [
      `Alaz'ın kervan defteri, ilk hatıranın izini gösteriyor.`,
      `Şehir kapılarındaki meydan görevleri, ana seferden ayrı kısa sınavlardır.`,
      `Son bölümde (${safeChapterCount}) döngünün ardındaki gerçeği ortaya çıkar.`,
    ],
    finalChapterLabel: `BÖLÜM ${safeChapterCount} · ŞAFAK MÜHRÜ`,
    endingSummary: `${safeChapterCount} bölüm boyunca dokuz hatırayı topladın. Eşik Mahallesi'ni aynı sabaha bağlayan döngü çözüldü; şehrin geleceğini artık sakinleri belirliyor.`,
  } as const;
}

export const CAMPAIGN_COPY = getCampaignCopy();
