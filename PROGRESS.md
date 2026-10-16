# İş ilerlemesi

İstek: A–E bölümlerini sırayla tamamla; mevcut Türkçe arayüzü, oyun kayıtlarını, mağaza/heybe ve düello akışlarını koru. Görseller prosedürel kalmalı; mobil performans sınırları gözetilmeli.

## Bölüm A — Teşhis

- **Altın nesne:** Ekran görüntülerindeki yol ortası nesne, mevcut dünyadaki ödül/pickup çizimiyle eşleşiyor. Altın ve sandık ödülleri büyük madeni para modelini, yüksek şeffaf ışık sütununu ve parlayan halkayı birlikte çiziyor; bu bileşim iri, biçimsiz kaya ve üstündeki işaretçi gibi okunuyor. Pickup çiziminde koni yok; koni biçimli yakın nesneler yol kenarı prop'ları ve geçit mimarisinde bulunuyor.
- **Yarım/ham çevre nesneleri:** Dünya parçası prop'ları arasında düz kutu duvar/harabe parçaları, koni geometrili çam tepeleri ve uzak dağlar, sade sütun/kemer parçaları var. Yol çatallarındaki geçitler bağımsız portal çerçeveleri; `FinalGate` da basit bloklardan kurulu.
- **Belirme/hareket:** Chunk içeriği `seededRandom` ile deterministik üretiliyor; tekrar üretiminde rastgele konum değişmiyor. Sahnede nesneler kamera uzaklığına göre dünya koordinatından kamera-relative koordinata çevriliyor; pickup'lar ayrıca yaklaşırken mıknatıs etkisiyle oyuncuya doğru çekiliyor ve ölçekleniyor. Bu pickup hareketi sabit dünya nesnesi beklentisini bozuyor.
- **Düzeltme:** Büyük altın/sandık ödülleri küçük, yerde duran prosedürel para yığınına çevrildi. Yüksek ışık sütunu kaldırıldı; pickup artık oyuncuya mıknatıs etkisiyle kaymıyor veya yakında büyümüyor.
- **Bölüm A durumu:** Tamamlandı. Son genel doğrulama tüm bölümler bittikten sonra yapılacak.

## Bölüm B — Oyun içi silah seçimi

- Kül Yolu'na 44 px üzeri dokunma alanlı SİLAH düğmesi eklendi: kısa dokunma iki kayıtlı yuva arasında geçiyor, uzun basma sahip olunan silah kartlarını açıyor. Panel dışına/Escape'e dokunma kapatıyor ve panel açıkken hareket duruyor.
- Silah kartları nadirlik, hasar, hız ve menzili gösteriyor; yuva 1 ana teçhizata, yuva 2 kayıtlı ikinci silaha bağlandı. Seçim eldeki prosedürel modeli ve düellonun ilk silahını değiştiriyor.
- Düello içi mevcut değiştirici korundu; bekleme süresi 1,5 saniyeye, görsel geçiş 0,4 saniyeye ayarlandı. Düello öncesi seçim ayarı eklendi; varsayılanı kapalı.
- Var olan profil eşyası ve mağaza kataloğu kullanıldı; eski profillerde boş ikinci silah varsayılanı korunuyor.
- **Bölüm B durumu:** Uygulandı; 1,5 saniyelik bekleme süresi testi güncel davranışla hizalandı.

## Bölüm C — Düelloda dik duruş

- Mevcut `KnightActor` ve `Knight3D` düello kökleri X/Z eğimini sıfırda tutuyor; güncel kaynakta bu kural doğrulandı.
- Kamera yönü dövüş başında bir kez alınıyor; kamera dövüşçülerin orta noktasını takip ediyor. Dövüşçüler yer değiştirince kamera artık aralarındaki çizgiye göre dönmüyor.
- Dövüşçülerin hareket edip birbirini geçmesini kapsayan kamera regresyon testi eklendi.
- **Bölüm C durumu:** Kamera ve dik duruş düzeltmeleri uygulandı; iPhone üzerinde görsel kabul testi bekliyor.

## Bölüm D — Kül Yolu 3D dünya

- Oyuncunun yön değişimi yumuşatıldı; mevcut tek-parça modelde adım bob'u, yana ağırlık kayması ve hafif squash/stretch belirginleştirildi. Dünya sahnesinde oyuncuya düşük seviyeli sıcak dolgu ışığı eklendi.
- Kaynak `FrogWarrior` GLB'si tek mesh ve iskeletsiz kaldı; görünüşü/kaplaması değiştirilmeden yükleme sırasında 18 kemikli procedural skin rig oluşturuluyor. Ağırlıklar kaynak mesh'in bütün 27.035 verteksinden belirleniyor; rig gövde, kollar, eller, bacaklar, ayaklar ve başı içeriyor.
- Oyuncu GLB'si artık rig'li modele animasyon fazından sürülen yürüme/koşma, saldırı/ağır saldırı, blok, kaçınma, darbe ve ölüm pozlarını uyguluyor; reduced-motion ayarı eklem hareketini azaltıyor.
- Kaynak GLB'nin vertex ağırlıkları ve eklem dağılımı, normalize edilmiş ağırlıklar, değişmeyen bağlama pozu ve hareket eden eklemler otomatik testlerle doğrulanıyor.
- Yerel mobil önizlemede WebGL bağlamı oluşturulamadı; bu nedenle rig'in gerçek görsel deformasyonu iPhone üzerinde hâlâ kabul testi bekliyor.
- **Bölüm D durumu:** Kod tarafındaki gerçek eklem animasyonu tamamlandı; cihaz üstü görsel kabul testi açık.

## Bölüm E — Düello arenası

- Dövüş kamerasının 360 derece dönme/ters tarafa geçme nedeni, yön bazının her karede dövüşçüler arasındaki hareketli hattan hesaplanmasıydı. Başlangıç yönünü kilitleyip kamera mesafesini aradaki mesafeye göre ölçekleyecek şekilde düzeltildi.
- Mevcut simülasyon rakipleri arena sınırında tutuyor; mobil basma/bırakma saldırı akışı ve saldırı efektleri için otomatik testler mevcut. Başlangıçtaki 2,7 m mesafede kısa saldırı simülasyonu `weaponTrail` ve `hit` üretti; rakip canı 130'dan 124'e düştü.
- Kamera regresyon testi, rakiplerin hareket edip birbirini geçtiği durumu da kapsıyor.
- Yerel tarayıcı WebGL bağlamı açamadı; Vercel'de/iPhone Safari'de gerçek düello ve vuruş hissi doğrulanamadı. Bu çalışma alanından yayın yapılmadı.
- **Bölüm E durumu:** Kamera ve kod düzeyindeki savaş akışı tamamlandı; canlı Vercel/iPhone arena ve etki kabul testi açık.

## Kaldığım yer / bilinenler

- A, B ve C tamamlandı. D'deki tek-parça oyuncu modeli görünüşü korunarak çalışma anında rig'leniyor ve eklem animasyonu alıyor. E'nin kamera/savaş akışı kod düzeyinde tamam; yalnız canlı kabul testi açık.
- Son doğrulama: 222 test geçti; typecheck ve production build başarılı. Build, yaklaşık 976 KB mağaza kataloğu parçası ve 5,52 MB oyuncu GLB'si için boyut uyarısı veriyor.
- Yerel önizleme WebGL bağlamı oluşturamadı. iPhone Safari FPS ve canlı Vercel görünümü bu çalışma alanından doğrulanamaz; kullanıcı Vercel'e kendisi yayınlar.

## Kod denetimi — 16 Ekim 2026

- **A — TAMAM:** Altın ödül küçük para yığını olarak çiziliyor; yüksek ışık sütunu ve pickup'a bağlı koni yok.
- **B1 — TAMAM:** Kül Yolu'nda SİLAH düğmesi ve sahip olunan silahları gösteren seçim paneli var.
- **B2 — TAMAM:** Düello kontrollerinde ikinci silah atanmışsa çalışan silah değiştirme düğmesi var.
- **B3 — TAMAM:** `store-catalog.ts` içinde 6'dan fazla silahın istatistik ve görsel verisi tanımlı.
- **C — TAMAM:** Düello karakterlerinin kökü dik tutuluyor; kamera yönü dövüş sırasında değişen rakip konumlarından etkilenmiyor.
- **D — KOD TAMAM, CİHAZ TESTİ AÇIK:** Oyuncunun kaynak GLB'si runtime skin ağırlıklarıyla rig'leniyor ve eklemleri animasyon alıyor. Yerel WebGL bağlamı başarısız olduğu için görsel deformasyon ve cihaz performansı iPhone'da doğrulanmalı.
- **E — KOD TAMAM, CANLI KABUL TESTİ AÇIK:** Arena kamerası, sınırları, saldırı akışı ve efektler kod/test düzeyinde tamam. Vercel ve iPhone Safari üzerinde son doğrulama henüz yapılmadı.
