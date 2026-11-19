import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "whispering-forest",
  name: "Sis Koridoru",
  storySummary: "Sisin içindeki dağ yolu, Alaz'ın timinden ayrıldığı noktaya çıkar; dördüncü dosya içeriden gelen ihaneti kanıtlar.",
  storyBeats: [
    "Gözetleme kamerası, konvoyun sis bastırmadan önce dar koridora girdiğini gösterir.",
    "Taç Birliği'nin yol kontrol noktaları, Alaz'ın ekibinin kaçış rotasını kapatmıştır.",
    "Kök Bekçisi kod adlı izci, konvoyun koordinatlarının tim içinden sızdırıldığını söyler.",
    "Eski devriye kayıtları, Alaz'ın komuta zincirine güvenmediğini doğrular.",
    "Dördüncü istihbarat dosyası açılır: konvoyun konumunu sızdıran kişi merkez üste çalışmaktadır.",
  ],
  theme: "sisli orman yolu, terk edilmiş kontrol noktaları ve kamufle mevziler",
  enemyFaction: "Taç Birliği İz Takımı",
  mapVariants: ["kök-tüneli", "sis-patikası", "yıkık-kulübe", "ay-taşı-korusu", "orman-kapısı"],
  missionTemplates: [
    { id: "forest-clash", name: "Sis Hattı", kind: "normal-combat", objective: "Kontrol noktasını tutan iz takımını geri püskürt." },
    { id: "forest-waves", name: "Geçit Savunması", kind: "survival", objective: "Tahliye ekibi koridoru geçene kadar mevziyi koru." },
    { id: "forest-hunt", name: "Sızan Koordinat", kind: "target-hunt", objective: "Konvoyun yerini bildiren saha ajanını bul." },
    { id: "forest-siege", name: "Kuzey Kontrolü", kind: "siege", objective: "Sis koridorundaki iletişim direğini geri al." },
    { id: "forest-cache", name: "Dördüncü Dosya", kind: "exploration", objective: "Terk edilmiş devriye aracındaki kayıtları çıkar." },
  ],
  miniBossTemplate: { id: "forest-mini-boss", name: "Kök Bekçisi", objective: "Sızdırılan koordinatların kaynağını bilen izciyi etkisiz hâle getir." },
  actBossTemplate: { id: "forest-act-boss", name: "İz Takımı Lideri", objective: "Kontrol noktasını ele geçir ve dördüncü dosyayı çıkar." },
};
