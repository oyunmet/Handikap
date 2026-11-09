import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "lost-city",
  name: "Kayıp Şehir",
  storySummary: "Taş Yeminliler kayıp şehri koruyor; kum altındaki mühür sarayın yolunu gösterecek.",
  theme: "kum altında kalmış taş şehir",
  enemyFaction: "Taş Yeminliler",
  mapVariants: ["kumlu-pazar", "gömülü-avlu", "taş-köprü", "kayıp-arşiv", "güneş-kapısı"],
  missionTemplates: [
    { id: "city-clash", name: "Şehir Devriyesi", kind: "normal-combat", objective: "Kayıp şehrin girişini temizle." },
    { id: "city-waves", name: "Taş Dalga", kind: "survival", objective: "Uyanan muhafız dalgalarına dayan." },
    { id: "city-hunt", name: "Arşiv Hırsızı", kind: "target-hunt", objective: "Mühür kaydını çalanı yakala." },
    { id: "city-siege", name: "Güneş Kapısı", kind: "siege", objective: "Kapıyı tutan savunmayı aş." },
    { id: "city-cache", name: "Kum Altındaki Kayıt", kind: "exploration", objective: "Eski arşivdeki sandığı bul." },
  ],
  miniBossTemplate: { id: "city-mini-boss", name: "Taş Nöbetçi", objective: "Taş Nöbetçiyi yen." },
  actBossTemplate: { id: "city-act-boss", name: "Kayıp Şehir Kumandanı", objective: "Perde boss'unu yen ve mührü al." },
};
