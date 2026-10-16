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
- Kaynak `FrogWarrior` GLB'si tek mesh ve iskeletsiz; gerçek eklem/ayak animasyonu bu varlıkla üretilemiyor. Görünüşü korumak için model değiştirilmedi. Gerçek bacak yürüyüşü için rig'li model veya yeniden rig işlemi gerekiyor.
- Yerel mobil ekran görüntüsünde WebGL bağlamı oluşturulamadığından dünya ışığı ve animasyon değişiklikleri görsel olarak doğrulanamadı.
- **Bölüm D durumu:** Görünürlük ve hareket hissi iyileştirildi; gerçek eklem animasyonu ve cihaz üstü kabul testi açık.

## Bölüm E — Düello arenası

- Dövüş kamerasının 360 derece dönme/ters tarafa geçme nedeni, yön bazının her karede dövüşçüler arasındaki hareketli hattan hesaplanmasıydı. Başlangıç yönünü kilitleyip kamera mesafesini aradaki mesafeye göre ölçekleyecek şekilde düzeltildi.
- Mevcut simülasyon rakipleri arena sınırında tutuyor; mobil basma/bırakma saldırı akışı ve saldırı efektleri için otomatik testler mevcut. Başlangıçtaki 2,7 m mesafede kısa saldırı simülasyonu `weaponTrail` ve `hit` üretti; rakip canı 130'dan 124'e düştü.
- Kamera regresyon testi, rakiplerin hareket edip birbirini geçtiği durumu da kapsıyor.
- Yerel tarayıcı WebGL bağlamı açamadı; Vercel'de/iPhone Safari'de gerçek düello ve vuruş hissi doğrulanamadı. Bu çalışma alanından yayın yapılmadı.
- **Bölüm E durumu:** Kamera ve kod düzeyindeki savaş akışı düzeltildi; cihaz üstünde arena/etki kabul testi açık.

## Kaldığım yer / bilinenler

- A, B ve C tamamlandı; D/E'de ekran görüntülerindeki kamera ve görünürlük sorunlarına yönelik kod düzeltmeleri yapıldı.
- Son doğrulama: 219 test geçti; typecheck ve production build başarılı. Build, mevcut 977 KB katalog parçası için boyut uyarısı veriyor.
- iPhone Safari FPS ve canlı Vercel görünümü bu çalışma alanından doğrulanamaz; kullanıcı Vercel'e kendisi yayınlar.

## Kod denetimi — 16 Ekim 2026

- **A — TAMAM:** Altın ödül küçük para yığını olarak çiziliyor; yüksek ışık sütunu ve pickup'a bağlı koni yok.
- **B1 — TAMAM:** Kül Yolu'nda SİLAH düğmesi ve sahip olunan silahları gösteren seçim paneli var.
- **B2 — TAMAM:** Düello kontrollerinde ikinci silah atanmışsa çalışan silah değiştirme düğmesi var.
- **B3 — TAMAM:** `store-catalog.ts` içinde 6'dan fazla silahın istatistik ve görsel verisi tanımlı.
- **C — TAMAM:** Düello karakterlerinin kökü dik tutuluyor; kamera yönü dövüş sırasında değişen rakip konumlarından etkilenmiyor.
- **D — YARIM:** Dünya, kamera ve karakter animasyonu iyileştirildi. Oyuncu GLB'si tek parça/iskeletsiz olduğundan gerçek bacak eklemi hareketi mümkün değil; mobil görsel test de yapılamadı.
- **E — YARIM:** Kamera artık rakiplerin hattına göre dönmüyor; arena sınırı, saldırı akışı ve efektler testli. Vercel/iPhone üzerinde canlı kabul testi yapılamadı.
