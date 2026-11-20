import { CAMPAIGN_OPERATIONS } from "../../../data/story.ts";
import type { CampaignActData } from "../campaign-level-data.ts";

const operation = CAMPAIGN_OPERATIONS[2];

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: operation.id,
  name: operation.name,
  storySummary: operation.storySummary,
  storyBeats: operation.storyBeats,
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
