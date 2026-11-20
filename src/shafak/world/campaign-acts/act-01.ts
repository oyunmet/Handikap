import { CAMPAIGN_OPERATIONS } from "../../../data/story.ts";
import type { CampaignActData } from "../campaign-level-data.ts";

const operation = CAMPAIGN_OPERATIONS[0];

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: operation.id,
  name: operation.name,
  storySummary: operation.storySummary,
  storyBeats: operation.storyBeats,
  theme: "hasarlı sınır karakolu, beton tahliye koridoru ve terk edilmiş kontrol noktaları",
  enemyFaction: "Taç Birliği",
  mapVariants: ["kervan-geçidi", "yıkık-köprü", "kül-düzlüğü", "nöbetçi-burcu", "yanık-han"],
  missionTemplates: [
    { id: "ash-clash", name: "İlk Temas", kind: "normal-combat", objective: "Tahliye koridorunu kapatan Taç Birliği ekibini geri püskürt." },
    { id: "ash-waves", name: "Koridor Savunması", kind: "survival", objective: "Siviller güvenli hatta ulaşana kadar kontrol noktasını koru." },
    { id: "ash-hunt", name: "Kesik Sinyal", kind: "target-hunt", objective: "Alaz'ın son yayınını takip eden telsiz operatörünü bul." },
    { id: "ash-siege", name: "Batı Geçidi", kind: "siege", objective: "Kontrol noktasını geri al ve tahliye koridorunu aç." },
    { id: "ash-cache", name: "Saha Kaydı", kind: "exploration", objective: "İlk istihbarat dosyasını terk edilmiş karakoldan çıkar." },
  ],
  miniBossTemplate: { id: "ash-mini-boss", name: "Batı Karakol Komutanı", objective: "Tahliye hattını yöneten Taç Birliği komutanını etkisiz hâle getir." },
  actBossTemplate: { id: "ash-act-boss", name: "İleri Hat Komutanı", objective: "İleri karakolu geri al ve ilk istihbarat dosyasını güvene çıkar." },
};
