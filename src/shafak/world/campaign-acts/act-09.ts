import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "shadow-palace",
  name: "Aynasız Saray",
  storySummary: "Aynasız Saray'da Alaz ve hükümdar son günü bekliyor; dokuzuncu hatıra döngüyü başlatan kararı açıklıyor.",
  storyBeats: [
    "Aynasız Saray'daki gölgeler önceki döngülerden kalmış; her biri seni daha önce görmüş.",
    "Nöbetçiler Alaz'ı hapsetmiyor; döngü sona ererse kaybettikleri günle yüzleşmekten korkuyorlar.",
    "Mühür Salonu'ndaki dokuz kayıt birleşiyor: Alaz, insanlara yarını vermek için mührü parçaladı.",
    "Hükümdar savaşı değil, kaybettiği günü sonsuza dek korumayı seçmiş.",
    "Dokuzuncu hatıra açılıyor; Alaz'la birlikte kapıyı aç ve şehrin ilk gerçek sabahını başlat.",
  ],
  theme: "aynaları sökülmüş saray, döngü kayıtları ve son günün tanıkları",
  enemyFaction: "Aynasız Nöbetçiler",
  mapVariants: ["ayna-avlusu", "kara-galeri", "mühür-salonu", "son-koridor", "prenses-kulesi"],
  missionTemplates: [
    { id: "palace-clash", name: "Aynasız Nöbet", kind: "normal-combat", objective: "Alaz'ın açacağı saray kapısının önündeki nöbetçileri aş." },
    { id: "palace-waves", name: "Son Günün Dalgası", kind: "survival", objective: "Döngünün son savunması bitene kadar dayan." },
    { id: "palace-hunt", name: "Alaz'ın Son İzi", kind: "target-hunt", objective: "Alaz'a ulaşan yolu kapatan son tanığı bul." },
    { id: "palace-siege", name: "Dokuzuncu Kapı", kind: "siege", objective: "Son kapıyı tutan hattı yar." },
    { id: "palace-cache", name: "Mührün Kalbi", kind: "exploration", objective: "Şafak Mührü'nün dokuzuncu hatırasını bul." },
  ],
  miniBossTemplate: { id: "palace-mini-boss", name: "Aynasız Şampiyon", objective: "Alaz'ın son anısını koruyan şampiyonu yen." },
  actBossTemplate: { id: "palace-act-boss", name: "Kül Hükümdarı", objective: "Dokuzuncu hatırayı aç, Alaz'a ulaş ve döngüyü sona erdir." },
};
