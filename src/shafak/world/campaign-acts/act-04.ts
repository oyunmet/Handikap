import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "whispering-forest",
  name: "Fısıltı Korusu",
  storySummary: "Korudaki köyler kaybolanların adlarını hatırlıyor; dördüncü hatıra Alaz'ın neden yalnız yürüdüğünü açığa çıkarıyor.",
  storyBeats: [
    "Köy meydanındaki isim taşları, her döngüde kaybolan sakinlerin izini tutuyor.",
    "Fısıltı muhafızları Alaz'ı değil, aynı günü yeniden başlatan eski yemini koruyor.",
    "Kök Bekçisi, dördüncü hatıranın Alaz'ın hükümdara söyleyemediği özrü sakladığını anlatıyor.",
    "Korunun anlatıcısı, Alaz ile hükümdarın bir zamanlar aynı halkı korumaya söz verdiğini hatırlıyor.",
    "Dördüncü hatıra açılıyor: bu yemin iktidar için değil, şehirdeki insanları korumak için edilmişti.",
  ],
  theme: "sisli koru, köy yolları ve terk edilmiş avlular",
  enemyFaction: "Fısıltı Kökleri",
  mapVariants: ["kök-tüneli", "sis-patikası", "yıkık-kulübe", "ay-taşı-korusu", "orman-kapısı"],
  missionTemplates: [
    { id: "forest-clash", name: "Köklerin Çağrısı", kind: "normal-combat", objective: "Köy yolunu kapatan Fısıltı Kökleri'ni koru ve geçidi aç." },
    { id: "forest-waves", name: "Unutulan İsimler", kind: "survival", objective: "Köylüler korudan çıkana kadar avludaki yolu tut." },
    { id: "forest-hunt", name: "Sis İçindeki Ses", kind: "target-hunt", objective: "Alaz'ın özrüne tanık olan kişiyi bul." },
    { id: "forest-siege", name: "Ay Taşı Kuşatması", kind: "siege", objective: "Ay Taşı Korusu'nu kuşatan hattı dağıt." },
    { id: "forest-cache", name: "Köklerin Hatırası", kind: "exploration", objective: "Dördüncü hatıranın saklandığı köy kayıtlarını bul." },
  ],
  miniBossTemplate: { id: "forest-mini-boss", name: "Kök Bekçisi", objective: "Dördüncü hatıranın tanığı olan Kök Bekçisi'yle yüzleş." },
  actBossTemplate: { id: "forest-act-boss", name: "Ay Taşı'nın Yeminlisi", objective: "Eski yeminin gerçeğini öğren ve beşinci perdeye geç." },
};
