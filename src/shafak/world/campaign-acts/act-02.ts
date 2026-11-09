import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "frozen-pass",
  name: "Donmuş Geçit",
  storySummary: "Buz Sancaklıları geçidi tutuyor; prensesin mektubu güneye giden yolu gösteriyor.",
  theme: "buz sırtları ve terk edilmiş dağ yolu",
  enemyFaction: "Buz Sancaklıları",
  mapVariants: ["buz-kanyonu", "çöken-patika", "donmuş-kervan", "kar-burcu", "buz-gölü"],
  missionTemplates: [
    { id: "frost-clash", name: "Geçit Nöbeti", kind: "normal-combat", objective: "Dağ geçidini tutanları yen." },
    { id: "frost-waves", name: "Tipi Baskını", kind: "survival", objective: "Tipi dinene kadar dalgalara dayan." },
    { id: "frost-hunt", name: "Buz İzleri", kind: "target-hunt", objective: "Kafile izini saklayan avcıyı yakala." },
    { id: "frost-siege", name: "Kuzey Kuşatması", kind: "siege", objective: "Buz duvarını koruyan hattı aş." },
    { id: "frost-cache", name: "Donmuş Emanet", kind: "exploration", objective: "Buzun altındaki emaneti çıkar." },
  ],
  miniBossTemplate: { id: "frost-mini-boss", name: "Buz Kıran", objective: "Buz Kıran'ı yen." },
  actBossTemplate: { id: "frost-act-boss", name: "Geçit Kumandanı", objective: "Perde boss'unu yen ve mührü al." },
};
