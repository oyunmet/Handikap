# İleride AdMob + Capacitor ekleme rehberi

Bu yalnızca hazırlık dokümanıdır. Proje şu anda aynı alan adını açan Android
Trusted Web Activity (TWA) kullanıyor. Capacitor, AdMob SDK'sı, CMP/UMP SDK'sı
ve reklam birimleri eklenmemiştir; reklamlar kapalı kalmalıdır.

## TWA ile farkı

- TWA oyunu `https://handikap.vercel.app/` adresinde Chrome üzerinden açar.
- Capacitor web arayüzünü yerel Android kabuğuna alır ve Android reklam SDK'sı
  köprüsü sağlar; bu geçiş uygulama kimliği, deep link, auth dönüşü, geri tuşu,
  çevrimdışı davranış ve yayın zincirini değiştirir.
- Var olan TWA'yı sırf reklam eklemek için değiştirme. Önce ayrı dalda test,
  migration planı ve üretim cihazı doğrulaması yap.

## Gerekli işler — hiçbirini bu doküman tek başına etkinleştirmez

1. Kullanıcı ve ülke gereksinimlerine uygun sertifikalı CMP/Google UMP akışını
   ve rıza geri çekmeyi tamamla.
2. Android manifestine gerçek AdMob uygulama ID'sini ekle; `APPLICATION_ID`
   değerini test ad unit ID'siyle karıştırma.
3. Rewarded video için gerçek ad unit ID'si, açık kullanıcı seçimi ve
   `server-side verification (SSV)` callback imza doğrulaması ekle.
4. SSV callback'i imza/nonce/placement/account eşleşmesini, zaman sınırını,
   tek kullanımı, günlük limiti ve tekrar oynatma saldırılarını doğrulasın.
5. Her uygulama görünümünde ses, müzik, oyun döngüsü, Android back, lifecycle,
   ekran kilidi ve WebGL bağlamı kurtarma davranışını test et.
6. Gizlilik politikası, Data safety, reklam beyanı, hedef kitle ve
   `app-ads.txt` dosyasını tekrar güncelle.
7. Play Console iç testinde reklam test ID'leri kullan; üretim reklamlarını
   kendi cihazında tıklayarak test etme.

`ADS_CONSENT_CMP_READY`, `ADS_REWARD_VERIFICATION_READY` ve `ADS_ENABLED`
varsayılan olarak kapalıdır. İlk ikisini yalnızca karşılık gelen gerçek
altyapı ve bağımsız test hazır olduğunda aç.
