import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "red-marsh",
  name: "Kızıl Sazlık",
  storySummary: "Kızıl su, mühür parçalarının anılarını birbirine karıştırıyor; sazlıkların ortasında Alaz'ın susturduğu üçüncü yankı var.",
  storyBeats: [
    "Sazlıkta duyulan ses Alaz'a ait; ancak seni bir tuzağa değil, batık bir çana çağırıyor.",
    "Zehirli izleri takip et: bataklık muhafızları üçüncü kıvılcımı saklayan kişiyi koruyor.",
    "Sazlık Celladı, Alaz'ın onu öldürmediğini ve bir söz karşılığında serbest bıraktığını söylüyor.",
    "Batık iskelede bulunan kayıt, her kıvılcımın bir savaş anısını mühürlediğini açığa çıkarıyor.",
    "Güney Kapısı Kumandanı düşünce üçüncü yankı beliriyor: Alaz düşmanlarından değil, tekrarlanan zamandan kaçıyor.",
  ],
  theme: "kızıl sazlıklar, batık yollar ve yankılanan yeminler",
  enemyFaction: "Kızıl Saz Yemini",
  mapVariants: ["sazlik-koridoru", "batık-köprü", "kızıl-havuz", "çamur-yolu", "eski-iskele"],
  missionTemplates: [
    { id: "marsh-clash", name: "Sazlıkta Yüzleşme", kind: "normal-combat", objective: "Üçüncü yankıya giden yolu kapatan muhafızları yen." },
    { id: "marsh-waves", name: "Yükselen Yankı", kind: "survival", objective: "Sular yükselirken anı dalgalarına dayan." },
    { id: "marsh-hunt", name: "Sessiz İz", kind: "target-hunt", objective: "Üçüncü kıvılcımın yerini bilen hedefi yakala." },
    { id: "marsh-siege", name: "Batık İskele", kind: "siege", objective: "İskeleyi tutan savunmayı yar ve çana ulaş." },
    { id: "marsh-cache", name: "Sazların Altındaki Çan", kind: "exploration", objective: "Batık çanı bul ve yankıyı uyandır." },
  ],
  miniBossTemplate: { id: "marsh-mini-boss", name: "Sazlık Celladı", objective: "Üçüncü kıvılcımın sırrını saklayan Cellat'ı yen." },
  actBossTemplate: { id: "marsh-act-boss", name: "Güney Kapısı'nın Saz Beyi", objective: "Sazlığın yeminini çöz ve üçüncü yankıyı kurtar." },
};
