# Reklam ve hedef kitle beyanı

## İlk sürüm

- İlk Play sürümünde reklamları kapalı tut.
- İstemci yapı sağlayıcısı varsayılanı `none` değerindedir.
- Sunucu reklam yapılandırması varsayılan olarak `ads_enabled: false` döndürür.
- Reklam ayarı ve kişiselleştirilmiş reklam ayarı birbirinden ayrıdır; ikisi de
  kullanıcı tarafından kapatılabilir.
- H5 Games için doğru yayıncı kimliği, onaylı CMP ve gerçek server-side ödül
  doğrulaması olmadan `ADS_ENABLED`, `ADS_CONSENT_CMP_READY` veya
  `ADS_REWARD_VERIFICATION_READY` değerlerini açma.
- AdMob Capacitor köprüsü, SDK, uygulama kimliği ve reklam birimi bu projede
  etkin değildir. Sadece hazırlık dokümanı vardır.
- `public/app-ads.txt` yayıncı hesabı doğrulanana kadar yer tutucudur; gerçek
  reklam ağına ait dosya gibi yayımlama.

## Play Console seçimleri

- Uygulamanın çocukları hedeflediğini işaretleme; oyunda ön kayıt için 13+
  onayı vardır. Play Console'un yaş grubu sorusunu gerçek hedef kitleye göre
  yanıtla.
- İçerik derecelendirmesi anketinde dövüş, ateşli silah görünümü, kan/yaralanma
  göstergeleri, kullanıcı içeriği ve çevrimiçi etkileşim sorularını gerçek oyun
  sürümünde incele. Derecelendirmeyi tahmin ederek beyan etme.
- Reklam beyanını ilk sürümde “reklam yok” olarak seç; yalnızca mağazaya
  gönderilen APK/AAB'de ve production configuration'da gerçekten kapalı
  olduğunu doğruladıktan sonra.
- Gelecekte reklam açılırsa hedef kitle, Data safety, gizlilik politikası,
  `app-ads.txt`, CMP ve SDK beyanlarını yeniden gözden geçir.

## Güvenli açılma koşulları

1. Sertifikalı/uygun CMP ve yaş/ülke gereksinimleri doğrulanmalı.
2. Sağlayıcı onayı ve gizlilik beyanları tamamlanmalı.
3. Ödüllü reklamın sunucu doğrulaması sağlayıcı imzasını kontrol etmeli; salt
   istemci callback'i yeterli değildir.
4. Günlük limit, tek kullanımlık nonce, zaman aşımı, hız limiti ve hesap silme
   temizliği test edilmeli.
5. Kill switch ile hem web SDK yüklemesi hem API ödülü kapatılmalı.
