# World V2 Durum ve Eski Dünya Sözleşmesi

Son güncelleme: 2026-10-11

## İlerleme

- [x] Faz 0 — mevcut dünya/UI/sunucu sözleşmesi koddan çıkarıldı.
- [ ] Faz 1 — kısmi: `?world=v2` opt-in, WebGL 2 şartı, `preserveDrawingBuffer: false`, sayısal kamera koruması ve dört aşamalı kurtarma eklendi. Dünya ekranı hâlâ menüden çıkınca unmount oluyor; kaynak havuzu ve cihaz doğrulaması tamamlanmadı.
- [ ] Faz 2 — kısmi: yeni atmosfer, uzak dağ silueti, ash/rain parçacıkları ve düşük poligonlu biyom zemini eklendi. Mevcut yol chunk'ları, dekor ve etkileşim varlıkları korunarak yeniden kullanılıyor; yeni zeminin gerçek cihazda görüntüsü doğrulanamadı.
- [ ] Faz 3 — karakter, animasyon ve etkileşimler.
- [ ] Faz 4 — mevcut dünyaya bağlı düello görsel katmanı.
- [ ] Faz 5 — kısmi: son kodda typecheck, production build ve 142 test geçti; iPhone/WebGL cihaz doğrulaması yapılmadı.
- [ ] Faz 6 — kabul testlerinden sonra varsayılanı değiştirme ve eski renderer'ı ayrı commit'te kaldırma.

Faz 0 envanterinden sonra kod değişiklikleri başladı. Eski renderer varsayılan ve geri dönüş yolu olarak tutuluyor; bu aşamada davranışını veya sunucu sözleşmelerini silen değişiklik yapılmadı.

## Değiştirilemez sınırlar

- `App` ve `WorldScene` içindeki Clerk oturumu, profil/ilerleme, Supabase/PostgreSQL ödül kayıtları, mağaza ve API davranışı renderer kapsamı değildir.
- Dünya çizicisi; hareket, çarpışma, rakip menzili, ödül doğrulaması veya sunucu savaş sonucunu sahiplenmemelidir. Yeni görsel sahne, aşağıdaki mevcut `World3D` veri/olay girişlerinin görsel karşılığı olmalı; HUD ve API callback'leri yerinde kalmalıdır.
- Hesap düellosunda sunucudan dönen rakip/seed/istatistikler yetkilidir. Tamamlanmış düello için sunucu input tape'i yeniden oynatır; istemci yaw'ı simülasyonda ve kayıtta aynı 0.001 radyan hassasiyetine yuvarlanmalıdır.
- GLB iskeletleri, skin ağırlıkları ve `Idle`, `Walk`, `Run`, `Attack1`, `Block`, `Dodge`, `HitReaction`, `Cast_Fire`, `Cast_Lightning`, `Death`, `Victory` klip adları korunmalıdır.

## Eski dünya sözleşmesi (koddan doğrulanan)

### Sahne sınırı ve renderer girdileri

- Oyun ekranı `App` içinde `screen === "world"` iken `WorldScene` olarak yüklenir. Ekrandan çıkıldığında bu alt ağaç kaldırılır.
- `WorldScene`, `World3D`'ye hareket referansı, çarpışma ızgarası, kalite/efekt/hareket azaltma ayarları, hava, karakter görünümü ve animasyon durumu; yakın rakipler/eşyalar/engeller; odak rakip; düello durumu/kamerası/kilit modu ve görsel savaş olaylarını verir.
- Yürüme ve düello zaten aynı `World3D`/Three.js Canvas altında çizilir; düello başladığında rakip listesi gizlenir, aynı sahneye iki dövüşçü ve efekt katmanı eklenir. Renderer geçişi bu akışı korumalıdır.
- `WorldRenderer.tsx` adlı OffscreenCanvas/2D işçi çizicisi mevcut kaynakta bulunur; mevcut `WorldScene` render ağacında kullanımına rastlanmadı. Ana oynanan 3D renderer `World3D.tsx` ve React Three Fiber Canvas'ıdır.

### Oyuncu, hareket ve yol ilerlemesi

- Hareket durumu `WorldMotion` içinde hız bileşenleri (`velocityX`, `velocityY`), derinlik (`depth`), toplam mesafe (`distance`), kamera mesafesi, adım fazı/sayacı, durma süresi, hareket edildi bilgisi, yakınlaştırma/kamera öncülüğü ve bakış yönünü taşır.
- Animasyon/UI hareket durumları `idle`, `walking`, `running`, `stopped`; animasyon çözümleyicisi bunları karakter durumuna çevirir. Hareket sabit 1/60 s adımlarla simüle edilir; hareket kodunda yürüme hızı 3.4 m/s, koşu 6.8 m/s'dir.
- Yol ilerlemesi mesafe tabanlı ve üst sınırı olmayan bölümlerden oluşur: kapılar 144 m arayla, dekor chunk'ları 48 m arayla üretilir. Gösterge `travel % 144 / 144` yüzdesini ve bir sonraki kapıya kalan metreyi (`KAPI · N m`) gösterir; küresel bir toplam yol uzunluğu yoktur.
- Oyuncunun yol derinliği `depth ∈ [-1, 1]` ile sınırlandırılır; 3D yatay konumu `depth * 5.2` ile hesaplanır. Kontrol joystick/klavye girdisidir; eski sistemde sabit şerit seçimi yoktur.
- Kapı mesafesi `nextGateDistance(travel)` ile sıradaki 144 m sınırıdır. Biyom döngüsü her 3 bölümde (432 m) değişir; biyomlar Kül Yolu, Donmuş Geçit ve Kızıl Bataklık'tır.

### Rakipler ve SAVAŞ eylemi

- Her 144 m bölümde dört deterministik rakip profili vardır; profil döngüsü Kapı Muhafızı, Demir Yemin, Kül Okçusu ve Gölge Şövalyesi arketiplerini içerir. Bölüm içi yaklaşık konumlar 52, 84, 109 ve 134 m'dir (seed kaynaklı ±1 m sapmayla); yatay konumlar dönüşümlüdür.
- HUD için sıradaki yenilmemiş rakip ve 105 m içindeki 3D rakipler hesaplanır. Rakip kartı oyuncuya 25 m veya daha yakınken görünür; aynı koşul `SAVAŞ` düğmesini etkinleştirir. Bu eşik renderer'a bağlı değildir, siyah canvas durumunda da düğme kullanılabilir.
- Kart rakip adı/unvanı/seviyesi/ganimet tahmini/alay metnini, varsa `KONUŞ` ve menzilde `SAVAŞ` eylemlerini sunar. Renderer'a ayrıca odak rakip verilir.

### Toplanabilirler, engeller ve dünya etkileşimleri

- Toplanabilir türleri: küçük/büyük altın, küçük elmas, Kor Kristali, Mühür Parçası ve Demir Kırığı. Kimlikler bölüm ve öğe bazlıdır; istemci alınan ID'leri bölüm ID'siyle `onClaimWorldPickups(chapterId, pickupIds)` callback'ine verir. Önceden alınanlar `onLoadClaimedPickups(chapterId)` ile yüklenir. Hesap ödülü sunucu tarafından doğrulanır; geçici/konuk oturumu davranışı HUD'da ayrıca belirtilir.
- Her bölümde kaya, diken tuzağı ve 3 sağlık puanlı barikat bulunur. Barikat bölüme göre yaklaşık +116 m'dedir. Saldırı kartı barikat 4.2 m içindeyken ve yatay çakışma koşulu sağlandığında görünür; HUD `BARİKAT · N DARBE` ve `SALDIR` sunar. Klavyede Space/E de saldırı isteği üretir. Kırılma/ödül mantığı `WorldScene`'dedir.
- Yol dekoru seed'li chunk'lardan gelir: kule, harabe, kemer, ağaç, bayrak, kaya, meşale, kristal, ateş çukuru, araba, kemik ve biyoma özgü buz kristali/sazlık/mangrov.

### Hava, düello ve yön

- Başlangıç havası `ash` / Kül'dür. HUD hava anahtarı `clear → ash → rain → fog` döngüsünü değiştirir; `airEnabled` açık/kapalı değeri de mevcut.
- Düello girişi, “GERÇEK ZAMANLI SAVAŞ · AYNI 3D DÜNYA” kartı ve sweep/VS/countdown evreleriyle aynı dünya Canvas'ında gerçekleşir. Düello kamerası iki dövüşçüyü çerçeveler; oyuncu/rakip modelleri, animasyonlar ve savaş efektleri ayrı görsel girdilerle çizilir.
- 360° yönlü düello varsayılan olarak açıktır; `?duel360=0` kapatır. Hedef kilidi ve kamera orbit/pitch kontrolü UI'dan sürülür. Yön halkası Türkçe `ÖN / ARKA / SAĞ / SOL` ve alt satır `RAKİP` metnini gösterir. Saldırı/kalkan yön çarpanları sunucu doğrulamalı combat simülasyonunun parçasıdır.

### API/oturum sözleşmesi

- Düello başlatma: `POST /api/duels/start`, yalnızca `{ opponentId }` gövdesi, Clerk kimliğiyle korumalı. İstemci authenticated retry yardımcısıyla en fazla bir retry kullanır (`maxRetries: 1`, 600 ms taban gecikme, 429 retry yok). Başarılı cevapta `duelId`, `seed`, `playerStats`, `opponent` ve isteğe bağlı `resumed` doğrulanır.
- Sunucu start endpoint'i 30 istek/dakika limiti, kullanıcı başına transaction advisory lock ve açık düelloyu sürdürme davranışı kullanır. Tamamlama ve ödül doğrulaması `/api/duels/complete` üzerinden sunucu tarafında kalır.
- Yeni dünya aynı auth request/callback'lerini kullanmalı; renderer değişikliği yeni bir duel/pickup API sözleşmesi oluşturmamalıdır.

## Mevcut renderer ve kurtarma durumu

- Ana 3D çizici `World3D.tsx` içindeki React Three Fiber `<Canvas>`'ıdır; şu an dünya ekranı ağacı ile birlikte mount/unmount edilir. Render seçenekleri antialias kapalı, `powerPreference: "high-performance"` ve her zaman `preserveDrawingBuffer: false`; WebGL 2 olmayan context reddedilir.
- Canvas context kaybını yakalar, ilk kare/render döngüsünü izler ve dört aşamalı kurtarma uygular: güvenli sahne varsayılanları, materyal yeniden derleme, renderer remount ve tam sahne remount. Renderer uygulama ömrü boyunca yaşayan tekil bir kaynak değildir.
- Debug/selftest path'inde renderer varsayılan drawing buffer'ından 16 noktada `readPixels` örneklemesi vardır. Önceki iPhone Safari incelemesinde varsayılan buffer readback'i görünür sahnede bile siyaha yakın değerler verebildi. Bu örneklem yalnızca debug tanısıdır; doğrulanmamış default-buffer luminansı production kurtarma tetikleyicisi değildir.
- Bilinen siyah ekranın kök nedeni mevcut koddan ve eldeki geçmişten kesinleştirilemedi. Checkout geçmişi tek grafted commit gösterdiğinden önceki renderer değişikliklerinin tam diff'i bu workspace'te mevcut değil. Faz 1'in hedefi tek hata senaryosu varsaymak değil; geçerli context/render sinyalleri ve güvenli kaynak sahipliğiyle kurtarılabilir mimari kurmaktır.

## Bilinen doğrulama boşlukları / riskler

- `?world=v2` artık yeni atmosfer/zemin yolunu seçer ve dünya ekranını doğrudan açar; v1 varsayılandır. Karakter, toplanabilirler, yol etkileşimleri ve düello v1'in paylaşılan `SceneContents` bileşenlerini kullanmaya devam eder. Dune mesh ve recovery-step testleri eklendi.
- Replit screenshot runner bu projede WebGL context kuramadı (`Error creating WebGL context`); sahne bu yüzden runner'da çizilemedi. Bu, shader/GLB hatasının kanıtı değildir; WebGL destekli tarayıcı ve iPhone doğrulaması ayrı raporlanmalıdır.
- 60 FPS, iPhone'da 10 dakikalık siyah-kare sıfır testi, 20 tur renderer.info sabitliği, tüm biyom/rakip/hava kombinasyonları ve zorunlu context-loss dayanıklılığı henüz doğrulanmadı.
- Doğrudan ekrandan `readPixels` testi ile “iPhone'da siyah kare yok” kabulü çelişebilir. Üretim kurtarmasında kullanılacak luminans kanıtı varsa, okunabilir render target üzerinde cihazda doğrulanmalı; default framebuffer örneklemi iOS kurtarma tetikleyicisi yapılmamalıdır.
- Faz 6'da eski renderer/varlıkları kaldırmak, varsayılanı değiştirmek ve push etmek; yalnızca Faz 1–5 kabul kanıtları alındıktan sonra yapılmalıdır. Eski renderer ayrı commit'te silinmelidir.
- Eklenen ekli talimat dosyası yalnızca görev girdisidir; proje commit'ine dahil edilmemelidir.
