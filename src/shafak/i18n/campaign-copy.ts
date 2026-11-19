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
    menuKicker: `${cityName.toLocaleUpperCase("tr-TR")} · ${safeActCount} OPERASYON`,
    introTagline: `${safeActCount} operasyon · ${safeChapterCount} bölüm · 9 kayıt parçası`,
    openingDescription: `${cityName} çevresindeki tahliye hattı kesildi; ekip lideri Alaz kayıp. Dokuz kayıt parçasını topla, ${safeActCount} operasyona yayılan ${safeChapterCount} bölümde Demir Taç'ın planını ortaya çıkar.`,
    menuDescription: `${cityName} çevresindeki iletişim ağı ele geçirildi. Dokuz kayıt parçasını bul, Alaz'ı kurtar ve sivillerin tahliye koridorunu yeniden aç.`,
    loadingTips: [
      `İlk telsiz kaydı, Alaz'ın konvoyunun son konumunu gösteriyor.`,
      `Günlük saha görevleri ana operasyondan bağımsız kısa görevlerdir.`,
      `Son bölümde (${safeChapterCount}) iletişim ağının kontrolünü geri al.`,
    ],
    finalChapterLabel: `BÖLÜM ${safeChapterCount} · SON İSTİHBARAT DOSYASI`,
    endingSummary: `${safeChapterCount} bölüm boyunca dokuz kayıt parçasını topladın. Demir Taç'ın ağı durduruldu, siviller tahliye edildi ve Alaz Kuzgun Timi'ne döndü.`,
  } as const;
}

export const CAMPAIGN_COPY = getCampaignCopy();
