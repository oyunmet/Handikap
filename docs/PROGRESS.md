# İlerleme notu

## SUNVORIA düzeltme talimatı — Faz 0

**Durum:** Bitti; kaynak kodda değişiklik yapılmadı.

- Talimattaki önceki durumdan farklı olarak `docs/SUNVORIA_SPEC.md` bu depoda yok; talimatın 4.3 aşamalarını karşılaştırmak için kullanıcı girdisi gerekir.
- Depo yönergeleri Sunvoria adını ve mevcut oyun kimliğini koruyor; çelişen eski marka/isim değişiklikleri uygulanmayacak.
- Faz 0 temel ölçümleri `docs/AUDIT/00-baseline.md` dosyasına, komut çıktıları `docs/AUDIT/00-*.txt` dosyalarına kaydedildi.
- Doğrulama: typecheck geçti; 830 test geçti; production build 2.95 saniyede tamamlandı ve `dist/` 23 MiB oldu.
- GitHub'a tag push yapılmadı; bu depoda push ve deploy kullanıcıya aittir.

## SUNVORIA düzeltme talimatı — Faz 1

**Durum:** Sürüyor.

- `package-lock.json` içinde 219 Replit içi tarball URL'si bulundu; URL'ler sürüm ve bütünlük hash'lerini koruyarak herkese açık npm adreslerine dönüştürülecek.
- Bu depoda daha önce Vercel'in `npm ci` sonrasında `pnpm install --frozen-lockfile` çalıştırdığı doğrulanmış. Bu nedenle `pnpm-lock.yaml` silinmeyecek; iki kilit dosyasının `package.json` ile eşleşmesi korunacak.
- Vercel Node 24.x kullanıyor; import edilen çalışma alanı Node 20.20.0. Yerel yapılandırma bu sürüm farkına göre hizalanacak.
- `npx depcheck` `.local/skills/` şablonlarını da taradığı için çok sayıda ilgisiz eksik paket raporladı; sonuç, uygulama bağımlılıklarını tek başına belirlemek için kullanılmayacak.

## Yeni mimari çalışması — 19 Kasım 2026

**Oyun adı:** Sunvoria. Mevcut ad, logo kimliği ve uluslararası marka korunacak; ekli brief'in çelişen yeni ad önerileri uygulanmayacak.

**Aşamalar:** A1 Core + tema + tek kabuk — bitti. A2 Hub dünyası + karakter — bitti. A3 Sefer/koşu — bitti. A4 FPS baskın — bitti. A5 Meydan Okuma + Siper Hattı — bitti. A6 Hikâye/diyalog/arşiv — bitti. A7 Cila, performans ve ad temizliği — sürüyor.

**Şu an yapılan iş:** A7'de mobil düello HUD'si ve silah/hançer kullanımı düzeltildi; cihaz ve oturumla canlı ödül doğrulaması bekliyor.

**Sıradaki 3 adım:**
1. Giriş yapılmış hesapla üretimde profil ve bir pickup ödülünü uçtan uca doğrula.
2. Gerçek telefonda düello, koş, eğil ve zıpla kontrollerini uçtan uca dene.
3. iPhone/Android FPS ve bellek ölçümünü al; sonuç olmadan performans iddiası yazma.

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
- A7 sürüyor; gerçek cihaz kabul ölçümü ve giriş gerektiren ödül isteği henüz doğrulanmadı.

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
- Ortak `src/data/story.ts` ve `src/data/strings.ts` kaynakları mevcut; açılış ve final ekranlarının bir kısmı hâlâ eski, ayrı metinler kullanıyordu.
- Kayıt Arşivi yalnız bölüm/ilerleme özeti gösteriyor; dokuz parçanın kilit durumunu ve operasyon finali hikâye ödülünü göstermiyordu.
- Profil yalnız son 64 rakibi saklıyor; eski hesap/yerel kayıtlarında kalıcı hikâye parçası listesi için geriye uyumlu ek alan gerekiyor.
- Ekli revizyonda oyun adını koruma talimatı, gövdenin daha ilerideki yeni isim önerileriyle çelişiyor. Kullanıcının açık ad koruma talimatı öncelikli; mevcut Sunvoria adı ve mevcut hub kimliği değiştirilmeden ilerle.

**A6 sonucu — 2026-11-20:**
- Açılış, final ve operasyon sonucu anlatıları ortak hikâye verisine bağlandı; operasyon finali ekranı kayıt parçasını, sonraki operasyon ipucunu ve mevcut altın/elmas ödüllerini gösteriyor.
- Yalnız doğrulanmış operasyon finali zaferi ilgili parçayı açıyor. Kayıt kimlikleri profil içinde ayrı ve kalıcı tutuluyor; son 64 rakibi sınırlayan listeye bağlı değil.
- Hub'daki Kayıt Arşivi dokuz parçanın kilit/açık durumunu ve sefer özetini gösteriyor. Eski yerel/hesap profilleri mevcut rakip kayıtlarından geriye uyumlu biçimde okunuyor; veritabanı şeması değiştirilmedi.
- Doğrulama: `npm test` — 812/812; `npm run typecheck`, `npm run build` ve `git diff --check` geçti.
- Önizlemede yalnız yaş doğrulama ekranı açıldı; giriş sonrası hub ve arşivin görsel kabulü yapılamadı. Yerel sunucuda Clerk ve `DATABASE_URL` yapılandırılmadığı için hesaplı canlı akış doğrulanmadı.
- A7 başlangıcında düello silahı/nişanı, mobil hareket tuşları ve ödül doğrulama hatası henüz ele alınmamıştı.

**A7 mobil düello HUD ve doğrulama — 2026-11-20:**
- `src/shafak/game/DuelControls.tsx` — telefonda doğrudan silah değiştiren, bekleme süresini bildiren dokunma tuşu eklendi. Bıçak etiketi yay yakın menzildeyken ve hançer adlarında doğru gösteriliyor.
- `src/shafak/game/world-duel-responsive.css` — portre düello düzeninde nişan tuşu açık bir ızgara hücresine yerleştirildi; silah yuvaları ve yetenek tuşları en az 48 px hedefe çıkarıldı.
- `src/shafak/game/duel-control-presentation.ts` ve testi — hançer, yakın yay, cephanesiz yay ve standart yakın dövüş etiketleri doğrulanıyor. `api-json` pickup istemcisi zaten iki sınırlı tekrar ve bekleyen gecikme kullanıyor; yanlış kimlik 400, oturum 401, veritabanı/depoya erişim hatası 503 olarak ayrılıyor.
- Yerel doğrulama: `npm test` — 816/816; `npm run typecheck`, `npm run build` ve `git diff --check` geçti. Uygulama temiz başladı; ekran görüntüsü yaş doğrulama kartında kaldı, giriş sonrası düello arayüzü bu nedenle görsel olarak incelenmedi.
- `https://handikap.vercel.app/api/health` — 200; veritabanı bağlı, gerekli tablolar eksiksiz, üretim Clerk anahtar kontrolleri true. Bu anlık sağlık kontrolü geçmiş pickup hatasının kök nedenini belirlemiyor. Bu çalışma alanındaki uygulama Clerk ve `DATABASE_URL` olmadan başladığından girişli profil/pickup yazma isteği denenmedi.
- Gerçek telefon, girişli üretim ödül akışı ve FPS/bellek ölçümü hâlâ bekliyor; A7 açık kalıyor.

**Alınan kararlar:**
- Sunvoria adı ve mevcut marka varlıkları korunacak; oyun adı veya eski kayıt/iç kimlikler yeniden yazılmayacak.
- Grafit-altın token paleti ortak tema kaynağıdır; aşamalı taşımada yeni sabit renkler eklenmeyecek.
- Mevcut oyun, Clerk, hesap kayıtları, satın almalar ve sahneler geçiş boyunca korunacak.
- Sunvoria adı ve mevcut kayıtlar korunacak. Kilit düzeltmesi GitHub'a gönderildi; Vercel production build sonucu doğrulanmadan başarılı sayılmayacak.

**Eksik asset listesi:**
- A1 için yeni model veya ses asset'i gerekmiyor.
- A2 şehir hub'ı `public/models/kuzgun-soldier.glb` humanoid rig'ini kullanıyor; `public/models/player-hero.glb` ve `public/shafak-ui-chime.ogg` diğer sahneler için korunuyor.

**Son güncelleme:** 2026-11-20 11:59 Europe/Istanbul.

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

## Düello sahnesi ve mobil kontroller — 27 Kasım 2026

- Düello sırasında yol joystick'i devre dışı bırakıldı; düello joystick'i
  hareketin tek kaynağı. Eski dünya girdisinin her karede dövüş hareketini sıfıra
  çekmesi kaldırıldı. Ekran yönü değişince veya pencere odağı kaybolunca hareket
  girdisi güvenli biçimde temizleniyor.
- Kamera çarpışma düzeltmesi, dövüş kamerasını dik ve oyuncudan yeterince uzakta
  tutuyor; engel algılandığında kamera çarpışma mesafesi korunuyor. Oyuncu ve
  rakibin ekranda ayrılması, rakip geçişlerinde kameranın daha az sıçraması için
  açı güncellendi.
- Görünür düğmeler saldırı, siper, zıplama ve tek bir “Diğer” düğmesine indirildi.
  Nişan, yetenekler, hızlı eşyalar, silah seçimi, kamera, yardım ve pes etme
  açılır panelde kaldı. Savaş motoru, sunucu doğrulaması ve ödüller değiştirilmedi.
- Yerel doğrulama: `npm run typecheck`, `npm test` (819 test),
  `npm run build` ve `git diff --check` geçti.
- Önizleme yeniden açılıyor; ekran görüntüsü yaş doğrulama kartında kaldığından
  düello sahnesi tarayıcıda veya gerçek iPhone'da görsel olarak test edilmedi.
  Push veya deploy yapılmadı.

## Düello WebGL hatası ve düğme görünümü — 27 Kasım 2026

- Yeni mobil ekran görüntüsünde ortak WebGL çizicisinin tekrar tekrar bağlam
  kaybettiği görüldü. Dokunmatik cihazlarda düello çizim çözünürlüğü, kalite
  ayarından bağımsız en çok 1.25 DPR olacak şekilde sınırlandı; masaüstü ve
  düello dışı kalite sınırları değişmedi.
- Savaş düğmeleri daha büyük, yüksek kontrastlı iki satırlı düzene alındı:
  zıplama ve siper üstte; “Diğer” ve büyük saldırı düğmesi altta. Yetenek,
  nişan ve eşya paneli ikincil eylemleri saklamaya devam ediyor.
- Yerel doğrulama: `npm run typecheck`, `npm test` (819 test),
  `npm run build` ve `git diff --check` geçti; uygulama yeniden başlatıldı.
- Kullanıcının Vercel yayını bu çalışma alanına bağlı değil; üretim günlükleri
  okunamadı ve bu değişiklikler yayınlanmadı. Gerçek iPhone düello ekranı bu
  oturumda görsel olarak doğrulanmadı.

## Savaş Odası sıfırdan yenileme — 28 Kasım 2026

- **İstek:** Kullanıcı taktik alanının bozuk olduğunu bildirdi ve tüm modu temiz bir yapıyla yeniden yazmamı istedi. Her aşamanın kod deposunda kaydedilmesini, kullanım limiti dolarsa çalışmanın kaldığı yerden sürdürülebilmesini özellikle belirtti.
- **Güvenli sınır:** Yeni uygulama tamamlanıp doğrulanana kadar mevcut mod çalışır durumda kalacak. Profil/ödül API’si, satın alınmış silahlar, ayarlar, görev türleri ve oda ilerlemesi korunacak; kullanıcı verisi sıfırlanmayacak. Git push veya deploy yapılmayacak.
- **İlk inceleme:** War Room giriş/React akışı, görev simülasyonu, 3D sahne, kayıt ve ödül bağlantıları haritalandı. Mevcut özellik kümesi yaklaşık 28.000 satıra yayılıyor.
- **Başlangıç doğrulaması:** `npm run typecheck` geçti; War Room hedef testleri 298/298 geçti. Bunlar bildirilen sorunu açıklamıyor. Önizleme yaş doğrulama ekranında kaldı; taktik sahne görsel olarak incelenemedi ve doğrulama atlatılmadı.
- **Aşamalar:** 0 akış ve koruma sınırları — tamamlandı. 1 kayıt uyumluluk katmanı — tamamlandı. 2 yeni oturum/simülasyon çekirdeği — sürüyor. 3 kontroller ve HUD. 4 3D alan ve görsel geri bildirim. 5 yeni modu bağlama ve eski alanı kaldırma. 6 test/build ve görsel kabul.
- **Aşama 1 sonucu:** Altın, oda ilerlemesi ve günlük tamamlanma işlemleri bağımsız `war-room-persistence.ts` modülüne taşındı. Mevcut `*-v1` anahtarları ve oda ilerleme JSON biçimi aynen korundu; bozuk kayıt ve depolama erişim hatası güvenli varsayılana düşüyor. Beş yeni test eklendi.
- **Doğrulama:** War Room testleri 303/303 geçti; `npm run typecheck` ve `npm run build` geçti. Üretim derlemesinin mevcut büyük Three.js paket uyarısı sürüyor.
- **Aşama 2 dilimi:** Briefing → battle → victory/defeat geçişleri React'ten bağımsız saf TypeScript durum makinesine taşındı ve mevcut War Room ekranı bu geçişleri kullanıyor. Geçersiz sonuç geçişleri reddediliyor; sonuç ekranlarından sonraki odaya başlama korunuyor.
- **Doğrulama:** War Room hedef testleri 307/307 geçti; `npm run typecheck` ve `npm run build` geçti. Dört yeni oturum-geçiş testi eklendi. Three.js büyük paket uyarısı sürüyor.
- **Aşama 2b sonucu:** Giriş başlangıcı, bağımsız boş HUD durumu, canlı runtime → HUD izdüşümü ve zafer/yenilgi/dalga sonucu kararı saf `war-room-simulation.ts` modülüne taşındı. 3D sahne HUD projeksiyonu ve görev sonuç kararını yeni modülden alıyor; görünüm ve oyun kuralları değişmedi. Canlı HUD koleksiyonları runtime verilerinden ayrıştırıldı.
- **Doğrulama:** War Room hedefleri 313/313 geçti; `npm run typecheck`, `npm run build` ve `git diff --check` geçti. Build'de mevcut Three.js büyük parça uyarısı sürüyor.
- **Aşama 2c sonucu:** Duruş, silah seçimi/değişimi, sıçrama ve kaçış eylemleri yeni simülasyon modülüne taşındı; tek-seferlik inputların tüketilmesi ve mevcut cooldown/stamina/weapon reset kuralları korundu.
- **Doğrulama:** War Room hedefleri 315/315 geçti; `npm run typecheck`, `npm run build` ve `git diff --check` geçti. Mevcut büyük Three.js parça uyarısı sürüyor.
- **Aşama 2d tamamlandı:** `WarRoomScene3D` hareket niyetini hesaplıyor; runtime konumunu, çarpışma çözümünü ve çizim enterpolasyonunu tek `advanceWarRoomPlayerMovement` simülasyon çağrısı yürütüyor. Ortak sabit-adım karesi ve sinematik yavaşlatma korunuyor; duraklamada birikmiş süre sıfırlanıyor.
- **Doğrulama:** Sabit hareket ve simülasyon hedef testleri 18/18 geçti; `npm test` 843/843 geçti; `npm run typecheck` ve `npm run build` başarılı. Build mevcut büyük Three.js parça uyarısını veriyor.
- **Aşama 2e tamamlandı:** Kat geçişi, sıçrama, iniş ve düşme hasarı runtime simülasyonuna taşındı; sahnedeki düşüş/yükseklik React referansları kaldırıldı. İniş algısı artık önceki karedeki 0,08 m eşiğine bağlı değil; 60 FPS'de hasarı kaçırmaması için havada kalma durumu runtime'da izleniyor.
- **Doğrulama:** Hareket ve simülasyon hedef testleri 20/20 geçti; `npm test` 845/845 geçti; `npm run typecheck`, `npm run build` ve `git diff --check` başarılı. Build mevcut büyük Three.js parça uyarısını veriyor.
- **Aşama 2f tamamlandı:** Pasif iyileşme, stamina, iyileştirme noktası toplama ve basılı tutarak sandık açma simülasyon sınırına taşındı. Ses ve görsel efektler sahnede kaldı; oyun kuralları ve etkileşim sırası korundu.
- **Doğrulama:** Hareket ve simülasyon hedef testleri 23/23 geçti; `npm test` 848/848 geçti; `npm run typecheck`, `npm run build` ve `git diff --check` başarılı. Build mevcut büyük Three.js parça uyarısını veriyor.
- **Aşama 2g tamamlandı:** Yeniden doldurma zamanlayıcısı ve oyuncu ateş girdisi (tek atış, otomatik basılı tutma, yay şarjı, melee basılı kalma süresi) simülasyon sınırına taşındı. Sahne yalnızca yeniden doldurma sesini ve çıkan ateş isteğinin 3D hedef/efekt çözümünü yürütüyor.
- **Doğrulama:** Hareket ve simülasyon hedef testleri 25/25 geçti; `npm test` 850/850 geçti; `npm run typecheck`, `npm run build` ve `git diff --check` başarılı. Build mevcut büyük Three.js parça uyarısını veriyor.
- **Aşama 2h tamamlandı:** Menzilli atış hazırlığı artık cooldown, şarjör, recoil, isabet geri bildirimi, saçılma ve şarj çarpanını simülasyonda güncelliyor. Sahne hedef/raycast çözümünü, ses ve efektleri yürütüyor.
- **Doğrulama:** Hareket ve simülasyon hedef testleri 26/26 geçti; `npm test` 851/851 geçti; `npm run typecheck`, `npm run build` ve `git diff --check` başarılı. Build mevcut büyük Three.js parça uyarısını veriyor.
- **Şu an:** Aşama 2 sürüyor. Sıradaki dilim isabet/öldürme sonucunu ve düşman karar güncellemelerini sahneden ayırmak; ardından kontrol/HUD, 3D alan ve yeni modu bağlama adımları gelecek.
