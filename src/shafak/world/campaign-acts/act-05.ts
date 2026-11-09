import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "broken-throne",
  name: "Çürük Taht",
  storySummary: "Tahtın Muhafızları kraliyet merkezini savunuyor; mühür parçaları ihanetin izini aydınlatacak.",
  theme: "ihanetle parçalanmış kraliyet merkezi",
  enemyFaction: "Tahtın Muhafızları",
  mapVariants: ["taht-avlusu", "yıkık-kışla", "gizli-merdiven", "ihanet-salonu", "kırık-bahçe"],
  missionTemplates: [
    { id: "throne-clash", name: "Taht Devriyesi", kind: "normal-combat", objective: "Eski saray muhafızlarını yen." },
    { id: "throne-waves", name: "Tahtın Dalgası", kind: "survival", objective: "Saraydan çıkan dalgaları durdur." },
    { id: "throne-hunt", name: "Hainin İzi", kind: "target-hunt", objective: "Kapıyı içeriden açan haini bul." },
    { id: "throne-siege", name: "Saray Kuşatması", kind: "siege", objective: "Taht avlusundaki savunmayı kır." },
    { id: "throne-cache", name: "Kraliyet Emaneti", kind: "exploration", objective: "Gizlenmiş kraliyet emanetini bul." },
  ],
  miniBossTemplate: { id: "throne-mini-boss", name: "Yemin Bozan", objective: "Yemin Bozan'ı yen." },
  actBossTemplate: { id: "throne-act-boss", name: "Taht Kumandanı", objective: "Perde boss'unu yen ve mührü al." },
};
