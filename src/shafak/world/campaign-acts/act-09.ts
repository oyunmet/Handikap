import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "shadow-palace",
  name: "Aynasız Saray",
  storySummary: "Son yankıda Alaz seni bekliyor; sarayın aynaları Kül Hükümdarı'nın sakladığı tek günü tekrar tekrar gösteriyor.",
  storyBeats: [
    "Aynasız Saray'da hiçbir gölge sana ait değil; her biri önceki seferinden kalmış.",
    "Gölge nöbetçileri Alaz'ı içeride tutmuyor; onun açacağı kapının döngüyü dışarı salmasından korkuyor.",
    "Mühür Salonu'ndaki dokuz iz birleşiyor: Alaz, Şafak Mührü'nü kendi elleriyle parçaladı.",
    "Kül Hükümdarı'nın yankısı savaşı bitirmeyi değil, kaybettiği günü sonsuza dek korumayı seçti.",
    "Son kapı açıldı. Dokuzuncu yankıyı tamamla, Kül Hükümdarı'nı yen ve şafağı Alaz'la birlikte seç.",
  ],
  theme: "aynaları sökülmüş saray ve son güne hapsolmuş bir hükümdar",
  enemyFaction: "Aynasız Nöbetçiler",
  mapVariants: ["ayna-avlusu", "kara-galeri", "mühür-salonu", "son-koridor", "prenses-kulesi"],
  missionTemplates: [
    { id: "palace-clash", name: "Aynasız Nöbet", kind: "normal-combat", objective: "Alaz'ın açacağı kapının önündeki nöbetçileri yen." },
    { id: "palace-waves", name: "Son Günün Dalgası", kind: "survival", objective: "Döngünün son savunması bitene kadar dayan." },
    { id: "palace-hunt", name: "Alaz'ın Son İzi", kind: "target-hunt", objective: "Alaz'a ulaşan yolu kapatan yankıyı bul." },
    { id: "palace-siege", name: "Dokuzuncu Kapı", kind: "siege", objective: "Son kapıyı tutan hattı yar." },
    { id: "palace-cache", name: "Mührün Kalbi", kind: "exploration", objective: "Şafak Mührü'nün son parçasını bul." },
  ],
  miniBossTemplate: { id: "palace-mini-boss", name: "Aynasız Şampiyon", objective: "Alaz'ın son anısını koruyan şampiyonu yen." },
  actBossTemplate: { id: "palace-act-boss", name: "Kül Hükümdarı", objective: "Dokuzuncu yankıyı tamamla, Alaz'a ulaş ve döngüyü sona erdir." },
};
