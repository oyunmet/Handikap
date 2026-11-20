import { CAMPAIGN_OPERATIONS } from "../../../data/story.ts";
import type { CampaignActData } from "../campaign-level-data.ts";

const operation = CAMPAIGN_OPERATIONS[7];

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: operation.id,
  name: operation.name,
  storySummary: operation.storySummary,
  storyBeats: operation.storyBeats,
  theme: "yüksek irtifa radar üssü, anten sahası ve kayalık askeri mevziler",
  enemyFaction: "Taç Birliği Dağ Taburu",
  mapVariants: ["kara-sırt", "uçurum-geçidi", "rüzgar-burcu", "yarık-kenarı", "zirve-merdiveni"],
  missionTemplates: [
    { id: "summit-clash", name: "Anten Sahası", kind: "normal-combat", objective: "Radarı koruyan Taç Birliği ekibini etkisiz hâle getir." },
    { id: "summit-waves", name: "Üs Savunması", kind: "survival", objective: "Kuzgun Timi anahtarı bulana kadar radar üssünü tut." },
    { id: "summit-hunt", name: "Emir Zinciri", kind: "target-hunt", objective: "Merkez komutadan gelen emri taşıyan subayı bul." },
    { id: "summit-siege", name: "Rüzgâr Burcu", kind: "siege", objective: "Anten kontrol binasını ele geçir ve aktarımı durdur." },
    { id: "summit-cache", name: "Sekizinci Dosya", kind: "exploration", objective: "Radar kontrol odasındaki anahtarın koordinatlarını çıkar." },
  ],
  miniBossTemplate: { id: "summit-mini-boss", name: "Radar Üs Komutanı", objective: "Anten sahasını tutan Taç Birliği komutanını durdur." },
  actBossTemplate: { id: "summit-act-boss", name: "Dağ Taburu Komutanı", objective: "Radar üssünü ele geçir ve son komutanın koordinatlarını al." },
};
