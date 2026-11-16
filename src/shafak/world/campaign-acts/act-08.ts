import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "black-summit",
  name: "Yarık Zirvesi",
  storySummary: "Zaman yarığının tepesinde sekizinci yankı bekliyor; Kül Hükümdarı'nın savaşı neden sürdürdüğü artık saklanamıyor.",
  storyBeats: [
    "Zirveye çıkan her basamak aynı darbeyi yeniden yaşatıyor; yarık, döngünün nabzı gibi atıyor.",
    "Zirve Sancaklıları Alaz'ı kurtarmak değil, mührü tamamen parçalamak için bekliyor.",
    "Yarık Celladı, her zaferinde yeniden dirildiğini ve bundan korktuğunu itiraf ediyor.",
    "Rüzgâr Burcu'ndaki son kayıt, Kül Hükümdarı'nın düzeni korumak için zamanı hapsettiğini gösteriyor.",
    "Zirve Kumandanı yenilince yarık açılıyor; sekizinci yankı Alaz'ın son kez saraya girdiğini duyuruyor.",
  ],
  theme: "kara taşlı zirve, zaman yarığı ve kırılmak üzere olan döngü",
  enemyFaction: "Yarık Sancaklıları",
  mapVariants: ["kara-sırt", "uçurum-geçidi", "rüzgar-burcu", "yarık-kenarı", "zirve-merdiveni"],
  missionTemplates: [
    { id: "summit-clash", name: "Yarığın Nöbeti", kind: "normal-combat", objective: "Zaman yarığını kapatan sancaklıları yen." },
    { id: "summit-waves", name: "Tekrarın Dalgaları", kind: "survival", objective: "Yarık kapanana kadar aynı saldırılara diren." },
    { id: "summit-hunt", name: "Külün Tanığı", kind: "target-hunt", objective: "Hükümdarın eski yeminini bilen hedefi bul." },
    { id: "summit-siege", name: "Rüzgâr Burcu", kind: "siege", objective: "Sekizinci kıvılcımın önündeki kuşatmayı dağıt." },
    { id: "summit-cache", name: "Son Kayıt", kind: "exploration", objective: "Alaz'ın saraya bıraktığı son işareti çıkar." },
  ],
  miniBossTemplate: { id: "summit-mini-boss", name: "Yarık Celladı", objective: "Tekrarı besleyen celladı yen ve yukarı çık." },
  actBossTemplate: { id: "summit-act-boss", name: "Yarığın Son Sancaktarı", objective: "Sekizinci yankıyı kurtar ve Aynasız Saray'a ulaş." },
};
