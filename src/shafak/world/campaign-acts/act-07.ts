import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "lost-city",
  name: "Kumaltı Arşivleri",
  storySummary: "Arşiv kayıtları, dokuz parçanın döngüde kaybolan insanların hatıraları olduğunu kanıtlıyor.",
  storyBeats: [
    "Arşivde Alaz'ın adı silinmiş; her döngüde senin adın aynı sayfaya eklenmiş.",
    "Taş Kayıtçılar belgeleri saklıyor, çünkü şehrin yıkılışını hatırlamak paniği yeniden başlatıyor.",
    "Arşiv Hırsızı, yedinci hatıranın bir anahtar değil, döngüyü gören bir sakine ait olduğunu söylüyor.",
    "Güneş Kapısı'ndaki duvar resmi, Alaz ile hükümdarın bir zamanlar yan yana savaştığını gösteriyor.",
    "Yedinci hatıra açılıyor: bu yolculuk daha önce yaşandı ve her seferinde şehir unutmaya zorlandı.",
  ],
  theme: "kum altında kalmış şehir, eski pazar sokakları ve taş arşivler",
  enemyFaction: "Taş Kayıtçılar",
  mapVariants: ["kumlu-pazar", "gömülü-avlu", "taş-köprü", "kayıp-arşiv", "güneş-kapısı"],
  missionTemplates: [
    { id: "city-clash", name: "Silinmiş İsimler", kind: "normal-combat", objective: "Alaz'ın adını arşivden silen Taş Kayıtçılar'la yüzleş." },
    { id: "city-waves", name: "Uyanan Arşiv", kind: "survival", objective: "Kayıt koruyucuları susana kadar dayan." },
    { id: "city-hunt", name: "Arşiv Hırsızı", kind: "target-hunt", objective: "Yedinci hatırayı gören sakini bul." },
    { id: "city-siege", name: "Güneş Kapısı", kind: "siege", objective: "Duvar resmini koruyan savunma hattını aş." },
    { id: "city-cache", name: "Dokuzuncu Sayfa", kind: "exploration", objective: "Yolculuğun tekrarlandığını kanıtlayan kaydı bul." },
  ],
  miniBossTemplate: { id: "city-mini-boss", name: "Arşiv Nöbetçisi", objective: "Dokuzuncu sayfayı saklayan arşiv nöbetçisiyle yüzleş." },
  actBossTemplate: { id: "city-act-boss", name: "Taş Kayıtların Sonu", objective: "Yedinci hatırayı aç ve tekrarın kaynağına ulaş." },
};
