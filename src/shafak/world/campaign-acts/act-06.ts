import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "mist-coast",
  name: "Dilsiz Kıyı",
  storySummary: "Kıyı fenerleri aynı sırayla sönüp yanıyor; altıncı hatıra Alaz'ın kaçış rotasını gösteriyor.",
  storyBeats: [
    "Fener, her gece aynı üç sinyali veriyor; Alaz'ın bıraktığı rota kıyıdan başlıyor.",
    "Kara Yelkenliler mektubu sakladı, çünkü çizilen deniz yolu her döngüde yer değiştiriyor.",
    "Fırtına Kaptanı, Alaz'ı saraya götürmek yerine kıyıdan güvenle çıkarmaya çalıştığını anlatıyor.",
    "Batık güvertedeki günlük, hükümdarın her şafakta savaşı yeniden başlattığını doğruluyor.",
    "Altıncı hatıra açılıyor: fener zinciri saraya ulaşan gizli deniz yolunu gösteriyor.",
  ],
  theme: "fırtınalı liman, fener istasyonları ve batık gemi kayıtları",
  enemyFaction: "Kör Fener Kardeşliği",
  mapVariants: ["fener-burnu", "batık-güverte", "tuzlu-mağara", "fırtına-iskelesi", "kıyı-burcu"],
  missionTemplates: [
    { id: "coast-clash", name: "Fenerin Üç Sinyali", kind: "normal-combat", objective: "Alaz'ın yardım işaretini susturmak isteyenleri durdur." },
    { id: "coast-waves", name: "Kara Fırtına", kind: "survival", objective: "Fener görevlileri güvenli yere ulaşana kadar kıyı hattını koru." },
    { id: "coast-hunt", name: "Kayıp Kaptan", kind: "target-hunt", objective: "Gizli deniz rotasını bilen kaptanı bul." },
    { id: "coast-siege", name: "Dilsiz Fener", kind: "siege", objective: "Fener istasyonunu kuşatan hattı yar ve sinyali tamamla." },
    { id: "coast-cache", name: "Batık Günlük", kind: "exploration", objective: "Altıncı hatıranın rotasını gösteren seyir defterini çıkar." },
  ],
  miniBossTemplate: { id: "coast-mini-boss", name: "Fırtına Kaptanı", objective: "Alaz'ın kıyıdaki son tanığı olan kaptanla yüzleş." },
  actBossTemplate: { id: "coast-act-boss", name: "Kör Fener'in Kumandanı", objective: "Fener kumandanını yen ve saraya giden rotayı aç." },
};
