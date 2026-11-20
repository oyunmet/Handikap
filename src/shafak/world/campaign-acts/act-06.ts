import { CAMPAIGN_OPERATIONS } from "../../../data/story.ts";
import type { CampaignActData } from "../campaign-level-data.ts";

const operation = CAMPAIGN_OPERATIONS[5];

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: operation.id,
  name: operation.name,
  storySummary: operation.storySummary,
  storyBeats: operation.storyBeats,
  theme: "fırtınalı askeri liman, radar istasyonu ve yük gemisi enkazı",
  enemyFaction: "Taç Birliği Kıyı Filosu",
  mapVariants: ["fener-burnu", "batık-güverte", "tuzlu-mağara", "fırtına-iskelesi", "kıyı-burcu"],
  missionTemplates: [
    { id: "coast-clash", name: "Radar İstasyonu", kind: "normal-combat", objective: "Kıyı radarını kapatan Taç Birliği ekibini geri püskürt." },
    { id: "coast-waves", name: "İskele Savunması", kind: "survival", objective: "Tahliye botları açığa ulaşana kadar iskeleyi tut." },
    { id: "coast-hunt", name: "Kayıp Kaptan", kind: "target-hunt", objective: "Alaz'ın deniz rotasını bilen kaptanı bul." },
    { id: "coast-siege", name: "Kıyı Sinyali", kind: "siege", objective: "İletişim istasyonunu geri al ve yardım sinyalini tamamla." },
    { id: "coast-cache", name: "Altıncı Dosya", kind: "exploration", objective: "Enkazdaki seyir ve aktarım kayıtlarını çıkar." },
  ],
  miniBossTemplate: { id: "coast-mini-boss", name: "Kıyı Komutanı", objective: "Kıyı istasyonlarını kapatan Taç Birliği komutanını etkisiz hâle getir." },
  actBossTemplate: { id: "coast-act-boss", name: "Kıyı Filosu Lideri", objective: "Radar üssünü geri al ve merkez üssün koordinatlarını çıkar." },
};
