# Play Store v1.0.0 hazırlığı

## Adımlar

1. **Yatay/dikey mod ve arayüz — Tamamlandı**
2. **Nişan ve ateş — Tamamlandı**
3. **Hareket ve takılmalar — Tamamlandı**
4. **Menü, mağaza, silahlar — Tamamlandı**
5. **Savaş odası ve düello — Tamamlandı**
6. **Hikâye, zorluk, final — Tamamlandı**
7. **Prenses 3D modeli (oyuncu iskeleti) — Tamamlandı**
8. **Performans, boyut, Play Store — Kod tamamlandı; yayın öncesi kullanıcı işlemleri bekliyor**

## Adım 1 — Yatay/dikey mod ve arayüz

- **Durum:** Tamamlandı.
- **Yapılanlar:** Profil penceresi oyunun koyu-altın görsel diline alındı; portrede tek sütuna, yatayda iki sütuna geçiyor ve kısa ekranlarda kendi içinde kayıyor. Menü, dinamik viewport yüksekliği ve güvenli alan paylarıyla taşmadan kaydırılabilir. Toast metinleri büyütülüp güvenli alan içine alındı. Savaş Odası'ndaki yatay ekran kilidi, portrede oyunu durduran mantık ve yönlendirme katmanı kaldırıldı; döndürme sırasında etkin HUD ve maç durumu korunuyor.
- **Manifest:** `public/manifest.webmanifest` zaten `"orientation": "any"` kullanıyor; değiştirilmedi.
- **Ghost kontrolü:** Kaynakta `ghost` adlı bileşen/sınıf bulunmadı; yatay yönlendirme yardımcısı artık yön kilitlemiyor ve yönü engelleyen metin göstermiyor.
- **Doğrulama:** Menü ve profil 360×800, 412×915, 800×360 ve 915×412 boyutlarında Chromium'da açıldı. Döküman yatay taşması yoktu; profil kartı güvenli alan içinde kaldı, dar yükseklikte kendi içinde kaydı. Savaş Odası aktif HUD'u 800×360'tan 360×800'e döndürülünce görünür kaldı; yönlendirme katmanı veya yatay taşma oluşmadı.
- **Testler:** `npm test` — 574 geçti; `npm run typecheck` — geçti; `npm run build` — geçti. Derleme mevcut büyük parça uyarısını verdi; Adım 8'de ele alınacak.
- **Yarım kalanlar:** Kod tarafında yok.
- **Doğrulanamayanlar:** Gerçek iPhone Safari'de safe-area, dokunma ve döndürme kabul testi yapılmadı. Diğer cihaz/hesap durumlarına bağlı ekranların elle kabul testi ayrıca gerekir.
- **Değişen dosyalar:** `ILERLEME.md`, `src/shafak/App.css`, `src/shafak/LandscapeOrientationHint.tsx`, `src/shafak/game/ProfilePanel.tsx`, `src/shafak/game/profile-panel.css`, `src/shafak/game/WarRoomGame.tsx`, `src/shafak/game/war-room.css`, `src/shafak/gameplay-layout.css`.

## Adım 2 — Nişan ve ateş

- **Durum:** Tamamlandı; önceki oturumun kayıtlarında tam dokunma E2E'si geçti ve Adım 2 yerel commit edildi.
- **Yapılanlar:** ADS'de silah görünümü aşağı/yan tarafa alınıp küçültülerek nişangâh ve hedef görüşü açıldı. Joystick, ADS ve ateş ayrı pointer kimlikleriyle aynı anda tutulabiliyor; birinin bırakılması diğerlerini kesmiyor. 844×390 ve 932×430'da nişan/ateş hedefleri en az 48×48 px.
- **Doğrulama:** Önceki oturum kaydı: 30 ilgili birim testi, E2E'de çoklu dokunma/bağımsız bırakma/iptal/duraklatma/döndürme ve typecheck başarılı. Bu oturumda typecheck ve seçili giriş testleri 22/22 geçti. E2E yeniden çalıştırması joystick alt adımını geçti; yazılım WebGL kullanan Chromium'da her CDP dokunma olayı 4–6 saniye sürdüğü için tam akış ShellExec zaman sınırına takıldı. Test başlangıcı artık görünür debug katmanı yerine kayıtlı tanı ayarını kullanıyor; beklenen deprecation uyarıları hata sayılmıyor, gerçek konsol hataları hâlâ başarısız kılıyor.
- **Yarım kalanlar:** Bu oturumdaki E2E yeniden çalıştırmasının kamera bakışı, üç parmak, iptal, duraklatma ve döndürme bölümleri süre sınırı nedeniyle tamamlanmadı; önceki oturumdaki başarılı E2E kaydı korunuyor.
- **Doğrulanamayanlar:** Gerçek telefonda eşzamanlı nişan/ateş ve dokunma alanı kabul testi.
- **Değişen dosyalar:** `scripts/war-room-mobile-e2e.mjs`, `src/shafak/game/war-room-input.test.js`, `src/shafak/game/war-room-responsive.css`, `src/shafak/game/war-room-viewmodel.ts`, `src/shafak/game/war-room-viewmodel.test.js`, `src/shafak/world/WarRoomFirstPersonArms.tsx`, `src/shafak/world/WarRoomScene3D.tsx`, `ILERLEME.md`.

## Adım 3 — Hareket ve takılmalar

- **Durum:** Tamamlandı (kod, hedefli testler, tür denetimi ve üretim derlemesi).
- **Yapılanlar:** Mevcut silah bob/sway yumuşatma, kamera ile aynı karede view-model güncellemesi ve `normal/düşük/kapalı` ayarı korundu. Oyuncu yer hareketi 60 Hz sabit adımlı alt hareketlere geçirildi; çizim için önceki ve güncel çarpışma çözülmüş konumlar arasında interpolasyon eklendi. Kare süresi sıçraması dört simülasyon adımıyla sınırlandırıldı, ışınlanma/oda geçişinde interpolasyon geçmişi sıfırlanıyor. Kapı ve eşik çarpışmaları, daire-kutu çarpışması, duvar boyunca kayma ve merdiven/balkon düşüş davranışı zaten mevcut ve değişmeden korundu. FPS/tanılama HUD'u yalnızca kalıcı Ayarlar tercihiyle açılıyor; test ayarı da bu tercihi kullanıyor.
- **Doğrulama:** Yeni sabit adım testleri 4/4; kapı, çarpışma, görünüm ve FPS ayarı testleriyle birlikte toplam 46 hedefli test geçti. `npm run typecheck` ve `npm run build` başarılı. Build hâlâ 500 kB üzeri parça uyarısı veriyor; Adım 8 kapsamı.
- **Yarım kalanlar:** Kod tarafında yok.
- **Doğrulanamayanlar:** 60 FPS hedefi orta seviye gerçek Android telefonda ölçülmedi. Bu ortamın yazılım WebGL E2E'si dokunma başına 4–6 saniye sürdüğünden telefon performansı yerine kullanılamaz.
- **Değişen dosyalar:** `src/shafak/game/war-room-fixed-movement.ts`, `src/shafak/game/war-room-fixed-movement.test.js`, `src/shafak/world/WarRoomScene3D.tsx`, `ILERLEME.md`.

## Adım 4 — Menü, mağaza, silahlar

- **Durum:** Tamamlandı (kod, testler, tür denetimi ve üretim derlemesi).
- **Yapılanlar:** Ana menüden mağaza/envanter/demirciye doğrudan geçiş zaten doğru sekmeyi seçiyordu; ilk açılış hikâyesi artık bu paneli örtmüyor. Bölüm hikâyeleri panel kapatılana kadar bekliyor ve her açılış/bölüm hikâyesi tarayıcıda bir kez gösteriliyor; NPC konuşmaları tekrarlanabilir. Atla, Escape ve tamamını göster akışları korunup uzun daktilo metinleri kaydırılabilir hale getirildi. War Room silahlarının mağaza detayları artık sıfır RPG bonusları yerine gerçek hasar, atış aralığı, şarjör, yedek mühimmat, doldurma süresi ve menzili gösteriyor. Bu silahlar normal ekipman yuvasına eklenmedi; satın alınan silahın hazırlık ekranındaki iki yuvada seçilebildiği yükleme testiyle doğrulandı. Hesap, envanter ve para kaydına dokunulmadı.
- **Doğrulama:** 6 yeni hedefli test geçti; `npm test` — 586 geçti; `npm run typecheck` — geçti; `npm run build` — geçti. Mobil önizlemede 402×874 açılış ekranı yüklendi, tarayıcıda uygulama hatası görülmedi. Üretim derlemesindeki 500 kB üzeri `time-of-day` parça uyarısı Adım 8 kapsamına bırakıldı.
- **Yarım kalanlar:** Kod tarafında yok.
- **Doğrulanamayanlar:** Önizleme görüntüsü etkileşim yapamadığı ve gerçek mağaza alımı kayıtlı oyun parasını değiştireceği için mağaza sekmeleri, hikâye atlama ve gerçek profilde satın alma/iki yuvaya yerleştirme uçtan uca tıklanmadı. Bunlar cihazda elle kabul testinde kontrol edilmeli.
- **Değişen dosyalar:** `ILERLEME.md`, `src/shafak/game/store-catalog.ts`, `src/shafak/game/store-ui/StorePanel.tsx`, `src/shafak/game/war-room-store-items.test.js`, `src/shafak/world/story-dialogue-progress.test.js`, `src/shafak/world/story-dialogue-progress.ts`, `src/shafak/world/StoryDialogueOverlay.tsx`, `src/shafak/world/WorldScene.tsx`, `src/shafak/world/world-scene.css`.

## Adım 5 — Savaş odası ve düello

- **Durum:** Tamamlandı (kod, hedef testler, tür denetimi ve üretim derlemesi).
- **Yapılanlar:** Savaş Odası hazırlığında silah yuvası seçimi ve `BAŞLA` doğrulaması korunup yenilgi sonuç ekranına da açık çıkış eklendi. Düello sonucunda ödüller kaydedildikten sonra hem keşfe devam hem doğrudan ana menüye dönüş var. Boss zaferi bir mühür parçası verir; normal zafer, yenilgi ve beraberlik bu malzemeyi üretmez. Kural hem misafir kayıtlarında hem sunucu tarafında uygulanıyor ve sunucu boss bilgisini kendi rakip kaydından alıyor. Savaş Odası silah satın alma bildirimi, silahın normal düello ekipmanına değil hazırlık yuvalarına gittiğini açıkça belirtiyor. Botların duvar çevresi ve merdiven rotaları mevcut çarpışma testleriyle doğrulandı.
- **Doğrulama:** 42 ilgili test geçti (sunucu düello/ödül, bot davranışı, hasar/sağlık ve çevresel çarpışmalar); `npm run typecheck` — geçti; `npm run build` — geçti. Üretim derlemesinde 500 kB üzeri `time-of-day` parça uyarısı sürüyor; Adım 8 kapsamında ele alınacak.
- **Yarım kalanlar:** Kod tarafında yok.
- **Doğrulanamayanlar:** Gerçek hesapla düello ödülünün veritabanına yazıldığı ve ana menü dönüşünün telefonda dokunmayla kabul testi yapılmadı; sunucu ödül mantığı birim/servis testleriyle doğrulandı.
- **Değişen dosyalar:** `ILERLEME.md`, `server/duelService.ts`, `server/duelService.test.js`, `src/shafak/game/DuelResults.tsx`, `src/shafak/game/WarRoomResult.tsx`, `src/shafak/game/profile.ts`, `src/shafak/game/profile-rewards.test.js`, `src/shafak/game/types.ts`, `src/shafak/world/WorldScene.tsx`.

## Adım 6 — Hikâye, zorluk, final

- **Durum:** Tamamlandı (kampanya akışı, ekonomi ayarı, testler, tür denetimi ve üretim derlemesi).
- **Yapılanlar:** Hikâye kayıp prenses, karanlığın ele geçirdiği krallık ve dokuz Mühür Parçası çevresinde tutarlı hale getirildi; üç bölgede her bölüm için kısa bilgi metinleri var ve açılış/menü sloganları değiştirildi. Bölüm başına rakip sayısı 5'ten 9'a kademeli yükseliyor; her bölümün son karşılaşması boss, rakip seviyesi ve savaş istatistikleri bölüm ilerledikçe artıyor. Son bossun ardından ödülleri, prensesin diyaloğunu ve “Oyun Tamamlandı” ekranını gösteren final akışı bağlandı. Yeni Oyun+ yalnız final bossu yenilince (eski kayıtlarda son kapı geçilmişse de) açılıyor; yeniden başlamayı onaylatıyor, zorluğu Zor'a alıyor ve yalnızca bölüm konumu ile yol rakibi kayıtlarını temizliyor. Profil, para, envanter, ekipman, yükseltmeler ve ganimetler korunuyor. Gelecekteki düello altını düşürüldü, Zor yol artık ekstra altın vermiyor; demirci yükseltme maliyetleri kademeli artırıldı. Mevcut oyuncu kayıtları değiştirilmedi.
- **Doğrulama:** `npm test` — 598 geçti; `npm run typecheck` — geçti; `npm run build` — geçti. Kampanya bölümleri, final kapısı, boss ölçeklemesi, hikâye metinleri, ödül hızı ve yükseltme maliyetleri için yeni/hedefli testler eklendi.
- **Yarım kalanlar:** Kod tarafında yok.
- **Doğrulanamayanlar:** WebGL bağlamı bu önizleme tarayıcısında açılamadığı için gerçek 3D boss zaferi, final ekranının telefondaki görünümü ve Yeni Oyun+ dokunma akışı cihazda elle kabul testine bırakıldı. Derleme büyük `time-of-day` parçası uyarısı veriyor; Adım 8 kapsamında ele alınacak.
- **Değişen dosyalar:** `ILERLEME.md`, `server/profileApi.ts`, `server/duelService.ts`, `src/shafak/App.tsx`, `src/shafak/i18n/tr.ts`, `src/shafak/intro/IntroCinematic.tsx`, `src/shafak/game/profile.ts`, `src/shafak/game/profile-rewards.test.js`, `src/shafak/game/store-balance.ts`, `src/shafak/game/store-balance.test.js`, `src/shafak/world/CampaignEnding.tsx`, `src/shafak/world/WorldScene.tsx`, `src/shafak/world/campaign-ending.css`, `src/shafak/world/campaign-progression.ts`, `src/shafak/world/campaign-progression.test.js`, `src/shafak/world/story-dialogue.ts`, `src/shafak/world/story-dialogue.test.js`, `src/shafak/world/world-bot-profiles.ts`, `src/shafak/world/world-chapter-coverage.test.js`, `src/shafak/world/world-content.ts`, `src/shafak/world/world-content.test.js`, `src/shafak/world/world-progress.ts`.

## Adım 7 — Prenses modeli

- **Durum:** Tamamlandı (oyuncu GLB iskeleti ve animasyonlarıyla kodla üretiliyor; harici prenses GLB'si gerekmiyor).
- **Yapılanlar:** `player-hero.glb` aynı iskelet ve iskeletli karakter animasyonları için klonlanıyor. Koyu kızıl/altın palet, yere yakın uzun etek ve hafif salınımı, uzun saç, taç ve taş Three.js geometrisiyle ekleniyor; aksesuar boyutu kemiklerin fit sonrası dünya ölçeğine göre dengeleniyor. Final ekranı açılınca model bileşeni dinamik yükleniyor; model hazır olduktan sonra kısa yürüyüş, el sallama ve konuşma döngüsüne geçiyor. Finalde kamera yönüne dönüyor. Portre/yatay kamera kadrajı ayrı hesaplanıyor. Dinamik import, GLB veya WebGL hatasında alttaki SVG silueti görünür kalıyor.
- **Dosya gereksinimi:** `public/models/princess.glb` yüklenmez ve üretilmez. Yeniden kullanılan `public/models/player-hero.glb` 660.208 bayt; ayrı prenses varlığı yok.
- **Doğrulama:** Hedefli prenses testleri — 6/6; tam `npm test` — 611/611; `npm run typecheck` — geçti; `npm run build` — geçti. Üretim derlemesinde `PrincessModelReveal` ayrı bir dinamik chunk; oyuncu GLB'si veya prenses geometrisi açılış ekranı paketine eklenmedi. Mobil önizleme açılış ekranını uygulama hatası olmadan yükledi; son sahneye önizlemede etkileşimle ulaşılamadığı için modelin gerçek WebGL görüntüsü ayrıca doğrulanmadı.
- **Doğrulanamayanlar:** Gerçek iPhone/Android üzerinde 3D görünüm, WebGL bağlamı ve döndürme sırasında final sahnesi cihazda gözle doğrulanmadı.
- **Yarım kalanlar:** Kod tarafında yok; cihaz kabul testi yayın öncesi kontrol listesinde.
- **Değişen dosyalar:** `ILERLEME.md`, `public/models/princess-upload.md`, `src/shafak/world/CampaignEnding.tsx`, `src/shafak/world/PrincessModelReveal.tsx`, `src/shafak/world/princess-character.ts`, `src/shafak/world/princess-character.test.js`, `src/shafak/world/princess-model-config.ts`, `src/shafak/world/princess-model-config.test.js`.

## Adım 8 — Performans, boyut, Play Store

- **Durum:** Uygulama kodu ve web yayın hazırlığı tamamlandı; Play Store'a yüklenebilir imzalı paket için kullanıcıya bağlı son işlemler bekliyor.
- **Yapılanlar:** Vite parça bölme sınırları büyük kod uyarısını kaldırıyor; ana ilk yükleme HTML/JS/CSS grafiği 0,32 MiB ham ve 0,10 MiB gzip. Ana menü ve oyun bölümleri tembel yükleniyor. Büyük görseller WebP, arayüz sesi OGG; `public/assets` içindeki dört GLB oyun kaynak kodunda kullanılıyor, Draco dosyaları model yükleyicisi için gerekli, bu yüzden kullanılmayan büyük bir dosya silinmedi. Savaş Odası efekt havuzları, yeniden kullanılan dünya/kare tamponları, grafik kalite seçenekleri, düşük kalitede gölge kapatma ve geometri/malzeme/doku temizliği mevcut. Gizlilik ve hesap/veri silme sayfaları herkese açık ve Ayarlar'dan bağlı; silme API'si aynı-köken, oturum ve açık onay istiyor, hesapla ilişkili dört sunucu tablosunu ve Clerk kimliğini siliyor. PWA manifesti, 192/512/maskable ikonlar ve yalnız çevrimdışı bilgilendirme sayfasını kullanan service worker hazır. Android kimliği `com.safaksavascilari.game`, hedef API 36, sürüm `1.0.0`; sürüm ana ekranda gösteriliyor.
- **Doğrulama:** `npm test` — 607/607 geçti; `npm run typecheck` — geçti; `npm run build` — geçti ve 500 kB üzeri parça uyarısı yok. PWA/hesap silme hedef testleri 15/15 geçti. Mobil önizlemede hesap silme onay kutusu ve yazılı onay boşken silme düğmesi devre dışı göründü. `https://handikap.vercel.app` üzerinde salt-okunur Android web ön kontrolü manifest, ikon, service worker, çevrimdışı ekran ve yasal sayfalarda geçti; yalnız gerçek sertifika parmak izi beklediği için başarısız oldu. Üretim `/api/health` Clerk anahtarlarının yapılandırıldığını bildirdi.
- **Veri güvenliği:** Hesap silme testi yalnız sahte Clerk yanıtı ve sahte veritabanı kullandı; gerçek hesap veya oyuncu kaydı silinmedi. Vercel üretiminde silme uç noktasıyla gerçek kullanıcı deneyi yapılmadı.
- **Yarım kalanlar / kullanıcı işlemleri:** Android/JDK SDK ortamda yok; APK/AAB üretimi ve imzalama Android Studio'da yapılmalı. `public/.well-known/assetlinks.json` içindeki yer tutucu gerçek debug ve Play App Signing SHA-256 parmak izleriyle değiştirilip Vercel'e yayınlanmalı; sonra `npm run android:validate:web` yeniden geçmeli. Gerçek Android telefonda giriş, TWA tam ekran bağlantısı, düello, Savaş Odası, geri tuşu, döndürme, çevrimdışı ekran, WebGL/FPS ve ayrı bir test hesabıyla hesap silme elle doğrulanmalı.
- **Doğrulanamayanlar:** İmzalı AAB, gerçek Play sertifikasıyla Digital Asset Links, Play Console yüklemesi ve gerçek cihaz kabul testleri bu çalışma alanında yapılamadı.
- **Değişen dosyalar:** `ILERLEME.md`, `docs/android-play-store.md`; uygulama varlıkları ve hesap silme/PWA altyapısı önceki yerel commitlerde hazırlanmıştı.
