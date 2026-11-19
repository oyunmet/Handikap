import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "broken-throne",
  name: "Başkent Çemberi",
  storySummary: "Başkent çevresindeki tahliye kayıtları, Demir Taç'ın yardım ağını askeri denetime aldığını ve savaşı uzattığını gösterir.",
  storyBeats: [
    "Başkent çevresindeki kontrol noktaları, sivillerin çıkışını değil askeri sevkiyatı önceliklendiriyor.",
    "Taç Birliği askerleri, Alaz'ın komuta merkezinden emir çaldığına inanıyor.",
    "Yemin Bozan kod adlı kurmay, tahliye ağına sahte koordinatların yüklendiğini itiraf eder.",
    "Yeraltı komuta odasındaki kayıt, sivil yardım sinyallerinin hedef tespitinde kullanıldığını kanıtlar.",
    "Beşinci dosya açılır: Alaz, sistemi durdurmak için merkezden ayrılmıştır.",
  ],
  theme: "başkent çevre yolu, beton komuta sığınağı ve boşaltılmış idari bloklar",
  enemyFaction: "Taç Birliği Merkez Muhafızları",
  mapVariants: ["taht-avlusu", "yıkık-kışla", "gizli-merdiven", "ihanet-salonu", "kırık-bahçe"],
  missionTemplates: [
    { id: "throne-clash", name: "Çevre Yolu", kind: "normal-combat", objective: "Tahliye rampasını tutan Merkez Muhafızları'nı dağıt." },
    { id: "throne-waves", name: "Sığınak Hattı", kind: "survival", objective: "Siviller yeraltı sığınağına ulaşana kadar girişi koru." },
    { id: "throne-hunt", name: "Kurmayın İzinde", kind: "target-hunt", objective: "Sahte koordinatları yükleyen kurmayı bul." },
    { id: "throne-siege", name: "Komuta Sığınağı", kind: "siege", objective: "Merkez sığınağın dış savunmasını aş." },
    { id: "throne-cache", name: "Beşinci Dosya", kind: "exploration", objective: "Yeraltı komuta odasındaki aktarım kaydını indir." },
  ],
  miniBossTemplate: { id: "throne-mini-boss", name: "Yemin Bozan", objective: "Sahte koordinatları sisteme yükleyen kurmayı durdur." },
  actBossTemplate: { id: "throne-act-boss", name: "Merkez Muhafızları Lideri", objective: "Komuta sığınağını ele geçir ve beşinci dosyayı güvene al." },
};
