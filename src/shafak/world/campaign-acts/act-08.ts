import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "black-summit",
  name: "Kara Zirve",
  theme: "kara taşlı yüksek dağ ve gök yarığı",
  enemyFaction: "Zirve Lejyonu",
  mapVariants: ["kara-sırt", "uçurum-geçidi", "rüzgar-burcu", "yarık-kenarı", "zirve-merdiveni"],
  missionTemplates: [
    { id: "summit-clash", name: "Zirve Çatışması", kind: "normal-combat", objective: "Zirve yolundaki lejyonu yen." },
    { id: "summit-waves", name: "Yukarıdan Gelenler", kind: "survival", objective: "Yüksek geçitteki dalgalara dayan." },
    { id: "summit-hunt", name: "Yarık Avı", kind: "target-hunt", objective: "Yarığın izini taşıyan hedefi bul." },
    { id: "summit-siege", name: "Rüzgâr Burcu", kind: "siege", objective: "Burçtaki kuşatma düzenini boz." },
    { id: "summit-cache", name: "Zirve Emaneti", kind: "exploration", objective: "Uçurum kenarındaki emaneti ara." },
  ],
  miniBossTemplate: { id: "summit-mini-boss", name: "Yarık Celladı", objective: "Yarık Celladını yen." },
  actBossTemplate: { id: "summit-act-boss", name: "Zirve Kumandanı", objective: "Perde boss'unu yen ve mührü al." },
};
