import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "frozen-pass",
  name: "Ayaz Geçidi",
  storySummary: "Dağ geçidindeki karakol ve köy aynı geceyi tekrar yaşıyor; Alaz'ın mektubu ikinci yeminin kime ait olduğunu gösteriyor.",
  storyBeats: [
    "Alaz'ın mektubu, ikinci hatıranın buzda değil, geçitteki nöbet kayıtlarında saklandığını söylüyor.",
    "Köylüler aynı geceyi tekrar yaşıyor; nöbetçiler bunun nedenini bilmeden geçidi kapatmış.",
    "Buz Kıran, fırtınanın güneye yayılmasını ve daha fazla insanın döngüye girmesini engellemek istemiş.",
    "Sancak kulesindeki kayıt, Alaz'ın mührü kırmadan önce kuzeydekilerden yardım istediğini kanıtlıyor.",
    "İkinci hatıra açılıyor: geçit halkı da aynı günü yaşıyor, fakat kimse tek başına çıkış yolunu bilmiyor.",
  ],
  theme: "karlı sınır karakolu, dağ köyü ve sığınma yolları",
  enemyFaction: "Ayaz Sancağı",
  mapVariants: ["buz-kanyonu", "çöken-patika", "donmuş-kervan", "kar-burcu", "buz-gölü"],
  missionTemplates: [
    { id: "frost-clash", name: "Sancak Yemini", kind: "normal-combat", objective: "Alaz'ın mektubunu arayan nöbetçileri geçit yolundan uzaklaştır." },
    { id: "frost-waves", name: "Tipinin Üç Gecesi", kind: "survival", objective: "Köylüler sığınağa ulaşana kadar karakol hattını koru." },
    { id: "frost-hunt", name: "Donmuş Mektup", kind: "target-hunt", objective: "Mektubun son kaydını taşıyan postacıyı bul." },
    { id: "frost-siege", name: "Buz Duvarı", kind: "siege", objective: "Sancak kulesini kuşatan hattı yar ve yolu aç." },
    { id: "frost-cache", name: "Ayaz Emaneti", kind: "exploration", objective: "İkinci hatıranın kayıtlı olduğu geçit defterini çıkar." },
  ],
  miniBossTemplate: { id: "frost-mini-boss", name: "Buz Kıran", objective: "Alaz'ın mektubunu saklayan Buz Kıran'ı yen." },
  actBossTemplate: { id: "frost-act-boss", name: "Ayaz Sancağı'nın Beyi", objective: "Karakol kumandanını yen ve ikinci hatıranın kaydını aç." },
};
