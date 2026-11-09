import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "shadow-palace",
  name: "Gölge Sarayı",
  theme: "karanlığın hüküm sürdüğü son saray",
  enemyFaction: "Gölge Muhafızları",
  mapVariants: ["ayna-avlusu", "kara-galeri", "mühür-salonu", "son-koridor", "prenses-kulesi"],
  missionTemplates: [
    { id: "palace-clash", name: "Saray Çatışması", kind: "normal-combat", objective: "Son sarayın muhafızlarını yen." },
    { id: "palace-waves", name: "Gölge Dalgası", kind: "survival", objective: "Sarayın son savunma dalgalarına dayan." },
    { id: "palace-hunt", name: "Son İz", kind: "target-hunt", objective: "Prensesin yolunu kapatan hedefi bul." },
    { id: "palace-siege", name: "Son Kapı", kind: "siege", objective: "Son kapıyı koruyan hattı yar." },
    { id: "palace-cache", name: "Mühür Odası", kind: "exploration", objective: "Son mühür odasındaki hazineyi ara." },
  ],
  miniBossTemplate: { id: "palace-mini-boss", name: "Gölge Şampiyonu", objective: "Gölge Şampiyonunu yen." },
  actBossTemplate: { id: "palace-act-boss", name: "Karanlık Hükümdar", objective: "Son perde boss'unu yen ve prensesi bul." },
};
