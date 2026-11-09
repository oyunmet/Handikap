import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "whispering-forest",
  name: "Fısıltı Ormanı",
  theme: "sisli orman ve unutulmuş patikalar",
  enemyFaction: "Kök Muhafızları",
  mapVariants: ["kök-tüneli", "sis-patikası", "yıkık-kulübe", "ay-taşı-korusu", "orman-kapısı"],
  missionTemplates: [
    { id: "forest-clash", name: "Kök Devriyesi", kind: "normal-combat", objective: "Orman geçidindeki muhafızları yen." },
    { id: "forest-waves", name: "Fısıltı Dalgası", kind: "survival", objective: "Ormanın çağırdığı dalgaları atlat." },
    { id: "forest-hunt", name: "Sessiz Av", kind: "target-hunt", objective: "Sis içindeki iz sürücüyü yakala." },
    { id: "forest-siege", name: "Koru Kuşatması", kind: "siege", objective: "Koruya kurulan kuşatmayı dağıt." },
    { id: "forest-cache", name: "Kök Altındaki Sandık", kind: "exploration", objective: "Köklerin sakladığı hazineyi bul." },
  ],
  miniBossTemplate: { id: "forest-mini-boss", name: "Kök Bekçisi", objective: "Kök Bekçisini yen." },
  actBossTemplate: { id: "forest-act-boss", name: "Orman Kumandanı", objective: "Perde boss'unu yen ve mührü al." },
};
