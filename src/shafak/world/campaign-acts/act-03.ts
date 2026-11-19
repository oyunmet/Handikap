import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "red-marsh",
  name: "Kızıl Liman",
  storySummary: "Liman manifestoları, kayıp konvoyun Taç Birliği'ne değil sivil tahliye ağına ait olduğunu ortaya çıkarır.",
  storyBeats: [
    "Liman güvenlik kamerası, gece yarısı mühürsüz bir askeri sevkiyatı yakalar.",
    "Kayıp yük listesi, Alaz'ın ekibinin limandan bir haberleşme kasası çıkardığını gösterir.",
    "Sazlık Celladı lakaplı liman komutanı, sevkiyatın Taç Birliği'ne ait olmadığını itiraf eder.",
    "Batık yük iskelesindeki kayıtlar, kasanın merkez komuta ağına bağlandığını doğrular.",
    "Üçüncü istihbarat dosyası açılır: Alaz, ağın sivil tahliye sistemini de kullandığını fark etmiştir.",
  ],
  theme: "konteyner sahası, yük iskelesi ve sisli kıyı depoları",
  enemyFaction: "Taç Birliği Liman Taburu",
  mapVariants: ["sazlik-koridoru", "batık-köprü", "kızıl-havuz", "çamur-yolu", "eski-iskele"],
  missionTemplates: [
    { id: "marsh-clash", name: "Rıhtım Teması", kind: "normal-combat", objective: "Yük iskelesini kontrol eden Taç Birliği ekibini geri püskürt." },
    { id: "marsh-waves", name: "Depo Savunması", kind: "survival", objective: "Liman çalışanları güvenli bölgeye geçene kadar depoyu tut." },
    { id: "marsh-hunt", name: "Kayıp Manifesto", kind: "target-hunt", objective: "Sevkiyat listesini taşıyan liman görevlisini bul." },
    { id: "marsh-siege", name: "Konteyner Hattı", kind: "siege", objective: "Konteyner sahasındaki kontrol noktasını geri al." },
    { id: "marsh-cache", name: "Üçüncü Dosya", kind: "exploration", objective: "Haberleşme kasasının liman kayıtlarını çıkar." },
  ],
  miniBossTemplate: { id: "marsh-mini-boss", name: "Liman Komutanı", objective: "Sevkiyat kayıtlarını saklayan komutanı etkisiz hâle getir." },
  actBossTemplate: { id: "marsh-act-boss", name: "Rıhtım Tabur Lideri", objective: "Yük iskelesini güvene al ve üçüncü dosyayı çıkar." },
};
