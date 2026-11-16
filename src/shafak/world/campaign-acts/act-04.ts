import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "whispering-forest",
  name: "Fısıltı Korusu",
  storySummary: "Kökler, unutulan isimleri geri fısıldıyor; dördüncü yankı Alaz'ın neden yalnız yürüdüğünü gösterecek.",
  storyBeats: [
    "Korudaki ağaçlar adını tanıyor; Alaz'ın bıraktığı iplik işaretleri kök tüneline uzanıyor.",
    "Fısıltı muhafızları bir kişiyi değil, mührün içinde tekrarlanan aynı günü koruyor.",
    "Kök Bekçisi, dördüncü kıvılcımın bir isim değil, yarım kalmış bir özür sakladığını söylüyor.",
    "Ay Taşı Korusu'ndaki yankı, Alaz ile Kül Hükümdarı'nın bir zamanlar aynı yemini ettiğini duyuruyor.",
    "Orman kapısının kumandanı yenilince kökler ilk kez susuyor; dördüncü parça eski yemini gösteriyor.",
  ],
  theme: "sisli koru, yaşayan kökler ve geri dönen anılar",
  enemyFaction: "Fısıltı Kökleri",
  mapVariants: ["kök-tüneli", "sis-patikası", "yıkık-kulübe", "ay-taşı-korusu", "orman-kapısı"],
  missionTemplates: [
    { id: "forest-clash", name: "Köklerin Çağrısı", kind: "normal-combat", objective: "Ay Taşı Korusu'na giden geçidi aç." },
    { id: "forest-waves", name: "Unutulan İsimler", kind: "survival", objective: "Korunun çağırdığı yankılar dinene kadar dayan." },
    { id: "forest-hunt", name: "Sis İçindeki Ses", kind: "target-hunt", objective: "Alaz'ın izini takip eden sessiz avcıyı bul." },
    { id: "forest-siege", name: "Ay Taşı Kuşatması", kind: "siege", objective: "Dördüncü kıvılcımı çevreleyen kuşatmayı dağıt." },
    { id: "forest-cache", name: "Köklerin Hatırası", kind: "exploration", objective: "Dördüncü parçayı saklayan emanet sandığını bul." },
  ],
  miniBossTemplate: { id: "forest-mini-boss", name: "Kök Bekçisi", objective: "Dördüncü parçanın yankısını koruyan Bekçi'yi yen." },
  actBossTemplate: { id: "forest-act-boss", name: "Ay Taşı'nın Yeminlisi", objective: "Alaz'ın eski yeminini çöz ve beşinci perdeye geç." },
};
