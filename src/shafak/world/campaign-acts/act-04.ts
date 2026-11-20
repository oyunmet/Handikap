import { CAMPAIGN_OPERATIONS } from "../../../data/story.ts";
import type { CampaignActData } from "../campaign-level-data.ts";

const operation = CAMPAIGN_OPERATIONS[3];

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: operation.id,
  name: operation.name,
  storySummary: operation.storySummary,
  storyBeats: operation.storyBeats,
  theme: "sisli orman geçidi, terk edilmiş kontrol noktaları ve kamufle mevziler",
  enemyFaction: "Taç Birliği İz Takımı",
  mapVariants: ["kök-tüneli", "sis-patikası", "yıkık-kulübe", "ay-taşı-korusu", "orman-kapısı"],
  missionTemplates: [
    { id: "forest-clash", name: "Sis Hattı", kind: "normal-combat", objective: "Kontrol noktasını tutan iz takımını geri püskürt." },
    { id: "forest-waves", name: "Geçit Savunması", kind: "survival", objective: "Tahliye ekibi koridoru geçene kadar mevziyi koru." },
    { id: "forest-hunt", name: "Sızan Koordinat", kind: "target-hunt", objective: "Konvoyun yerini bildiren saha ajanını bul." },
    { id: "forest-siege", name: "Kuzey Kontrolü", kind: "siege", objective: "Sis koridorundaki iletişim direğini geri al." },
    { id: "forest-cache", name: "Dördüncü Dosya", kind: "exploration", objective: "Terk edilmiş devriye aracındaki kayıtları çıkar." },
  ],
  miniBossTemplate: { id: "forest-mini-boss", name: "Saha İstihbarat Subayı", objective: "Sızdırılan koordinatların kaynağını bilen subayı etkisiz hâle getir." },
  actBossTemplate: { id: "forest-act-boss", name: "İz Takımı Lideri", objective: "Kontrol noktasını ele geçir ve dördüncü dosyayı çıkar." },
};
