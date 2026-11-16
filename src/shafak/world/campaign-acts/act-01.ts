import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "ash-road",
  name: "Eşik Mahallesi",
  storySummary: "Eşik Mahallesi aynı sabaha uyanır; Alaz'ın kervan defteri ilk hatırayı ve Köz Nöbeti'nin şehri neden kapattığını ortaya çıkarır.",
  storyBeats: [
    "Fırıncı, bu sabahı daha önce yaşadığını hissediyor; yalnızca kapıdaki saat bir dakika geri kalmış.",
    "Kervan defteri, Alaz'ın her döngüde aynı sokağa küçük bir işaret bıraktığını gösteriyor.",
    "Köz Nöbeti kapıyı düşmandan değil, tekrarlanan günün paniğinden korumaya çalışıyor.",
    "Kül Yargıcı'nın kaydı, Alaz'ın şehirden kendi isteğiyle çıktığını ve bir tanık aradığını doğruluyor.",
    "İlk hatıra açılıyor: Alaz, Şafak Mührü'nü insanları aynı günden kurtarmak için kırdı.",
  ],
  theme: "yaşayan pazar sokakları, kervan kapısı ve aynı sabaha dönen mahalle",
  enemyFaction: "Köz Nöbeti",
  mapVariants: ["kervan-geçidi", "yıkık-köprü", "kül-düzlüğü", "nöbetçi-burcu", "yanık-han"],
  missionTemplates: [
    { id: "ash-clash", name: "Kervanın Son Nöbeti", kind: "normal-combat", objective: "Kervan defterini arayan Köz Nöbeti askerlerini pazar kapısından uzaklaştır." },
    { id: "ash-waves", name: "Sönen Ocak", kind: "survival", objective: "Mahalle sakinleri sığınağa ulaşana kadar geçidi açık tut." },
    { id: "ash-hunt", name: "İz Silen", kind: "target-hunt", objective: "Defterdeki silinmiş adı bilen iz sürücüyü bul." },
    { id: "ash-siege", name: "Batı Kapısı'nda Yarık", kind: "siege", objective: "Batı Kapısı'ndaki kuşatma hattını yar ve mahalle kapısını aç." },
    { id: "ash-cache", name: "Yolcunun Emaneti", kind: "exploration", objective: "Alaz'ın sakladığı kervan defterini yanık hanın arşiv odasında bul." },
  ],
  miniBossTemplate: { id: "ash-mini-boss", name: "Kül Yargıcı", objective: "Kervan kayıtlarını değiştiren Kül Yargıcı'nı yen." },
  actBossTemplate: { id: "ash-act-boss", name: "Batı Kapısı Son Nöbetçisi", objective: "Batı Kapısı'nın son nöbetçisini yen ve ilk hatırayı aç." },
};
