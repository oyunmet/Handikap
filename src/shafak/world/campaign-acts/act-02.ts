import { CAMPAIGN_OPERATIONS } from "../../../data/story.ts";
import type { CampaignActData } from "../campaign-level-data.ts";

const operation = CAMPAIGN_OPERATIONS[1];

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: operation.id,
  name: operation.name,
  storySummary: operation.storySummary,
  storyBeats: operation.storyBeats,
  theme: "karlı dağ karakolu, radar kulesi ve dar askeri ikmal hatları",
  enemyFaction: "Taç Birliği Kuzey Taburu",
  mapVariants: ["buz-kanyonu", "çöken-patika", "donmuş-kervan", "kar-burcu", "buz-gölü"],
  missionTemplates: [
    { id: "frost-clash", name: "Radar Hattı", kind: "normal-combat", objective: "Radar istasyonunu tutan Taç Birliği ekibini dağıt." },
    { id: "frost-waves", name: "Karakol Savunması", kind: "survival", objective: "Takviye ulaşana kadar kuzey karakolunu koru." },
    { id: "frost-hunt", name: "Telsizciyi Bul", kind: "target-hunt", objective: "Alaz'ın son yardım çağrısını alan telsizciyi bul." },
    { id: "frost-siege", name: "Buz Tüneli", kind: "siege", objective: "Tünel girişindeki mevziyi geri al ve ikmal hattını aç." },
    { id: "frost-cache", name: "İkinci Sinyal", kind: "exploration", objective: "Radar üssündeki istihbarat dosyasını çıkar." },
  ],
  miniBossTemplate: { id: "frost-mini-boss", name: "Radar Komutanı", objective: "Radar kulesini yöneten Taç Birliği komutanını etkisiz hâle getir." },
  actBossTemplate: { id: "frost-act-boss", name: "Kuzey Tabur Komutanı", objective: "Radar üssünü güvene al ve ikinci dosyayı çıkar." },
};
