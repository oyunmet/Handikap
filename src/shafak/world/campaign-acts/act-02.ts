import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "frozen-pass",
  name: "Kuzey Geçidi",
  storySummary: "Kuzgun Timi, dağ geçidinde kayıp konvoyun izini sürer; ikinci telsiz kaydı Alaz'ın kuzeydeki gizli bağlantısını bulur.",
  storyBeats: [
    "Karakol kamerası, Alaz'ın konvoyunun kar fırtınası başlamadan önce geçide girdiğini gösterir.",
    "Dağ köyündeki siviller, Taç Birliği'nin telsiz direğini ele geçirdiğini anlatır.",
    "Buz Kıran'ın ekibi, geçidi kapatıp bölgeye takviye gelmesini önlemeye çalışmaktadır.",
    "Sinyal kulesindeki kayıt, Alaz'ın yardım çağrısını kimin susturduğunu kanıtlar.",
    "İkinci istihbarat dosyası açılır: Alaz'ın ekibi, kuzeydeki eski radar üssüne yönelmiştir.",
  ],
  theme: "karlı dağ karakolu, radar kulesi ve dar askeri ikmal yolları",
  enemyFaction: "Taç Birliği Kuzey Taburu",
  mapVariants: ["buz-kanyonu", "çöken-patika", "donmuş-kervan", "kar-burcu", "buz-gölü"],
  missionTemplates: [
    { id: "frost-clash", name: "Radar Hattı", kind: "normal-combat", objective: "Radar istasyonunu tutan Taç Birliği ekibini dağıt." },
    { id: "frost-waves", name: "Karakol Savunması", kind: "survival", objective: "Takviye ulaşana kadar kuzey karakolunu koru." },
    { id: "frost-hunt", name: "Telsizciyi Bul", kind: "target-hunt", objective: "Alaz'ın son yardım çağrısını alan telsizciyi bul." },
    { id: "frost-siege", name: "Buz Tüneli", kind: "siege", objective: "Tünel girişindeki mevziyi geri al ve ikmal yolunu aç." },
    { id: "frost-cache", name: "İkinci Sinyal", kind: "exploration", objective: "Radar üssündeki istihbarat dosyasını çıkar." },
  ],
  miniBossTemplate: { id: "frost-mini-boss", name: "Buz Kıran", objective: "Radar kulesini yöneten Taç Birliği komutanını etkisiz hâle getir." },
  actBossTemplate: { id: "frost-act-boss", name: "Kuzey Tabur Komutanı", objective: "Radar üssünü güvene al ve ikinci dosyayı çıkar." },
};
