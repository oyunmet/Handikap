import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "ash-road",
  name: "İleri Hat",
  storySummary: "Tahliye konvoyu kesilir ve Alaz kaybolur. İlk kayıt, Taç Birliği'nin Kuzey İleri Üssü'ndeki iletişim hattına sızdığını gösterir.",
  storyBeats: [
    "İleri karakolun telsizi, tahliye konvoyuyla bağlantının tam kesildiği saati kaydetmiş.",
    "Operatör 06, yayın izinin Taç Birliği'nin kapattığı batı geçidine uzandığını bulur.",
    "Kurtarılan siviller, Alaz'ın konvoyu güvenli bölgeye yönlendirdiğini doğrular.",
    "Batı Karakol Komutanı'nın emir kaydı, tahliye geçidinin neden kapatıldığını ortaya çıkarır.",
    "İlk istihbarat dosyası açılır: Alaz'ın kaybolması bir esir alma değil, planlı bir sızmadır.",
  ],
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
