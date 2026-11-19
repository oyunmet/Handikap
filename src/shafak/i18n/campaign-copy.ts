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
    introTagline: `${safeActCount} operasyon · ${safeChapterCount} bölüm · 9 istihbarat dosyası`,
    openingDescription: `${cityName} çevresindeki tahliye hattı kesildi; ekip lideri Alaz kayıp. Dokuz istihbarat dosyasını topla, ${safeActCount} operasyona yayılan ${safeChapterCount} bölümde Demir Taç'ın planını ortaya çıkar.`,
    menuDescription: `${cityName} çevresindeki iletişim ağı ele geçirildi. Dokuz dosyayı topla, Alaz'ı bul ve sivillerin tahliye koridorunu yeniden aç.`,
    loadingTips: [
      `İlk telsiz kaydı, Alaz'ın konvoyunun izini gösteriyor.`,
      `Günlük saha görevleri ana operasyondan ayrı kısa sınavlardır.`,
      `Son bölümde (${safeChapterCount}) iletişim ağının kontrolünü geri al.`,
    ],
    finalChapterLabel: `BÖLÜM ${safeChapterCount} · SON İSTİHBARAT DOSYASI`,
    endingSummary: `${safeChapterCount} bölüm boyunca dokuz dosyayı topladın. Demir Taç'ın ağı kapatıldı, siviller tahliye edildi ve Alaz Kuzgun Timi'ne geri döndü.`,
  } as const;
}

export const CAMPAIGN_COPY = getCampaignCopy();
