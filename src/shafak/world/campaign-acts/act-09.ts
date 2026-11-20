import { CAMPAIGN_OPERATIONS } from "../../../data/story.ts";
import type { CampaignActData } from "../campaign-level-data.ts";

const operation = CAMPAIGN_OPERATIONS[8];

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: operation.id,
  name: operation.name,
  storySummary: operation.storySummary,
  storyBeats: operation.storyBeats,
  theme: "yeraltı komuta merkezi, sunucu salonu ve son tahliye koridoru",
  enemyFaction: "Demir Taç'ın Merkez Muhafızları",
  mapVariants: ["komuta-avlusu", "kara-galeri", "sunucu-salonu", "son-koridor", "radar-kulesi"],
  missionTemplates: [
    { id: "palace-clash", name: "Komuta Girişi", kind: "normal-combat", objective: "Sunucu salonunun girişini tutan muhafızları aş." },
    { id: "palace-waves", name: "Son Tahliye", kind: "survival", objective: "Siviller güvenli koridora ulaşana kadar merkezi savun." },
    { id: "palace-hunt", name: "Alaz'a Ulaş", kind: "target-hunt", objective: "Alaz'ın saklandığı bölmeye geçişi aç." },
    { id: "palace-siege", name: "Sunucu Salonu", kind: "siege", objective: "Merkez sunucuyu ele geçir ve aktarımı durdur." },
    { id: "palace-cache", name: "Dokuzuncu Dosya", kind: "exploration", objective: "Ağın kontrol anahtarını merkez sunucudan al." },
  ],
  miniBossTemplate: { id: "palace-mini-boss", name: "Merkez Muhafızı", objective: "Alaz'a ulaşmanı engelleyen merkez komutanını durdur." },
  actBossTemplate: { id: "palace-act-boss", name: "Demir Taç", objective: "Demir Taç'ı yen, dokuzuncu dosyayı güvene al ve tahliye ağını kapat." },
};
