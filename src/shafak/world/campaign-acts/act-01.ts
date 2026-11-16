import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "ash-road",
  name: "Kül Yolu",
  storySummary: "Alaz'ın yarım bıraktığı kervan haritası ilk kıvılcımı Kül Yolu'na götürüyor; Köz Nöbeti kapının ardındaki sırrı biliyor.",
  storyBeats: [
    "Alaz'ın yarım haritası, Şafak Mührü'nün ilk kıvılcımının Batı Kapısı'nda söndüğünü gösteriyor.",
    "Köz Nöbeti yolu kesmiyor; kapıyı içeriden kimin açtığını bulmaya çalışıyor.",
    "Yıkık handaki işaret, kervanın prensesi değil Şafak Mührü'nü taşıdığını ortaya çıkarıyor.",
    "Kül Yargıcı'nın sakladığı defterde Alaz'ın kendi isteğiyle doğuya gittiği yazıyor.",
    "Batı Kapısı'nın son nöbetçisi düşünce ilk kıvılcım kapının ardında değil, senin elinde yanıyor.",
  ],
  theme: "yanık kervan yolları ve kül altında kalan yeminler",
  enemyFaction: "Köz Nöbeti",
  mapVariants: ["kervan-geçidi", "yıkık-köprü", "kül-düzlüğü", "nöbetçi-burcu", "yanık-han"],
  missionTemplates: [
    { id: "ash-clash", name: "Kervanın Son Nöbeti", kind: "normal-combat", objective: "Alaz'ın haritasını taşıyan kervanı kuşatanları yen." },
    { id: "ash-waves", name: "Sönen Ocak", kind: "survival", objective: "Kervan halkı kaçana kadar gelen dalgalara dayan." },
    { id: "ash-hunt", name: "İz Silen", kind: "target-hunt", objective: "Şafak işaretini çalan iz sürücüyü bul." },
    { id: "ash-siege", name: "Batı Kapısı'nda Yarık", kind: "siege", objective: "Kapıdaki kuşatma hattını dağıt." },
    { id: "ash-cache", name: "Yolcunun Emaneti", kind: "exploration", objective: "Alaz'ın sakladığı kervan sandığını bul." },
  ],
  miniBossTemplate: { id: "ash-mini-boss", name: "Kül Yargıcı", objective: "Kervan defterini koruyan Kül Yargıcı'nı yen." },
  actBossTemplate: { id: "ash-act-boss", name: "Batı Kapısı Son Nöbetçisi", objective: "İlk kıvılcımı saklayan nöbetçiyi yen ve geçidi aç." },
};
