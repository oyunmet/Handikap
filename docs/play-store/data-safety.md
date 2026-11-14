# Play Console — Data safety çalışma notu

Bu belge Play Console beyanı değildir; gönderimden önce uygulamanın gönderilen
derlemesini ve Google'ın güncel soru formunu temel alarak sahibi tarafından
doğrulanmalıdır.

## Koddan görülen veri akışları

- Hesap girişi ve hesap bilgileri Clerk tarafından yönetilir.
- Oyun profili ve ilerleme PostgreSQL'de saklanır; web uygulaması Vercel'de
  barındırılır.
- Sunucu profili, görünen ad, ilerleme, envanter, oyun içi bakiyeler, düello
  sonuçları ve ödül kayıtlarını hesap kimliğiyle ilişkilendirir.
- Tarayıcı yerel depolaması oyun ayarlarını, misafir ilerlemesini ve 13+ yaş
  onayının yalnızca `adult` / `underage` sonucunu tutabilir; doğum tarihi
  istenmez.
- Reklam izni ve kişiselleştirme seçimi yerel cihaz tercihleridir. Reklam ve
  üçüncü taraf reklam SDK istekleri varsayılan olarak kapalıdır. H5 Games
  yalnızca server-side reward verification, CMP, sunucu bayrağı ve kullanıcı
  tercihi hazır olduğunda etkinleşebilir. AdMob SDK henüz eklenmemiştir.
- Bu sürüm üçüncü taraf analitik kullanmaz. Anonim tanılama uç noktası yalnızca
  izin verilen olay kategorisini alır; mesaj, stack trace, URL, kullanıcı ID'si
  veya cihaz kimliği kabul etmez.
- Barındırma ve kimlik doğrulama sağlayıcılarının kendi teknik erişim kayıtları
  bulunabilir; sağlayıcıların saklama ayarlarını ayrıca doğrula.

## Silme ve saklama

- Uygulama içindeki **Ayarlar → Hesabı sil** bağlantısı ve
  `/delete-account` sayfası, kullanıcı onayı ve oturum doğrulamasından sonra
  hesabı ve oyun kayıtlarını siler.
- `shafak_ad_reward_challenges` kayıtları hesap silme işlemine dahildir.
- Hesap verileri silme isteğine kadar tutulur. Sağlayıcı yedeklerindeki kayıtlar,
  sağlayıcının yedek saklama süresince kalabilir.
- Silme akışını gerçek bir üretim hesabında test etme; ayrı bir test hesabı
  kullan.

## Gönderim öncesi sahibi doğrulamalı

- Play Console'un toplama, paylaşma, güvenlik, silme ve geçici işleme sorularını
  gerçek üretim yapılandırmasıyla yanıtla.
- Clerk ve PostgreSQL sağlayıcı sözleşmelerindeki veri bölgesi, alt işleyenler
  ve saklama bilgilerini doğrula.
- Reklamlar kapalı olsa da, uygulama paketi ve sunucu ortamında ek SDK veya
  reklam ID'si bulunmadığını doğrula.
- Form yanıtlarının bu derleme ve `privacy` sayfasıyla tutarlı olduğundan emin
  ol; gönderimden sonra Play Console önizlemesini incele.
