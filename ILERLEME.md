# Play Store v1.0.0 hazırlığı

## Adımlar

1. **Yatay/dikey mod ve arayüz — Tamamlandı**
2. **Nişan ve ateş — Tamamlandı**
3. **Hareket ve takılmalar — Tamamlandı**
4. **Menü, mağaza, silahlar — Bekliyor**
5. **Savaş odası ve düello — Bekliyor**
6. **Hikâye, zorluk, final — Bekliyor**
7. **Prenses 3D modeli (GLB) — Bekliyor**
8. **Performans, boyut, Play Store — Bekliyor**

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
