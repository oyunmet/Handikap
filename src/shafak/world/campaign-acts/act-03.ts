import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "red-marsh",
  name: "Kızıl Bataklık",
  storySummary: "Bataklık Lejyonu sazlıkları koruyor; mühür parçaları prensesin izini ortaya çıkaracak.",
  theme: "kızıl sazlıklar ve zehirli su",
  enemyFaction: "Bataklık Lejyonu",
  mapVariants: ["sazlik-koridoru", "batık-köprü", "kızıl-havuz", "çamur-yolu", "eski-iskele"],
  missionTemplates: [
    { id: "marsh-clash", name: "Sazlık Devriyesi", kind: "normal-combat", objective: "Bataklık yolunu kapatanları yen." },
    { id: "marsh-waves", name: "Yükselen Su", kind: "survival", objective: "Sular yükselirken dalgalara dayan." },
    { id: "marsh-hunt", name: "Zehirli İz", kind: "target-hunt", objective: "İz bırakmadan kaçan hedefi bul." },
    { id: "marsh-siege", name: "İskele Kuşatması", kind: "siege", objective: "İskeleyi tutan savunmayı kır." },
    { id: "marsh-cache", name: "Batık Hazine", kind: "exploration", objective: "Batık sandığı bulup çıkar." },
  ],
  miniBossTemplate: { id: "marsh-mini-boss", name: "Sazlık Celladı", objective: "Sazlık Celladını yen." },
  actBossTemplate: { id: "marsh-act-boss", name: "Güney Kapısı Kumandanı", objective: "Perde boss'unu yen ve mührü al." },
};
