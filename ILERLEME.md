# Play Store v1.0.0 hazırlığı

## Adımlar

1. **Yatay/dikey mod ve arayüz — Tamamlandı**
2. **Nişan ve ateş — Bekliyor**
3. **Hareket ve takılmalar — Bekliyor**
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
