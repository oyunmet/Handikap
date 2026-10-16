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
- **Bölüm B durumu:** Uygulandı; son genel tip/test doğrulaması bekliyor.

## Bölüm C — Düelloda dik duruş

- Bekliyor.

## Bölüm D — Kül Yolu 3D dünya

- Bekliyor.

## Bölüm E — Düello arenası

- Bekliyor.

## Kaldığım yer / bilinenler

- A ve B uygulandı; genel typecheck/test/build son aşamada bir kez çalıştırılacak.
- iPhone Safari FPS ve canlı Vercel görünümü bu çalışma alanından doğrulanamaz; kullanıcı Vercel'e kendisi yayınlar.
