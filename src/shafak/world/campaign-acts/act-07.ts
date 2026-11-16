import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "lost-city",
  name: "Kumaltı Arşivleri",
  storySummary: "Kumun altındaki kayıtlar dokuz parçanın dokuz anahtar değil, döngünün dokuz hatırası olduğunu gösteriyor.",
  storyBeats: [
    "Kumaltı arşivinde Alaz'ın adı silinmiş; yerine her döngüde senin adın yazılmış.",
    "Taş Yeminliler kayıtları saklıyor, çünkü her hatırlayışta şehir bir kez daha yıkılıyor.",
    "Arşiv Hırsızı, yedinci kıvılcımın saklı bir anahtarı değil, bir tanığın anısını koruduğunu söylüyor.",
    "Güneş Kapısı'ndaki duvar resmi, Alaz ile Kül Hükümdarı'nı aynı safta gösteriyor.",
    "Kayıp Şehir Kumandanı düşünce yedinci yankı tamamlanıyor: bu yolculuk daha önce de yaşandı.",
  ],
  theme: "kum altında kalmış şehir, taş kayıtlar ve silinmiş isimler",
  enemyFaction: "Taş Kayıtçılar",
  mapVariants: ["kumlu-pazar", "gömülü-avlu", "taş-köprü", "kayıp-arşiv", "güneş-kapısı"],
  missionTemplates: [
    { id: "city-clash", name: "Silinmiş İsimler", kind: "normal-combat", objective: "Alaz'ın kaydını saklayan taş yeminlileri yen." },
    { id: "city-waves", name: "Uyanan Arşiv", kind: "survival", objective: "Kayıt koruyucuları susana kadar dayan." },
    { id: "city-hunt", name: "Arşiv Hırsızı", kind: "target-hunt", objective: "Yedinci kıvılcımın tanığını bul." },
    { id: "city-siege", name: "Güneş Kapısı", kind: "siege", objective: "Duvar resmini koruyan hattı aş." },
    { id: "city-cache", name: "Dokuzuncu Sayfa", kind: "exploration", objective: "Yolculuğun tekrarlandığını kanıtlayan kaydı bul." },
  ],
  miniBossTemplate: { id: "city-mini-boss", name: "Arşiv Nöbetçisi", objective: "Dokuzuncu sayfayı koruyan nöbetçiyi yen." },
  actBossTemplate: { id: "city-act-boss", name: "Taş Kayıtların Sonu", objective: "Yedinci yankıyı tamamla ve tekrarın kaynağına git." },
};
