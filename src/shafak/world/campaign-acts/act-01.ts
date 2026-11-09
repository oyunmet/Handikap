import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "ash-road",
  name: "Kül Yolu",
  storySummary: "Kül Nöbetçileri yolu tutuyor; mührün izi prensesin geçtiği kervan yolunu gösteriyor.",
  theme: "kül ve yıkılmış kervan yolu",
  enemyFaction: "Kül Nöbetçileri",
  mapVariants: ["kervan-geçidi", "yıkık-köprü", "kül-düzlüğü", "nöbetçi-burcu", "yanık-han"],
  missionTemplates: [
    { id: "ash-clash", name: "Kül Nöbeti", kind: "normal-combat", objective: "Yolun önünü kesen nöbetçileri yen." },
    { id: "ash-waves", name: "Sönen Korlar", kind: "survival", objective: "Saldırı dalgaları bitene kadar dayan." },
    { id: "ash-hunt", name: "Kayıp İz", kind: "target-hunt", objective: "İz sürücüyü bul ve etkisiz hale getir." },
    { id: "ash-siege", name: "Kervan Kuşatması", kind: "siege", objective: "Kuşatma hattını yar." },
    { id: "ash-cache", name: "Kervan Sandığı", kind: "exploration", objective: "Haritadaki hazineyi bul." },
  ],
  miniBossTemplate: { id: "ash-mini-boss", name: "Kül Yargıcı", objective: "Kül Yargıcını yen." },
  actBossTemplate: { id: "ash-act-boss", name: "Batı Kapısı Kumandanı", objective: "Perde boss'unu yen ve mührü al." },
};
