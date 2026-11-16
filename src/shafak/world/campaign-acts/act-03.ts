import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "red-marsh",
  name: "Kızıl Sazlık",
  storySummary: "Sazlık suyu kayıp yolcuların son gününü geri getiriyor; üçüncü hatıranın izi batık iskeleye uzanıyor.",
  storyBeats: [
    "Sazlıktaki çan her akşam aynı saatte çalıyor; sesi kayıp yolcuların son görüldüğü yere uzanıyor.",
    "Muhafızlar bir sandığı değil, her döngüde yeniden kıyıya vuran yolcu kayıtlarını saklıyor.",
    "Sazlık Celladı, Alaz'ın onu öldürmek yerine tanıkları koruması için serbest bıraktığını anlatıyor.",
    "Batık iskeledeki defter, döngünün her seferinde aynı insanları ve aynı savaşı geri getirdiğini gösteriyor.",
    "Üçüncü hatıra açılıyor: Alaz düşmanlarından değil, tekrarlanan günden kaçıyordu.",
  ],
  theme: "sazlık geçitleri, batık iskele ve su basan yerleşimler",
  enemyFaction: "Kızıl Saz Yemini",
  mapVariants: ["sazlik-koridoru", "batık-köprü", "kızıl-havuz", "çamur-yolu", "eski-iskele"],
  missionTemplates: [
    { id: "marsh-clash", name: "Sazlıkta Yüzleşme", kind: "normal-combat", objective: "Kayıp yolcuların kayıtlarını saklayan muhafızları yen." },
    { id: "marsh-waves", name: "Yükselen Yankı", kind: "survival", objective: "Sular yükselirken iskelede kalan sakinleri koru." },
    { id: "marsh-hunt", name: "Sessiz İz", kind: "target-hunt", objective: "Üçüncü hatıranın tanığını sazlıklarda bul." },
    { id: "marsh-siege", name: "Batık İskele", kind: "siege", objective: "İskeleyi kuşatan hattı yar ve yolcu kayıtlarına ulaş." },
    { id: "marsh-cache", name: "Sazların Altındaki Çan", kind: "exploration", objective: "Batık çanın yanındaki sefer defterini çıkar." },
  ],
  miniBossTemplate: { id: "marsh-mini-boss", name: "Sazlık Celladı", objective: "Yolcuları koruyan Sazlık Celladı'nın neden geri döndüğünü öğren." },
  actBossTemplate: { id: "marsh-act-boss", name: "Güney Kapısı'nın Saz Beyi", objective: "Güney Kapısı'nın savunmasını aş ve üçüncü hatırayı aç." },
};
