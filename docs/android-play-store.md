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
- `android/`: Android Studio ile açılabilen TWA projesi.
- `package.json`: web varlıklarını doğrulama, APK test sürümü ve App Bundle
  üretme komutları.

## İlk Android paketi

Önce bu web değişikliklerini kullanıcının yönettiği Git/Vercel süreciyle
`handikap.vercel.app` adresine yayınla. Bu çalışma alanı Git'e gönderim veya
Vercel yayını yapmaz. Yayından sonra:

1. `npm run android:validate:web` ile canlı manifest, ikonlar ve service worker'ı
   kontrol et.
2. Android Studio'da `android/` klasörünü açıp SDK 36'yı indir.
3. `npm run android:debug` ile telefona yüklenebilen debug APK üret.
4. İlk imzalı App Bundle için Android Studio'da **Build → Generate Signed Bundle
   / APK → Android App Bundle** adımlarını izle. Uygulama kimliği
   `com.safaksavascilari.game` olarak sabitlendi; adı `Şafak Savaşçıları`.
   İmzalama anahtarını özel ve yedekli yerde sakla; keystore dosyası,
   parolalar ve Play Console erişim bilgileri Git'e eklenmez. Play App Signing'i
   etkinleştir.
5. İmzalama sertifikalarının SHA-256 parmak izlerini aldıktan sonra
   `/.well-known/assetlinks.json` dosyasını oluşturup Vercel'de yayınla. Yerel
   test imzası ve Play App Signing sertifikası farklıysa iki parmak izi de
   tanımlanmalıdır. Bu doğrulama tamamlanmadan TWA tam ekran yerine tarayıcı
   arayüzü gösterebilir.
6. Gerçek Android telefonda giriş, düello, War Room, geri tuşu, ekran
   döndürme, çevrimdışı ekranı ve WebGL/FPS davranışını test et.
7. Google Play Console'da uygulama kaydını aç, imzalı AAB'yi yükle, kapalı
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
