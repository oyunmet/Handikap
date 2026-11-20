export const CAMPAIGN_LEVELS_PER_OPERATION = 50;

export type CampaignMissionKind =
  | "normal-combat"
  | "survival"
  | "target-hunt"
  | "siege"
  | "exploration"
  | "mini-boss"
  | "act-boss";

export type StoryPortraitId = "sema" | "traveler" | "commander" | "field-agent";

export type StoryDialogue = {
  id: string;
  kind: "opening" | "chapter" | "npc";
  title: string;
  speaker: string;
  portrait: StoryPortraitId;
  lines: string[];
  hint: string;
};

export type CampaignStoryRecord = {
  id: string;
  title: string;
  excerpt: string;
};

export type CampaignOperationStory = {
  id: string;
  number: number;
  name: string;
  storySummary: string;
  storyBeats: readonly [string, string, string, string, string];
  record: CampaignStoryRecord;
  commanderLine: string;
  nextOperationHint: string | null;
};

export const CAMPAIGN_NARRATIVE = {
  sagaTitle: "Son Hat'tan Doğuşa",
  heroName: "Yolcu",
  squadName: "Şafak Birliği",
  guideName: "Sema",
  lostOfficerName: "Alaz",
  enemyName: "Karanlık Sancak",
  finalBossName: "Karanlık Sancak Komutanı",
  cityName: "Kül",
  networkName: "tahliye haberleşme ağı",
  opening:
    "Kül kuşatma altında. Haberleşme ağı çöktü, sivil tahliye koridoru kapandı. Şafak Birliği'nin telsizcisi Sema, Yolcu'yu son çalışan hatta yönlendiriyor. Dokuz operasyon boyunca kayıt parçalarını bul, kayıp istihbarat subayı Alaz'ın izini sür ve sivillere Doğuş Kapısı'nı aç.",
  openingLines: [
    "Kül kuşatma altında. Haberleşme ağı sustu; son sivil tahliye koridoru kapandı.",
    "Ben Sema. Şafak Birliği'nin kalan telsiz hattını ayakta tutuyorum. Alaz'ın son sinyali Son Hat'tan geldi.",
    "Yolcu, dokuz operasyon boyunca kayıt parçalarını bul. Her parça ağı yeniden kurmak için gereken bir iz taşıyor.",
  ],
  ending:
    "Kayıtlar bir araya geldi. Yolcu, Alaz ve Sema tahliye ağını güvenli kanala taşıdı; Doğuş Kapısı açıldı ve siviller Kül'den çıktı.",
  endingDialogue:
    "“Kapıyı açtın. Şimdi içeride kalanların da bir yolu var.”",
} as const;

export const CAMPAIGN_OPERATIONS: readonly CampaignOperationStory[] = [
  {
    id: "ash-road",
    number: 1,
    name: "Son Hat",
    storySummary: "Kül'ün son tahliye hattı kesildi. Alaz kayıp; çalışan telsiz yalnızca kısa bir yardım çağrısı yakalıyor.",
    storyBeats: [
      "Son Hat'taki telsiz, konvoyla bağlantının kesildiği saati kaydetmiş.",
      "Sema, çağrının Kül'ün batı geçidinden geldiğini doğrular.",
      "Kurtarılan siviller, Alaz'ın konvoyu güvenli bölgeye yönlendirdiğini anlatır.",
      "Geçit komutanının emri, tahliye yolunun bilerek kapatıldığını gösterir.",
      "İlk kayıt parçası açılır: Alaz'ın kayboluşu bir esir alınma değil, planlı bir sızmadır.",
    ],
    record: {
      id: "campaign-record-01",
      title: "Son Çağrı",
      excerpt: "Alaz'ın son kaydı, tahliye koridorunun bilerek kapatıldığını ve ikinci bir sinyalin kuzeye taşındığını doğruluyor.",
    },
    commanderLine: "Bir hat kapandı diye savaş bitmez. Sessizliği ben seçtim.",
    nextOperationHint: "Kül Sokakları'nda kesilen çağrının hangi binadan yönlendirildiğini bul.",
  },
  {
    id: "frozen-pass",
    number: 2,
    name: "Kül Sokakları",
    storySummary: "Yardım çağrıları terk edilmiş sokaklardan yeniden yönlendiriliyor. Alaz'ın bıraktığı ikinci şifre parçası kuzeyde.",
    storyBeats: [
      "Sokak röleleri aynı yardım çağrısını farklı koordinatlara taşıyor.",
      "Sema, sahte yönlendirmelerin tek bir merkezden yapıldığını bulur.",
      "Bir sığınaktaki tanık, Alaz'ın kuzey çıkışına ilerlediğini söyler.",
      "Karanlık Sancak'ın saha emri, sivil kanalların çatışma hattına bağlandığını kanıtlar.",
      "İkinci kayıt parçası, ağın içinde gizlenmiş bir tahliye haritasını açar.",
    ],
    record: {
      id: "campaign-record-02",
      title: "Sahte Koordinatlar",
      excerpt: "Yardım anonsları, sivilleri güvenli bölgeden uzağa sürmek için aynı merkezden değiştirilmiş.",
    },
    commanderLine: "Sokaklar boş değil. Her sessizlik bir emirdir.",
    nextOperationHint: "Sessiz İstasyon'un son yayınını çöz; Alaz'ın bıraktığı kod orada.",
  },
  {
    id: "red-marsh",
    number: 3,
    name: "Sessiz İstasyon",
    storySummary: "Sessiz istasyonda yayın kesildi, ama kayıt cihazları çalışıyor. Alaz'ın izi yeraltı bağlantısına uzanıyor.",
    storyBeats: [
      "İstasyonun ana frekansı kapalı; acil durum bandında kısa aralıklarla sinyal var.",
      "Sema, sinyalin içeriden ve elle gönderildiğini fark eder.",
      "Kontrol odasındaki dosyalar, haberleşme ağının kopyalandığını ortaya çıkarır.",
      "İstasyon komutanı, Alaz'ın şifreyi farklı operasyonlara böldüğünü doğrular.",
      "Üçüncü kayıt parçası, ağı yöneten yedek merkezin yerini gösterir.",
    ],
    record: {
      id: "campaign-record-03",
      title: "Sessiz Yayın",
      excerpt: "Ağın kopyası istasyondan yönetilmiyor; her yayın, daha büyük bir merkezin geçici rölesi.",
    },
    commanderLine: "Sinyali duydun. Ama onu kimin gönderdiğini bilmiyorsun.",
    nextOperationHint: "Demir Geçit'teki taşıyıcı aracı yakala; sonraki anahtar hareket hâlinde.",
  },
  {
    id: "whispering-forest",
    number: 4,
    name: "Demir Geçit",
    storySummary: "Şifreyi taşıyan araç Demir Geçit'e girdi. Yolcu, Alaz'ın rotasını takip ederken kapalı geçitleri aşmalı.",
    storyBeats: [
      "Kuzey yolu kapatıldı; geçidin içinden tek bir araç çıkış yaptı.",
      "Sema, araçtaki vericinin Alaz'ın eski saha kodunu kullandığını yakalar.",
      "Yol üzerindeki işaretler, Alaz'ın konvoyu tek başına yönlendirmediğini gösterir.",
      "Geçit komutanının kaydı, Karanlık Sancak'ın şifreyi başkente taşıdığını açığa çıkarır.",
      "Dördüncü kayıt parçası, sonraki buluşma noktasını işaretler: Gölgeli Çarşı.",
    ],
    record: {
      id: "campaign-record-04",
      title: "İkinci Çağrı",
      excerpt: "Alaz'ın telsizinde duyulan ikinci ses, tahliye hattının içeriden de korunduğunu gösteriyor.",
    },
    commanderLine: "Kapıdan geçmek kolay. Geri dönmek için izin gerekir.",
    nextOperationHint: "Gölgeli Çarşı'da kayıp vericiyi bul ve Sema'yla bağlantıyı yenile.",
  },
  {
    id: "broken-throne",
    number: 5,
    name: "Gölgeli Çarşı",
    storySummary: "Çarşıdaki kalabalık tahliye edilmiş görünüyor; geride kalan işaretler gizli bir haberleşme odasını gösteriyor.",
    storyBeats: [
      "Çarşının bütün tabelaları sökülmüş; yalnızca eski tahliye işaretleri duruyor.",
      "Sema, açık kalan bir dükkân telsizinden Alaz'ın kodunu çözer.",
      "Yeraltı deposundaki manifestolar, yardım malzemelerinin karargâha taşındığını gösterir.",
      "Karanlık Sancak'ın emri, sivil tahliye ağının askeri hedef ağına çevrildiğini kanıtlar.",
      "Beşinci kayıt parçası Kızıl Karargâh'a giden gizli bağlantıyı açar.",
    ],
    record: {
      id: "campaign-record-05",
      title: "Yük Manifestosu",
      excerpt: "Sivil yardım malzemeleri, sahte emirlerle Kızıl Karargâh'a yönlendirilmiş.",
    },
    commanderLine: "Kalabalıkta iz kaybolur. Kayıtta asla.",
    nextOperationHint: "Kızıl Karargâh'ın ana sunucusuna ulaş; değiştirilen emirleri durdur.",
  },
  {
    id: "mist-coast",
    number: 6,
    name: "Kızıl Karargâh",
    storySummary: "Karargâhın emir kayıtları, tahliye ağının neden susturulduğunu ve Alaz'ın neden saklandığını açıklıyor.",
    storyBeats: [
      "Karargâhın dış halkasında bütün acil frekanslar tek bir panele bağlanmış.",
      "Sema, panelin sivil çağrıları otomatik olarak çatışma hedeflerine çevirdiğini bulur.",
      "Alaz'ın bıraktığı not, ağı kapatmak yerine güvenli kanala taşımayı önerir.",
      "Komutanın emri, sıradaki anahtarın Yanık Köprü'de tutulduğunu gösterir.",
      "Altıncı kayıt parçası, ağı yeniden açmak için gereken yetki sırasını verir.",
    ],
    record: {
      id: "campaign-record-06",
      title: "Güvenli Kanal",
      excerpt: "Alaz, ağı kapatmayı değil, sivil çağrıları koruyan ayrı bir kanala taşımayı planlamış.",
    },
    commanderLine: "Bu karargâhı değil, ağı yönetiyorsunuz.",
    nextOperationHint: "Yanık Köprü'de tahliye hattını tut ve son şifre düğümünü kurtar.",
  },
  {
    id: "lost-city",
    number: 7,
    name: "Yanık Köprü",
    storySummary: "Yanık Köprü'nün tahliye koridoru çöküyor. Alaz'ın son güvenli rotası karşı kıyıda.",
    storyBeats: [
      "Köprünün kuzey ayağı hasarlı; siviller karşı kıyıda mahsur kalmış.",
      "Sema, köprü kontrol sisteminin Karanlık Sancak tarafından uzaktan kilitlendiğini anlar.",
      "Yolcu, geçici geçiş hattını kurarken yedinci kayıt parçasına ulaşır.",
      "Kayıt, Alaz'ın Kara Kale'ye götürüldüğünü ve esir olmadığını doğrular.",
      "Tahliye kolu açılır; son iki anahtar aynı komuta merkezine yönelir.",
    ],
    record: {
      id: "campaign-record-07",
      title: "Açık Geçit",
      excerpt: "Alaz Kara Kale'de tutulmuyor; oraya kendi isteğiyle gitmiş ve ağın anahtarını yanında götürmüş.",
    },
    commanderLine: "Köprüyü yakarsan, geride kalanları da burada bırakırsın.",
    nextOperationHint: "Kara Kale'ye gir; Alaz'ın seçimini ve son anahtarı öğren.",
  },
  {
    id: "black-summit",
    number: 8,
    name: "Kara Kale",
    storySummary: "Kara Kale'nin kayıtları Alaz'ın gerçek planını ortaya çıkarıyor. Doğuş Kapısı'na giden yol artık açık.",
    storyBeats: [
      "Kalenin dış savunması, tahliye ağına bağlı otomatik kilitlerle çalışıyor.",
      "Sema, Alaz'ın son yayınının kalenin içinden gönderildiğini belirler.",
      "Sekizinci kayıt parçası, Karanlık Sancak komutanının ağ üzerindeki tek yetkisini kanıtlar.",
      "Alaz'ın mesajı, son anahtarın Doğuş Kapısı'nda saklandığını söyler.",
      "Yolcu, ağı güvenli kanala geçirmek için gereken son operasyona hazırlanır.",
    ],
    record: {
      id: "campaign-record-08",
      title: "Alaz'ın Seçimi",
      excerpt: "Alaz, sivillerin çağrılarını korumak için son anahtarı Doğuş Kapısı'na taşıdı.",
    },
    commanderLine: "Bütün dosyalar tek merkeze çıkıyor. Beni durduramazsın.",
    nextOperationHint: "Doğuş Kapısı'nda son anahtarı etkinleştir ve siviller için çıkış aç.",
  },
  {
    id: "shadow-palace",
    number: 9,
    name: "Doğuş Kapısı",
    storySummary: "Son anahtar Doğuş Kapısı'nda. Yolcu, Sema ve Alaz ağı güvenli kanala taşıyıp tahliyeyi başlatmalı.",
    storyBeats: [
      "Doğuş Kapısı'nın kontrol noktası kilitli; son frekans Alaz'ın koduyla yanıt veriyor.",
      "Sema, sivillerin çıkış sırasını açık kanala aktarır.",
      "Alaz, dokuzuncu kayıt parçasıyla ağın güvenli devrini tamamlar.",
      "Karanlık Sancak komutanı son bağlantıyı kesmek için merkeze gelir.",
      "Ağ güvenli kanala taşınır. Doğuş Kapısı açılır ve siviller Kül'den çıkar.",
    ],
    record: {
      id: "campaign-record-09",
      title: "Son Hat'tan Doğuşa",
      excerpt: "Ağ kapatılmadan güvenli kanala taşındı; son kayıt, sivillerin tahliye edildiğini doğruluyor.",
    },
    commanderLine: "Kapıyı açarsan, düzeni kaybedersin. Açmazsan, insanları.",
    nextOperationHint: null,
  },
] as const;

export const CAMPAIGN_ACT_COUNT = CAMPAIGN_OPERATIONS.length;
export const CAMPAIGN_LEVEL_COUNT = CAMPAIGN_ACT_COUNT * CAMPAIGN_LEVELS_PER_OPERATION;
export const CAMPAIGN_STORY_RECORDS = CAMPAIGN_OPERATIONS.map((operation) => operation.record);

export const CAMPAIGN_CHAPTER_NAMES = [
  "Kapalı Koridor",
  "Son Frekans",
  "Boş Kontrol Noktası",
  "Kül Yağmuru",
  "Terk Edilmiş Araç",
  "İlk İz",
  "Kayıp Çağrı",
  "Kör Nokta",
  "Kırık Anten",
  "Komutanın Sesi",
  "Doğu Çıkışı",
  "Sessiz Peron",
  "Yarım Mesaj",
  "Dar Geçit",
  "Sivil Konvoy",
  "Boş Kule",
  "Ters Koordinat",
  "İşaret Fişeği",
  "Sığınak Kapısı",
  "İkinci İz",
  "Yük Manifestosu",
  "Gölge Sokak",
  "Yedek Kanal",
  "Baskı Hattı",
  "Sönmüş Projektör",
  "Şifre Düğümü",
  "Harita Kenarı",
  "Tünel Ağzı",
  "Yanlış Emir",
  "İlk Çatışma",
  "Kapalı Hat",
  "Kayıp Frekans",
  "Kör Gözlem",
  "Gizli Bağlantı",
  "Boş Depo",
  "Sinyal Yükseltici",
  "Kırık Mühür",
  "Çıkış Sırası",
  "Kıyı Sesi",
  "Komutanın Kaydı",
  "Yanmış Geçit",
  "Son Vardiya",
  "Açık Kanal",
  "Karanlık Koridor",
  "Tahliye İşareti",
  "Kilitli Sunucu",
  "Sancak Gölgesi",
  "Sivil Hattı",
  "Bir Adım Kaldı",
  "Operasyon Finali",
] as const;

export const STORY_DIALOGUE_CONTENT = {
  npcBeats: [
    "Bu tahliye kolunda Karanlık Sancak'ın kapattığı başka bir geçit var.",
    "Alaz'ın son sinyali bu bölgede kesildi; kayıt cihazlarını kontrol et.",
    "Bir sonraki operasyona hazırlan. Sivillerin güvenli çıkışı hâlâ mümkün.",
  ],
  chapterFallback: "bölgesinde Alaz'ın sinyalini takip et.",
  finalBossLines: [
    "Alaz ağı kapatmak istedi; ben bu hattı korumak için onu merkezden uzak tuttum.",
    "Karanlık Sancak'ın planı biterse, bütün emirlerim de burada biter.",
  ],
  rivalVoices: {
    "gate-warden": [
      "Kontrol noktası kapalı. Geri çekil ya da telsizini bırak.",
      "Tahliye rotası değişti; merkezden gelen emri sorgulama.",
      "Bu mevziyi tutmamın nedeni emir. Başka bir seçenek bırakmadılar.",
    ],
    "iron-oath": [
      "Bölgeyi teslim etmem için yazılı emir gerekiyor.",
      "Merkez ağı susturuyor; kendi birimlerimizle bile bağlantı kuramıyoruz.",
      "Bu hattı savunuyorum çünkü sivillerin çıkışı başka yerde kapalı.",
    ],
    "ash-archer": [
      "Gözlem noktasından bütün geçitler görünüyor.",
      "Telsiz sessiz. Konumunu açık kanalda verme.",
      "Sis kalkmadan bu yamacı geçemezsin.",
    ],
    "shadow-knight": [
      "Termal kamerada tek bir hareket bile kaçmaz.",
      "İşaret fişeği göründüğünde konumun belli olacak.",
      "Karanlıkta telsiz kullanma. Sinyal seni ele verir.",
    ],
    "storm-lancer": [
      "Hava desteği yok. Bu mevzide yalnızız.",
      "Anten hasarlı; batı kanadından sinyal alamıyoruz.",
      "Fırtına dinince tahliye koridorunu tekrar açacağız.",
    ],
    "rift-berserker": [
      "Zırhlı araç desteği olmadan bu hat düşmez.",
      "Her takviye talebi merkezde bekletiliyor.",
      "Emir değişti. Kimse nedenini söylemiyor.",
    ],
    "ember-alchemist": [
      "Kontrol odasındaki güç dağıtımı hâlâ çalışıyor.",
      "Yedek sunucu alt geçitte. Ana hattı kapatmadan oraya ulaş.",
      "Bu cihazlar yardım sinyalini komuta ağına yönlendiriyor.",
    ],
    "venom-assassin": [
      "Telsizini kapat. Bu frekans dinleniyor.",
      "İçeriden bilgi sızdıran kişiyi bulmadan merkeze girmeyin.",
      "Yanlış çağrı kodunu kullandın. Burada kimse sana güvenmez.",
    ],
    "frost-hunter": [
      "Kar, araç izlerini kapatır ama ayak izlerini değil.",
      "Radar kaydı, konvoyun kuzey tüneline girdiğini gösteriyor.",
      "Sinyali buldun. Şimdi göndericinin kim olduğunu öğren.",
    ],
    "chapter-boss": [
      "Dosyaları teslim et. Merkezde neler olduğunu hâlâ bilmiyorsun.",
      "Alaz ağı güvenli kanala taşımak istedi; ben bu hattı korumak için onu durdurdum.",
      "Karanlık Sancak'ın emriyle bütün iletişim kanalları kapatılacak.",
    ],
  },
} as const;

const knownStoryRecordIds = new Set(CAMPAIGN_STORY_RECORDS.map((record) => record.id));
const storyRecordOrder = new Map(CAMPAIGN_STORY_RECORDS.map((record, index) => [record.id, index]));

export function getCampaignOperationForChapter(chapterId: number) {
  const safeChapter = Number.isFinite(chapterId)
    ? Math.max(0, Math.min(CAMPAIGN_LEVEL_COUNT - 1, Math.floor(chapterId)))
    : 0;
  return CAMPAIGN_OPERATIONS[Math.floor(safeChapter / CAMPAIGN_LEVELS_PER_OPERATION)];
}

export function getCampaignChapterName(chapterId: number) {
  const safeChapter = Number.isFinite(chapterId)
    ? Math.max(0, Math.min(CAMPAIGN_LEVEL_COUNT - 1, Math.floor(chapterId)))
    : 0;
  const operation = getCampaignOperationForChapter(safeChapter);
  return `${operation.name} · ${CAMPAIGN_CHAPTER_NAMES[safeChapter % CAMPAIGN_LEVELS_PER_OPERATION]}`;
}

export function getCampaignStoryRecordForChapter(chapterId: number) {
  if (!Number.isSafeInteger(chapterId) || chapterId < 0 || chapterId >= CAMPAIGN_LEVEL_COUNT) return null;
  const levelNumber = chapterId + 1;
  if (levelNumber % CAMPAIGN_LEVELS_PER_OPERATION !== 0) return null;
  return CAMPAIGN_OPERATIONS[Math.floor(chapterId / CAMPAIGN_LEVELS_PER_OPERATION)]?.record ?? null;
}

export function getCampaignStoryRecordById(id: string) {
  return CAMPAIGN_STORY_RECORDS.find((record) => record.id === id) ?? null;
}

export function normalizeCampaignStoryRecordIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  const ids = new Set(value.filter(
    (id): id is string => typeof id === "string" && knownStoryRecordIds.has(id),
  ));
  return [...ids].sort((left, right) => (
    (storyRecordOrder.get(left) ?? Number.MAX_SAFE_INTEGER)
    - (storyRecordOrder.get(right) ?? Number.MAX_SAFE_INTEGER)
  ));
}

export function isValidCampaignStoryRecordIds(value: unknown) {
  return Array.isArray(value)
    && value.length <= CAMPAIGN_STORY_RECORDS.length
    && value.every((id) => typeof id === "string" && knownStoryRecordIds.has(id))
    && new Set(value).size === value.length;
}
