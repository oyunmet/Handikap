import { CAMPAIGN_OPERATIONS } from "../../../data/story.ts";
import type { CampaignActData } from "../campaign-level-data.ts";

const operation = CAMPAIGN_OPERATIONS[6];

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: operation.id,
  name: operation.name,
  storySummary: operation.storySummary,
  storyBeats: operation.storyBeats,
  theme: "kumla kaplanmış metro tüneli, yeraltı aktarma merkezi ve sunucu odaları",
  enemyFaction: "Taç Birliği İletişim Birimi",
  mapVariants: ["kumlu-pazar", "gömülü-avlu", "taş-köprü", "kayıp-arşiv", "güneş-kapısı"],
  missionTemplates: [
    { id: "city-clash", name: "Aktarma Merkezi", kind: "normal-combat", objective: "Yeraltı haberleşme merkezini tutan ekibi dağıt." },
    { id: "city-waves", name: "Tünel Savunması", kind: "survival", objective: "İstihbarat ekibi kayıtları indirene kadar tüneli koru." },
    { id: "city-hunt", name: "İletişim Subayı", kind: "target-hunt", objective: "Yedinci kayıt parçasını taşıyan saha ajanını bul." },
    { id: "city-siege", name: "Sunucu Odası", kind: "siege", objective: "Sunucu katını ele geçirip iletişim hattını kes." },
    { id: "city-cache", name: "Yedinci Dosya", kind: "exploration", objective: "Merkez sunucudaki görev emirlerini indir." },
  ],
  miniBossTemplate: { id: "city-mini-boss", name: "İletişim Subayı", objective: "Görev kayıtlarını saklayan Taç Birliği subayını etkisiz hâle getir." },
  actBossTemplate: { id: "city-act-boss", name: "İletişim Birimi Komutanı", objective: "Sunucu odasını güvene al ve yedinci dosyayı indir." },
};
