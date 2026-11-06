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
    title: "KÜL YOLU",
    lines: [
      "Şafak Kapısı kapanırken savaşçılar ölmedi; isimleri taşın içine kilitlendi. O geceyi hatırlayan tek şey, avucundaki mühür.",
      "Bu yol bir zamanlar evine dönmek isteyenlerin iziydi. Şimdi her kül tanesi seni tanıyor; bazıları adını senden önce fısıldıyor.",
    ],
    hint: "Mor ışık saçan Mühür Parçalarını ara. Demirci onları ekipmanını güçlendirmek için kullanabilir.",
  },
  {
    title: "KÜL YOLU · SESSİZ ÇAN",
    lines: [
      "Yolun kıyısındaki çan, rüzgârda değil; sen yaklaştıkça çalıyor. İçinde birinin son nefesi saklı.",
      "Kül Okçusu seni görmeden önce mührü gördü. Kapıya yaklaştıkça düşmanların yüzü değişiyor.",
    ],
    hint: "İzleri takip et. Kırmızı saldırı uyarısında siper al veya yana kaç; her kapı yeni bir anı açar.",
  },
  {
    title: "KÜL YOLU · TAŞTAKİ İSİM",
    lines: [
      "Taş levhada kendi adın kazılı. Harfler yeni değil; taş, seni çok uzun zamandır bekliyormuş.",
      "Demir Yemin kapının ilk nöbetçisiydi. Savaş Odası'ndaki yankılar, onun neden hâlâ savaştığını gösterecek.",
    ],
    hint: "Savaş Odası'nda aynı yolcunun taşıdığı silahlarla sınava gir; karşılaşmadan sonra Kül Yolu'na dönebilirsin.",
  },
  {
    title: "DONMUŞ GEÇİT",
    lines: [
      "Geçidin buzunda kendi ayak izlerin var; ama bu bölümde henüz bulunmadın. Mühür, zamanı da saklıyor.",
      "Buzun altından gelen ses sana yol arkadaşı gibi sesleniyor. Cevap verirsen, seni hatırlayacak.",
    ],
    hint: "Donmuş geçitteki Mühür Parçası kapının ikinci işaretini taşıyor. Yaklaşınca çevresindeki mor ışığı izle.",
  },
  {
    title: "DONMUŞ GEÇİT · BUZ ALTINDAKİ AD",
    lines: [
      "Buzun içinde zincirlenmiş bir sancak var; üzerinde Şafak Savaşçıları'nın kayıp birliğinin adı yazılı.",
      "Nöbetçiler bu adı duyunca geri çekiliyor. Demir Yemin ise ilk kez kılıcını indiriyor.",
    ],
    hint: "Konuşmak için yolcunun yanına git. Her rakip yalnızca bir engel değil; kapının eksik bir hatırası.",
  },
  {
    title: "DONMUŞ GEÇİT · KIRIK YEMİN",
    lines: [
      "Demir Yemin, kapıyı içeriden kapattığını itiraf ediyor. Dışarıda kalanları korumak için kendi adını feda etmiş.",
      "Mühürde yeni bir çizgi belirdi. Uzakta kızıl bir ışık yanıyor; biri zinciri çözmeye başlamış.",
    ],
    hint: "Bir sonraki eşikte yol artık seni sınamayacak; senden bir karar isteyecek.",
  },
  {
    title: "KIZIL BATAKLIK",
    lines: [
      "Bataklıkta hiçbir iz kaybolmuyor. Su, savaşçıların son anlarını ve kapının her açılışını hatırlıyor.",
      "Kızıl ışık mühürdeki çatlağa denk düştü. Kapının ardındaki şey, senin dönüşünü bekliyor.",
    ],
    hint: "Bataklıktaki parıltıyı takip et. Mühür Parçaları biriktikçe Demirci'de daha güçlü geliştirmeler açılır.",
  },
  {
    title: "KIZIL BATAKLIK · ÇAMURDAKİ MÜHÜR",
    lines: [
      "Bataklığın dibinde bir tılsım buldun. Üzerindeki işaret, yoldaki tüm mühür parçalarını birbirine bağlıyor.",
      "Bu tılsım, Savaş Odası'nın kapısını da tanıyor. Oradaki yankı sana bir sonraki bölümün adını söyleyebilir.",
    ],
    hint: "Tılsımın izini sür; her yeni bölümde başka bir parça ve başka bir tanık var.",
  },
  {
    title: "KIZIL BATAKLIK · SON SULAR",
    lines: [
      "Kapı ilk kez aralandı. Ardında bir taht değil, yüzlerce savaşçının adını taşıyan boş bir salon var.",
      "Bir ses fısıldıyor: 'Beni kurtarmaya gelmedin. Beni burada bırakan kişiyi bulmaya geldin.'",
    ],
    hint: "Yol yeniden başlayabilir; fakat mühür artık seni tanıyor. Yeni döngüde daha önce gördüğün işaretleri hatırla.",
  },
] as const;

const NPC_LINES = [
  [
    "Kılıç kapıyı değil, geride bıraktıklarının adını korur. Mühür sende yanıyorsa ben de sınavın parçasıyım.",
    "Külü geride bırakma; buzun altında kendi yemininin sesini duyacaksın.",
  ],
  [
    "Buzun altındaki ses benim yeminim değil; kapı kapanırken adımı orada bıraktım.",
    "Çatlak büyüdükçe yol seni hatırlıyor. Kızıl ışıklara değil, mühürdeki işarete bak.",
  ],
  [
    "Bataklık düşenlerin adını saklar. Kapının döngüsü beni nöbetçi yaptı.",
    "Mührü taşıyan sensin; döngüyü durdurabilecek olan da. Artık nedenini biliyorsun.",
  ],
] as const;

function chapterIndex(chapterId: number) {
  const safeChapter = Number.isFinite(chapterId) ? Math.max(0, Math.floor(chapterId)) : 0;
  return safeChapter % CHAPTER_STORIES.length;
}

function regionIndex(chapterId: number) {
  const safeChapter = Number.isFinite(chapterId) ? Math.max(0, Math.floor(chapterId)) : 0;
  return Math.floor(safeChapter / 3) % 3;
}

export function getOpeningStoryDialogue(): StoryDialogue {
  const opening = CHAPTER_STORIES[0];
  return {
    id: "story-opening",
    kind: "opening",
    title: "MÜHRÜN ÇAĞRISI",
    speaker: "YOL KILAVUZU",
    lines: [
      opening.lines[0],
      "Yolun sonunda seni bekleyen cevap, Kül Yolu'nda ve Savaş Odası'nda saklı. İki kapı da aynı mühürle açılıyor.",
      "Yolcu, silahını iki sınavda da yanında taşı. Bulduğun Mühür Parçaları Demirci'de gücünü artıracak.",
    ],
    hint: "Mührün mor ışığını izle; her bölümde Mühür Parçalarını ara. Her rakip kapının ardındaki geçmişten bir parça taşıyor.",
  };
}

export function getChapterStoryDialogue(chapterId: number): StoryDialogue {
  const safeChapter = Number.isFinite(chapterId) ? Math.max(0, Math.floor(chapterId)) : 0;
  const chapter = CHAPTER_STORIES[chapterIndex(safeChapter)];
  const cycle = Math.floor(safeChapter / CHAPTER_STORIES.length);
  return {
    id: `story-chapter-${safeChapter}`,
    kind: "chapter",
    title: cycle > 0 ? `${chapter.title} · DÖNGÜ ${cycle + 1}` : chapter.title,
    speaker: "YOL KILAVUZU",
    lines: cycle > 0
      ? [
          `Yol aynı yere döndü, ama mühür bu kez daha sıcak. Bu ${cycle + 1}. döngüde taşların sakladığı izi sen de hatırlıyorsun.`,
          ...chapter.lines,
        ]
      : [...chapter.lines],
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
