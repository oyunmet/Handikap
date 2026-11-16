import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "broken-throne",
  name: "Kırık Taht",
  storySummary: "Beşinci kıvılcım sarayın boş tahtında yanıyor; krallığın çöküşü bir ihanet değil, aynı günün tekrarından doğmuş.",
  storyBeats: [
    "Taht avlusunda kralın adı yok; her mühür yankısı aynı sabaha geri dönüyor.",
    "Taht Muhafızları Alaz'ı hain sanıyor, çünkü her döngüde onun ayrılışını yeniden yaşıyorlar.",
    "Yemin Bozan, Kül Hükümdarı'nın savaşı bitirmek için zamanı dondurduğunu açıklıyor.",
    "Gizli merdivenlerde bulunan kayıt, Şafak Mührü'nün bu döngüyü beslediğini kanıtlıyor.",
    "Taht Kumandanı yenilince beşinci kıvılcım, Alaz'ın mührü neden kırdığını gösteriyor.",
  ],
  theme: "boş taht, döngüye sıkışmış saray ve kırık yeminler",
  enemyFaction: "Tahtın Son Yemini",
  mapVariants: ["taht-avlusu", "yıkık-kışla", "gizli-merdiven", "ihanet-salonu", "kırık-bahçe"],
  missionTemplates: [
    { id: "throne-clash", name: "Boş Tahtın Nöbeti", kind: "normal-combat", objective: "Her döngüde aynı savaşı tekrarlayan muhafızları yen." },
    { id: "throne-waves", name: "Tekrarlanan Gün", kind: "survival", objective: "Döngü dalgaları kırılana kadar ayakta kal." },
    { id: "throne-hunt", name: "İçeriden Açılan Kapı", kind: "target-hunt", objective: "Döngüyü başlatan mührü taşıyan kişiyi bul." },
    { id: "throne-siege", name: "Taht Avlusu", kind: "siege", objective: "Avludaki son savunma hattını yar." },
    { id: "throne-cache", name: "Kralın İsimsiz Emaneti", kind: "exploration", objective: "Boş tahtın ardında saklanan kaydı bul." },
  ],
  miniBossTemplate: { id: "throne-mini-boss", name: "Yemin Bozan", objective: "Döngüyü ayakta tutan Yemin Bozan'ı yen." },
  actBossTemplate: { id: "throne-act-boss", name: "Tahtın Son Yemini", objective: "Beşinci yankıyı al ve sarayın gerçeğini duy." },
};
