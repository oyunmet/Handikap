# Android ve Play Store hazırlığı

## Paketleme yolu

Bu oyun üretimde `handikap.vercel.app` üzerinden çalışıyor; giriş, profil ve ödül
API'leri de aynı alan adına bağlı. Bu nedenle Android paketinde **Trusted Web
Activity (TWA)** kullanılıyor. TWA, oyunu doğrulanmış aynı HTTPS alan adında
Chrome'un kendi motoruyla açar. Yerel bir WebView paketi gibi API adresini,
Clerk alan adlarını ve çapraz kaynak izinlerini farklı bir uygulama kökenine
taşımamış olur.

Oyun internet bağlantısı gerektirir. Bağlantı yokken uygulama çevrimdışı ekranı
gösterir; hesap, düello veya oyun ilerlemesini çevrimdışı kaydettiğini iddia
etmez.

Android kabuğu, Google'ın `android-browser-helper` TWA kütüphanesini kullanır.
Bu kütüphane proje derlemesine doğrudan eklenmiştir; güvenlik denetiminde
uyarı veren Bubblewrap npm CLI'si oyunun bağımlılıklarına eklenmemiştir.

## Hazırlanan web tarafı

- `public/manifest.webmanifest`: Türkçe uygulama adı, tam ekran gösterim ve ikonlar.
- `public/sw.js`: yalnızca çevrimdışı gezinme ekranını önbelleğe alır. Oyun,
  hesap ve API yanıtları önbelleğe yazılmaz.
- `public/icons/`: mevcut kalkan logosundan üretilen Android ve PWA ikonları.
- `/privacy` ve `/delete-account`: herkese açık gizlilik bildirimi ve hesap/veri
  silme akışı. Gizlilik soruları için `muhammedeminturk.16@gmail.com` kullanılır.
- `public/.well-known/assetlinks.json`: Android paket kimliğini içerir; imzalama
  sertifikası parmak izi yayın öncesinde gerçek SHA-256 değeriyle değiştirilmelidir.
- `android/`: Android Studio ile açılabilen TWA projesi.
- `package.json`: web varlıklarını doğrulama, APK test sürümü ve App Bundle
  üretme komutları.

## İlk Android paketi

Önce bu web değişikliklerini kullanıcının yönettiği Git/Vercel süreciyle
`handikap.vercel.app` adresine yayınla. Bu çalışma alanı Git'e gönderim veya
Vercel yayını yapmaz. Yayından sonra:

1. `public/.well-known/assetlinks.json` içindeki parmak izini debug ve Play App
   Signing sertifikalarının gerçek SHA-256 parmak izleriyle değiştir; parmak
   izleri sır değildir, keystore ve parolalar ise hiçbir zaman Git'e eklenmez.
2. Web değişikliklerini yayınladıktan sonra `npm run android:validate:web` ile
   canlı manifest, ikonlar, service worker, çevrimdışı ekran ve Digital Asset
   Links doğrulamasını kontrol et.
3. Android Studio'da `android/` klasörünü açıp SDK 36'yı indir.
4. `npm run android:debug` ile telefona yüklenebilen debug APK üret.
5. İlk imzalı App Bundle için Android Studio'da **Build → Generate Signed Bundle
   / APK → Android App Bundle** adımlarını izle. Uygulama kimliği
   `com.safaksavascilari.game` olarak sabitlendi; adı `Şafak Savaşçıları`.
   İmzalama anahtarını özel ve yedekli yerde sakla; keystore dosyası,
   parolalar ve Play Console erişim bilgileri Git'e eklenmez. Play App Signing'i
   etkinleştir.
6. Yerel test imzası ve Play App Signing sertifikası farklıysa iki parmak izini
   de dosyaya ekle. Doğrulama tamamlanmadan TWA tam ekran yerine tarayıcı
   arayüzü gösterebilir.
7. Gerçek Android telefonda giriş, düello, War Room, geri tuşu, ekran
   döndürme, çevrimdışı ekranı ve WebGL/FPS davranışını test et.
8. Google Play Console'da uygulama kaydını aç, imzalı AAB'yi yükle, kapalı
   test ve mağaza beyanlarını tamamla. İlk yüklemeden sonra paket kimliği
   değiştirilemez.

## Henüz tamamlanmayan Play Store adımları

Bu çalışma alanında Android SDK/JDK kurulu değil ve imzalama anahtarı
oluşturulmadı. Canlı Vercel alan adında manifest ve Digital Asset Links dosyası
yayınlanmadı. Bu nedenle burada henüz APK/AAB üretilemedi; bu hazırlık, tek
başına Play Store'a yüklenebilir bir sürüm anlamına gelmez.

Google Play'in 31 Ağustos 2026'dan itibaren yeni uygulamalar için istediği
minimum hedef Android sürümü API 36'dır. Gönderim günündeki Play Console
gereksinimini yeniden kontrol et.
