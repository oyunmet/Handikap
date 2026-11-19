import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "black-summit",
  name: "Yarık Dağ Üssü",
  storySummary: "Dağ üssündeki sekizinci dosya, Demir Taç'ın çatışmayı sürdürmek için tahliye sistemini nasıl kullandığını kanıtlar.",
  storyBeats: [
    "Dağ üssündeki radar, sivil tahliye çağrılarını askeri hedef işaretlerine dönüştürmüştür.",
    "Yarık Sancaklıları kod adlı birlik, bu aktarımı durdurmak için kendi komuta merkezinden ayrılmıştır.",
    "Yarık Celladı, Demir Taç'ın emrine karşı çıktığı için üsse kapatıldığını anlatır.",
    "Rüzgâr Burcu'ndaki ses kaydı, operasyon emrinin doğrudan merkez komutadan geldiğini doğrular.",
    "Sekizinci dosya açılır: ağı kapatacak ana anahtar, Son Komuta Merkezi'ndedir.",
  ],
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
  miniBossTemplate: { id: "summit-mini-boss", name: "Yarık Celladı", objective: "Anten sahasını tutan Taç Birliği komutanını durdur." },
  actBossTemplate: { id: "summit-act-boss", name: "Dağ Taburu Komutanı", objective: "Radar üssünü ele geçir ve son komutanın koordinatlarını al." },
};
