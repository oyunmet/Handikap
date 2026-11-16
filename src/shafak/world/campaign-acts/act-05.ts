import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "broken-throne",
  name: "Kırık Taht",
  storySummary: "Saray muhafızları aynı savaşı yineliyor; beşinci hatıra krallığın çöküşünü döngüye bağlıyor.",
  storyBeats: [
    "Boş taht salonu her sabah aynı toplantıyı kuruyor; saray halkı günün ilerlediğini hatırlamıyor.",
    "Taht Muhafızları Alaz'ı hain sanıyor, çünkü onun ayrılışını her döngüde yeniden görüyorlar.",
    "Yemin Bozan, hükümdarın kaybettiği günü korumak için zamanı durdurduğunu itiraf ediyor.",
    "Gizli merdivenlerdeki kayıt, Şafak Mührü'nün döngüyü beslediğini ve çıkışı engellediğini kanıtlıyor.",
    "Beşinci hatıra açılıyor: Alaz mührü kırdı, çünkü sonsuz bir sabah artık kimseyi korumuyordu.",
  ],
  theme: "saray yerleşkesi, boş taht salonu ve döngüde kalan muhafızlar",
  enemyFaction: "Tahtın Son Yemini",
  mapVariants: ["taht-avlusu", "yıkık-kışla", "gizli-merdiven", "ihanet-salonu", "kırık-bahçe"],
  missionTemplates: [
    { id: "throne-clash", name: "Boş Tahtın Nöbeti", kind: "normal-combat", objective: "Aynı sabahı tekrar eden saray muhafızlarını durdur." },
    { id: "throne-waves", name: "Tekrarlanan Gün", kind: "survival", objective: "Saray halkı güvenli bölgeye ulaşana kadar avluyu koru." },
    { id: "throne-hunt", name: "İçeriden Açılan Kapı", kind: "target-hunt", objective: "Döngüyü başlatan kararı bilen saray görevlisini bul." },
    { id: "throne-siege", name: "Taht Avlusu", kind: "siege", objective: "Taht avlusundaki savunma hattını yar." },
    { id: "throne-cache", name: "Kralın İsimsiz Emaneti", kind: "exploration", objective: "Hükümdarın kaybettiği günü anlatan kaydı bul." },
  ],
  miniBossTemplate: { id: "throne-mini-boss", name: "Yemin Bozan", objective: "Hükümdarın kararını savunan Yemin Bozan'la yüzleş." },
  actBossTemplate: { id: "throne-act-boss", name: "Tahtın Son Yemini", objective: "Sarayın gerçeğini öğren ve beşinci hatırayı aç." },
};
