# İlerleme notu

## Yeni mimari çalışması — 19 Kasım 2026

**Oyun adı:** Sunvoria. Mevcut ad, logo kimliği ve uluslararası marka korunacak; ekli brief'in çelişen yeni ad önerileri uygulanmayacak.

**Aşamalar:** A1 Core + tema + tek kabuk — bitti. A2 Hub dünyası + karakter — bitti. A3 Sefer/koşu — bitti. A4 FPS baskın — bitti. A5 Meydan Okuma + Siper Hattı — bitti. A6 Hikâye/diyalog/arşiv — sürüyor. A7 Cila, performans ve ad temizliği — bekliyor.

**Şu an yapılan iş:** A6’da hikâye/diyalog metinlerini ortak veri kaynaklarına bağlıyor, operasyon ödülü ile Kayıt Arşivi’ni tamamlıyorum; oyun adı Sunvoria olarak kalıyor.

**Sıradaki 3 adım:**
1. Hikâye, diyalog ve A6 arayüz metinlerini ortak `src/data` kaynaklarından okut.
2. Operasyon sonunda belirli kayıt parçasını açıp Kayıt Arşivi’nde göster.
3. Mevcut hesap/kayıt uyumunu koruyup A6'yı test, typecheck ve build ile doğrula.

**A1'de doğrulanan temel (koddan):**
- `src/core/` — sabit zaman adımlı döngü, runtime, klavye/dokunmatik giriş, kamera takibi, GLB yükleyici ve nesne havuzu.
- `src/state/game-store.ts`, `src/modes/mode.ts`, `src/world/world-config.ts` ve `src/data/asset-manifest.ts` — ortak mod/sahne durumu ve temel yapılandırma.
- `src/styles/tokens.css` — grafit-altın tasarım tokenları; `src/shafak/tokens.css` bunları eski arayüz değişkenlerine bağlıyor.
- `src/ui/GameShell.tsx` ve `src/ui/GameCanvasHost.tsx` — tek uygulama kabuğu ve tek gerçek React Three Fiber `<Canvas>`.
- `src/shafak/App.tsx` — mevcut uygulama aynı kabukta kalıyor; altı 3D görünüm ortak Canvas'a viewport olarak kaydediliyor.
- `src/ui/game-canvas-host.test.js` — tek Canvas, kabuk bağlantısı ve altı mevcut sahnenin ortak host kullanımı için regresyon kontrolleri.
- `AGENTS.md` — oyun adı, stack, yapı ve aşama kuralları kayıtlı.

**A2 tamamlandı — Hub dünyası ve karakter:**
- `src/shafak/world/city-hub-layout.ts` — Sefer Haritası, Meydan Okuma Alanı, Siper Hattı, Günün Emri ve Kayıt Arşivi için beş ayrı fiziksel istasyon.
- `src/shafak/world/CityHub.tsx` — Kayıt Arşivi istasyonundan güncel sefer özeti/hedefi açılır; klavyede Escape ile kapanır ve kapatma odağı alınır.
- `src/shafak/world/CityHubScene.tsx` ve `src/shafak/world/city-hub-residents.ts` — beş istasyon aynı sahnede, sıcak grafit-altın çevre renkleri ve insan rig'li oyuncu/yerleşik karakterler korunuyor.
- `src/shafak/world/city-hub.css` — hub panelleri ve arşiv sheet'i ortak grafit-altın tasarım tokenlarını kullanıyor.
- `src/shafak/world/city-hub-layout.test.js` ve mevcut `city-hub-camera.test.js` / `city-hub-residents.test.js` — yeni istasyon, hareket, kamera açıklığı ve yerleşik kontrolleri.

**A1 doğrulama — 19 Kasım 2026:**
- `npm test` — 801/801 geçti.
- `npm run typecheck` — geçti.
- `npm run build` — geçti; statik `dist/` üretildi.
- `git diff --check` — geçti.
- Mobil önizlemede Sunvoria yaş doğrulama ekranı göründü; tarayıcıda uygulama hatası yok. Etkileşim yapılamadığı için giriş sonrası kabuk ve 3D pikseller bu görüntüde doğrulanmadı.

**Vercel derleme teşhisi — 19 Kasım 2026:**
- Ekli Vercel çıktısında `npm ci` ve Vite build başarılı; hata sonraki dondurulmuş pnpm kurulumunda oluştu.
- `package.json` içindeki `zustand@^5.1.0`, `pnpm-lock.yaml` kök importer'ında eksikti; kilit dosyası 5.1.0 sürümüyle eşitlendi.
- `pnpm install --frozen-lockfile --lockfile-only --ignore-scripts` — geçti. Düzeltme `main` dalına gönderildi; bu commit'in Vercel build sonucu henüz doğrulanmadı.

**A2 doğrulama — 19 Kasım 2026:**
- `npm test` — 801/801 geçti.
- `npm run typecheck` ve `npm run build` — geçti.
- Mobil önizleme yaş doğrulama ekranında kaldı; giriş sonrası hub ve 3D sahne görsel olarak doğrulanmadı.

**A3 tamamlandı — Sefer/koşu ortak GameRuntime'e bağlandı:**
- `src/core/game-runtime.ts` — sabit-adım güncellemelerinden sonra bir kez çalışan, adım sayısı ve interpolasyon alfa değerini veren kare aboneliği eklendi.
- `src/shafak/world/WorldScene.tsx` — sefer simülasyonu ayrı `requestAnimationFrame`/akümülatör yerine ortak Canvas sürücüsünün sabit adım sayısını ve interpolasyonunu kullanıyor. Sekme gizlenince zaman biriktirme ve takılı kalan hareket/savaş girdileri temizleniyor.
- Mevcut hareket, çarpışma, kapı ilerlemesi, düello, ödül toplama ve yerel/hesap kaydı akışlarının kodu korunuyor; kayıt şeması ve Sunvoria adı değiştirilmedi.
- `src/core/game-runtime.test.ts` — sabit güncellemelerden sonra kare bildirim sırasını ve interpolasyon durumunu test ediyor.
- Doğrulama: `npm test` — 802/802; A3'e yönelik GameRuntime/sefer hareketi/kampanya/kayıt testleri — 32/32; `npm run typecheck`, `npm run build` ve `git diff --check` geçti. Uygulama yeniden başladı; önizleme yaş doğrulama ekranını gösterdi ve tarayıcı konsolunda çalışma zamanı hatası yok.
- Sınır: Kimlik doğrulaması veya yaş kapısı atlanmadı; bu nedenle sefer sahnesi, WebGL hareketi ve gerçek telefon dokunmatik kabulü bu oturumda görsel olarak doğrulanmadı. Bu çalışma alanında Clerk ve `DATABASE_URL` yapılandırılmadığından hesap tabanlı kayıt akışı da canlı olarak denenemedi.

**Bilinen hatalar ve sonraki aşamalara kalanlar:**
- Eski oyun akışları `src/shafak/` altında korunuyor; yeni çekirdeğin input, kamera, yükleme ve havuz API'lerine oyun mantığının aşamalı taşınması A4–A7 kapsamındadır.
- Gerçek iPhone Safari FPS/bellek ve WebGL cihaz kabul testleri yapılmadı.
- War Room önizlemesi yaş doğrulama ekranında kaldığından baskın sahnesi bu turda görsel olarak doğrulanmadı; yaş ekranı atlanmadı.
- Vercel kilit dosyası düzeltmesi `main` dalına gönderildi; yeni Vercel build sonucuna erişip doğrulayamadım.
- A6–A7 henüz başlamadı.

**A4 başlangıç incelemesi — 2026-11-20:**
- Savaş Odası zaten tek kabuk/ortak Canvas içinde; ana sahne `useFrame` delta'sı ve oyuncu için ayrı sabit-hareket akümülatörü kullanıyor.
- Sağ yarı kamera bakışı, sol dinamik joystick, üçüncü şahıs kamera, nişan strafe'i ve silah viewmodel davranışı mevcut; bu aşamada korunacak.
- Baskın yüklemesi, oda/ödül/profil kayıtları ve war-room loadout'ı mevcut akışlar; şema veya eşya sahipliği değiştirmeyeceğim.

**A4 sonucu — 2026-11-20:**
- Savaş Odası simülasyon delta'sı ve oyuncu hareket zamanlaması ortak GameRuntime kare adımlarından besleniyor; mevcut çarpışma/interpolasyon akışı, üç adımlı hareket sınırı, duraklatma ve sinematik yavaş çekim korundu.
- Var olan `arena` mod eşlemesi, oda/ödül/profil kayıt anahtarları ve eşya sahipliği değiştirilmedi.
- Doğrulama: 806 test geçti; typecheck ve üretim build'i geçti; uygulama iş akışı temiz açıldı ve önizleme ekranında tarayıcı çalışma hatası görülmedi.

**A5 başlangıç incelemesi — 2026-11-20:**
- Hub'da Meydan Okuma Alanı ve Siper Hattı girişleri, görev türleri ve Savaş Odası oyun mantığı zaten var; mevcut uygulama akışını yeniden kurmaya gerek yok.
- Ortak `GameMode` deposu her `war-room` ekranını `arena` sayıyor; Siper Hattı/Survival ve görev türü değişince `defense` olarak güncellenmiyor.
- Oda girişleri, kayıt anahtarları, görev sonuçları ve ödül hesaplamaları bu aşamada korunacak; yalnızca hub adları ve ortak mod eşlemesi düzeltilecek.

**A5 sonucu — 2026-11-20:**
- Hub istasyonları brief'teki “Meydan Okuma Alanı” ve “Siper Hattı” adlarını kullanıyor; Siper Hattı görev sonucu ve görev seçimi ekranında da aynı ad gösteriliyor.
- Ortak mod deposu raid/ikmal/günlük görevleri `arena`, survival/mevzi savunmasını `defense` olarak izliyor. Görev seçimi ve günlük görevin gerçek hedefi değiştikçe ortak mod da güncelleniyor.
- Mevcut oda akışı, localStorage kayıt anahtarları, ödüller, görev kuralları ve eşya sahipliği korunuyor.
- Doğrulama: `npm test` — 808/808; `npm run typecheck`, `npm run build` ve `git diff --check` geçti.
- Uygulama temiz yeniden başladı; önizlemede tarayıcı hatası yok. Yaş doğrulama ekranı açıldığı için hub/arena/savunma sahnesi bu turda görsel olarak doğrulanmadı.

**A6 başlangıç incelemesi — 2026-11-20:**
- Kampanya anlatısı, diyalog havuzu, operasyon bölümleri ve son ekran metinleri ayrı dosyalara dağılmış; ortak `src/data/story.ts` ve `src/data/strings.ts` kaynakları henüz yok.
- Kayıt Arşivi şu an bölüm/ilerleme özeti gösteriyor; dokuz hikâye parçasını listelemiyor ve operasyon finali için ayrı ödül ekranı yok.
- Ekli revizyonda oyun adını koruma talimatı, gövdenin daha ilerideki yeni isim önerileriyle çelişiyor. Kullanıcının açık ad koruma talimatı öncelikli; mevcut Sunvoria adı ve mevcut hub kimliği değiştirilmeden ilerle.

**Alınan kararlar:**
- Sunvoria adı ve mevcut marka varlıkları korunacak; oyun adı veya eski kayıt/iç kimlikler yeniden yazılmayacak.
- Grafit-altın token paleti ortak tema kaynağıdır; aşamalı taşımada yeni sabit renkler eklenmeyecek.
- Mevcut oyun, Clerk, hesap kayıtları, satın almalar ve sahneler geçiş boyunca korunacak.
- Sunvoria adı ve mevcut kayıtlar korunacak. Kilit düzeltmesi GitHub'a gönderildi; Vercel production build sonucu doğrulanmadan başarılı sayılmayacak.

**Eksik asset listesi:**
- A1 için yeni model veya ses asset'i gerekmiyor.
- A2 şehir hub'ı `public/models/kuzgun-soldier.glb` humanoid rig'ini kullanıyor; `public/models/player-hero.glb` ve `public/shafak-ui-chime.ogg` diğer sahneler için korunuyor.

**Son güncelleme:** 2026-11-20 07:32 Europe/Istanbul.

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

## Ek kapsam — 14 Ekim 2026

İstenen yeni işler dört aşamalı. Bu bölüm eski tamamlanmış aşamaları değiştirmez;
ekli geliştirme listesindeki devam noktasını tutar.

### Aşama 1 — hata düzeltmeleri

**Durum:** Kod düzeltmeleri tamamlandı. Gerçek iPhone Safari kabul ölçümü hâlâ
yapılmadı.

- Sandık, barikat ve yol rakipleri için ortak etkileşim kaydı eklendi. İpucu,
  kayıtlı 3D nesnesi sahneye bağlı ve görünür, etkin ve yakınsa gösteriliyor;
  yakınlık 125 ms'de bir yenileniyor. Eylem anında konum ve nesne tekrar
  doğrulanıyor.
- Sahne parçası kaldırılınca etkileşim kaydı kaldırılıyor; açılan sandık ve
  kırılan barikat kimlikleri oyuncu bazında yerel kayda yazılıyor ve yeniden
  yüklemede etkinleşmiyor.
- Ayarlardan açılan performans paneline son karenin draw-call değeri eklendi.
- Hesap dünyası ilerlemesi, istek sürerken gelen son konumu kaybetmeyen bir
  asenkron kuyrukla 3 saniyede bir eşitleniyor. Aynı anda ikinci istek açılmıyor;
  yeni konumlar birleştiriliyor, kapı geçişi/sekmeden ayrılma/sahne kapanışında
  öncelikli kayıt deneniyor. Ağ hatasında son konum sonraki güncellemeye kadar
  kuyrukta kalıyor; yerel kayıt ağdan bağımsız devam ediyor.
- Düello/ödül/mağaza gibi hesap değişiklikleri mevcut sunucu işlemlerinde oyun
  döngüsünden ayrı olarak gönderiliyor; yol konumu için ayrıca düzenli
  eşitleme var.
- Yerel doğrulama: `npm run typecheck`, `npm test` (153 test) ve
  `npm run build` geçti. Büyük `WorldScene` paketi için 500 kB uyarısı sürüyor.
- Gerçek iPhone Safari ölçümü, Chrome Performance profili ve WebGL'li cihazda
  görsel kabul testi bu ortamda yapılmadı; 30+ FPS/50+ FPS cihaz hedefleri
  kanıtlanmış sayılmaz. Sekme kapanırken tarayıcının ağ isteğini durdurması da
  mümkündür; yerel ilerleme yedeği korunur.

### Aşama 2 — savaş sistemi genişletme

**Durum:** Aşama 2.3 tamamlandı. Aşama 2.4'te ilk rakip davranışları, beş yeni
rakip türü ve bölüm bossları eklendi; zorluk eğrisi ile karakter yüz ifadeleri
sonraki dilim olarak kaldı.

- Düello saldırılarına zamanlı hafif-hafif-ağır zinciri eklendi. Hızlı basışlar
  arasında 78 oyun karesi (1,3 saniye) süre var; ikinci hafif vuruş %10, ağır
  bitirici %25 ek hasar verir. Kaçırma, blok/parry veya hasar alma zinciri keser.
- Düello HUD'ında zincirin sonraki vuruşu Türkçe gösteriliyor; zincir ve hasar
  simülasyon içinde hesaplandığından sunucu tekrar oynatımı deterministik kalır.
- Yerel doğrulama: savaş simülasyonu testleri zincir sırasını, hasar artışını ve
  süre aşımında sıfırlanmayı doğruluyor.

#### Aşama 2.3 — Akrobatik dövüş hareketleri

- Kaçınma hamlesi kısa süreli dokunulmazlık sağlıyor; art arda geri kaçış
  taklaya dönüşüyor. Zıplama sonrasında saldırı, yere iniş vuruşuna dönüşüyor.
- Dövüşçüler rakibe dönük kalırken oyuncu yanlara kayabiliyor; mobil dövüş
  kontrollerinde zıplama düğmesi mevcut. Silah türüne göre hareket ve saldırı
  süreleri kullanılıyor.
- Bu hareketlerin sunucu tekrar oynatımındaki deterministik akışı test ediliyor.

#### Aşama 2.4 — Rakip davranışları, yeni türler ve bosslar

- Dört mevcut arketip farklı taktiklerle savaşıyor: ağır baskı, blok ağırlıklı
  savunma, menzilli okçuluk ve hızlı gölge saldırıları. Okçu, oyuncuya uzaktan
  telegraph gösterip ok gönderebiliyor; yakınında geri çekiliyor.
- Rakip canı yarının altına indiğinde öfke fazı başlıyor: saldırı araları ve
  telegraph kısalıyor, saldırganlık/hareket hızı artıyor. HUD etiketi ve kırmızı
  arena ışığı fazı görünür kılıyor.
- Arketip sunucudaki düello kaydına göre seçilip aynı seed'li tekrar oynatımda
  yeniden kullanılıyor; istemcinin farklı rakip davranışı seçmesine izin
  verilmiyor.
- Beş yeni taktik türü eklendi: fırtına mızrakçısı, yarık berserkeri, kül
  simyacısı, zehir suikastçısı ve ayaz avcısı. Bölümler arasında dokuz normal
  arketip döngüye giriyor; zehir, yanma ve dayanıklılık etkileri dövüşte
  simüle ediliyor.
- Her bölümde dört normal karşılaşma ve geçitten önce beşinci karşılaşma olarak
  boss bulunuyor. İlk bölümün mevcut dört rakibi korunuyor; sonraki bölümlerde
  normal türler dokuz arketip arasından döngüye giriyor. Boss kendi görünümüne, daha yüksek can/hasara ve
  sunucuda doğrulanan ödül sınırına sahip; beşinci rakip yenilmeden yeni kapı
  açılmıyor.
- Boss kimliği `0–4` aralığında sunucuda doğrulanıyor ve arketip sunucu
  tekrarında aynen kullanılıyor. Daha önce geçilmiş kapılar eski kayıtların
  ilerleme mesafesiyle korunuyor.
- Yerel doğrulama: `npm run typecheck`, `npm test` (178 test) ve
  `npm run build` geçti; büyük `WorldScene` paketi için 500 kB uyarısı sürüyor.

### Devam noktası

- Aşama 1 kod çalışmaları tamamlandı; gerçek cihaz kabul ölçümü bekliyor.
- Aşama 2.4'te bölüm ilerlemesine göre zorluk eğrisi ve öfke anında karakter
  yüz/göz görselleri sırada.
- Sonra Aşama 3'te ekipman ve mağaza sistemini, Aşama 4'te Kül Yolu
  görsellerini ve etkileşimlerini sırayla uygula.
- Dış Vercel dağıtımına push/deploy yapma; kaynak değişiklikleri burada kayıtlı
  bırakılır ve yayınlamayı kullanıcı yapar.

### Düello doğrulaması ve sunumu — 14 Ekim 2026

- Mobil joystick'in yüzde ölçekli eksenleri ondalıklı değer olarak sunucuya
  gönderilebiliyor; düello kaydı bu eksenleri sınırlandırıp aynen tekrar oynatıyor.
  Tick ve düğme bitleri tam sayı olarak kalıyor.
- Mobil düello kamerası oyuncunun arka-sağ omuzundan daha geniş açıyla bakıyor;
  oyuncu ve rakibi aynı karede tutarken oyuncuyu rakibe dönük bırakıyor.
- Elde taşınan prosedürel silah biraz dışarı/öne alınıp okunaklılığı artırıldı.
  Rakip isabet alınca kısa gövde sarsılması yapıyor; yenilen model animasyonla
  yere düşüp görünür kalıyor, küle dönüşme parçacıkları ek efekt olarak sürüyor.
- Yerel doğrulama: `npm test` (163 test), `npm run typecheck`,
  `npm run build` ve `git diff --check` geçti. Dövüş kamerası ve ondalıklı
  joystick alanları için regresyon testleri eklendi.
- Replit önizlemesi açılıyor; bu çalışma alanında Clerk ve veritabanı
  yapılandırılmadığından hesaba bağlı gerçek düello API'si devre dışı. Gerçek
  iPhone Safari/WebGL dövüş sahnesi ve Vercel'de sonuç kaydı doğrulanmadı.
- Kullanıcı Vercel'e push/deploy yapacağından bu kaynaklar yayınlanmak üzere
  bırakıldı; bu oturumda push veya deploy yapılmadı.

## Sunvoria açılışı ve aydınlık sahne — 19 Kasım 2026

- Kullanıcı Sunvoria adını kabul etti; açılış ve ana menü artık aynı güneşli
  Sunvoria ekranını kullanıyor. Eski marka metinleri görünür arayüzden kaldırıldı;
  kayıt/API uyumluluğu için sabit iç kimlikler değiştirilmedi.
- Dünya ve düello sahnelerinde kameraya bağlı gökyüzü küresi kapatıldı. Sahne
  arka planı gökyüzü dokusu olarak kalıyor; gündüz renkleri, bulutlar ve güneş
  daha belirgin. Düello arka planına da görünür güneş eklendi.
- Yerel doğrulama: `npm run typecheck`, `npm test` (790 test), `npm run build`
  ve `git diff --check` geçti.
- Önizleme ekran görüntüsü yaş doğrulama kartında durdu; bu oturumda yaş onayı
  verilmedi, ana ekran ve 3D oyun görüntüsü görsel olarak doğrulanmadı. Clerk,
  Vercel yayını, push ve deploy değiştirilmedi.
