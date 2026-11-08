export type StoryDialogue = {
  id: string;
  kind: "opening" | "chapter" | "npc";
  title: string;
  speaker: string;
  lines: string[];
  hint: string;
};

const CHAPTER_STORIES = [
  {
    title: "KÜL YOLU · İLK KAPI",
    lines: [
      "Karanlık krallığın batı yolunu kapladığında prenses ortadan kayboldu. Kül Yolu'nun kapısını ancak dağılmış Mühür Parçaları açabilir.",
      "Külün altında nöbetçilerin izleri duruyor; her parça, prensesin geçtiği yolu biraz daha belirginleştiriyor.",
    ],
    hint: "Kül Yolu'ndaki Mühür Parçalarını topla ve batı kapısının nöbetçilerini geç.",
  },
  {
    title: "KÜL YOLU · KAYIP İZLER",
    lines: [
      "Eski kervan yolunda prensesin arabasına ait bir toka buldun. Kül nöbetçileri onu senden önce arıyor.",
      "Mührün ışığı, batı kapısına giden güvenli geçidi gösteriyor.",
    ],
    hint: "Yol kenarındaki ganimeti topla; kapıya giden izleri takip et.",
  },
  {
    title: "KÜL YOLU · BATI KAPISI",
    lines: [
      "Kapının son nöbetçisi, prensesin geçmesini engelleyen emri hâlâ yerine getiriyor. Onu yenince mühür kuzeydeki geçidi işaret ediyor.",
      "Kül Yolu açıldı; krallığın kuzey sınırı şimdi önünde.",
    ],
    hint: "Bölüm bossunu yen ve Donmuş Geçit'e giden kapıyı aç.",
  },
  {
    title: "DONMUŞ GEÇİT · KUZEY YOLU",
    lines: [
      "Kuzey geçidi, karanlık yayılınca krallığın son kervanlarını buz altında bıraktı. İkinci kapının kilidi, yeni Mühür Parçalarıyla çözülebilir.",
      "Buzun içindeki sancaklar, prensesin buradan güneye götürüldüğünü doğruluyor.",
    ],
    hint: "Donmuş Geçit'teki parçaları ara; buzlu patikalarda saldırı işaretlerini izle.",
  },
  {
    title: "DONMUŞ GEÇİT · BUZDAKİ MEKTUP",
    lines: [
      "Buzun içinde, prensesin el yazısıyla bırakılmış kısa bir not var: “Son kapı bataklıkta.”",
      "Geçit nöbetçileri notu saklamış; güneye açılan yolu koruyorlar.",
    ],
    hint: "Notun işaret ettiği güneye giden geçidi bul.",
  },
  {
    title: "DONMUŞ GEÇİT · SON NÖBET",
    lines: [
      "Geçidin bossu, prensesi taşıyan kafilenin izini saklamak için buz duvarını kapatmış. Yenilgisi güney kapısının kilidini çözüyor.",
      "Mühür tamamlanmaya yaklaşıyor; son parçalar Kızıl Bataklık'ta.",
    ],
    hint: "Bossu yenerek Kızıl Bataklık'ın kapısını aç.",
  },
  {
    title: "KIZIL BATAKLIK · GÜNEY KAPISI",
    lines: [
      "Güney bataklığı, karanlığın krallığa ilk yayıldığı yer. Prensesin izleri son kapının önünde kesiliyor.",
      "Mühür Parçaları burada birleşince, bataklığın ortasındaki geçit açılacak.",
    ],
    hint: "Kızıl Bataklık'ta kalan Mühür Parçalarını topla ve son kapıya ilerle.",
  },
  {
    title: "KIZIL BATAKLIK · SUYUN ALTINDA",
    lines: [
      "Bataklık suyu, prensesin bıraktığı son Mühür Parçasını saklıyor. Parçalar birleşince son kapının yeri görünür oluyor.",
      "Karanlık, kapının ardındaki salonda toplanmış; artık başka bir yol yok.",
    ],
    hint: "Son kapıya hazırlan; bu yolun en güçlü nöbetçileri burada.",
  },
  {
    title: "KIZIL BATAKLIK · SON EŞİK",
    lines: [
      "Dokuzuncu bölüm, son kapının önünde bitiyor. Karanlık Hükümdar'ı yen ve kayıp prensesle yüzleş.",
      "Mühür tamamlandı; bundan sonra krallığın kaderini sen belirleyeceksin.",
    ],
    hint: "Son bossu yen; ardından prensesin hikâyesi tamamlanacak.",
  },
] as const;

const NPC_LINES = [
  [
    "Karanlık batı kapısını kapattığında prenses buradan geçmişti. Mührün ışığı onun izini yeniden gösteriyor.",
    "Kül nöbetçileri emri hâlâ sürdürüyor; kapı açılınca kuzey yolu ortaya çıkacak.",
  ],
  [
    "Prensesin mektubu güneye, Kızıl Bataklık'a gidiyor. Donmuş Geçit'teki son boss yolu kapatmış.",
    "Mühür parçalarını birleştir; kapı bu kez ardına kadar açılacak.",
  ],
  [
    "Prenses son kapının ardında. Bataklıkta karanlığın toplandığı yere kadar ilerle.",
    "Karanlık Hükümdar düşerse krallık serbest kalacak; sonrası senin kararın.",
  ],
] as const;

function chapterIndex(chapterId: number) {
  const safeChapter = Number.isFinite(chapterId) ? Math.max(0, Math.floor(chapterId)) : 0;
  return Math.min(safeChapter, CHAPTER_STORIES.length - 1);
}

function regionIndex(chapterId: number) {
  const safeChapter = Number.isFinite(chapterId) ? Math.max(0, Math.floor(chapterId)) : 0;
  return Math.min(2, Math.floor(safeChapter / 3));
}

export function getOpeningStoryDialogue(): StoryDialogue {
  const opening = CHAPTER_STORIES[0];
  return {
    id: "story-opening",
    kind: "opening",
    title: "KAYIP PRENSES",
    speaker: "YOL KILAVUZU",
    lines: [
      "Karanlık krallığı ele geçirirken prenses kayboldu.",
      "Onu saklayan dokuz kapı, Mühür Parçaları olmadan açılmıyor.",
      "Kül Yolu'ndan Kızıl Bataklık'a ilerle, parçaları birleştir ve son kapıya ulaş.",
    ],
    hint: "Her bölgede Mühür Parçalarını ara. Son bölümde Karanlık Hükümdar'ı geçerek prensesi bul.",
  };
}

export function getChapterStoryDialogue(chapterId: number): StoryDialogue {
  const safeChapter = Number.isFinite(chapterId) ? Math.max(0, Math.floor(chapterId)) : 0;
  const chapter = CHAPTER_STORIES[chapterIndex(safeChapter)];
  return {
    id: `story-chapter-${safeChapter}`,
    kind: "chapter",
    title: chapter.title,
    speaker: "YOL KILAVUZU",
    lines: [...chapter.lines],
    hint: chapter.hint,
  };
}

const RIVAL_STORIES: Readonly<Record<string, readonly [string, string, string]>> = {
  "gate-warden": [
    "Kapıdan geçmek için önce içeride bıraktığın kişiyi hatırlamalısın.",
    "Nöbet tuttuğum gecenin sabahı hiç gelmedi. Senin mührün bunu değiştirebilir.",
    "Taşlar adını biliyor; ben de artık kimin dönmesini beklediğimi biliyorum.",
  ],
  "iron-oath": [
    "Yeminimi tutmak için herkesi geride bıraktım. Şimdi yemin, beni burada tutuyor.",
    "Kılıcımın ağırlığı demirden değil; verdiğim sözün içinde kalanlardan.",
    "Kapı açılırsa benden geriye ne kalacağını bilmiyorum. Yine de çekilmem.",
  ],
  "ash-archer": [
    "Külün üstünde yürüyenlerin gölgesi yoktur. Seninki neden iki tane?",
    "Oku kapıya değil, seni izleyen şeye attım. Sesini duydun mu?",
    "Mühür parladığında hedefim kayboluyor; sanki gelecekten birini vuruyorum.",
  ],
  "shadow-knight": [
    "Zırhımda yüzüm yok; kapının ardında bıraktığım yüz var.",
    "Gölgem senden önce geçti. Bir sonraki kapıda seni kimin beklediğini biliyor.",
    "Kılıcımı indirirsem karanlık beni geri çağırır. Beni susturabilir misin?",
  ],
  "storm-lancer": [
    "Fırtınanın içinde tek bir ses duydum: kapının bu kez içeriden açılacağını söyledi.",
    "Mızrağım yolu değil, yolu kapatan şeyi arıyor. Mühür sende olduğu için seni seçti.",
    "Şimşek her çaktığında bir isim siliniyor. Benimki sıradaki olabilir.",
  ],
  "rift-berserker": [
    "Yarık açıldığında içinden ben çıktım. Ama beni oraya kimin gönderdiğini hatırlamıyorum.",
    "Öfkem bana ait değil; her darbede kapının içinden biri daha uyanıyor.",
    "Beni yenmek kolay. Uyanan şeyi durdurmak için sonraki eşiğe ulaşmalısın.",
  ],
  "ember-alchemist": [
    "Külün içindeki ateşi söndürmedim; son hatırayı korumak için sakladım.",
    "Her Mühür Parçası başka bir anı yakıyor. Sence bu anılar kime ait?",
    "Tılsımın ışığına bakma. Işık sana bakıyorsa, artık seni tanımıştır.",
  ],
  "venom-assassin": [
    "Seni zehirlemedim. Kapının seni hatırlamasını sağlayan şeyi kanına bıraktım.",
    "Sessizliğim korkudan değil; adımı söylersem kapı hemen açılır.",
    "Dikkat et, yolcu. Burada en tehlikeli şey duyduğun ses değil, cevap verdiğin ses.",
  ],
  "frost-hunter": [
    "Ayaz, izleri silmez; onları bir sonraki kişinin görebileceği kadar dondurur.",
    "Buzun altında bir savaş sürüyor. Her ok, içeridekilerin kalp atışına göre yön değiştiriyor.",
    "İkinci kapının önünde durma. Orada seni bekleyen kişi senin sesinle konuşacak.",
  ],
  "chapter-boss": [
    "Beni son düşmanın sanıyorsun. Oysa ben, kapının dışarıda tuttuğu son hatırayım.",
    "Her döngüde buraya geldin; her döngüde cevabı unutup yeniden başladın.",
    "Mührü tamamla. Son kapının ardında aradığın düşman değil, kendi seçimin var.",
  ],
};

export function getNpcStoryDialogue(name: string, chapterId: number): StoryDialogue | null {
  if (name !== "Demir Yemin") return null;
  const safeChapter = Number.isFinite(chapterId) ? Math.max(0, Math.floor(chapterId)) : 0;
  return {
    id: `story-demir-yemin-${safeChapter}`,
    kind: "npc",
    title: "YEMİNİN AĞIRLIĞI",
    speaker: "DEMİR YEMİN",
    lines: [...NPC_LINES[regionIndex(safeChapter)]],
    hint: "Savaş Odası'ndaki yankılar onun geçmişini sınar; Kül Yolu'nda ise mührün izini sür.",
  };
}

export function getWorldRivalStoryDialogue(rival: {
  name: string;
  archetype: string;
  chapterId: number;
  taunt: string;
}): StoryDialogue {
  if (rival.name === "Karanlık Hükümdar") {
    return {
      id: "story-final-boss",
      kind: "npc",
      title: "SON KAPI",
      speaker: "KARANLIK HÜKÜMDAR",
      lines: [
        rival.taunt,
        "Prensesi susturmadım; onu kapının ardında, krallığı koruyabilsin diye sakladım.",
        "Mühür tamamlandı. Bu düellonun sonunda saklanan gerçeği duyacaksın.",
      ],
      hint: "Son bossu yen; ardından prensesle konuşacaksın.",
    };
  }
  const special = getNpcStoryDialogue(rival.name, rival.chapterId);
  if (special) return special;
  const safeChapter = Number.isFinite(rival.chapterId) ? Math.max(0, Math.floor(rival.chapterId)) : 0;
  const voice = RIVAL_STORIES[rival.archetype] ?? RIVAL_STORIES["gate-warden"];
  const offset = (safeChapter + rival.name.length) % voice.length;
  return {
    id: `story-rival-${rival.archetype}-${safeChapter}`,
    kind: "npc",
    title: rival.name === "Kül Tahtı" ? "SON KAPI" : "KIRIK YEMİNLER",
    speaker: rival.name.toLocaleUpperCase("tr-TR"),
    lines: [
      rival.taunt,
      voice[offset],
      voice[(offset + 1) % voice.length],
    ],
    hint: "Her yolcu kapının başka bir anısını koruyor. Konuş, sonra karar verip düelloya gir.",
  };
}
