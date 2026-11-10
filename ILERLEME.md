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

### Adım 11 alt adımları

- **11.1 — Mağaza: satın alma ve kuşanma:** Tamamlandı
- **11.2 — Ana menü metinleri:** Tamamlandı
- **11.3 — Yatay arayüz çakışmaları:** Tamamlandı
- **11.4 — Silah titremesi:** Tamamlandı
- **11.5 — Kapı ve eşik takılması:** Tamamlandı
- **11.6 — Ortam görsel kalitesi:** Kod tamamlandı; gerçek cihaz görsel/FPS kabulü açık
- **11.7 — Silahlar ve eller:** Kod/test tamamlandı; gerçek cihaz kabulü açık
- **11.8 — Savaş Odası kapsamlı yenileme:** Bekliyor
- **11.9 — Final doğrulama:** Bekliyor
