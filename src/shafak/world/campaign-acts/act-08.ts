import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "black-summit",
  name: "Yarık Zirvesi",
  storySummary: "Zirvede aynı kuşatma kuruluyor; sekizinci hatıra Kül Hükümdarı'nın savaşı neden sürdürdüğünü açığa çıkarıyor.",
  storyBeats: [
    "Zirve yolundaki nöbetçiler aynı kuşatmayı yeniden kuruyor; yarık her şafakta büyüyor.",
    "Yarık Sancaklıları Alaz'ı değil, mührün kalan parçalarını yok ederek döngüyü durdurmak istiyor.",
    "Yarık Celladı her yenilgisinden sonra geri döndüğünü ve artık bundan korktuğunu itiraf ediyor.",
    "Rüzgâr Burcu'ndaki kayıt, hükümdarın kaybettiği günü korumak için zamanı hapsettiğini doğruluyor.",
    "Sekizinci hatıra açılıyor: Alaz, döngüyü bitirmek için saraya son kez girmişti.",
  ],
  theme: "dağ zirvesi, sınır burcu ve yeniden kurulan kuşatma",
  enemyFaction: "Yarık Sancaklıları",
  mapVariants: ["kara-sırt", "uçurum-geçidi", "rüzgar-burcu", "yarık-kenarı", "zirve-merdiveni"],
  missionTemplates: [
    { id: "summit-clash", name: "Yarığın Nöbeti", kind: "normal-combat", objective: "Sınır burcunu kapatan sancaklıları yen." },
    { id: "summit-waves", name: "Tekrarın Dalgaları", kind: "survival", objective: "Kuşatma hattı çözülene kadar mevziyi koru." },
    { id: "summit-hunt", name: "Külün Tanığı", kind: "target-hunt", objective: "Hükümdarın eski yemininin tanığını bul." },
    { id: "summit-siege", name: "Rüzgâr Burcu", kind: "siege", objective: "Saraya giden yolu kapatan kuşatma hattını dağıt." },
    { id: "summit-cache", name: "Son Kayıt", kind: "exploration", objective: "Alaz'ın saraya bıraktığı son kaydı bul." },
  ],
  miniBossTemplate: { id: "summit-mini-boss", name: "Yarık Celladı", objective: "Her döngüde geri dönen cellatla yüzleş ve yukarı çık." },
  actBossTemplate: { id: "summit-act-boss", name: "Yarığın Son Sancaktarı", objective: "Sekizinci hatırayı aç ve Aynasız Saray'a ulaş." },
};
