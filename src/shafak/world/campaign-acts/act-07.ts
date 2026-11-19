import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "lost-city",
  name: "Kumaltı İstasyonu",
  storySummary: "Yeraltı istasyonundaki yedinci dosya, Taç Birliği'nin haberleşme ağını ve Alaz'ın gerçek görevini ortaya çıkarır.",
  storyBeats: [
    "Kum altındaki eski ulaşım tünelleri, başkent ile dağ üssü arasında gizli bir aktarım hattı kurar.",
    "Taş Kayıtçılar kod adlı bakım ekibi, merkez sunucunun yedek kayıtlarını saklamıştır.",
    "Arşiv Hırsızı, yedinci dosyanın sadece görev emirlerini değil, komuta zincirini de içerdiğini söyler.",
    "Güneş Kapısı'ndaki sunucu odası, Alaz'ın tahliye ağına yetkisiz erişim sağlamadığını kanıtlar.",
    "Yedinci dosya açılır: Alaz, sivil ağı kapatmak için değil, Taç Birliği'nin kullanımını durdurmak için ayrılmıştır.",
  ],
  theme: "kumla kaplanmış metro tüneli, yeraltı aktarma merkezi ve sunucu odaları",
  enemyFaction: "Taç Birliği İletişim Birimi",
  mapVariants: ["kumlu-pazar", "gömülü-avlu", "taş-köprü", "kayıp-arşiv", "güneş-kapısı"],
  missionTemplates: [
    { id: "city-clash", name: "Aktarma Merkezi", kind: "normal-combat", objective: "Yeraltı haberleşme merkezini tutan ekibi dağıt." },
    { id: "city-waves", name: "Tünel Savunması", kind: "survival", objective: "İstihbarat ekibi kayıtları indirene kadar tüneli koru." },
    { id: "city-hunt", name: "Arşiv Hırsızı", kind: "target-hunt", objective: "Yedinci dosyayı taşıyan saha ajanını bul." },
    { id: "city-siege", name: "Sunucu Odası", kind: "siege", objective: "Sunucu katını ele geçirip iletişim hattını kes." },
    { id: "city-cache", name: "Yedinci Dosya", kind: "exploration", objective: "Merkez sunucudaki görev emirlerini indir." },
  ],
  miniBossTemplate: { id: "city-mini-boss", name: "Arşiv Nöbetçisi", objective: "Görev kayıtlarını saklayan iletişim subayını etkisiz hâle getir." },
  actBossTemplate: { id: "city-act-boss", name: "İletişim Birimi Komutanı", objective: "Sunucu odasını güvene al ve yedinci dosyayı indir." },
};
