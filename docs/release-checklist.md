# Android / Google Play yayına hazırlık

## Hazırlanmış kod ve dosyalar

- [x] `com.safaksavascilari.game` TWA kimliği korundu; `targetSdk` 36.
- [x] Android `versionName`, `package.json` sürümünü kullanır.
- [x] GitHub Actions'ta manuel, imzalı AAB üretim iş akışı eklendi. `versionCode`
  varsayılanı workflow çalıştırma numarasından artar; Play'de daha yüksek bir
  kod varsa elle daha yüksek `version_code` gir.
- [x] İmzalama anahtarı yalnızca Actions secrets içinden geçici dosyaya yazılır
  ve AAB workflow artifact'ı olarak sunulur.
- [x] `assetlinks.json` içinde debug ve Play App Signing parmak izi alanları
  için ayrı yer tutucular var.
- [x] `app-ads.txt` taslak yer tutucu olarak eklendi; reklam açma anlamına gelmez.
- [x] Reklam SDK'sı yapı varsayılanında `none`; sunucu, CMP ve doğrulama
  hazırlığı olmadan reklam yapılandırması veya ödül sağlamaz.
- [x] Yaş onayı, Türkçe/İngilizce gizlilik metni ve hesap silme bağlantısı var.
- [x] Aynı-origin API'de CORS yansıtması kaldırıldı; temel güvenlik başlıkları
  eklendi. CSP eklenmedi; gerçek script/CDN listesiyle test edilmeden eklemek
  giriş veya WebGL yüklemesini bozabilir.

## Yayın öncesi zorunlu doğrulamalar

- [ ] GitHub Actions secrets: `ANDROID_KEYSTORE_BASE64`,
  `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- [ ] İlk AAB'yi imzala ve Google Play App Signing'i aç.
- [ ] Gerçek SHA-256 debug ve Play App Signing parmak izlerini
  `public/.well-known/assetlinks.json` dosyasına yaz; değişikliği Vercel'e
  kullanıcı tarafından yayınla.
- [ ] Play Console'da mağaza kaydı, ikon, özellik grafiği, ekran görüntüsü,
  uzun açıklama, Data safety, içerik derecelendirmesi ve reklam/hedef kitle
  beyanını tamamla.
- [ ] İnceleme hesabını Play Console'un güvenli alanında ver; kod veya dokümana
  parola ekleme.
- [ ] Önce iç testte gerçek cihazda giriş, bölüm, mağaza, Savaş Odası, Android
  geri tuşu, uygulamaya dönme, WebGL/FPS, ses, bağlantı kesilmesi ve hesap
  silmeyi doğrula.
- [ ] Yeni kişisel geliştirici hesabı 13 Kasım 2023'ten sonra oluşturulduysa
  production erişimi öncesi Play Console'un kapalı test koşulunu doğrula.
  Google Play'in 2026 rehberi en az 12 test kullanıcısının 14 gün kesintisiz
  katılımını ister; gönderim gününde kuralı tekrar kontrol et.
- [ ] Google Play'in 31 Ağustos 2026'dan başlayan yeni uygulama/güncelleme API
  36 şartını ve gönderim günündeki en güncel hedef API gereksinimini doğrula.
- [ ] Üretim veritabanında migration 007'nin çalıştığını ayrıca doğrula. Bu
  çalışma alanı production veritabanında migration çalıştırmadı.

## Reklamlar

- [ ] İlk yayın için reklamları kapalı tut.
- [ ] CMP, AdMob/Google onayları, ad unit ID ve imzalı SSV doğrulaması
  tamamlanana kadar `ADS_ENABLED`, `ADS_CONSENT_CMP_READY` ve
  `ADS_REWARD_VERIFICATION_READY` değerlerini etkinleştirme.
- [ ] Reklamlı bir sürüm planlanırsa politika, mağaza beyanları, `app-ads.txt`,
  izin ekranı ve sunucu doğrulama testlerini ayrı onayla.

## Test hesabı ve cihazı kullanıcı tarafından gereklidir

Play Console hesabı, signing keystore, gerçek Android cihaz, reviewer login,
Play App Signing fingerprint'i ve production Vercel/DB erişimi bu Replit
çalışma alanında mevcut değil; bu adımlar burada doğrulanmadı.
