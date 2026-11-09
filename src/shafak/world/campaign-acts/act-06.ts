import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "mist-coast",
  name: "Sisli Kıyı",
  storySummary: "Kara Yelkenliler kıyıyı kuşatıyor; batık gemilerde prensesin izine dair bir parça yatıyor.",
  theme: "fırtınalı kıyı ve batık gemiler",
  enemyFaction: "Kara Yelkenliler",
  mapVariants: ["fener-burnu", "batık-güverte", "tuzlu-mağara", "fırtına-iskelesi", "kıyı-burcu"],
  missionTemplates: [
    { id: "coast-clash", name: "Kıyı Çatışması", kind: "normal-combat", objective: "Kıyıyı tutan korsanları yen." },
    { id: "coast-waves", name: "Fırtına Dalgası", kind: "survival", objective: "Fırtına boyunca saldırılara dayan." },
    { id: "coast-hunt", name: "Kaptanın Peşinde", kind: "target-hunt", objective: "Kaçan kaptanı yakala." },
    { id: "coast-siege", name: "Fener Kuşatması", kind: "siege", objective: "Feneri kuşatanları kıyıdan at." },
    { id: "coast-cache", name: "Batık Yük", kind: "exploration", objective: "Gemiden kalan hazineyi ara." },
  ],
  miniBossTemplate: { id: "coast-mini-boss", name: "Fırtına Kaptanı", objective: "Fırtına Kaptanını yen." },
  actBossTemplate: { id: "coast-act-boss", name: "Kara Yelken Kumandanı", objective: "Perde boss'unu yen ve mührü al." },
};
