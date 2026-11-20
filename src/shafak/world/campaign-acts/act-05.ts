import { CAMPAIGN_OPERATIONS } from "../../../data/story.ts";
import type { CampaignActData } from "../campaign-level-data.ts";

const operation = CAMPAIGN_OPERATIONS[4];

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: operation.id,
  name: operation.name,
  storySummary: operation.storySummary,
  storyBeats: operation.storyBeats,
  theme: "başkent çevresi, beton komuta sığınağı ve boşaltılmış idari bloklar",
  enemyFaction: "Taç Birliği Merkez Muhafızları",
  mapVariants: ["taht-avlusu", "yıkık-kışla", "gizli-merdiven", "ihanet-salonu", "kırık-bahçe"],
  missionTemplates: [
    { id: "throne-clash", name: "Tahliye Çemberi", kind: "normal-combat", objective: "Tahliye rampasını tutan Merkez Muhafızları'nı dağıt." },
    { id: "throne-waves", name: "Sığınak Hattı", kind: "survival", objective: "Siviller yeraltı sığınağına ulaşana kadar girişi koru." },
    { id: "throne-hunt", name: "Kurmayın İzinde", kind: "target-hunt", objective: "Sahte koordinatları yükleyen kurmayı bul." },
    { id: "throne-siege", name: "Komuta Sığınağı", kind: "siege", objective: "Merkez sığınağın dış savunmasını aş." },
    { id: "throne-cache", name: "Beşinci Dosya", kind: "exploration", objective: "Yeraltı komuta odasındaki aktarım kaydını indir." },
  ],
  miniBossTemplate: { id: "throne-mini-boss", name: "Merkez Kurmayı", objective: "Sahte koordinatları sisteme yükleyen kurmayı durdur." },
  actBossTemplate: { id: "throne-act-boss", name: "Merkez Muhafızları Lideri", objective: "Komuta sığınağını ele geçir ve beşinci dosyayı güvene al." },
};
