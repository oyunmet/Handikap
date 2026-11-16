import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "mist-coast",
  name: "Dilsiz Kıyı",
  storySummary: "Fenerler konuşmadan yanıp sönüyor; altıncı kıvılcım Alaz'ın döngüyü kırmak için kurduğu gizli işareti saklıyor.",
  storyBeats: [
    "Dilsiz Kıyı'nın feneri her gece aynı üç kez yanıyor; Alaz'ın işareti bu.",
    "Kara Yelkenliler mektubu denize atmadı, çünkü içindeki rota her döngüde değişiyor.",
    "Fırtına Kaptanı, Alaz'ı saraya götürmek yerine kıyıdan kaçırmaya çalıştığını söylüyor.",
    "Batık güvertedeki günlük, Kül Hükümdarı'nın her sabah savaşı yeniden başlattığını doğruluyor.",
    "Kara Yelken Kumandanı yenilince altıncı kıvılcım, saraya giden gizli deniz yolunu açıyor.",
  ],
  theme: "fırtınalı kıyı, suskun fenerler ve batık günlükler",
  enemyFaction: "Kör Fener Kardeşliği",
  mapVariants: ["fener-burnu", "batık-güverte", "tuzlu-mağara", "fırtına-iskelesi", "kıyı-burcu"],
  missionTemplates: [
    { id: "coast-clash", name: "Fenerin Üç Sinyali", kind: "normal-combat", objective: "Alaz'ın işaretini susturmak isteyenleri yen." },
    { id: "coast-waves", name: "Kara Fırtına", kind: "survival", objective: "Fener yanana kadar kıyı dalgalarına dayan." },
    { id: "coast-hunt", name: "Kayıp Kaptan", kind: "target-hunt", objective: "Gizli deniz rotasını bilen kaptanı bul." },
    { id: "coast-siege", name: "Dilsiz Fener", kind: "siege", objective: "Feneri kuşatan hattı kır ve sinyali tamamla." },
    { id: "coast-cache", name: "Batık Günlük", kind: "exploration", objective: "Altıncı kıvılcımın yanındaki seyir defterini çıkar." },
  ],
  miniBossTemplate: { id: "coast-mini-boss", name: "Fırtına Kaptanı", objective: "Alaz'ın kıyıdaki son tanığı olan kaptanı yen." },
  actBossTemplate: { id: "coast-act-boss", name: "Kör Fener'in Kumandanı", objective: "Altıncı yankıyı al ve saraya giden rotayı çöz." },
};
