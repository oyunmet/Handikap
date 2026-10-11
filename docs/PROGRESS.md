# İlerleme notu

## Aşama 1 — Performans ve akıcılık

**Durum:** Kod çalışmaları tamamlandı. Gerçek iPhone Safari kabul ölçümü henüz
yapılmadı.

### Tamamlananlar

- Sabit zaman adımı ve sekmeden dönüşte sınırlı delta kullanılıyor.
- 2D dünya çiziminde görünür parça/nesne listeleri yeniden kullanılıyor; arka
  plan işçisi yavaşlarsa eski kareleri biriktirmek yerine son kareyi çiziyor.
- Dünya parçaları önceden hazırlanıyor; eski 3D parçalar sahneden kaldırılıyor,
  parça verisi ve 2D çizim önbellekleri sınırlı tutuluyor.
- Statik çevre InstancedMesh ile çiziliyor; kalite ayarları, mobil piksel oranı
  ve gölge bütçeleri sınırlandırılmış durumda.
- Düello sahnesi görünür geçiş sırasında shader hazırlığı yapıyor.
- `?debug=1` panelinde FPS, draw call, üçgen, geometri/doku, heap ve uzun kare
  ölçümleri bulunuyor. Post-processing açıkken sayaçlar tüm render geçişlerini
  kapsayacak şekilde sıfırlanıyor.
- Adım sesi örneği/buffer'ı önbelleğe alınıyor; ses örneği oynatımı için Howler
  havuzu ayarlı. Düello efektleri ve toz patlamaları mevcut kodda üst sınırla
  tutuluyor. Oyunda mermi/proje nesnesi bulunmadığı için mermi havuzu eklenmedi.

### Yerel doğrulama

- `npm run typecheck` — geçti.
- `npm test` — 64 test geçti; 5 dakikalık dünya parçası/yeniden kullanılan
  tampon sınırı testi eklendi.
- `npm run build` — geçti. Vite, ana JavaScript paketinin 500 kB üstünde
  olduğunu bildiriyor.
- Preview açıldı; ekran görüntüsü aracı WebGL bağlamı oluşturamadığı için 3D
  sahnenin pikselleri ve debug sayaçları bu tarayıcıda doğrulanamadı.

### Kalan kabul ölçümü

Gerçek iPhone Safari'de `/?debug=1&scene=world` açıp yolda ve bir düelloda
oynarken 5 dakika ölçüm yap. FPS'nin 50 veya üstünde, 100 ms üzeri kare
sıçramalarının sıfır ve belleğin sabit kaldığını cihaz üzerinde doğrula.

## Aşama 2 — Görsel kalite ve atmosfer

**Durum:** Kod çalışmaları ve yerel doğrulama tamamlandı. WebGL içeriği için
gerçek cihaz görsel/FPS kabul testi henüz yapılmadı.

### Tamamlananlar

- Kül Yolu, Donmuş Geçit ve Kızıl Bataklık paletleri bölüm kapıları arasında
  yumuşak geçiş yapıyor; her biyom için ayrı çevre öğeleri üretiliyor.
- Dört hava durumu (Açık, Kül, Yağmur, Sis) mevcut atmosferi kapatmak yerine
  parçacık, sis, yol yansıması ve ekran katmanlarını değiştiriyor.
- Üç instanced dağ katmanı ve iki bulut katmanı parallax yapıyor; ay, yıldız ve
  düşük maliyetli ufuk sisi korunuyor.
- Yol kaplama, çatlak/solmuş çizgi, normal ve pürüzlülük dokuları kodla üretiliyor;
  yol kenarı taşları sürüş alanını boş bırakıyor.
- Harabelere yıkık taş/rubble ayrıntıları eklendi. Donmuş kristaller ve bataklık
  sazlığı/ağaçları hem 3D statik gruplarda hem 2D/worker yedeğinde çiziliyor.
- Sıcak ana ışığa düşük maliyetli soğuk dolgu/rim ışığı eklendi; en yakın dört
  çevre ateşi gerçek ışık kullanıyor, uzaktakiler glow yedeğini kullanıyor.
- Kalite ayarı düşük olmadığında seçici, düşük şiddetli bloom; mevcut ACES,
  vignette ve hafif film grain ile birlikte çalışıyor.

### Yerel doğrulama

- `npm run typecheck` — geçti.
- `npm test` — 68 test geçti; biyom sırası/geçişi, hava durumu döngüsü ve
  biyom-özel çevre üretimi test ediliyor.
- `npm run build` — geçti; ana JavaScript paketi 500 kB üzerinde uyarısı sürüyor.
- Bu preview tarayıcısı WebGL bağlamı sağlayamadığı için yeni 3D atmosfer, gerçek
  cihaz FPS'i ve GPU sayaçları burada ölçülemedi. Aşama 1'deki iPhone kabul testi
  de hâlâ açık.

## Aşama 3 — Karakterler ve BOT'lar

**Durum:** Kod ve yerel doğrulama tamamlandı.

### Tamamlananlar

- Dört BOT görünümü ve adı ayrışıyor: Kapı Muhafızı (iki elli kılıç), Demir
  Yemin (gürz/kalkan), Kül Okçusu (yay/sadak), Gölge Şövalyesi (ikiz hançer).
- Botlar mevcut devriye, oyuncuyu fark etme, yaklaşma ve meydan okuma akışını
  koruyor; her arketipin ayrı repliği var.
- İlk BOT kolay, orta gruptaki iki BOT orta, son BOT zor kalıyor; seviye ve
  bölüm ilerledikçe ödül/seviye ölçeklemesi korunuyor.
- Şövalyelerin miğfer/omuz ve silah ayrıntıları, kumaş pelerini, çevre ışığı,
  göz ve kılıçtaki düşük maliyetli emissive vurgular arketipe göre değişiyor.
- Mevcut prosedürel çevre yansıması, animasyon geçişleri, ayak IK, toz/adım ve
  mıknatıslı eşya toplama/ses akışları korunuyor.

### Yerel doğrulama

- `npm run typecheck` — geçti.
- `npm test` — 68 test geçti; BOT kimliği, rol silahları, ayrı görünüm renkleri,
  seeded içerik ve sunucu tarafı düello tekrarı doğrulandı.
- `npm run build` — geçti; Vite ana paketin 500 kB üstü olduğunu bildiriyor.
- Gerçek cihaz FPS'i ve WebGL sahne pikselleri preview ortamında doğrulanamıyor;
  Aşama 1'deki gerçek iPhone kabul ölçümü hâlâ açık.

## Aşama 4 — Düello, kamera ve HUD

**Durum:** Kod ve yerel doğrulama tamamlandı. WebGL'li gerçek cihaz görsel kabul
testi henüz yapılmadı.

### Tamamlananlar

- Düello girişi yaklaşık iki saniyelik tarama/VS sinematiğiyle açılıyor, ardından
  3-2-1 geri sayımında yakın dövüş kamerasına geçiyor; azaltılmış hareket ayarı
  kısa girişi koruyor.
- BOT saldırı hazırlığında kırmızı yer halkası, silah parıltısı ve tek seferlik
  kısa sesli uyarı birlikte tetikleniyor.
- Ateş topu, şimşek, blok/parry kalkanı, dodge ardıl görüntüsü ve vuruş halkası
  gerçek savaşçı konumlarında gösteriliyor. 12 olay/216 olay noktası ve 26'lık
  bitirici kül bütçesi toplam 242 ile 300 sınırının altında.
- Düşük can göstergesi yanıp sönüyor; tükenen dayanıklılık ağır nefes etiketi ve
  model hareketiyle belirtiliyor. Geri sayım mobil ekranda daha görünür.
- Mevcut düello, hit-stop, kamera sarsıntısı, blok/parry/dodge ve sonuç/ödül
  akışları korunuyor; azaltılmış hareket ve görsel efekt ayarları uygulanıyor.

### Yerel doğrulama

- `npm run typecheck` — geçti.
- `npm test` — 70 test geçti; olay-etki eşlemesi ve efekt bütçesi eklendi.
- `npm run build` — geçti; Vite ana JavaScript paketi için 500 kB üstü uyarısı
  sürüyor.
- Bu preview tarayıcısı WebGL sağlayamadığından 3D efektler ve gerçek FPS burada
  görsel olarak ölçülemedi. Aşama 1'deki iPhone kabul testi hâlâ açık.

## Aşama 5 — Hikâye, ses ve kurtarma

**Durum:** Kod ve yerel doğrulama tamamlandı. Gerçek cihaz ve WebGL bağlamını
bilerek düşürerek yapılan kabul testi henüz yapılmadı.

### Tamamlananlar

- Oyun dünyası açılışında ve bölüm kapısı geçişlerinde atlanabilir, yazı efekti
  ve kontrol ipuçları olan Türkçe diyalog açılıyor; sahne diyalog boyunca
  hareketi duraklatıyor. Azaltılmış hareket ayarı yazı efektini hızlandırıyor.
- Demir Yemin'in bölüm biyomuna göre değişen özel konuşma seçenekleri eklendi;
  hikâye metinleri ayrı bir kaynak dosyada tutuluyor.
- Dosyasız Web Audio ile döngülü, biyoma göre değişen müzik ve prosedürel
  yol/atmosfer sesleri eklendi. Efekt ve müzik düzeyleri hem oyun ayarından hem
  genel ayarlardan düzenlenip kaydediliyor; değerler güvenli aralığa çekiliyor.
- Ses bağlamı yalnızca kullanıcı etkileşimiyle başlıyor/devam ediyor; iOS
  otomatik oynatma kısıtlamasına uygun. Ses kapatılınca her iki karışım da
  yumuşakça susturuluyor.
- WebGL bağlamı kaybında sahne duraklatılıyor; bağlam geri gelince yeniden
  oluşturuluyor. Başlatma/geri yükleme hatasında görünür “Yeniden dene” kontrolü
  var.
- Yeni hikâye/ses kontrolleri güvenli alanları kullanıyor; kaydırma panelleri
  küçük ve yatay telefon ekranlarında taşmıyor. Yeni ayar düğmeleri ve ilgili
  oyun eylemleri en az 44 px dokunma yüksekliğine sahip.
- Düello sahnesindeki “Pes et” ve yardım düğmeleri de 44 px dokunma hedefi oldu;
  telefonda yardım düğmesi büyüyen vazgeçme düğmesiyle çakışmayacak şekilde aşağı alındı.

### Yerel doğrulama

- `npm run typecheck` — geçti.
- `npm test` — 74 test geçti; kaydedilmiş ses değerleri, üç bölüm müzik dizisi,
  açılış/bölüm diyalogları ve Demir Yemin'in bağlamsal konuşmaları kapsanıyor.
- `npm run build` — geçti. Ana JavaScript paketi 1,684 kB, ayrı 3D dünya paketi
  174 kB; Vite ana paket için 500 kB üstü uyarısı veriyor.
- `git diff --check` — geçti.
- Replit önizlemesi başlatıldı; açılış hikâye kartı yükleniyor ve tarayıcı konsolunda
  uygulama hatası görünmüyor. Bu görüntü düello etkileşimini veya WebGL pikselini doğrulamıyor.
- Bu yerel kontrol gerçek iPhone Safari FPS/bellek ölçümü veya WebGL bağlam
  kaybını zorlayarak sınamayı içermiyor. Aşama 1'de listelenen 50+ FPS, sıfır
  100 ms üzeri kare ve 5 dakikalık sabit bellek kabulü hâlâ açık; FPS, üçgen,
  draw call ve bellek değerleri gerçek cihazda ölçülmüş gibi raporlanmamalı.
