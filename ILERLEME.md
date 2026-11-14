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
9. **Test kısayolu — Tamamlandı**

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

## Adım 9 — Test kısayolu

- **Durum:** KISMEN — kayıt bağımsız final önizlemesi ve SVG yedek modu kaynakta mevcut. Canlı Vercel, `/api/debug-tools/status` yoluna uygulama API'sine ulaşmadan Vercel `NOT_FOUND` döndürüyor; bu yüzden iç içe yol için açık Vercel giriş dosyası eklendi, üretimde kullanılması için push/redeploy bekliyor. Normal açılış da başlangıç hata ekranına düşüyor; tarayıcı hata yığını bekleniyor.
- **Kısayol:** `https://handikap.vercel.app/?debug=final` prensesli final sahnesini; `https://handikap.vercel.app/?debug=final&fallback=1` SVG siluet yedeğini açar. Yeni API giriş dosyası Vercel'e dağıtıldıktan ve `DEBUG_TOOLS=1` ayarlandıktan sonra kullanılabilir. Bu ayar olmadan test kapısı kapalı kalır. Başlangıç hata ekranındaki kısa, hassas değerleri ayıklanmış hata mesajını görmek için `https://handikap.vercel.app/?debug=diagnostics` açılır; yalnızca aynı sunucu kapısı açıkken görünür, normal oyunculara ve Play Store TWA'ya gösterilmez.
- **Veri güvenliği:** Kısayol `WorldScene`, Clerk oyun oturumu ve profil yükleme/kaydetme akışını başlatmaz. Final ekranında Yeni Oyun+ düğmesi yoktur; yalnızca normal oyuna dönme düğmesi bulunur. Ödül veya ilerleme yazımı yapılmaz. TWA'nın `android-app://com.safaksavascilari.game` referrer'ı test kısayolunu yok sayar; Play Store uygulaması normal oyunda kalır.
- **Ortam değişkeni:** Vercel projesinde **Settings → Environment Variables** altında `DEBUG_TOOLS=1` eklenip ilgili Production/Preview hedefi yeniden dağıtılmalıdır. Play Store sürümünde kapalı tutmak için TWA referrer engeli korunmalı; üretim değişkeni test amacıyla açılmışsa mağaza yayını öncesinde kaldırılmalıdır.
- **Doğrulama:** Canlı ana sayfa, API sağlık kontrolü ve ana JavaScript/CSS varlıkları 200 döndü; `/api/debug-tools/status` ise Vercel katmanında `NOT_FOUND` döndürdü. Canlı API sağlık kontrolü veritabanı ve Clerk'i sağlıklı bildirdi. Başsız Chromium canlı sitede giriş ekranına ulaştı ve başlangıç hatası üretmedi; iPhone Safari sorunu burada yeniden üretilemedi. Vercel yolu için giriş dosyası, hata tanı görünümü ve regresyon testleri eklendi. `npm test` — 619/619; `npm run typecheck` — geçti; `npm run build` — geçti. Önceki görsel kontrolde dikey 402×874 ve yatay 844×390 kadrajları incelenmişti; gerçek cihaz kadrajı ayrıca kontrol edilmeli.
- **Değişen dosyalar:** `ILERLEME.md`, `api/[...path].ts`, `api/debug-tools/status.ts`, `server/index.ts`, `server/debugToolsApi.ts`, `server/debugToolsApi.test.js`, `server/vercel-handler.test.js`, `src/main.jsx`, `src/shafak/debug/final-scene-access.ts`, `src/shafak/debug/final-scene-access.test.js`, `src/shafak/debug/FinalSceneEntry.tsx`, `src/shafak/world/CampaignEnding.tsx`.

## Adım 10 — Uzun kampanya

- **Durum:** Alt adım 10.1 tamamlandı. Sonraki ilk alt adım 10.2 — Hikâye — bekliyor. Bu çalışma yalnızca 10.1'i doğrulayıp kayda aldı; hikâye, zorluk, ekonomi ve final kapsamına geçilmedi.

### 10.1 — Yapı ve veri modeli

- **Yapılanlar:** 9 perde × 50 bölüm = 450 bölüm; her perdenin kompakt verisi ayrı modülde ve tembel yükleniyor. Şablon/parametre tabanlı üretimde normal çatışma, hayatta kalma, hedef avı, kuşatma ve keşif/hazine türleri bulunuyor; her 10. bölüm mini-boss, her 50. bölüm perde boss'u. Eski dünya mesafesinden kampanya bölümü hesaplanıyor; profil migrasyonu oyuncu ilerlemesini, altın/elması, malzemeleri (Mühür Parçaları dahil), envanteri, ekipmanı ve mevcut dünya konumunu koruyor. Menü perde/bölüm numarasını ve ilerleme çubuğunu gösteriyor; “DEVAM ET” düğmesi bölüm numarasıyla kaldığı yeri açıyor.
- **Veri boyutu:** Üretim derlemesindeki dokuz perde veri parçasının gzip toplamı 4.922 bayt; bu ölçüm yalnızca perde veri parçalarını kapsar.
- **Doğrulama:** Kampanya veri/progression/migrasyon ve dünya kapsamı hedef testleri 26/26 geçti; üretilen 450 bölümün kimlikleri, şablonları, görevleri, harita varyantları ve boss konumları doğrulandı. Proje testleri `.cache`, `.config`, `node_modules`, `.git` ve `dist` dışarıda bırakılarak açık dosya keşfiyle 647/647 geçti. Normal `npm test` komutu ortamda `.config/pulse/repl-runtime` bulunamadığı için test keşfine ulaşmadan durdu. `npm run typecheck` ve `npm run build` geçti. Yerel Chromium önizlemesinde ana menüde `PERDE 1 / 9`, `BÖLÜM 1 / 450`, yüzde ilerleme ve `DEVAM ET · BÖLÜM 1` göründü.
- **Yarım kalanlar:** Kod tarafında 10.1 için yarım kalan yok. 10.2–10.6 sırayla bekliyor; 10.6 kapsamındaki 30 bölüm bot simülasyonu ve cihaz performans ölçümü henüz yapılmadı.
- **Doğrulanamayanlar:** Gerçek iPhone Safari'de menü/dokunma kabul testi ve gerçek cihaz performansı bu alt adımda ölçülmedi.
- **Kod durumu:** Kampanya uygulama kodu bu çalışma başlamadan önceki yerel `07beec2` commit'inde bulunuyordu; bu alt adımda kaynak kod değiştirilmedi. Bu commit yalnızca ilerleme kaydını ekler.
- **Bu commit'te değişen dosyalar:** `ILERLEME.md`.

## Adım 11 — Kalite ve Savaş Odası yenilemesi

### 11.1 — Mağaza: satın alma ve kuşanma

- **Durum:** Tamamlandı (satın alma/kuşanma, hedef testler, tür denetimi ve üretim derlemesi).
- **Kök neden:** Yerel `WorldScene` satın alma akışı bütün `equipment` türleri için RPG yuvası arıyordu. Savaş Odası silahlarında `slot: null` olduğundan “Bu eşya kuşanılamaz.” hatası profil kaydı ve `commitBattleProfile` öncesinde üretiliyor; bu yerel akışta altın düşmüyor ve silah envantere eklenmiyordu. Hesaplı `POST /api/store/purchase` akışı ise Savaş Odası silahlarını zaten ayrı ele alıp veritabanı işlemi ve idempotency anahtarıyla kaydediyordu; bu API hatanın kaynağı değildi. Mağazada sahip olunan Savaş Odası silahı için “KUŞAN” yerine yalnızca satış düğmesi vardı. Önizleme kamerası seçili silah yerine karakterin tamamını kadrajladığı için silah yerine karakterin çizmeleri görünebiliyordu.
- **Yapılanlar:** Yerel satın alma artık bakiye ve heybe sınırını doğrulayıp altını/elmastan gerekeni bir kez düşürüyor, silahı envantere ekliyor ve profil değişikliğini ancak tüm kontroller başarılı olduktan sonra uyguluyor. Mağazadaki sahip olunan silah Ana veya Yedek Savaş Odası yuvasına atanabiliyor; hesaplı akış mevcut atomik satın alma ve ayrı kuşanma API'lerini kullanıyor. Atamalar kampanya/düello ekipmanını değiştirmiyor; yeni silahın hazırlık yükleme listesinde bulunduğu doğrulandı. Başarılı işlem bildirimi gösteriliyor, eşya seçimi değişince eski hata/bildirim temizleniyor. Silah önizlemesi artık karakter yerine silah modelinin sınır kutusuna göre otomatik kadraj alıyor; yavaş dönüş korunuyor.
- **Testler:** Yerel satın alma, yetersiz bakiye, tekrarlı satın alma, profil/ilerleme korunması, Ana/Yedek yuva ataması, hesaplı satın alma/idempotency, yetersiz bakiye, kuşanma ve hazırlık listesi; mağaza düğmeleri ve silah sınır kutusu için hedef testler 30/30 geçti. Tam `npm test` — 636/636; `npm run typecheck` — geçti; `npm run build` — geçti. Testler yalnızca fixture/sahte profil ve sahte veritabanı kullandı; gerçek hesap verisi veya gerçek oyun parası değiştirilmedi.
- **Yarım kalanlar:** 11.1 için kod tarafında yok. 11.2–11.9 sonraki alt adımlar olarak bekliyor.
- **Doğrulanamayanlar:** Gerçek iPhone Safari'de dokunma kabul testi ve gerçek profilde satın alma/kuşanma yapılmadı. Yerel tarayıcı ekran görüntüsü yalnızca giriş introsunu gösterdi; önizleme ve mağaza etkileşimi bu statik görüntüyle açılamadı. Gerçek cihazdaki silah görünümü/dönüşü ayrıca kontrol edilmeli.

### 11.2 — Ana menü metinleri (tek kaynak)

- **Durum:** Tamamlandı.
- **Kök neden:** Kampanya sayıları `campaign-progression.ts` içinde güncel olsa da `tr.ts`, açılış sinematiği, açılış hikâyesi ve final ekranında eski “dokuz kapı/üç bölge/dokuzuncu bölüm” metinleri sabit kalmış. Ana menü sayıları dinamik gösteriyor ancak güncel perde için kısa hikâye cümlesi kampanya verisinde bulunmuyor. Dolayısıyla yalnızca menü sayacını güncellemek diğer görünen kopyayı eski bırakıyor.
- **Yapılanlar:** Kampanya metinleri perde/bölüm sayıları ve ilk/son bölge adlarıyla tek yardımcıdan üretiliyor. Dokuz perde verisine kısa hikâye özeti eklendi; menü, intro, açılış ve bölüm hikâyeleri, NPC rehberi ve final ekranı güncel kampanya verisini kullanıyor. Bölüm rehberi her perdenin başında ilgili perde özetini gösteriyor. Profil, kayıt, para ve envanter verisine dokunulmadı.
- **Doğrulama:** Yeni regresyon testleri ilk çalıştırmada 3 beklenen hatayı verdi; düzeltmeden sonra hedefli kampanya/hikâye testleri 11/11 geçti. Tam `npm test` — 640/640; `npm run typecheck` — geçti; `npm run build` — geçti. Eski kampanya sayılarının aktif uygulama, README, public ve docs kopyalarında kalmadığını tarayan test eklendi. 402×874 yerel önizleme ekranında `9 PERDE · 450 BÖLÜM`, `KÜL YOLU` ve o perdeye ait hikâye cümlesi doğrulandı.
- **Yarım kalanlar:** 11.2 için kod tarafında yok. 11.3–11.9 sıradaki adımlar olarak bekliyor.
- **Doğrulanamayanlar:** Gerçek iPhone Safari ve production yayını bu oturumda denenmedi. Önizleme tarayıcısı WebGL yazılım fallback/GPU stall uyarıları verdi, ancak ana menü görüntülendi. Testler yalnızca statik kampanya fixture/verisini kullandı; gerçek profil/para/ilerleme kaydı değiştirilmedi.

### 11.3 — Yatay arayüz çakışmaları

- **Durum:** Tamamlandı.
- **Kök neden:** Yatay hazırlık ekranının önceki CSS’i, artık doğrudan alt öğe olmayan başlık/içerik/alt bar için grid satır ve sütunlarını sabitliyordu. İçerik öğelerinin min-content boyutları ve 168 px BAŞLA minimum genişliği, 772×330 ölçüsünde silah listesi/alt bar taşmasına yol açıyordu. Savaş içindeki kapı düğmesi ayar düğmeleri ve silah kontrollerinin alanına uzanıyordu; geçici bildirimler ise tek mutlak konumda gösteriliyordu.
- **Yapılanlar:** Hazırlık ekranı mod/görev ve günlük sınav için sol, silah seçimi için sağ sütun ve ilerleme/BAŞLA alanı sabit alt satır olacak şekilde kuruldu; GERİ düğmesi başlık satırına alındı. Silah listesi `min-height: 0` ve kendi kaydırma alanını kullanıyor; portrede içerik tek sütun ve kaydırılabilir. HUD bildirimleri üç öğeli, zaman aşımı olan kuyruğa alındı; kapı düğmesi landscape ve portrait HUD alanlarında sayaç, boss çubuğu, ayarlar ve diğer kontrollerden ayrıldı. Playwright ölçüm testi ve kuyruk birim testleri eklendi.
- **Doğrulama:** `npm test` — 642/642; `npm run typecheck` — geçti; `npm run build` — geçti. Playwright/Chromium'da 772×330, 667×375, 740×360, 800×360, 844×390, 915×412, 932×430, 360×800 ve 390×844 ölçülerinin her birinde hazırlık ekranı ve HUD kontrol edildi: 18 ekran görüntüsünde görünür metin/düğme kutularında çakışma veya viewport taşması yok. Görüntüler test sırasında `/tmp/war-room-11-3` altında üretildi; kullanıcı kayıtlarına dokunulmadı.
- **Yarım kalanlar:** 11.3 için kod tarafında yok. 11.4–11.9 sıradaki alt adımlar.
- **Doğrulanamayanlar:** Gerçek iPhone Safari'de dokunma kabulü ve cihaz üstü görüntü doğrulanmadı; Chromium emülasyonu gerçek cihaz testi yerine geçmez.

### 11.4 — Silah titremesi

- **Durum:** Tamamlandı (hareket ölçümü, testler, tür denetimi ve üretim derlemesi); gerçek telefon kabulü bekliyor.
- **Kök neden:** Önceki üretim kodu silah hareketini çarpışma çözümünden sonraki oyuncu hızına bağladığında duvar sürtünmesi hızı kareden kareye değiştirebiliyordu. Sonraki düzeltme bunu joystick/klavye niyetine ve sönümlü yaya geçirmişti; ancak bacak görünümü hâlâ sayı tutan bir ref beklerken yeni hareket durumu nesnesi alıyordu, bu nedenle typecheck hata veriyordu. Eklenen ilk ölçüm testi de yeni akışı çağırmak yerine eski hız ölçümünü simüle ediyor ve artık kullanılmayan 0,75 sallanma değerini kullanıyordu; bu yüzden sprint ölçümü 0,001223 standart sapmayla 0,001 eşiğini aşıyordu. Ayrı viewmodel kamerası 60° sabiti tanımlı olmasına karşın 63° kuruluyordu.
- **Yapılanlar:** Hareket niyeti, yerde olma ve 0,16 başlama / 0,08 bırakma eşikleriyle histerezis kullanılıyor; kritik sönümlü hareket hesabı kare süresine göre entegre ediliyor. Bacak görünümüne güncel hareket miktarını taşıyan ayrı sayı ref'i bağlandı; silah ve kollar aynı viewmodel pozunu kullanıyor. Ayrı kamera artık tam 60° FOV kullanıyor. Sallanma seçenekleri kapalı 0, hafif 0,45, normal 0,60 ölçeğinde; varsayılan hafif ve ayardaki etiket “Hafif”. Duvar geri çekilmesi hareket sırasında kapalı, dururken yumuşak geçişli; bu, hareket esnasında duvar algısının silahı ileri-geri itmesini engelliyor.
- **5 saniyelik ölçüm:** 60 Hz'de her kare için yerel X/Y/Z ve üç dönüş değeri kaydedildi. Düz yürüme, fiziksel hızı her karede 0↔4,1 m/sn değişen duvar sürtünmesi ve 8,2 m/sn koşu; kapalı/hafif/normal ayarlarının her birinde sınandı. Frame-değişimi standart sapma üst sınırı 0,001: kapalı tüm koşullarda 0,000000; hafif yürüme/sürtünme/koşu 0,000319 / 0,000319 / 0,000734; normal 0,000425 / 0,000425 / 0,000978. Sabit hareket niyetinde duvar sürtünmesi ile düz yürüme viewmodel kareleri aynı; oyuncunun gerçek katettiği mesafe farklı.
- **Doğrulama:** Başlangıçta tam test 643 testten 642 geçti ve sprint ölçüm testi kaldı; typecheck bacak ref türünde hata verdi. Düzeltilmiş hedef viewmodel testleri 20/20; tam `npm test` — 645/645; `npm run typecheck` — geçti; `npm run build` — geçti. SwiftShader Chromium'da 18 hazırlık/HUD görüntüsü tekrar alındı; dokuz çözünürlükte taşma/çakışma 0, tarayıcı hatası yok. 844×390 HUD görüntüsünde silah sağ-alt bölgede ve nişangâh açık kaldı. Kampanya kodunda aynı birinci şahıs silah viewmodel'i bulunmadığından düzeltme Savaş Odası görünümüne uygulandı; kampanya hareketi ve kayıtlarına dokunulmadı.
- **Yarım kalanlar:** Kod tarafında yok.
- **Doğrulanamayanlar:** Gerçek iPhone/Safari'de yürüyüş/koşu hissi, uzun süreli kare hızı, gerçek duvar temasında görüntü ve çoklu dokunma doğrulanamadı. Chromium emülasyonu gerçek cihaz FPS'sini kanıtlamaz.
- **Değişen dosyalar:** `src/shafak/App.tsx`, `src/shafak/game/war-room-viewmodel.ts`, `src/shafak/game/war-room-viewmodel-jitter.test.js`, `src/shafak/world/WarRoomScene3D.tsx`, `ILERLEME.md`.

### 11.5 — Kapı ve eşik takılması

- **Durum:** Tamamlandı (kapı/çarpışma regresyon testleri, tür denetimi ve üretim derlemesi).
- **Kök neden:** Batık Hisar ve Ayışığı Kalesi düzenlerinde ortak `coverOffset`, iki varilin çarpışma kutusunu bina giriş yaklaşımına kaydırıyordu; oyuncu veya bot kapıya yönelse de varile takılıyordu. 1.920 senaryolu testin bir üst kat çapraz çıkış başlangıcı da iç koridor yerine yan duvarın içinde kaldığından geçerli bir oyun rotasını ölçmüyordu. Tam testteki duvar kayma kontrolü, oyuncunun duvara yaklaşmasını tamamen yasaklıyordu; silah ölçümü ise duvar güvenlik geri çekilmesinin yumuşak hareketini yürüme bob titreşimiyle karıştırıyordu.
- **Yapılanlar:** Varil çarpışmaları harita varyantının genel örtü kaydırmasından çıkarıldı; görünür variller ve çarpışma konumları aynı oda verisinden üretilmeye devam ediyor. Kapı test başlangıçları gerçek, açık koridor noktalarına alındı ve oyuncu/bot için her başlangıç `isWarRoomPointClear` ile doğrulanıyor. Test, alt/üst katın doğru kapı durum anahtarını denetliyor. Duvar kayma kabul ölçütü, kapsülün duvara yaklaşmasına izin verip gerçek çarpışma sınırının aşılmadığını doğruluyor. Silah testinin duvar güvenlik çekilmesi bileşeni ana titreşim ölçümünde korunuyor; düz yürüme karşılaştırmasında bu bağımsız, yumuşak güvenlik ofseti ayrıştırılıyor. Kampanya kapı mantığı mevcut bölüm ilerlemesine bağlı otomatik açılmayı kullanıyor; aynı yaklaşma, kapıda bekleme ve geçiş açıklığı kuralları 450 bölümün tamamında sınanıyor. Kapı/duvar fizik hareketi mevcut 60 Hz sabit adımlı hareket akışında kaldı.
- **Doğrulama:** İlk tam çalıştırmada 651 testten 648'i geçti; üç başarısızlığın kök nedenleri yukarıdaki test kabul ölçütü ve varyant çarpışma konumları olarak ayrıştırıldı. Düzeltme sonrası `npm test` — 652/652; kapılardan 1.920 oyuncu/bot geçiş senaryosu (6 harita, 48 bina, iki kat, beş açı, yürüme/koşma) geçti; 450 kampanya kapısı senaryosu geçti; `npm run typecheck` ve `npm run build` başarılı. Yerel 402×874 önizleme açıldı ve giriş/introyu gösterdi.
- **Yarım kalanlar:** Kod tarafında yok.
- **Doğrulanamayanlar:** Gerçek iPhone/Android'de kapıdan geçiş, dokunma ve kare hızı elle doğrulanmadı; önizleme etkileşim yapılmadan oyun içi kapı sahnesine ulaşmadı. Önizleme konsolunda `KnightActor.tsx:575` civarında Three.js `AnimationMixer` çalışma zamanı hatası görüldü; kapı testlerinden bağımsız bu hata görsel kabul doğrulamasını sınırlıyor ve 11.9 doğrulamasında yeniden ele alınmalı.
- **Değişen dosyalar:** `ILERLEME.md`, `src/shafak/game/war-room-doors.test.js`, `src/shafak/game/war-room-engine.test.js`, `src/shafak/game/war-room-rooms.ts`, `src/shafak/game/war-room-viewmodel-jitter.test.js`, `src/shafak/world/world-v2-gate-state.test.js`.

### 11.6 — Görsel kalite: ortam (evler, sokaklar, koridorlar)

- **Durum:** Kod ve varlık bütçesi tamamlandı; gerçek cihaz görsel/FPS kabul testi açık.
- **Kapsam:** Pikselli görüntünün render ölçeği/doku filtresi nedenini ölç; mevcut 3B sahne, harita yerleşimi, oynanış, kontroller ve ölçeği koru. Tohumlu modüler bina/dekor çeşitliliği, uygun malzemeler, okunaklı ışık/sis/gökyüzü ve uzak LOD/instancing'i değerlendir. Hedef: görünür draw call <150, ortam varlıkları toplamı <6 MiB, telefonda 60 FPS hedefi; düşük/orta/yüksek ve otomatik kaliteyi koru.
- **Kök neden — ilk ölçüm:** `world-environment-asset-budget.test.js` düzeltme öncesi 0/1 geçti. Dört ortam GLB'si toplam 19,136,964 bayt (18.25 MiB), 6 MiB sınırının üzerindeydi. `wooden-barrel.glb` 19 düğüm ve 9 adet 1024×1024 doku içeriyor; uygulama `wooden_barrels_01_barrel01` temsilci düğümünü izole edip yalnızca bu modeli çiziyor. Diğer varil düğümleri/dokuları bu yolda kullanılmıyor. Bu, indirilen ortam verisinin gereksiz büyümesinin ölçülebilir nedenidir.
- **Kök neden — görünür varil:** `WorldModel.tsx` hem tekil modelde hem instanced batch'te yalnızca `wooden_barrels_01_barrel01` düğümünü ayırıyor. Diğer 18 düğüm ve iki kullanılmayan malzeme kümesinin dokuları yine de aynı GLB içinde indirilip ayrıştırılıyordu.
- **Yapılanlar:** Dört gerekli GLB korundu; gömülü JPEG dokular 512×512 ve kalite 80'e indirildi. Varil GLB'sinden yalnızca hiç çizilmeyen ek düğümler, meshler ve bunlara ait materyal/dokular çıkarıldı; kullanılan varil modeli, üç PBR haritası ve diğer üç prop'un tüm sahne geometrisi korundu. Toplam boyut 19,136,964 bayttan 5,410,476 bayta (5.16 MiB) düştü; 6 MiB sınırının altında. GLB başlığı, JSON/BIN boyları, sahne ve düğüm/mesh/texture bağlantıları ile 512 px doku sınırı otomatik test ediliyor. Mevcut kalite kademeleri, dinamik çözünürlük, MSAA, ACES tone mapping, sis/gökyüzü, bina/dekor çeşitliliği ve instancing değiştirilmedi.
- **Doğrulama:** Bütçe testi düzeltme öncesi kırmızıydı (19,136,964 bayt); `npm test` 654/654 geçti; ortam varlıkları, boyutlandırma ve grafik kalitesi hedef testleri 14/14 geçti; `npm run typecheck`, `npm run build` ve `git diff --check` geçti. Dört GLB'nin HTTP yanıtı 200; toplam indirme boyutu 5,410,476 bayt. 3B dünyaya kadar Chromium'da ulaşıldı ve canvas oluştu; fakat SwiftShader FPS sayacı 0 gösterdi, ekran görüntüsü yakalama zaman aşımına uğradı. Bu nedenle çizilen sahne ve draw-call sayısı ölçülmüş sayılmıyor.
- **Yarım kalanlar / doğrulanamayanlar:** Pikselli telefon görüntüsünün DPR, doku filtresi veya dağıtılan build kaynaklı olduğu gerçek cihazda henüz ayrıştırılmadı. Görünür draw call <150 ve gerçek telefonda 60 FPS hedefi ölçülmedi. SwiftShader Chromium doğrulaması sahne pikselini göstermedi; iPhone/Android görsel ve performans kabulü açık.

### 11.7 — Görsel kalite: silahlar ve eller

- **Durum:** Kod ve otomatik testler tamamlandı; 844×390 Chromium emülasyonunda boşta/nişan/koşu görüntüleri kontrol edildi. Gerçek cihaz kabulü açık.
- **Kök neden:** Silah kataloğunda özel GLB modelleri ve yeni ölçüler bulunmasına rağmen iki eski test hâlâ önceki veriyi varsayıyordu: ilk beş silahın model dosyalarını `null` bekliyor, silah laboratuvarı kürek uzunluğunu 1,2 m sayıyordu; güncel katalog özel modeller ve 1,4 m normalize uzunluk kullanıyor. Bu beklentiler mevcut model ve ölçüleri yanlış tanımlıyordu.
- **Yapılanlar:** Her Savaş Odası silahının ayrı Meshopt GLB modeli kullandığı ve model boyutunun 150 KiB sınırında kaldığı testlerle doğrulanıyor. Ana ateşli silah modellerinin namlu ve hareketli parça işaretleri korunuyor. Birinci şahıs kolları eldiven/kumaş ve parmak detaylarıyla silaha göre tutuş kullanıyor; ADS silahı küçültüp yana alıyor ve orta nişan hattını açık tutuyor. Ateş geri tepmesi, namlu alevi, kovan, doldurma, silah değiştirme ve koşuda silahı yumuşak indirme akışları mevcut. Eski beklentiler gerçek model/uzunluk değerleriyle güncellendi.
- **Doğrulama:** Viewmodel/silah modeli odaklı testler 27/27; tam `npm test` — 659/659; `npm run typecheck` ve `npm run build` geçti. İzole Playwright profiliyle 844×390 savaş ekranına girildi; boşta ve ADS'de eller/silah görünür, merkez nişan hattı açık, koşuda silah aşağı iner; tarayıcı hatası görülmedi. `npm run warroom:e2e` joystick ve kamera kaydırma kontrollerini geçti ancak üç eşzamanlı dokunma aşamasında 5 dakikalık komut süresi doldu; bu tam E2E sonucu başarılı sayılmıyor.
- **Yarım kalanlar:** Kod tarafında yok; gerçek cihaz kabulü ve tam çoklu-dokunma E2E doğrulaması bekliyor.
- **Doğrulanamayanlar:** Gerçek iPhone/Android'de el tutuşu, ADS/koşu görünümü ve kare hızı ölçülmedi. Chromium emülasyonu cihaz kabulü yerine geçmez.
- **Bu alt adımda değişen dosyalar:** `src/shafak/game/war-room-engine.test.js`, `src/shafak/game/war-room-lab.test.js`, `ILERLEME.md`.

### 11.8 — Savaş Odası kapsamlı yenileme

- **Durum:** Kod ve hedef testler tamamlandı; tam proje doğrulaması 11.9’da.
- **Kök neden:** Normal muhafızlar `approach` durumunda başlıyor ve devriye/uyarı/farkındalık akışı bulunmuyordu. Günlük görev HUD ve sonuç ekranı gerçek alt modu göstermiyor; zırh çalışma zamanında tutulmasına rağmen HUD’da görünmüyor; duraklatma ekranında ayarlara erişim yoktu. Mobil hareket ve kamera tarafları sabitti; hafif menzilli nişan yardımı kullanıcı ayarı değildi.
- **Yapılanlar:** Mevcut beş oyun modu, altı harita, zorluk/değiştiriciler, boss fazları, ganimet ve ödül sınırları korunup bot simülasyonları gerçek sandık toplama, görev tamamlama, hayatta kalma dalgaları ve sonuç koşullarıyla çalıştırıldı. Muhafızlara devriye/uyarı/çatışma farkındalığı eklendi; günlük görev HUD, hazırlık ve sonuç ekranında gerçek görev türünü gösteriyor; zırh çubuğu eklendi. Duraklatma menüsünden devam/ayarlar/çıkış seçenekleri açılıyor. Dokunmatik düzenleyici sol el yerleşimini ve hareket/bakış taraflarını değiştiriyor; ayarlardan açılıp kapanan menzilli yardım yalnızca nişan basılıyken, yakındaki açık hedefe en fazla 1,5° yöneliyor. Dokunmatik düğme boyutu ve kamera hassasiyeti ayarları korundu.
- **Doğrulama:** Savaş Odası görevleri, boss, ödül, ganimet, muhafız farkındalığı, nişan yardımı ve sol el düzeni için hedef testler 45/45 geçti. `npm run typecheck` ve `git diff --check` geçti. Altı haritanın her birinde beş gerçek zemin ganimet sandığına bot ulaştı.
- **Yarım kalanlar:** Kod tarafında yok; 11.9 tam test/build, bundle, ekran boyutu ve önizleme doğrulamasıdır.
- **Doğrulanamayanlar:** Gerçek iPhone/Android’de kare hızı, titreşim ve eşzamanlı çoklu dokunma henüz ölçülmedi; cihaz kabulü 11.9 sonunda ayrıca raporlanacak.
- **Bu alt adımda değişen dosyalar:** `src/shafak/App.tsx`, `src/shafak/game/WarRoomBriefing.tsx`, `src/shafak/game/WarRoomControlsEditor.tsx`, `src/shafak/game/WarRoomGame.tsx`, `src/shafak/game/WarRoomResult.tsx`, `src/shafak/game/war-room-awareness.ts`, `src/shafak/game/war-room-awareness.test.js`, `src/shafak/game/war-room-combat-feel.ts`, `src/shafak/game/war-room-combat-feel.test.js`, `src/shafak/game/war-room-controls.ts`, `src/shafak/game/war-room-controls-handedness.test.js`, `src/shafak/game/war-room-engine.ts`, `src/shafak/game/war-room-look-settings.ts`, `src/shafak/game/war-room-missions.test.js`, `src/shafak/game/war-room-mobile-controls.ts`, `src/shafak/game/war-room-touch-input.ts`, `src/shafak/game/war-room.css`, `src/shafak/world/WarRoomScene3D.tsx`, `ILERLEME.md`.

### 11.9 — Final doğrulama

- **Durum:** Tamamlandı; yerel otomatik doğrulama geçti, gerçek telefon kabulü açık.
- **Kök neden:** Dokuz ölçüdeki HUD taraması, portre görünümünde görev türüyle komutan adının 2 px çakıştığını, komutan satırı aşağı alınınca da kapı etkileşim düğmesinin komutan başlığının üstüne geldiğini gösterdi. HUD konumları aynı dar alana yığılmıştı.
- **Yapılanlar:** Portre HUD’da komutan satırı görev etiketinden ayrıldı; kapı düğmesi komutan/ganimet bildirimi alanının altına taşındı ve faz bildirimi için boşluk korundu. Tekrar çalıştırılabilir `warroom:final:e2e` testi eklendi. Sonuç ekranı yalnızca sentetik test özetiyle açıldı. Mağaza ve envanter ekranları varsayılan test profiliyle render edildi; gerçek hesap, kayıt, para, eşya veya ilerleme değiştirilmedi.
- **Ekran doğrulaması:** Ana menü, mağaza, envanter, hazırlık, HUD ve sonuç ekranlarının her biri 772×330, 667×375, 740×360, 800×360, 844×390, 915×412, 932×430, 360×800 ve 390×844 ölçülerinde yakalandı. Son tekrar çalıştırmasında toplam 54 görüntü üretildi; görünür metin/düğme taşması 0, çakışma 0 ve tarayıcı çalışma zamanı hatası 0. Geçici görüntüler `/tmp/war-room-11-9` altında. HUD/sonuç ölçüm görüntülerinde canvas gizli olduğundan bu çalışma 3B sahnenin görüntü kalitesini veya performansını doğrulamaz.
- **Testler:** Kilit dosyasındaki bağımlılıklar `npm ci --no-audit --no-fund` ile geri yüklendikten sonra `npm test` — 705/705; `npm run typecheck` — geçti; `npm run build` — geçti; `npm run warroom:final:e2e` — 6 ekran × 9 ölçü = 54 görüntü, görünür kutu çakışması/taşması yok; `git diff --check` — geçti. Node test keşfi artık proje test dizinleri (`db`, `server`, `src`) ile sınırlı ve eşzamanlılık 4; sınırsız keşif Replit çalışma zamanı yolunda testler başlamadan hata veriyordu.
- **Bundle ölçümü:** İlk yüklemenin statik JS grafiği 311.126 bayt (303,8 KiB), CSS 28.643 bayt (28,0 KiB); birlikte 339.769 bayt (331,8 KiB), gzip toplamı 106.079 bayt (103,6 KiB). Savaş Odası ilk yüklemeden ayrı lazy parçalar kullanıyor: JS 284.507 bayt (277,8 KiB; gzip 84.819 bayt), CSS 105.292 bayt (102,8 KiB; gzip 19.473 bayt). Ölçümler JS/CSS dosyalarıdır; HTML, harici yazı tipleri ve oyun içi 3B varlıklar dahil değildir. Gzip, dosyaların ayrı ayrı sıkıştırılmış toplamıdır.
- **Yarım kalanlar:** Yerel kod doğrulamasında açık madde yok.
- **Doğrulanamayanlar:** Gerçek iPhone/Android’de 60 FPS, silah sallanmasının hissi, gerçek duvar temasındaki görüntü ve eşzamanlı çoklu dokunma test edilmedi. SwiftShader tarayıcı görüntüsü cihaz performansı yerine geçmez; görünür draw-call sayısı da ölçülmedi.
- **Telefonda kısa kontrol:** Yatay ve dikey döndür; joystick ile yürü/koş; yürürken nişan + ateş + hareketi aynı anda basılı tut; düğmelerin çakışmadığını ve dokunma bırakınca diğer kontrollerin sürmesini kontrol et; duvar yanında silahı ve gerçek FPS’yi gözle.
- **Bu alt adımda değişen dosyalar:** `package.json`, `scripts/war-room-final-11-9-e2e.mjs`, `src/shafak/game/war-room-responsive.css`, `ILERLEME.md`.

### Adım 11 alt adımları

- **11.1 — Mağaza: satın alma ve kuşanma:** Tamamlandı
- **11.2 — Ana menü metinleri:** Tamamlandı
- **11.3 — Yatay arayüz çakışmaları:** Tamamlandı
- **11.4 — Silah titremesi:** Tamamlandı
- **11.5 — Kapı ve eşik takılması:** Tamamlandı
- **11.6 — Ortam görsel kalitesi:** Kod tamamlandı; gerçek cihaz görsel/FPS kabulü açık
- **11.7 — Silahlar ve eller:** Kod/test tamamlandı; gerçek cihaz kabulü açık
- **11.8 — Savaş Odası kapsamlı yenileme:** Kod/test tamamlandı; tam doğrulama 11.9’da
- **11.9 — Final doğrulama:** Tamamlandı; gerçek telefon kabulü açık

## Adım 12 — Performans, dikey mod ve stabilite

- **Durum:** 12.1–12.7 otomatik kod ve önizleme doğrulaması tamamlandı; gerçek iPhone/Android/PC GPU performansı ve cihaz kabulü açık. Sıradaki alt adım 13.1.
- **Sıra:** Aynı anda yalnızca bir alt adım. Her alt adım sonunda test, bu dosya güncellemesi ve yerel commit yapılacak. Kayıtlı ilerleme korunacak; gerçek hesap/para verisi kullanılmayacak; sırlar repoya yazılmayacak.
- **Kullanıcı bildirimi:** Gerçek iPhone Safari’de dikey düzen oynanamaz, oyun takılıyor/donuyor, kasmaya bağlı silah titreşimi sürüyor, silah ekranın sağ üçte birini kaplıyor, boss çubuğu ortada yer kaplıyor ve kenarlar pikselli. Kullanıcı ayrıca masaüstü bilgisayarda oyunun düzgün oynanmadığını bildirdi.

### 12.1 — Ölçüm ve tanılama

- **Durum:** Tamamlandı; araç ve geliştirme ortamı ölçümü hazır. Gerçek iPhone ölçümü doğrulanmadı.
- **Yapılanlar:** Savaş Odası Ayarları’na FPS HUD’undan ayrı, varsayılan kapalı bir Tanılama bölümü eklendi. Yerel rapor; ortalama FPS, kare süresi p50/p95/p99, 50 ms üzeri kareler, Long Task sayısı/süresi, kalite, render ölçeği, DPR/canvas boyutu, draw call/üçgen/geometri/doku, JS heap ve cihaz özellikleri (varsa), WebGL renderer, RAF hızı, harita, yaşayan düşman sayısı ve kalite düşürme olaylarını içeriyor. “Panoya kopyala” yalnızca cihazın panosuna yazar; rapor sunucuya gönderilmez.
- **Benchmark:** `?benchmark=1` sabit seed `0x5afac011` ile Taş Avlu’da botlara karşı hareket edip ateş eden 60 saniyelik otomatik Savaş Odası koşusunu başlatır. `VITE_WAR_ROOM_BENCHMARK_DISABLED=true` bu yolu kapatır. `npm run warroom:benchmark` Playwright/SwiftShader çalıştırıcısıdır; `WAR_ROOM_BENCHMARK_DESKTOP=1` 1280×720 dokunmatik olmayan masaüstü ölçümünü, `WAR_ROOM_BENCHMARK_DPR` ekran ölçeğini seçer. Benchmark sonucu/yeniden başlatma profil ödülü, kayıt veya ekonomi yazmaz.
- **ÖNCE — Replit geliştirme tarayıcısı, SwiftShader, 844×390, DPR 1, otomatik düşük kalite, 60 sn benchmark:**

  | Ölçüm | Sonuç |
  |---|---:|
  | Render örnekleri / ölçülen örnek aralığı | 20 / 48.920 ms |
  | Ortalama FPS / RAF frekansı | 0,4 / 0,4 Hz |
  | Kare süresi p50 / p95 / p99 | 2.389,7 / 3.096,7 / 4.858,6 ms |
  | 50 ms üzeri kare | 20 |
  | Long Tasks / toplam süre | 43 / 21.154 ms |
  | Draw call ortalama / tepe | 37,5 / 47 |
  | Üçgen ortalama / tepe | 1.602 / 2.100 |
  | Geometri / doku | 2.112 / 74 |
  | Canvas / render ölçeği | 717×331 / 0,85 |
  | Cihaz bildirimi / JS heap | 4 iş parçacığı, 8 GiB / 260.543.395 bayt |
  | Harita / yaşayan düşman | Taş Avlu / 9 |

- **ÖNCE — ayrı 22,46 sn geliştirme profili, hareket ve ateş açık:** 11 RAF örneği; p50 1.949,9 ms, p95/p99 3.483,2 ms; 39 draw call ve 1.664 üçgen. Örnek sayısı düşüktür; tek başına istatistiksel cihaz karşılaştırması değildir.
- **ÖNCE — en çok örneklenen CPU işlevleri:** WebGL `getProgramInfoLog` 6.510 ms; React `exports.jsxDEV` 1.013 ms; adsız `(program)` 876 ms; GC 407 ms; `jsxDEVImpl` 369 ms. İlk yüklemedeki shader derlemesi ve geliştirme React kodu örneği etkiliyor. Bunlar gerçek iPhone’daki kök neden olarak doğrulanmadı; takip eden alt adımlarda ölçülerek ele alınacak.
- **SONRA:** 12.1 ölçüm altyapısı ekledi, performans optimizasyonu yapmadı; bu nedenle iyileşme iddiası yok. Yukarıdaki 60 sn koşusu yeni aracın ilk ölçümüdür. 12.2 ve sonraki düzeltmelerden sonra aynı tabloya SONRA değerleri eklenecek.
- **Doğrulama:** Yeni rapor/benchmark hedef testleri 4/4; `npm test` 709/709; `npm run typecheck`, `npm run build` ve `git diff --check` geçti. Otomatik benchmark tamamlandı ve tarayıcı çalışma zamanı hatası vermedi. Ayarlar’daki Tanılama’nın kapalı başladığı, rapor ürettiği ve panoya kopyalamanın yerel kaldığı tarayıcıda kontrol edildi.
- **Kök neden / doğrulanamayanlar:** Önizleme WebGL renderer’ı SwiftShader olduğu için 0,4 FPS gerçek GPU/telefon sonucu değildir; bu ölçüm telefondaki takılmanın kök nedenini belirlemez. Otomatik koşuda shader/scene başlangıcı nedeniyle kare örnekleri 48,92 saniyeye yayıldı. iPhone Safari FPS/ısınma/bellek, Düşük Güç Modu davranışı ve gerçek GPU renderer ölçülmedi.
- **Telefonda yapılacak:** Yatay/dikey gerçek oyunu birkaç saniye çalıştır; Ayarlar > Tanılama > Performans raporu’nu açıp “Panoya kopyala” ile paylaş. Rapor hesap veya oyun verisi taşımaz.

### 12.2 — Render kaynaklı kasma: **Tamamlandı (gerçek PC GPU ölçümü 12.7'de doğrulanacak)**

- **Yapılanlar:** Dokunmatik cihazda düşük kalite DPR 1, diğer kalite kademeleri en çok 1,5; masaüstü Yüksek en çok 2. Savaş Odası’nın 30 karelik ortalama/p95 ölçümü, 1/0,85/0,7/0,6 çözünürlük basamakları, iki yavaş/dört hızlı pencere histerezisi ve en az 1 sn kademe aralığı korundu. İki ardışık 100 ms üzeri karede beklemeden çözünürlüğü düşürme eklendi. DPR artık React yeniden çizimlerinde başlangıç değerine dönmüyor; Canvas’ın DPR değeri adaptif ölçekle birlikte tutuluyor. DOM HUD ölçeği Canvas çözünürlüğünden bağımsız kaldı. Her iki dünya çizim yolunda mobil gerçek gölgeleri kapatıldı; antialias yalnızca dokunmatik olmayan Yüksek kalitede açık. Savaş Odası sahnesi ve silah görünümünde ayrı ayrı tek hemisferik ve tek yönlü ışık kaldı; dinamik nokta ışıkları kaldırıldı, ateş/gem parıltıları kendi aydınlık materyallerini kullanıyor. Dokunmatik HUD’da blur, büyük gölgeler ve sürekli ateş/düşük can/iyileşme animasyonları kapatıldı. Otomatik kalite cihaz sınıfını ve ilk 5 saniyeyi ölçüyor; en düşük ayarda FPS düşük kalırsa bir kez uyarıyor.
- **ÖNCE — aynı SwiftShader benchmark, 12 Kasım 2026, 844×390, DPR 1, Taş Avlu/9 bot:** 37 kare örneği / 53,112 sn; ortalama FPS ve RAF 0,7; p50/p95/p99 1.373,6 / 1.951,1 / 3.159,4 ms; 50 ms üzeri 36 kare; 55 uzun görev / 16.783 ms; ortalama/tepe draw call 38,2/47; üçgen 1.629/2.100; geometri/doku 2.112/74; kalite Düşük, çözünürlük ölçeği 1.
- **SONRA — aynı benchmark ve koşullar:** 27 kare örneği / 51,436 sn; ortalama FPS ve RAF 0,5; p50/p95/p99 1.906,4 / 2.638,3 / 3.850,2 ms; 50 ms üzeri 26 kare; 50 uzun görev / 16.945 ms; ortalama/tepe draw call 37,9/47; üçgen 1.617/2.100; geometri/doku 2.101/74; kalite Düşük, çözünürlük ölçeği 1.
- **YENİ ÖNCE — masaüstü boyutu, 1280×720, DPR 1, SwiftShader, 12 Kasım 2026:** 37 örnek / 51.098 ms; ortalama FPS/RAF 0,7; p50/p95/p99 1.324,7 / 1.845,4 / 2.491,7 ms; 50 ms üzeri 36 kare; 61 Long Task / 17.120 ms; draw call 38,2/47; üçgen 1.629/2.100; geometri/doku 2.064/74; otomatik kalite Düşük, render ölçeği 1; JS heap 315.629.411 bayt; yaşayan bot 9. Ölçüm gerçek PC GPU’sunda değil, SwiftShader yazılım renderer’ında.
- **YENİ ÖNCE — ayrı 20 sn masaüstü CPU/heap örneklemesi:** CPU örneklerinde `getContext` 2.815 ms, React geliştirme `jsxDEV` 2.631 ms, GC 623 ms ve boşta 8.926 ms; 96.471.800 bayt örneklenmiş tahsis, bunun 37.762.212 baytı React `jsxDEV` ve 16.948.516 baytı Three.js `cloneUniforms` altında. Örnekleme sahne/renderer başlangıcını ve geliştirme derlemesini içerdiğinden üretim oyun döngüsündeki sürekli tahsisi tek başına kanıtlamıyor.
- **YENİ SONRA — aynı masaüstü koşusu, hızlı DPR ve kalıcı Canvas ölçeği sonrası:** 23 örnek / 51.143 ms; ortalama FPS/RAF 0,4; p50/p95/p99 1.864,3 / 5.462,1 / 6.861,6 ms; 50 ms üzeri 23 kare; 57 Long Task / 26.523 ms; draw call 37,7/47; üçgen 1.609/2.100; geometri/doku 2.053/74; render ölçeği 0,6 ve canvas 768×432; kalite Düşük; JS heap 290.513.912 bayt. Ölçek düşüşü doğrulandı; SwiftShader’daki FPS iyileşmedi ve dağılım değişken kaldı.
- **YENİ ÖLÇÜM — 12 Kasım 2026, Playwright masaüstü görünümü 1280×720, DPR 1, Taş Avlu/9 bot:** 48 örnek / 53.502 ms; ortalama FPS/RAF 0,9; p50/p95/p99 989,6 / 2.926,6 / 4.244,5 ms; 50 ms üzeri 47 kare; 78 Long Task / 26.221 ms; draw call 38,4/47; üçgen 1.637/2.100; geometri/doku 2.055/74; çözünürlük ölçeği 0,6 ve canvas 768×432; kalite Düşük; JS heap 244.195.232 bayt; renderer `ANGLE / SwiftShader`. Kod değişmediği ve yazılım renderer örneklemesi değişken olduğu için önceki satırlara göre iyileşme iddiası yok.
- **Playwright doğrulaması:** Bağımlılık package.json/kilit dosyasında kayıtlıydı ancak node_modules içinde kurulu değildi; kilitli sürüm kuruldu ve `npm run warroom:benchmark` başarıyla çalıştı. Ortamda `/dev/dri` veya NVIDIA GPU aygıtı yok; betik SwiftShader kullanıyor.
- **Ölçüm sonucu:** Başlangıçta DPR ölçeği Canvas’a uygulanıp React yenilemelerinde eski değere sıfırlanıyordu; kalıcı React state ile bu hata düzeltildi. İki ardışık ağır kareden sonra ölçek artık 1’den 0,6’ya iniyor. SwiftShader koşusu hızlanma göstermedi; yazılım WebGL ve geliştirme derlemesi gerçek PC GPU’su değildir. Bu nedenle PC’deki FPS sonucu doğrulanmış sayılmıyor. Draw call ve üçgen sayıları bütçenin çok altında kaldığı için geometri birleştirme, instancing, oda culling veya LOD’a ölçümsüz dokunulmadı. Doku sayısı ölçüldü; tek tek doku boyutu ve anisotropi mevcut raporda yok.
- **Doğrulama:** DPR/kalite hedef testleri 13/13; `npm run typecheck`, `npm run build` ve `git diff --check` geçti. Masaüstü benchmark hatasız tamamlandı; canvas 768×432’ye düştü ve tarayıcı çalışma zamanı hatası raporlanmadı. Oyun hesabı ve ekonomi verisine dokunulmadı.
- **Yarım kalanlar / doğrulanamayanlar:** Gerçek PC GPU ve monitör ölçeğinde FPS bu ortamdan ölçülemedi; ölçüm yalnızca SwiftShader yazılım renderer’ıdır. Gerçek iPhone Safari ve Android GPU FPS’i, ısınma, grafik belleği, Düşük Güç Modu, tüm doku ölçüleri ve gerçek cihaz DPR davranışı da ölçülmedi. Gerçek cihaz/PC kontrolü Adım 12.7’de raporlanacak; 12.3 henüz başlamadı.
- **Değişen dosyalar:** `ILERLEME.md`, `src/shafak/App.tsx`, `src/shafak/game/war-room-quality.ts`, `src/shafak/game/war-room-quality.test.js`, `src/shafak/game/war-room-responsive.css`, `src/shafak/world/WarRoomAdaptiveDpr.tsx`, `src/shafak/world/WarRoomBattlefield.tsx`, `src/shafak/world/WarRoomScene3D.tsx`, `src/shafak/world/World3D.tsx`, `src/shafak/world/World3DV2.tsx`, `src/shafak/world/graphics-quality.ts`, `src/shafak/world/graphics-quality.test.ts`.

### 12.3 — CPU, GC ve HUD kaynaklı kasma: **Tamamlandı; gerçek cihaz doğrulaması açık**

- **Kök neden:** Ekran görüntüsündeki önceki ölçüm, 100 ms HUD yenilemesinin React ağacını yeniden çizdiğini ve her karede kapı çarpışma listesi üretilmesinin gereksiz allocation yaptığını gösteriyordu. Kodda savaş sahnesi memo ile ayrılmış; kapı engelleri bina başına önbelleğe alınmış ve çağıran tamponda yeniden kullanılıyor. Testler bunu doğrudan doğruluyor.
- **Ek allocation düzeltmeleri:** Bot görüş çizgisi hesabında her test için oluşturulan iki küçük diziyi, duvar köşe nesnelerini ve döngü içindeki boss etki callback’lerini kaldırdım. Boss hasar uygulaması yalnızca tekil etki anında çağrılan modül düzeyi fonksiyona taşındı. Bot kararı yakın/ganimet takibinde yaklaşık 8,3 Hz, uzakta 5 Hz; algı 10 Hz. Fizik hareketi 50 ms dt ve kare başına en çok üç sabit adıma sınırlı. Efekt ve sesler havuzlanıyor; mini harita 100 ms HUD örneklemesiyle en fazla 10 Hz güncelleniyor. Kaydetme olayları döngü dışında.
- **ÖNCE — kod düzeltmesinden önce, Replit geliştirme tarayıcısı, Playwright 1280×720/DPR 1, Taş Avlu/9 bot, SwiftShader:** 48 örnek/53.391 sn; ortalama FPS/RAF 0,9; p50/p95/p99 998,8/2.791,2/4.074,7 ms; 47 kare >50 ms; 40 Long Task/20.688 ms; draw call 38,4/47; üçgen 1.637/2.100; geometri/doku 2.067/74. 8 sn ısınma sonrasında 45 sn’lik allocation örneklemesi 100.024.500 bayt tahsis örneği topladı. Üstte `jsxDEV` 53,2 MB, `jsxDEVImpl` 14,5 MB; `segmentIntersectsBounds` 3,31 MB, `isWarRoomSegmentClear` 3,28 MB, `segmentBlockFraction` 2,56 MB.
- **SONRA — kod düzeltmesinden sonra, aynı geliştirme ölçüm koşulu:** Benchmark (profilleyici olmadan) 27 örnek/52.184 sn; ortalama FPS/RAF 0,5; p50/p95/p99 1.775,3/5.021/6.180,3 ms; 26 kare >50 ms; 36 Long Task/19.992 ms; draw call 37,9/47; üçgen 1.617/2.100; geometri/doku 2.065/74; ölçek 0,6; 9 bot. 8 sn ısınma sonrası allocation örneklemesi 96.612.244 bayt/2.916 örnek; `jsxDEV` 56,9 MB, `jsxDEVImpl` 12,8 MB, `segmentBlockFraction` 3,38 MB. Düzeltilen iki AI geometri fonksiyonu üst allocation listesinde artık görünmedi.
- **Ölçüm yorumu:** Allocation örneklerinin toplamı önceki örneğe göre yaklaşık %3,4 daha düşük olsa da profiller arasındaki değişkenlik ve geliştirme React kodunun yüksek payı nedeniyle bu farkı iyileşme olarak sunmuyorum. FPS ölçümü 0,9’dan 0,5’e değişti; p95 de kötüleşti. Ortam SwiftShader kullandığından gerçek GPU performansı çıkarsanamaz ve bu veriler bir hızlanmayı doğrulamıyor. Çizim bütçesi (≤150 çağrı, ≤250.000 üçgen) her iki koşuda da geniş farkla geçti.
- **Testler:** Kapı, hareket, bot AI, boss ve sabit adım hedef testleri 49/49; `npm run typecheck`, `npm run build` ve `git diff --check` geçti. Benchmark tarayıcı hatası vermedi. Gerçek hesap, kayıt veya ekonomi verisine dokunulmadı.
- **Doğrulanamayanlar:** 60 FPS/ısınma/GC, Safari belleği ve GPU tahsisi gerçek telefonda ölçülmedi. Üretim önizlemesi, Clerk yapılandırılmadığı için oyunu güvenli biçimde açmadı; kimlik doğrulama atlanmadı. Üretim profili ve telefondaki allocation doğrulaması kapalı kaldı. Gerçek cihaz kabulü 12.7 raporunda da açık kalacak.

### 12.4 — Donmayı önleme ve toparlanma: **Tamamlandı (cihaz ve olay stres ölçümü açık)**

- **Kök neden:** Briefing ön yüklemesi oyuncu ve arena modellerini kapsıyordu ancak seçili silah GLB'leri ilk kullanımda yükleniyordu. Canvas boyut gözlemcisinde resize debounce yoktu. Shader hazırlığı, kare/Long Task watchdog'u, güvenli oyun döngüsü ve WebGL toparlanması zaten vardı; shader derleme süresi raporlanmıyordu.
- **Yapılanlar:** Seçili iki silahın modelleri arena ve oyuncu modelleriyle birlikte maç başlamadan ortak GLTF önbelleğine yükleniyor; bütün silah kataloğu yüklenmiyor. Maç öncesi `useProgress` hazır olma durumunu izliyor. Shader derleme süresi ve başarı durumu cihazda kalan performans raporuna eklendi. Sesler sentezlendiği için dosya indirmesi yok; ses bağlamı maç başında başlatılıyor. Efekt havuzları ve GLB içindeki dokular kullanılmaya devam ediyor.
- **Toparlanma:** Tekrarlanan 250 ms üzeri kareler ve Long Task'lar düşük kaliteye geçiriyor. Oyun döngüsündeki istisna maçı duraklatıyor; React error boundary sahneyi yeniden başlatabiliyor. WebGL bağlam kaybında oyun duraklatılıyor ve geri yüklemede Canvas yenilenirken dışarıdaki maç durumu korunuyor. Sekme/görünürlük kaybında girişler temizlenip performans saati sıfırlanıyor; dönüşte oyun duraklatılmış kalıyor. Simülasyon dt'si 50 ms ile sınırlı. Sahne kapanışında sahip olunan kaynaklar temizleniyor.
- **Ekran boyutu:** R3F Canvas ölçüm/değişiklikleri 150 ms debounce kullanıyor. `orientationchange`, `resize` ve `visualViewport.resize` olaylarında dokunmatik girişler sıfırlanıyor; böylece eski joystick dokunuşları yeni yön boyutuna taşınmıyor.
- **Benchmark — 13 Kasım 2026, 844×390, DPR 1, Taş Avlu/9 bot, SwiftShader:** 33 örnek / 57,908 sn; ortalama FPS/RAF 0,6; p50/p95/p99/maksimum 1.737,5 / 4.533,3 / 4.909,7 / 4.909,7 ms; 32 kare >50 ms ve >250 ms; 44 Long Task / 24.278 ms; shader derleme 2.506,2 ms ve başarılı; ortalama/tepe draw call 39,2/47; üçgen 1.679/2.184; geometri/doku 2.139/81. Tarayıcı çalışma zamanı hatası yok. Bu SwiftShader sonucu gerçek GPU performansını veya hızlanmayı doğrulamıyor.
- **Testler:** Tam otomatik test paketi 718/718; yükleme, watchdog, arka plan dönüş saati ve kaynak temizliği odaklı hedef testleri 10/10; `npm run typecheck`, `npm run build`, `git diff --check` geçti. Benchmark 60 saniyeyi tamamladı ve yerel rapor üretti.
- **Doğrulanamayanlar:** 10 gerçek maçlık bellek sızıntısı testi, kapı/bot doğma/boss fazı/silah değiştirme/doldurma olaylarının ayrı ayrı ≤50 ms kare hedefi, iPhone Safari/Android GPU ve gerçek cihaz ısınması bu ortamda doğrulanmadı. SwiftShader maksimum karesi hedefin çok üzerinde olduğundan olay bazlı hedefe ulaşıldığı iddia edilmiyor; gerçek cihaz/PC ölçümü 12.7’de açık kalacak. Hesap, kayıt veya ekonomi verisi kullanılmadı.
- **Değişen dosyalar:** `ILERLEME.md`, `src/shafak/game/WarRoomGame.tsx`, `src/shafak/game/war-room-performance.ts`, `src/shafak/game/war-room-performance.test.js`, `src/shafak/world/WarRoomModels.tsx`, `src/shafak/world/WarRoomScene3D.tsx`, `src/shafak/world/war-room-model-preload.test.js`.

### Kamera ve kahraman yönü — Tamamlandı (12.5 öncesi ek takip)

- **Kök neden:** Üçüncü şahıs kamera yeni kontrol yaw'ını izlerken oyuncu modeli yumuşatılmış kök yaw'ına göre dönüyordu. Kamera konumunun dünya koordinatlarında gecikmeli yumuşatılması dönüşte kamerayı oyuncunun önüne/yanına taşıyabiliyor; ev içinde de dışarıdaki eski mesafede kalıp duvar ve oda geometrisini bozabiliyordu. Hareket sırasında manuel bakış etkin olduğunda otomatik yön takibi kapanıyordu.
- **Yapılanlar:** Üçüncü şahıs kamera yaw'ı artık görünen oyuncu kökünün gerçek yönünden hesaplanıyor. Kamera yeni arka yön çizgisine hemen geçiyor; yalnız uzaklaşma yumuşatılıyor, yaklaşma ve iç mekân mesafesi anında uygulanıyor. Nişan alınmayan hareket, manuel bakışla birlikteyken de hareket yönünü izliyor; nişan sırasında yan hareket korunuyor. Ev içi kamera mesafesi 2,8 m'den 2 m'ye indirildi; nişanda 2,4 m.
- **Doğrulama:** `npm test` — 721/721 geçti; `npm run typecheck` — geçti; `npm run build` — geçti. Kamera dönüşünde arka yönde kalma, içeri girerken mesafenin hemen kısalması ve yatay joystick yönüne dönme testleri eklendi.
- **Doğrulanamayanlar:** Replit ekran görüntüsü tarayıcısı WebGL bağlamı oluşturamadığından 3D kamera burada görsel olarak doğrulanamadı. Gerçek iPhone/Android ve canlı Vercel sürümü ayrıca kontrol edilmedi; değişiklikler push veya deploy edilmedi.
- **Sıradaki adım:** 12.5 — Kasmaya bağlı silah titremesi — bekliyor. 13. adıma geçilmedi.
- **Değişen dosyalar:** `src/shafak/game/war-room-camera.ts`, `src/shafak/game/war-room-camera.test.js`, `src/shafak/game/war-room-mobile-controls.ts`, `src/shafak/game/war-room-mobile-controls.test.js`, `src/shafak/world/WarRoomScene3D.tsx`, `ILERLEME.md`.

### 12.5 — Kasmaya bağlı silah titremesi: **Tamamlandı; gerçek cihaz kabulü açık**

- **Yapılanlar:** Viewmodel animasyon dt’si 50 ms ile sınırlandı ve EMA ile yumuşatıldı. 25 ms üzerindeki karelerde silah bob/sway hedefi kademeli olarak %45’e iner; normal karelerde yumuşakça geri gelir. Silah/ellerin hedef konumu ve dönüşü 120 Hz sabit adımlı kritik sönümlü yaydan geçirilip render karesine interpolasyonla uygulanıyor. Kamera, oyuncu ve silah aynı render karesindeki kamera dönüşümünü kullanıyor. Mevcut ayrı 60° viewmodel kamerası, derinlik temizliği, duvar geri çekilmesi, sağ-alt yerleşim, 0,6 yatay görünüm ölçeği ve ADS küçültme/şeffaflık yolu korundu; bu değerler için yeni bir değişiklik gerekmedi.
- **ÖNCE/SONRA — aynı deterministik 120 karelik yürüyüş ve `[16, 16, 40, 16, 16, 60]` ms yapay kare süresi dizisi:** En büyük silah konumu değişimi 2,178 mm’den 1,480 mm’ye (%32,1 daha düşük), en büyük dönüş değişimi 0,002079 rad’dan 0,001467 rad’a (%29,4 daha düşük) indi. Son durumdaki test sınırı kare başına 1,5 mm.
- **Tarayıcı duman testi — 13 Kasım 2026, Replit geliştirme ortamı, SwiftShader:** Savaş Odası benchmark’ı 26 kare örneğiyle hatasız tamamlandı; WebGL shader hazırlığı başarılı ve sayfa çalışma zamanı hatası oluşmadı. Renderer `ANGLE / SwiftShader`; örneklenen ortalama 0,5 FPS, p50/p95/p99 kare süresi 2.138,6 / 4.863,5 / 6.306,7 ms. Bu yazılım renderer ölçümü gerçek telefon/GPU performansını veya FPS artışını kanıtlamaz.
- **Testler:** Viewmodel/jitter hedef testleri 21/21; tüm testler 722/722; `npm run typecheck`, `npm run build` ve `git diff --check` geçti. Kamera ile viewmodel aynı karede güncellendiği, ayrı kamera/FOV ve ADS yolunun test edildiği doğrulandı.
- **Doğrulanamayanlar:** Gerçek iPhone Safari/Android cihazında silah hissi, uzun süreli kasma ve 60 FPS kabulü bu ortamda ölçülmedi. Canlı Vercel’e push veya deploy yapılmadı; üretim ve hedef cihaz kontrolü açık kalıyor.
- **Değişen dosyalar:** `ILERLEME.md`, `src/shafak/game/war-room-viewmodel.ts`, `src/shafak/game/war-room-viewmodel-jitter.test.js`, `src/shafak/world/WarRoomScene3D.tsx`.

### 12.6 — Dikey mod ve HUD: **Tamamlandı; gerçek cihaz kabulü 12.7'de**

- **Yapılanlar:** Portre HUD'u güvenli alanları kullanıyor; yedi dokunma eylemi ve silah yuvaları en az 48 px, kontroller arası boşluk 8 px. Mini harita, kısa görev kartı, kompakt mühimmat/silah paneli ve ayrı kontrol yerleşimi korunuyor. Görev kartı dört saniye sonra çipe küçülüyor ve dokunmayla açılıp kapanıyor; yatay görünüm ipucu kapatılabiliyor. Döndürmede otomatik duraklatma veya yön kilidi yok; tüm ölçüler arasında test savaş aşamasının korunduğunu doğruluyor. Dikey kamera yatay görüşü en az 75° tutuyor.
- **Render bütçesi düzeltmesi:** Portre DPR sınırı artık yatay referansın gerçek, tam sayı çizim arabelleği piksellerinden hesaplanıyor. Önceki sürekli alan hesabı, 430×800'de küsurat yuvarlaması nedeniyle bütçeyi 12 piksel aşıyordu; artık aşı yok.
- **Ölçüm — 844×390 yatay referans:** Canvas 463×198 = 91.674 piksel. Portre: 360×640 — 216×384 = 82.944; 360×740 — 211×434 = 91.574; 390×664 — 232×395 = 91.640; 412×780 — 220×416 = 91.520; 430×800 — 221×412 = 91.052. Hepsi yatay referansın altında.
- **Tarayıcı doğrulaması:** Yedi istenen ölçünün briefing ve savaş HUD ekran görüntüleri alındı; görünür HUD kutularında taşma/çakışma yok. Yedi eylem, ≥48 px hedef, 8×8 px aralık, iki silah yuvası, görev kartı aç/kapa, yatay ipucu kapatma ve savaş aşamasının korunması geçti. Render boyutu kontrolü yazılım SwiftShader ortamında animasyon-kare geri çağrısından bağımsız zamanlayıcıyla bekliyor.
- **Vercel hatası:** `package.json` Playwright'ı `^1.65.0` isterken `pnpm-lock.yaml` eski `^1.64.1` değerini içeriyordu; Vercel'in dondurulmuş pnpm kurulumu bu nedenle duruyordu. pnpm kilidi `^1.65.0` / `1.65.1` ile eşitlendi; `pnpm install --frozen-lockfile` başarılı.
- **Testler:** `npm run warroom:layout:e2e` — tüm yedi boyut geçti; `pnpm test` — 725/725; `pnpm run typecheck`, `pnpm run build`, dondurulmuş pnpm kurulumu ve `git diff --check` geçti.
- **Doğrulanamayanlar:** Gerçek iPhone Safari/Android GPU'sunda FPS, ısınma ve güvenli alan/dokunma kabulü yapılmadı; Vercel'de yeni commit henüz çalıştırılmadı. Canlı dağıtım ve cihaz ölçümleri 12.7'de/elle yapılacak.
- **Değişen dosyalar:** `ILERLEME.md`, `pnpm-lock.yaml`, `scripts/war-room-layout-e2e.mjs`, `src/shafak/game/war-room-quality.ts`, `src/shafak/game/war-room-quality.test.js`.
- **Yeniden doğrulama — 14 Kasım 2026:** Sonraki kontrol, çalışma ağacındaki Playwright kilit tanımının `package.json` ile hâlâ uyuşmadığını gösterdi (`^1.65.0` karşısında `^1.65.1`); dondurulmuş kurulum bu yüzden başarısızdı. `pnpm-lock.yaml` yalnızca `^1.65.1` tanımına hizalandı; `pnpm install --frozen-lockfile --ignore-scripts` geçti. Yeniden çalıştırmada `pnpm test` — 727/727, `pnpm run typecheck`, `pnpm run build` ve `pnpm run warroom:layout:e2e` geçti; yedi viewport'ta 14 ekran görüntüsünde taşma/çakışma yok.

### 12.7 — Doğrulama: **Tamamlandı (otomatik doğrulama); gerçek cihaz kabulü açık**

- **Kök neden:** Her klonlanmış karakter iskeleti render sırasında bir GPU `Skeleton.boneTexture` oluşturuyordu. Karakter kaynaklarının kapatılması geometriyi, materyali ve klonlanmış dokuları temizliyor; iskeletin kemik dokusunu temizlemiyordu. İlk E2E ölçümünde her sahne yenilemesinde doku sayısı 7 arttı (32’den 81’e); geometri ve materyal sayıları sabit kaldı.
- **Yapılanlar:** Karakter kaynak sahipliği artık benzersiz iskeletleri de izliyor ve kapanışta `Skeleton.dispose()` çağırıyor. Aynı iskeleti paylaşan iki mesh için yalnız bir kez kapatma yapıldığını doğrulayan regresyon testi eklendi; sızıntı testi eşiği gevşetilmedi.
- **10 döngü kaynak testi:** Aynı WebGL renderer’ında üç ısınma yenilemesinden sonra taban 2.003 geometri / 18 doku / 3.180 materyaldi. Ardışık 10 test sahnesi yenilemesinin her birinde aynı sayaçlar korundu; yerel profil/ödül verisine yazılmadı.
- **ÖNCE/SONRA benchmark yorumu:** Önceki SwiftShader koşusu 26 örnek ve 0,5 FPS; son koşu (14 Kasım 2026, 844×390, DPR 1) 25 örnek / 56.714 ms ve 0,4 FPS ölçtü. Son p50/p95/p99 2.238,2 / 5.476,9 / 6.594,9 ms; 24 kare 50 ms’yi, 24 kare 250 ms’yi aştı; 56 Long Task toplamı 30.097 ms. Sonuç hızlanma göstermiyor.
- **Render bütçesi ve titreşim:** Son benchmark’ta ortalama/tepe draw call 39,3/47, üçgen 1.684/2.184 (hedeflerin altında); kalite Düşük, ölçek 0,6, shader hazırlığı başarılı. Viewmodel kare-süresi enjeksiyon testleri 5/5 geçti.
- **HUD:** Son E2E kontrolünde menü, mağaza, envanter, hazırlık, HUD ve sonuç ekranları 9 boyutta (54 görüntü) taşma/çakışma olmadan geçti.
- **Bundle raporu:** İlk statik grafik 309.297 B JS + 29.535 B CSS = 338.832 B (gzip toplamı 105.296 B). Savaş Odası giriş parçaları 297.974 B JS (gzip 89.442 B) + 128.099 B CSS (gzip 22.011 B). Savaş Odası’nın tüm statik import kapanışı ortak parçalarla 2.016.010 B JS + 198.119 B CSS (gzip toplamı 632.483 B); HTML, yazı tipi ve 3B varlıklar dahil değil.
- **Doğrulama:** `pnpm test` — 728/728; `pnpm run typecheck`, `pnpm run build -- --manifest`, `pnpm run warroom:resource-leak:e2e` (10 yenileme) ve `pnpm run warroom:final:e2e` (54 görüntü) geçti.
- **Doğrulanamayanlar:** Chromium `ANGLE / SwiftShader` yazılım renderer’ı gerçek GPU değildir; düşük FPS ölçümü gerçek PC/iPhone performansını kanıtlamaz. iPhone Safari ve Android’de FPS, ısınma, grafik belleği, Düşük Güç Modu ve uzun süreli oynanış ölçülmedi. Gerçek cihaz testi kullanıcıda kalıyor.
- **Değişen dosyalar:** `src/shafak/world/character-model.ts`, `src/shafak/world/character-model.test.js`, `ILERLEME.md`.

## Adım 13 — Play Store altyapısı ve reklam

- **Durum:** Bekliyor; Adım 12 doğrulandı, sıradaki alt adım 13.1.

### 13.1 — Reklam altyapısı: **Bekliyor**

- Sağlayıcıdan bağımsız `AdService` (`none`, `h5games`, pasif `admob-native`) ve varsayılan kapalı sağlayıcı; rıza, hazır olma, ödüllü/geçiş reklamı ve kapanış akışı.
- Sağlayıcı/kimlik yokken reklam kodu veya üçüncü taraf script yüklenmeyecek; reklam yalnız açık sağlayıcı ve rıza durumunda menü/doğal arada lazy-load edilecek. Sunucu kill switch’i olacak. Gerçek kimlik/sırlar repoya konmayacak; geliştirmede yalnız test kimliği.

### 13.2 — Reklam yerleşimi ve oyun deneyimi: **Bekliyor**

- Ödüllü reklam yalnız oyuncu seçerse; geçiş reklamı doğal arada, en fazla üç bölümde bir ve en az üç dakika arayla; ilk beş bölümde, savaşta, boss’ta veya hikâye/finalde yok. Banner olmayacak.
- Reklamda oyun/ses duraklatılacak; reklam yoksa oyun kesintisiz sürecek. Günlük küçük ödül sınırı sunucuda, tek kullanımlık nonce ve zaman/limit doğrulamasıyla korunacak. Gerçek para satışı olmayacak.

### 13.3 — Rıza ve gizlilik: **Bekliyor**

- Gereken bölgelerde onaylı CMP/UMP ve sonradan değiştirilebilir reklam/gizlilik tercihi; yaş onayı, 13 yaş altına reklam kapatma/veri toplamama.
- Türkçe/İngilizce gizlilik sayfasında reklam/kimlik/çerez, rıza, Clerk, PostgreSQL/Vercel, saklama/silme, iletişim, KVKK/GDPR açıklanacak; `/delete-account` ve uygulama içi erişim test edilecek.
- `app-ads.txt` yer tutucu şablonu eklenecek.

### 13.4 — Play Console içerik dosyaları: **Bekliyor**

- `docs/play-store/` altında TR/EN mağaza metni, Data Safety, içerik derecelendirme, reklam/hedef kitle, incelemeci erişimi ve v1.0.0 sürüm notları hazırlanacak.
- İkon/öne çıkan görsel/telefon/tablet ekran görüntüsü kontrol listesi ve sahne listesi eklenecek; ilk iki görsel üretilemezse ölçülü şablon verilecek. İncelemeci parolası dosyaya yazılmayacak.

### 13.5 — Güvenlik ve dayanıklılık: **Bekliyor**

- API hız sınırı, doğrulama/yetkilendirme, güvenli hata, CORS/CSP; reklam alan adları yalnız reklam açıkken. Ödül/altın/envanter sunucuda doğrulanacak.
- Bağlantı kopmasında ilerleme korunacak ve sınırlı yeniden deneme; üçüncü taraf analitik eklenmeyecek, yalnız anonim sunucu hata kaydı.
- Android geri tuşu, ekranın uyanık kalması, arka plan/WebGL dönüşü ve ses odağı kontrol edilecek.

### 13.6 — Android paketleme ve sürümleme: **Bekliyor**

- Keystore/şifreleri GitHub Secrets’tan alan, elle tetiklenen Bubblewrap TWA AAB GitHub Actions iş akışı; imza materyali repoya girmeyecek. Secrets kurulum adımları dokümante edilecek.
- `com.safaksavascilari.game`, package.json sürümünden `versionName` ve artan `versionCode`; hedef API resmi Play gereksiniminden doğrulanacak.
- Debug/Play sertifikaları için assetlinks şablonu ve Capacitor/AdMob rehberi hazırlanacak; kullanıcı karar verene kadar Capacitor yolu pasif kalacak.

### 13.7 — Yayın öncesi kontrol listesi: **Bekliyor**

- Play Console sıralı kontrol listesi, yalnız kullanıcının yapabileceği hesap/ödeme/sertifika/başvuru/test kullanıcı adımları ve reklam kapalı ilk sürüm seçeneği yazılacak.

### 13.8 — Doğrulama: **Bekliyor**

- AdService rıza/limit/aralık/kill-switch/nonce ve `none` ağ isteği testleri; yaş kapısı, hesap silme, rate limit; tür denetimi, üretim derlemesi ve reklam kodu bundle kontrolü.
- Gerçek reklam, cihaz ve Play Console’da doğrulanamayanlar ile kullanıcının manuel adımları açıkça raporlanacak.
