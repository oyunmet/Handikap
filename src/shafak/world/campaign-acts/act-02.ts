import type { CampaignActData } from "../campaign-level-data.ts";

export const CAMPAIGN_ACT_DATA: CampaignActData = {
  id: "frozen-pass",
  name: "Ayaz Geçidi",
  storySummary: "İlk kıvılcım kuzeydeki donmuş yeminleri uyandırıyor; Alaz'ın mektubu, geçidin ardında kalan ikinci parçayı işaret ediyor.",
  storyBeats: [
    "Alaz'ın mektubu, ikinci parçanın buzun altında değil, geçidi tutan sancakta saklı olduğunu söylüyor.",
    "Ayaz nöbetçileri sana saldırıyor; ancak mektubun mühür izini görünce tereddüt ediyorlar.",
    "Buz Kıran, geçidi kapatmasının sebebinin savaşı güneye taşımamak olduğunu itiraf ediyor.",
    "Sancak kulesindeki kayıt, Alaz'ın mührü kırmadan önce kuzey muhafızlarından yardım istediğini kanıtlıyor.",
    "Geçit kumandanı yenilince ayaz çözülüyor; ikinci kıvılcım Alaz'ın sana güvendiğini gösteriyor.",
  ],
  theme: "çatlamış buz sırtları ve donmuş geçit yeminleri",
  enemyFaction: "Ayaz Sancağı",
  mapVariants: ["buz-kanyonu", "çöken-patika", "donmuş-kervan", "kar-burcu", "buz-gölü"],
  missionTemplates: [
    { id: "frost-clash", name: "Sancak Yemini", kind: "normal-combat", objective: "Alaz'ın izini bilen geçit nöbetçilerini yen." },
    { id: "frost-waves", name: "Tipinin Üç Gecesi", kind: "survival", objective: "Dağ sığınağı boşalana kadar saldırılara dayan." },
    { id: "frost-hunt", name: "Donmuş Mektup", kind: "target-hunt", objective: "Mektubun devamını çalan avcıyı yakala." },
    { id: "frost-siege", name: "Buz Duvarı", kind: "siege", objective: "Sancak kulesine giden hattı aç." },
    { id: "frost-cache", name: "Ayaz Emaneti", kind: "exploration", objective: "İkinci kıvılcımın saklandığı emaneti çıkar." },
  ],
  miniBossTemplate: { id: "frost-mini-boss", name: "Buz Kıran", objective: "Alaz'ın mektubunu saklayan Buz Kıran'ı yen." },
  actBossTemplate: { id: "frost-act-boss", name: "Ayaz Sancağı'nın Beyi", objective: "Kuzey yemininin koruyucusunu yen ve ikinci kıvılcımı al." },
};
