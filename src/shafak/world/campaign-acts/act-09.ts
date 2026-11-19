import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "shadow-palace",
  name: "Son Komuta Merkezi",
  storySummary: "Kuzgun Timi, son merkezde Alaz'ı bulur ve Demir Taç'la yüzleşir; dokuzuncu dosya çatışmanın gerçek nedenini açıklar.",
  storyBeats: [
    "Son Komuta Merkezi, tüm bölgelerdeki tahliye ve haberleşme ağlarını tek bir sunucuda toplar.",
    "Merkez muhafızları Alaz'ı esir tutmuyor; onun kanıtlarla üsse dönmesini engelliyor.",
    "Dokuzuncu kayıt, Demir Taç'ın yardım ağını kontrol ederek çatışmayı uzattığını ortaya çıkarır.",
    "Alaz, ağı kapatmanın sivilleri de iletişimsiz bırakacağını bildiği için anahtarı tek başına taşımıştır.",
    "Son dosya açılır: Kuzgun Timi ağı güvenli şekilde kapatır, sivilleri tahliye eder ve Alaz'ı kurtarır.",
  ],
  theme: "yeraltı komuta merkezi, sunucu salonu ve son tahliye koridoru",
  enemyFaction: "Demir Taç'ın Merkez Muhafızları",
  mapVariants: ["komuta-avlusu", "kara-galeri", "sunucu-salonu", "son-koridor", "radar-kulesi"],
  missionTemplates: [
    { id: "palace-clash", name: "Komuta Girişi", kind: "normal-combat", objective: "Sunucu salonunun girişini tutan muhafızları aş." },
    { id: "palace-waves", name: "Son Tahliye", kind: "survival", objective: "Siviller güvenli koridora ulaşana kadar merkezi savun." },
    { id: "palace-hunt", name: "Alaz'a Ulaş", kind: "target-hunt", objective: "Alaz'ın saklandığı bölmeye giden yolu aç." },
    { id: "palace-siege", name: "Sunucu Salonu", kind: "siege", objective: "Merkez sunucuyu ele geçir ve aktarımı durdur." },
    { id: "palace-cache", name: "Dokuzuncu Dosya", kind: "exploration", objective: "Ağın kontrol anahtarını merkez sunucudan al." },
  ],
  miniBossTemplate: { id: "palace-mini-boss", name: "Merkez Muhafızı", objective: "Alaz'a ulaşmanı engelleyen merkez komutanını durdur." },
  actBossTemplate: { id: "palace-act-boss", name: "Demir Taç", objective: "Demir Taç'ı yen, dokuzuncu dosyayı güvene al ve tahliye ağını kapat." },
};
