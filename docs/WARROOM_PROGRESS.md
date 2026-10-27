# Savaş Odası faz ilerlemesi

Bu kayıt, `attached_assets` içindeki faz protokolü ve önceki oturum ekran görüntülerine göre sürdürüldü. Geçmiş commit ayrıntıları bu çalışma kopyasında bulunmadığında açıkça belirtilmiştir.

## Düzeltme turu — iPhone testinde görülen sorunlar

- **Durum:** DEVAM EDİYOR
- **Kapsam:** Ekli test notlarındaki Adım 1–7: silah normalizasyonu ve canlı kalibrasyon, hareket yönü/isabet teşhisi, can yenileme, geçerli hedef filtresi ve silaha özel yakın dövüş efektleri.
- **Kural:** Her adımın sonunda build, typecheck, testler ve yerel commit; Git push ve Vercel deploy yapılmayacak.
- **Adım durumu:** 1 kısmen doğrulandı · 2 kısmen doğrulandı · 3 kısmen doğrulandı · 4 kısmen doğrulandı · 5 kısmen doğrulandı · 6 bekliyor · 7 bekliyor.
- **Cihaz kabulü:** Gerçek iPhone/Safari testi bu çalışma ortamında yapılamaz; kod/test doğrulaması ile cihaz doğrulaması ayrı raporlanacak.

### Adım 1 — Silah normalizasyonu

- **Durum:** KISMEN — normalizasyon ve tutuş kod/testleri doğrulandı; iPhone'daki gerçek model görünümü doğrulanamadı.
- **Yapılanlar:** GLB sınır kutusu yükleme anında ölçülüyor, en uzun eksen hedef uzunluğa göre normalize ediliyor ve config'teki `gripRatio` el kemiği kökenine taşınıyor. Minimum görsel kalınlık yalnızca eksene dik boyutlara uygulanıyor. İstenen melee uzunlukları bıçak 0,30 m, balta 0,75 m, sopa 0,90 m, kürek 1,20 m, mızrak 1,90 m, asa 1,50 m ve kazma 1,00 m olarak test ediliyor.
- **Mesh incelemesi:** İncelenen yedi melee GLB'nin her birinde bir mesh ve bir primitive var; ayrı bir kopya/siyah silindir mesh'i bulunmadı. Görseldeki silindir bu mesh'in içindeyse bağımsızca gizlenemez; ekli notta bahsedilen görüntü bu çalışma kopyasına eklenmediği için bunun ekrandaki parça olduğuna dair kesin teşhis yapılamadı.
- **Doğrulama:** `npm run typecheck` ve `npm run build` başarılı; War Room motoru ve silah-fit testleri 15/15 geçti. Tüm testler 355 toplam, 347 geçti, 8 başarısız; bunlar altı mağaza/ekipman, bir duel dengesi ve bir varsayılan envanter testi. Tam iPhone/WebGL görsel kabulü doğrulanamadı.

### Adım 2 — Telefonda canlı kalibrasyon

- **Durum:** KISMEN — kod/build doğrulandı; gerçek iPhone'da dokunma ve pano izni kabulü açık.
- **Yapılanlar:** Savaş sırasında yalnızca `?calib=1` ile açılan, daraltılabilir ve yarı saydam panel eklendi. Etkin silah değişince panelin değerleri de değişir. Konum, derece cinsinden üç eksenli dönüş ve ölçek +/- ile ayarlanır; küçük/büyük adım arasında geçilir. JSON hem ekranda gösterilir hem pano API'si kullanılabiliyorsa kopyalanır. Clipboard izni yoksa JSON ekranda seçilebilir kalır. Kalibrasyon açıkken eski debug tutuş paneli gizlenerek üst üste binme önlendi.
- **Doğrulama:** `npm run typecheck` ve `npm run build` başarılı. `npm test`: 355 toplam, 347 geçti, aynı 8 Savaş Odası dışı taban testi başarısız. Fiziksel iPhone/pano kabulü doğrulanamadı.

### Adım 3 — Karakter yönü ve strafe

- **Durum:** KISMEN — saf yön hesabı ve oyun entegrasyonu doğrulandı; iPhone joystick kabulü açık.
- **Yapılanlar:** Kamera yönü korunarak beden yaw'ı ayrı hesaplanıyor. İleri/geri/yan hareket yüz/sırt yönünü dünya hareketine göre belirliyor; nişanda veya atak animasyonu bitiminden 0,8 sn sonra beden kamera yaw'ına dönüyor. Hareket başlarsa atak sonrası strafe zamanlayıcısı erkenden iptal ediliyor. `?debug=1` yön, hareket/strafe modu, joystick açısı ve beden yaw'ını gösteriyor.
- **Doğrulama:** Yön modülünün ileri/geri/yan/strafe/boşta ve timer testleri dahil War Room hedef testleri 15/15 geçti. `npm run typecheck` ve `npm run build` başarılı. `npm test`: 359 toplam, 351 geçti, 8 başarısız; aynı mağaza/ekipman (6), duel dengesi (1) ve varsayılan envanter (1) taban testleri. iPhone joystick davranışı doğrulanamadı.

### Adım 4 — İsabet teşhisi ve temas zamanı

- **Durum:** KISMEN — melee testleri/teşhis kodu doğrulandı; hedef cihazda vuruş ve çizgi görünümü açık.
- **Yapılanlar:** Temas anı animasyonun %55 ilerlemesine alındı; cooldown ile melee animasyon sürelerinin mevcut silah config'inde uyumlu olduğu korunuyor. Mızraklara saldırı menziline +0,4 m tolerans ve melee konisine ±65° uygulandı. Debug sonucu artık hedef adı/hasarı veya ıskalama türüyle mesafe/menzil/açıyı içeriyor; son sonuç en az 2 sn görünür. Sürüm `v15-kalibrasyon`.
- **Çizgi teşhisi:** Kırmızı çizgi kaynağı büyük olasılıkla düşman mermi izi: düşman namlusundan hedef noktasına çizilip 0,08 sn kalan `#f36e54` tracer. Melee izi bununla aynı değil; silah rengini kullanıyor, saldırı etkin değilken örnek üretmiyor ve 0,22 sn içinde soluyor. Ekli notta belirtilen ekran görüntüsü burada bulunmadığından çizginin birebir bu iz olduğu görsel olarak doğrulanamadı.
- **Doğrulama:** Melee aim, combat feel ve War Room motoru testleri 26/26 geçti; `npm run typecheck` ve `npm run build` başarılı. `npm test`: 361 toplam, 353 geçti, aynı 8 Savaş Odası dışı taban testi başarısız. iPhone/WebGL görsel kabulü doğrulanamadı.

### Adım 5 — Oyuncu can yenilenmesi ve şifa noktaları

- **Durum:** KISMEN — kurallar, oyun/HUD bağlantısı ve birim testleri doğrulandı; iPhone etkileşimi açık.
- **Yapılanlar:** Varsayılanı açık tek `RESTORE_CONFIG` ile pasif yenilenme 6 sn hasarsız/çatışmasız süreden sonra 2 CAN/sn ve %60 tavanla çalışıyor. Normal öldürme en az 6 veya maksimum CAN'ın %5'i; komutan öldürme %15 CAN veriyor. Dört sabit şifa noktası oyuncuya %25 CAN sağlıyor, 45 sn sonra yenileniyor; dolu CAN'da nokta tüketilmiyor. Yalnız oyuncu topluyor; düşman CAN/AI davranışı değiştirilmedi. Minimap işaretleri, yeşil yenilenme barı, `+X CAN` bildirimi, pickup efekti/sesi ve debug yenilenme durumu eklendi.
- **Doğrulama:** Restore/engine/audio hedef testleri 26/26 geçti; `npm run typecheck` ve `npm run build` başarılı. `npm test`: 371 toplam, 363 geçti, aynı 8 Savaş Odası dışı taban testi başarısız. Fiziksel iPhone etkileşimi doğrulanamadı.

## Faz 1 — Karakter yönelimi

- **Durum:** BİTTİ (önceki oturumda tamamlandığı ve yerel commit alındığı ekran görüntüsünde bildirildi).
- **Yapılanlar:** Önceki oturum raporu, joystick hareket yönü ve strafe yön hesabının/testlerinin tamamlandığını söylüyor.
- **Kalanlar:** 3D görünüm cihaz önizlemesinde doğrulanamadı; telefonda `?debug=1` ile kabul testi bekliyor.
- **Değişen dosyalar:** Önceki oturumun dosya listesi ve commit ayrıntıları bu çalışma kopyasında bulunmuyor.
- **Doğrulama sonucu:** Önceki oturum build/typecheck/test ve yerel commit yaptığını bildirdi; bu kopyada yeniden çalıştırılmadı.

## Faz 2 — Heybe → Donanım Görünümü

- **Durum:** BİTTİ (kod); cihaz/WebGL görsel kabul testi açık.
- **Yapılanlar:** Mobil önizleme tam genişlik ve `min(60svh, 520px)` yüksekliğinde. Aynı Canvas tam ekrana genişliyor; sürükleyerek döndürme, sınırlı çimdik yakınlaştırma, çift dokunma/double-click sıfırlama ve yavaş otomatik dönüş var. Oyuncu `KnightActor` rig'i ve el montajı kullanılıyor; seçilen parça önizlemede deneniyor, donanımlı parça ayrı etiketleniyor. Key/rim/fill ışıkları, gölge diskleri, nadirlik parıltısı, vignette ve parça değişim geçişi eklendi. Canvas görünür değilken duruyor, DPR 2 ile sınırlı, panel kapanınca unmount/dispose oluyor; WebGL fallback statik simge gösteriyor. `DENE · DÜNYADA GÖR` korunuyor.
- **Kalanlar:** Telefonda `?debug=1` ile dönme/zoom/tam ekran ve ekipman kabul testi.
- **Değişen dosyalar:** `src/shafak/game/WarRoomGame.tsx`, `src/shafak/game/store-ui/StorePanel.tsx`, `src/shafak/game/store-ui/store-panel.css`, `src/shafak/game/store-ui/equipment-preview-config.ts`, `src/shafak/world/EquipmentPreview3D.tsx`, `src/shafak/world/WorldScene.tsx`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama sonucu:** `npm run typecheck` ve `npm run build` başarılı. `npm test`: 329 testten 321 geçti, 8 bilinen test başarısızlığı var; önceki protokolde belirtilen 321/8 tabanıyla aynı. Replit ekran görüntüsü donanım paneline ulaşmadı; tarayıcı WebGL bağlamı oluşturamadığı için 3D önizleme bu ortamda doğrulanamadı.

## Faz 3 — Yeni yakın dövüş silahları

- **Durum:** BİTTİ
- **Yapılanlar:** `war-room-staff.glb`, `war-room-spear.glb` ve `war-room-pickaxe.glb` analiz scriptiyle raporlandı. Üç model de 1,5 MB ve 6.000 üçgen sınırının altında; silaha göre lazy-load ve yükleme hatasında özel yedek geometri kullanılıyor. Savaş Odası'na Kül Asası (geniş savuruş), Surlu Mızrağı (uzun saplama) ve Surlu Kazması (yüksek hasar/ağır darbe) eklendi; her birinin ayrı tutuş, ölçek, model ve mağaza kaydı var. Sadece War Room kataloğunda yer alıyor.
- **Kalanlar:** GLB'lerin gerçek iPhone/WebGL görünümü ve eldeki oranı cihazda kabul testi bekliyor.
- **Değişen dosyalar:** `src/shafak/game/war-room-data.ts`, `src/shafak/game/store-catalog.ts`, `src/shafak/game/war-room-engine.test.js`, `src/shafak/game/WarRoomGame.tsx`, `src/shafak/world/WarRoomScene3D.tsx`, `scripts/analyze-war-room-weapons.mjs`, `package.json`, `docs/WARROOM_WEAPONS.md`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama sonucu:** GLB analizi, ilgili testler, `npm run build` ve `npm run typecheck` geçti. `npm test`: 330 testten 322 geçti, 8 başarısız; başarısız dosya/test başlıkları Faz 3 öncesi taban çizgisiyle aynı (önce 329/321/8). WebGL ve gerçek cihaz kabul testi doğrulanamadı.

## Faz 4 — Savaş hissi

- **Durum:** BİTTİ (kod); cihaz/WebGL görsel kabul testi açık.
- **Yapılanlar:** Çalışma kopyasında bulunan üç adımlı farklı savuruşlu kombo, 350 ms basılı tutmayla ağır saldırı, tek vuruş anı kontrolü, mevcut koni/engel testi, 0,34–0,48 m engel denetimli ileri atılma, 25° ile sınırlı yakın hedef yardımı, 50/90 ms hit-stop, kamera/FOV geri bildirimi, 0,24 sn ile sınırlı yalnız görsel sendeleme, yönlü geri tepme ve ölümde yatıp solma korundu. Faz 4 kapatma bayrağı ve saldırı debug alanı mevcut. Plan/yardımcı fonksiyon testleri eklendi; TS tür hatası düzeltildi.
- **Kalanlar:** Hit geri bildiriminin ve animasyonların iPhone/WebGL üzerinde `?debug=1` ile görsel kabul testi.
- **Değişen dosyalar:** `src/shafak/game/war-room-combat-feel.test.js`, `src/shafak/world/WarRoomScene3D.tsx`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama sonucu:** Build ve typecheck geçti. `npm test`: 334 testten 326 geçti, 8 başarısızlık; aynı 6 mağaza/ekipman ve 2 duel taban testi, Savaş Odası testleri dahil yeni başarısızlık yok. Build büyük-bundle uyarısı verdi. WebGL/cihaz kabulü doğrulanamadı.

## Faz 5 — Görsel efektler

- **Durum:** BİTTİ (kod); iPhone/WebGL görsel kabul testi açık.
- **Yapılanlar:** 72 parçacıklı ortak havuz (150 üst sınırın altında), 30 decal yuvası ve 10 segmentli additive silah izi korunup tek bayrakla (`WAR_ROOM_POOLED_FX_ENABLED`) kapatılabilir hale getirildi. Kan ayarı hafif varsayılanıyla korunuyor; kapalıyken et isabetinde kan yerine kıvılcım, komutan/metal isabetinde kıvılcım, engel isabetinde toz üretiliyor. Ağır vuruş şok dalgası ve kısa ömürlü çatlak decal kullanıyor. Kritik ve normal hasar sayıları ayrı stillerle, animasyonlu ve mevcut CAN bildiriminden ayrık gösteriliyor. Koşu/iniş tozu, hasar vinyeti ve efsanevi silah aurası mevcut. Havuz renk tamponları savaş başında hazırlanıyor.
- **Kalanlar:** İz, isabet/çatlak efektleri ve aura için gerçek iPhone/WebGL görsel kabulü. Replit önizlemesinde WebGL bağlamı oluşturulamadığından bu ortamda görsel efektler çalıştırılarak doğrulanamadı.
- **Değişen dosyalar:** `src/shafak/game/WarRoomGame.tsx`, `src/shafak/game/war-room-engine.ts`, `src/shafak/game/war-room-features.ts`, `src/shafak/game/war-room-fx.ts`, `src/shafak/game/war-room-fx.test.js`, `src/shafak/game/war-room.css`, `src/shafak/world/WarRoomScene3D.tsx`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama sonucu:** `npm run typecheck` ve `npm run build` başarılı. `npm test`: 336 testten 328 geçti, 8 başarısız; başarısızlar War Room dışı: 6 mağaza/eşya testi, 1 düello süresi testi, 1 envanter varsayılanı testi. War Room FX testleri dahil bu fazdaki testlerde yeni hata yok. Ekran görüntüsü savaş arayüzüne ulaşmadı; tarayıcı WebGL bağlamı oluşturamadığı için görsel kabul doğrulanamadı.

## Faz 6 — Ses

- **Durum:** BİTTİ (kod); iPhone/Safari işitsel kabul testi açık.
- **Yapılanlar:** WebAudio gürültü + osilatör katmanlı ses sentezi; hafif/ağır saldırılar ve sekiz yakın dövüş silahının her biri için ayrı savuruş profili; et, metal, taş/duvar ve toprak/taş ayak sesi profilleri. Perde varyasyonu, mesafe zayıflaması, dinleyici yönüne göre stereo pan ve sabit 4 ses kanalı kullanılıyor. Dört kanaldaki ses düğümleri ilk savaş etkileşiminde birlikte hazırlanıyor; savaş sırasında yeni WebAudio düğümü oluşturulmuyor. SESSİZ ana kontrolü tüm kanalı susturuyor; `beginBattle` ve ses açma düğmesi iOS kullanıcı etkileşimi içinde AudioContext'i devam ettiriyor. `v14-faz6` etiketi debug görünümünde.
- **Kalanlar:** Gerçek iPhone/Safari'de sesli/sessiz geçişi, arka plan/ön plan dönüşü ve WebAudio duyum kalitesi doğrulanamadı.
- **Değişen dosyalar:** `src/shafak/game/war-room-audio.ts`, `src/shafak/game/war-room-audio.test.js`, `src/shafak/game/WarRoomGame.tsx`, `src/shafak/game/war-room-features.ts`, `src/shafak/world/WarRoomScene3D.tsx`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama sonucu:** İlgili ses testleri 5/5 geçti; build ve typecheck geçti. `npm test`: 341 testten 333 geçti, 8 başarısız; aynı altı mağaza/ekipman, bir düello süresi ve bir envanter varsayılanı testi başarısız, War Room ses testlerinde yeni hata yok. Build büyük chunk uyarısı verdi. iPhone/Safari işitsel kabul testi doğrulanamadı.

## Faz 7 — Kalite katmanları ve performans

- **Durum:** BİTTİ (kod); iPhone kabul testi açık.
- **Yapılanlar:** Elle seçilebilir düşük/orta/yüksek ve otomatik profiller; FPS düşüşünde otomatik kalite azaltma; parçacık, iz ve DPR profilleri; mobil DPR'nin düşük profilde 0,75'e ve orta profilde 0,9'a inmesi eklendi. `WAR_ROOM_QUALITY_ENABLED` bayrağı varsayılan açık; kapatılınca eski ölçeklenmemiş efekt/DPR davranışı korunuyor. Kullanılmayan silah GLB'leri briefing ön yüklemesinden çıkarıldı; briefing'de 7 arena modeli yüklendi, hiç silah GLB'si istenmedi. Savaşta kullanılan havuz nesnelerine tam temizleme eklendi; ortak çatlak geometrisi korunuyor. `?debug=1` 60 saniyelik sayaç, saldırı aralıkları, FPS, efekt/decal tepesi ve renderer geometri/doku sayılarını raporluyor. Sürüm `v14-faz7`.
- **Kalanlar:** iPhone'da kalite profillerinin, kaynak sayaçlarının ve performansın kabul testi. 60 sn SwiftShader denemesi kesintisiz testi geçemedi; headless yazılım render'ı telefona karşılık gelmiyor.
- **Değişen dosyalar:** `src/shafak/App.tsx`, `src/shafak/game/WarRoomGame.tsx`, `src/shafak/game/war-room-features.ts`, `src/shafak/game/war-room-quality.ts`, `src/shafak/game/war-room-quality.test.js`, `src/shafak/world/WarRoomModels.tsx`, `src/shafak/world/WarRoomScene3D.tsx`, `src/shafak/world/war-room-model-preload.test.js`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama sonucu:** Build ve typecheck geçti; build büyük-bundle uyarısı verdi. `npm test`: 351 testten 343 geçti, 8 başarısız; aynı bilinen 6 mağaza/ekipman, 1 düello süresi ve 1 envanter testi, yeni War Room başarısızlığı yok. Faz 7 kalite/model hedef testleri 10/10 geçti. 60 sn SwiftShader ölçümü: 1,6 ortalama / 1,0 en düşük FPS; 10 kabul edilen saldırı, en uzun boşluk 7.419 ms; FX 0/28, decal 0/30; renderer 187 geometri (+0), 84 doku (+0). Bu ortam testi “kesintisiz saldırı yok” olarak işaretledi; sayaç sonucu doğruladı, fakat efekt havuzu stresi ve gerçek cihaz FPS'si doğrulanamadı. Replit ekran görüntüsü WebGL bağlamı oluşturamadı; SwiftShader'da WebGL sahnesi açıldı.

## Faz 8 — Son kontrol ve rapor

- **Durum:** BİTTİ (kod ve yerel doğrulama); cihaz kabulü açık.
- **Yapılanlar:** Faz 7 `ecc308c` yerel commit olarak alındı. Dört mevcut faz bayrağının varsayılanı `true` doğrulandı. Sürüm etiketi `v14-premium-dovus` yapıldı. Son build/typecheck/test ve uygulama yeniden başlatma kontrol edildi. iPhone kontrol listesi aşağıya eklendi.
- **Kalanlar:** Aşağıdaki iPhone/Safari/WebGL kabul maddeleri.
- **Değişen dosyalar:** `src/shafak/game/war-room-features.ts`, `docs/WARROOM_PROGRESS.md`, `.agents/memory/mobile-frame-rate-verification.md`.
- **Doğrulama sonucu:** Build ve typecheck geçti; build büyük chunk uyarısı verdi. `npm test`: 351 testten 343 geçti, 8 bilinen taban testi başarısız; önceki Faz 7 geçişindeki aynı 8 test, War Room kaynaklı yeni hata yok. Uygulama `Start application` iş akışında yeniden başladı. Headless SwiftShader'da `v14-premium-dovus` WebGL savaş sahnesi açıldı ve seçili Mızrak için yalnızca `spear.glb` yüklendi. Gerçek iPhone FPS, görsel kalite ve Safari sesi doğrulanamadı.

### Son doğrulama tablosu

| Madde | Durum (Doğrulandı / Kısmen / Doğrulanamadı) | Not |
|---|---|---|
| Faz 1 — Karakter yönelimi | Kısmen | Önceki oturum tamamlandı diye bildirdi; bu kopyada eski commit/dosya ayrıntısı yok. iPhone hareket kabulü açık. |
| Faz 2 — Donanım önizlemesi | Kısmen | Kod/build/test kayıtları mevcut; gerçek cihazda sürükleme, zoom ve tam ekran kabulü açık. |
| Faz 3 — Yakın dövüş silahları | Kısmen | Seçili Mızrak 3D sahnede yüklendi; üç yeni GLB'nin iPhone eldeki oranı doğrulanmadı. |
| Faz 4 — Savaş hissi | Kısmen | Kod ve hedef testler mevcut; iPhone animasyon/hit geri bildirimi görsel kabulü açık. |
| Faz 5 — Görsel efektler | Kısmen | Havuz sınırları test edildi; ölçümde isabet olmadığından gerçek efekt havuzu stresi doğrulanmadı. |
| Faz 6 — Ses | Kısmen | Ses testleri 5/5 geçti; iPhone/Safari işitsel kabulü açık. |
| Faz 7 — Kalite ve performans | Kısmen | 60 sn SwiftShader örneği 1,6 ort. / 1,0 en düşük FPS ve 10 saldırı verdi; kesintisiz kriteri geçmedi, telefona genellenemez. |
| Faz bayrakları | Doğrulandı | `WAR_ROOM_COMBAT_FEEL_ENABLED`, `WAR_ROOM_POOLED_FX_ENABLED`, `WAR_ROOM_SYNTH_AUDIO_ENABLED`, `WAR_ROOM_QUALITY_ENABLED` varsayılanları `true`. |
| WebGL sahnesi ve seçili silah yüklemesi | Doğrulandı | Headless SwiftShader sahneyi açtı; seçili Mızrak `spear.glb` isteği üretti. Donanım GPU doğrulaması değildir. |
| `npm run build` | Doğrulandı | Başarılı; 500 kB üzeri bundle uyarısı sürüyor. |
| `npm run typecheck` | Doğrulandı | Başarılı. |
| `npm test` | Kısmen | 351 toplam, 343 geçti, 8 başarısız; aynı bilinen mağaza/ekipman (6), düello süresi (1) ve envanter (1) taban testleri. |
| iPhone/Safari kabulü | Doğrulanamadı | Bu çalışma ortamında fiziksel cihaz erişimi yok. |

### iPhone kontrol listesi

1. Oyunu `?debug=1` ile açıp Savaş Odası'na gir; sürüm etiketinin `v14-premium-dovus` olduğunu doğrula.
2. Joystick ile ileri/geri/yan/çapraz hareket et; yönelimi, strafe sırasında nişan ve kamera takibini kontrol et.
3. Donanım önizlemesinde parçayı sürükle, pinch zoom yap, çift dokunarak sıfırla; paneli tam ekrana alıp kapat.
4. Kül Asası, Surlu Mızrağı ve Surlu Kazması'nı ayrı ayrı kuşan; GLB yüklenirken yedek geometriyi, tutuşu, ölçeği ve kadrajı kontrol et.
5. Hafif kombo ve en az 350 ms basılı ağır saldırıyı dene; tek vuruş anını, hit-stop'u, kamera tepkisini ve düşman hasar görselini kontrol et.
6. Et/metal/taş/zemin isabetlerinde efektleri, kan ayarını, silah izini ve çatlak decal'ini gözle; havuz/decal sayaçlarının sabit üst sınırları aşmadığını kontrol et.
7. Düşük/orta/yüksek ve otomatik kaliteyi dene; 60 sn kesintisiz saldırı sırasında debug FPS, saldırı aralıkları, FX/decal tepesi ve renderer geometri/doku sayaçlarını kaydet.
8. Sesli/sessiz geçişini, ilk dokunuştan sonra iOS AudioContext'i, arka plan/ön plan dönüşünü ve yakın dövüş/zemin seslerini kontrol et.
9. WebGL siyah kare, model kaybı, kontrol kilitlenmesi, belirgin ısınma veya performans düşüşü varsa adım ve cihaz bilgisiyle not al.
