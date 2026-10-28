# Savaş Odası faz ilerlemesi

Bu kayıt, `attached_assets` içindeki faz protokolü ve önceki oturum ekran görüntülerine göre sürdürüldü. Geçmiş commit ayrıntıları bu çalışma kopyasında bulunmadığında açıkça belirtilmiştir.

## Düzeltme turu — iPhone testinde görülen sorunlar

- **Durum:** DEVAM EDİYOR
- **Kapsam:** Ekli test notlarındaki Adım 1–7: silah normalizasyonu ve canlı kalibrasyon, hareket yönü/isabet teşhisi, can yenileme, geçerli hedef filtresi ve silaha özel yakın dövüş efektleri.
- **Kural:** Her adımın sonunda build, typecheck, testler ve yerel commit; Git push ve Vercel deploy yapılmayacak.
- **Adım durumu:** 1 kısmen doğrulandı · 2 kısmen doğrulandı · 3 kısmen doğrulandı · 4 kısmen doğrulandı · 5 kısmen doğrulandı · 6 kısmen doğrulandı · 7 kısmen doğrulandı.
- **Cihaz kabulü:** Gerçek iPhone/Safari testi bu çalışma ortamında yapılamaz; kod/test doğrulaması ile cihaz doğrulaması ayrı raporlanacak.

### Adım 1 — Silah normalizasyonu

- **Durum:** KISMEN — normalizasyon ve tutuş kod/testleri doğrulandı; iPhone'daki gerçek model görünümü doğrulanamadı.
- **Yapılanlar:** GLB sınır kutusu yükleme anında ölçülüyor, en uzun eksen hedef uzunluğa göre normalize ediliyor ve config'teki `gripRatio` el kemiği kökenine taşınıyor. Minimum görsel kalınlık yalnızca eksene dik boyutlara uygulanıyor. İstenen melee uzunlukları bıçak 0,30 m, balta 0,75 m, sopa 0,90 m, kürek 1,20 m, mızrak 1,90 m, asa 1,50 m ve kazma 1,00 m olarak test ediliyor.
- **Mesh incelemesi:** İncelenen yedi melee GLB'nin her birinde bir mesh ve bir primitive var; ayrı bir kopya/siyah silindir mesh'i bulunmadı. Görseldeki silindir bu mesh'in içindeyse bağımsızca gizlenemez; ekli notta bahsedilen görüntü bu çalışma kopyasına eklenmediği için bunun ekrandaki parça olduğuna dair kesin teşhis yapılamadı.
- **Doğrulama:** `npm run typecheck` ve `npm run build` başarılı; War Room motoru ve silah-fit testleri 15/15 geçti. Tüm testler 355 toplam, 347 geçti, 8 başarısız; bunlar altı mağaza/ekipman, bir duel dengesi ve bir varsayılan envanter testi. Tam iPhone/WebGL görsel kabulü doğrulanamadı.

### Adım 2 — Telefonda canlı kalibrasyon

- **Durum:** KISMEN — kod/build doğrulandı; gerçek iPhone'da dokunma ve pano izni kabulü açık.
- **Yapılanlar:** Savaş sırasında yalnızca `?calib=1` ile açılan, daraltılabilir ve yarı saydam panel eklendi. Etkin silah değişince panelin değerleri de değişir. Konum, derece cinsinden üç eksenli dönüş ve ölçek +/- ile ayarlanır; küçük/büyük adım arasında geçilir. JSON hem ekranda gösterilir hem pano API'si kullanılabiliyorsa kopyalanır. Clipboard izni yoksa JSON ekranda seçilebilir kalır. Kalibrasyon açıkken eski debug tutuş paneli gizlenerek üst üste binme önlendi.
- **Doğrulama:** `npm run typecheck` ve `npm run build` başarılı. `npm test`: 355 toplam, 347 geçti, aynı 8 Savaş Odası dışı taban testi başarısız. Fiziksel iPhone/pano kabulü doğrulanamadı.

### Adım 3 — Karakter yönü ve strafe

- **Durum:** KISMEN — saf yön hesabı ve oyun entegrasyonu doğrulandı; iPhone joystick kabulü açık.
- **Yapılanlar:** Kamera yönü korunarak beden yaw'ı ayrı hesaplanıyor. İleri/geri/yan hareket yüz/sırt yönünü dünya hareketine göre belirliyor; nişanda veya atak animasyonu bitiminden 0,8 sn sonra beden kamera yaw'ına dönüyor. Hareket başlarsa atak sonrası strafe zamanlayıcısı erkenden iptal ediliyor. `?debug=1` yön, hareket/strafe modu, joystick açısı ve beden yaw'ını gösteriyor.
- **Doğrulama:** Yön modülünün ileri/geri/yan/strafe/boşta ve timer testleri dahil War Room hedef testleri 15/15 geçti. `npm run typecheck` ve `npm run build` başarılı. `npm test`: 359 toplam, 351 geçti, 8 başarısız; aynı mağaza/ekipman (6), duel dengesi (1) ve varsayılan envanter (1) taban testleri. iPhone joystick davranışı doğrulanamadı.

### Adım 4 — İsabet teşhisi ve temas zamanı

- **Durum:** KISMEN — melee testleri/teşhis kodu doğrulandı; hedef cihazda vuruş ve çizgi görünümü açık.
- **Yapılanlar:** Temas anı animasyonun %55 ilerlemesine alındı; cooldown ile melee animasyon sürelerinin mevcut silah config'inde uyumlu olduğu korunuyor. Mızraklara saldırı menziline +0,4 m tolerans ve melee konisine ±65° uygulandı. Debug sonucu artık hedef adı/hasarı veya ıskalama türüyle mesafe/menzil/açıyı içeriyor; son sonuç en az 2 sn görünür. Sürüm `v15-kalibrasyon`.
- **Çizgi teşhisi:** Kırmızı çizgi kaynağı büyük olasılıkla düşman mermi izi: düşman namlusundan hedef noktasına çizilip 0,08 sn kalan `#f36e54` tracer. Melee izi bununla aynı değil; silah rengini kullanıyor, saldırı etkin değilken örnek üretmiyor ve 0,22 sn içinde soluyor. Ekli notta belirtilen ekran görüntüsü burada bulunmadığından çizginin birebir bu iz olduğu görsel olarak doğrulanamadı.
- **Doğrulama:** Melee aim, combat feel ve War Room motoru testleri 26/26 geçti; `npm run typecheck` ve `npm run build` başarılı. `npm test`: 361 toplam, 353 geçti, aynı 8 Savaş Odası dışı taban testi başarısız. iPhone/WebGL görsel kabulü doğrulanamadı.

### Adım 5 — Oyuncu can yenilenmesi ve şifa noktaları

- **Durum:** KISMEN — kurallar, oyun/HUD bağlantısı ve birim testleri doğrulandı; iPhone etkileşimi açık.
- **Yapılanlar:** Varsayılanı açık tek `RESTORE_CONFIG` ile pasif yenilenme 6 sn hasarsız/çatışmasız süreden sonra 2 CAN/sn ve %60 tavanla çalışıyor. Normal öldürme en az 6 veya maksimum CAN'ın %5'i; komutan öldürme %15 CAN veriyor. Dört sabit şifa noktası oyuncuya %25 CAN sağlıyor, 45 sn sonra yenileniyor; dolu CAN'da nokta tüketilmiyor. Yalnız oyuncu topluyor; düşman CAN/AI davranışı değiştirilmedi. Minimap işaretleri, yeşil yenilenme barı, `+X CAN` bildirimi, pickup efekti/sesi ve debug yenilenme durumu eklendi.
- **Doğrulama:** Restore/engine/audio hedef testleri 26/26 geçti; `npm run typecheck` ve `npm run build` başarılı. `npm test`: 371 toplam, 363 geçti, aynı 8 Savaş Odası dışı taban testi başarısız. Fiziksel iPhone etkileşimi doğrulanamadı.

### Adım 6 — Yalnız geçerli melee hedefleri

- **Durum:** KISMEN — hedef filtresi, aim assist ve gösterge kod/testleri doğrulandı; iPhone nişan kabulü açık.
- **Yapılanlar:** Melee hedefi yalnız yaşayan düşman listesinden, silah menzilinde ve ±65° konide, duvar/cover kontrolünü geçerek seçiliyor. En yakın geçerli rakip aim assist alıyor; ölü düşman/engel/menzil/açı nedenleri debug satırında, seçili rakip adı ise hedef halkasıyla gösteriliyor. Geçerli hedef yoksa mevcut saldırı hareketi havaya savruluyor; pickup/prop/spawn/oyuncu hedef listesine dahil değil. Ateşli silahın mermi ve hasar çözümlemesi değiştirilmedi.
- **Doğrulama:** Aim, assist ve War Room motoru hedef testleri 28/28 geçti; `npm run typecheck` ve `npm run build` başarılı. `npm test`: 373 toplam, 365 geçti, aynı 8 Savaş Odası dışı taban testi başarısız. iPhone hedef göstergesi doğrulanamadı.

### Adım 7 — Silaha ve yüzeye özel efektler

- **Durum:** KISMEN — kod, birim test, typecheck ve build doğrulandı; iPhone/WebGL görsel kabulü açık.
- **Neden:** Önceki etki profili tanımlanmış olsa da melee isabeti onu silah kimliği olmadan çağırıyordu; böylece silah efektleri bıçak varsayılanına düşüyordu. Profildeki renk ve parlama değerleri de sahnede kullanılmıyor, her melee vuruşuna ortak toz ve ağır vuruşlarda ortak çatlak uygulanıyordu. Bloklu ıskada ayrıca isabet sesi çalıyordu.
- **Yapılanlar:** Bıçak/balta için kesik, sopa/asa/kürek için ezici savuruş, mızraklar için saplama ve kazma için maden profilleri ayrıldı. Melee isabeti doğru silah ve hedef yüzeyiyle profilleniyor; flaş, renkli kıvılcım, silaha göre toz/halkası ve yalnız ilgili ağır silahlarda şok dalgası/çatlak üretiyor. Sopa ve asa kan/kesik üretmiyor; kan ayarı yalnızca kan parçacıklarını değiştiriyor. Metal hedef kıvılcım/metal sesini, taş yüzey toz profilini kullanıyor. Iskalada yalnızca silaha özel saldırı izi ve savuruş sesi var. `?debug=1` son isabet efektini ve parçacık havuzu doluluğunu gösteriyor. Ateşli silahların hasar, mermi, hedef ve denge hesapları değiştirilmedi; yalnız görsel profil kullanımı düzenlendi. Ortak efekt havuzu (72/150 parçacık üst sınırı) ve 30 decal sınırı korundu.
- **Sürüm:** `v15-kalibrasyon-ek`.
- **Doğrulama:** `npm run typecheck` ve `npm run build` başarılı; build 500 kB üstü bundle uyarısı verdi. `npm test`: 375 toplam, 367 geçti, 8 başarısız; bilinen Savaş Odası dışı taban testleri (6 mağaza, 1 düello süresi, 1 varsayılan envanter), Adım 7 FX testleri geçti. `Start application` çalıştı ve giriş/intro ekranı açıldı; önizleme tarayıcısı WebGL bağlamı oluşturamadığı için savaş ve efekt görünümü doğrulanamadı. Gerçek iPhone/Safari kabulü de doğrulanamadı.

## Tur 3 — v16 iPhone bulguları

- **Durum:** DEVAM EDİYOR — Faz A–F kod doğrulaması tamamlandı; gerçek iPhone kabulü bekliyor.
- **Kapsam:** `attached_assets` içindeki v15 test notu ve IMG_8020–IMG_8029 ekran görüntüleri. Kamera/karakter yönelimi ve engel açıklığı; Kül Yolu dokunmatik koş/zıpla/eğil; silah laboratuvarı ve silah görünümü; vuruş/hasar/ölüm tepkileri; Savaş Odası oda zinciri.
- **Kurallar:** Faz başında bu kayıt okunur; her fazın sonunda sonuç, kök neden, kalanlar, değişen dosyalar ve doğrulama eklenir. Fazlar sıralı ve bağımsız commit edilir. Mevcut 367/375 tabanı korunur; 8 bilinen Savaş Odası dışı test hatası dışındaki yeni hata fazı geri aldırır. Push/deploy yapılmaz.
- **Kısıtlar:** Ateşli silah hasar/mermi/denge, düşman AI kararları, mağaza/ekonomi ve kalıcı ilerleme değiştirilmeyecek. Yeni savaş özellikleri kapatılabilir bayraklarla gelir. Savaşta parçacık ≤150, decal ≤30; yeni geometri/materyal oluşturulmaz.
- **Cihaz kabulü:** Ekli iPhone ekranları bulgu kanıtı olarak kullanılır; Replit önizlemesinde WebGL açılamadığından yeni 3D görsel sonuçlar ancak gerçek iPhone/Safari'de doğrulanabilir.
- **Fazlar:** A kamera/yönelim — TAMAMLANDI · B Kül Yolu kontrolleri — TAMAMLANDI · C silah/laboratuvar — TAMAMLANDI · D vuruş tepkileri — TAMAMLANDI · E oda zinciri — TAMAMLANDI · F son kontrol — KISMEN (iPhone kabulü bekliyor).

### Faz A — Kamera ve karakter yönelimi

- **Durum:** KISMEN — yön hesabı, engel testi ve kod doğrulandı; iPhone görsel kabulü bekliyor.
- **Kök neden:** `WarRoomScene3D.tsx:1009, 2398, 3177–3230`: gövde yaw'ı yumuşak güncellenmiyor, melee yardımı kamera yaw'ını temel alıyor, kamera çarpışması sahne prop sınırlarını/fade yardımcılarını kullanmıyordu. Yakın engelde güvenli mesafenin 1,2 m altına inmesi gerekebildiği halde eski kamera testi bunun tersini bekliyordu.
- **Yapılanlar:** Gövde yaw'ı en kısa açısal yoldan yumuşakça güncelleniyor; `?debug=1` testi ±180° sarımını ve 120 ms içindeki yetişmeyi kapsıyor. Hareket yönü seçeneği korunuyor, locomotion yönüne göre gövde eğimi uygulanıyor; melee saldırısı ve nişan yardımı gövde yönünü temel alıyor. Kamera 0,28 m swept-sphere ile siper ve sahneye etiketlenmiş statik prop AABB'lerini test ediyor; yakın engelde çarpışmadan önce yaklaşabiliyor, uzaktaki engelde 1,2 m tercihini koruyor. Kesişen etiketli prop 0,25 sn içinde yarı saydamlaşıyor; `?debug=1` kamera mesafesi ve engel kimliğini gösteriyor. Kamera/yönelim bayrakları mevcut ve varsayılan açık.
- **Değişen dosyalar:** `src/shafak/world/WarRoomScene3D.tsx`, `src/shafak/game/war-room-camera.test.js`, `src/shafak/game/war-room-orientation.test.js`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama:** Build ve typecheck başarılı. Tüm testler 385 toplam, 377 geçti, 8 başarısız; aynı bilinen mağaza/ekipman (6), düello süresi (1) ve envanter varsayılanı (1) taban testleri. Yeni kamera/yönelim testleri geçti. Replit önizlemesinde WebGL oluşturulamadığı için 3D fade ve gerçek iPhone davranışı **doğrulanamadı**.
- **Kalanlar:** iPhone'da karakter dönüş gecikmesi, saldırı yönü, engel yaklaşımı/fade ve debug satırını kontrol et.

### Faz B — Kül Yolu dokunmatik hareketleri

- **Durum:** KISMEN — çoklu dokunma, hareket/engel mantığı, poz, build ve testler doğrulandı; iPhone etkileşimi bekliyor.
- **Kök neden:** `WorldScene.tsx:3251–3325` butonları yalnızca `onClick` ile çalıştırıyordu; `useWorldInput.ts:101–125` içindeki pointer basma/bırakma yordamları kullanılmıyordu ve aynı anda basılan aksiyonlar pointerId ile ayrı tutulmuyordu. `world-content.ts:587–588` engeller zaten çömelme/zıplama durumunu kabul ediyordu; eksik olan mobil girişin o durumu güvenilir biçimde üretip göndermesiydi. Çömelme pozu `character-pose.ts:101–108` yalnız hafif diz/göğüs dönüşü uyguluyor, başı dik tutup kolları öne taşımıyordu.
- **Yapılanlar:** Koş/zıpla/eğil butonlarına bağımsız pointerId basma, bırakma, iptal ve capture kaybı işlendi; joystick başka bir parmakla aynı anda çalışabiliyor. Koş/eğil basılı tutulur, klavyeyle erişilebilir aç/kapat davranışı korunur, zıplama mevcut jump arc'ı kullanır. `WORLD_TOUCH_ACTIONS_ENABLED` ve `WORLD_BUILD_VERSION` bayrakları eklendi; varsayılan sürüm `v16-faz-b`. Basılı buton ışığı, diken/low-bar yaklaşınca zıpla/eğil nabzı ve kısa ses ipucu eklendi. Çömelmede oyuncu gövdesi yaklaşık %28 ölçeklenir; dizler bükülür, gövde öne eğilir, baş denge için ters yönde döner ve kollar öne gelir. Mevcut hız, zıplama eşiği ve ceza süre/değerleri değiştirilmedi. Testler bağımsız pointer, aynı eylemde çoklu pointer, girişten sprint/çömelme durumu, mevcut engel durum testleri ve poz kemiklerini kapsıyor.
- **Değişen dosyalar:** `src/shafak/world/world-touch-actions.ts`, `src/shafak/world/world-touch-actions.test.js`, `src/shafak/world/world-features.ts`, `src/shafak/world/world-features.test.js`, `src/shafak/world/useWorldInput.ts`, `src/shafak/world/WorldScene.tsx`, `src/shafak/world/world-scene.css`, `src/shafak/world/WorldV2Actor.tsx`, `src/shafak/world/character-pose.ts`, `src/shafak/world/character-model.test.js`, `src/shafak/audio/howler.ts`, `src/shafak/game/war-room-features.ts`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama:** `npm run build` ve `npm run typecheck` başarılı. `npm test`: 389 toplam, 381 geçti, 8 bilinen başarısız test aynı (6 mağaza/ekipman, 1 düello süresi, 1 varsayılan envanter). Dokunma, hareket, çarpışma ve karakter testleri geçti. Replit önizlemesinde WebGL/gerçek iPhone dokunma davranışı **doğrulanamadı**.
- **Kalanlar:** iPhone'da joystick + her aksiyonu farklı parmaklarla basılı tut; diken üzerinden zıplama, kiriş altında eğilme, ses ve buton nabzını kontrol et.

### Faz C — Silahlar ve laboratuvar

- **Durum:** KISMEN — laboratuvar akışı, silah görünümü, ikon üretimi, test/build/typecheck doğrulandı; cihazdaki GLB görünümü bekliyor.
- **Kök neden:** `WarRoomScene3D.tsx:1054` oyuncu silah montajının görünürlüğünü yanlışlıkla oyuncu bileşeninde bulunmayan `enemy` değişkenine bağlıyordu. Bu hem typecheck'i durduruyor hem de manken laboratuvarındaki silahı görünmez yapıyordu. İkonlar önceden yalnızca katalog şekillerinden SVG üretiyordu; gerçek model önizlemesi yoktu.
- **Yapılanlar:** `?lab=1` mevcut `?calib=1` ayar paneliyle birlikte çalışır; tüm katalog silahları tek dokunuşla döngüye girer, manken üzerinde sınanır ve ölçülen boy gösterilir. Görünür ikonlar GLB modelinden tek sefer SVG olarak çizilip önbelleğe alınır; ekran dışındaki silahlar yaklaşınca yüklenir. Prosedürel silahlar için ikon modeli ve render başarısızlığı/tarayıcı dışı ortamlar için hafif SVG yedeği bulunur. Mevcut melee duruş/kombo/ağır saldırı animasyonları ve silah/surface FX profilleri korundu; silah hasarı ve denge değerleri değiştirilmedi. Mevcut renkli decal havuzu (30), kısa/ince/yalnız saldırıda çizilen melee izi ve sRGB/emissive silah materyalleri korundu.
- **Değişen dosyalar:** `src/shafak/game/WarRoomGame.tsx`, `src/shafak/game/WarRoomWeaponIcon.tsx`, `src/shafak/game/war-room-lab.ts`, `src/shafak/game/war-room-lab.test.js`, `src/shafak/game/war-room-weapon-icons.ts`, `src/shafak/game/war-room-weapon-icons.test.js`, `src/shafak/world/WarRoomScene3D.tsx`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama:** `npm run typecheck` ve `npm run build` geçti; GLB ikon rendereri ayrı ~16 kB gzip'lik chunk olarak kaldı. `npm test`: 394 testten 386 geçti; 8 bilinen War Room dışı hata değişmedi (6 mağaza, 1 düello süresi, 1 envanter). Laboratuvar sıralama/boy ve ikon yedeği testleri geçti. SVGRenderer gerçek GLB çizimi tarayıcıda henüz görsel olarak doğrulanmadı; iPhone/Safari kabulü bekliyor.
- **Kalanlar:** iPhone'da bütün silah GLB'lerinin eldeki duruşunu, her test saldırısını ve gerçek modelden üretilen ikonları kontrol et.

### Faz D — Vuruş hissi ve düşman tepkileri

- **Durum:** KISMEN — kod, saf fonksiyon testleri, build/typecheck ve mevcut efekt havuz sınırları doğrulandı; 3D görünüm iPhone/WebGL'de bekliyor.
- **Kök neden:** `WarRoomScene3D.tsx:2390–2400` melee darbelerinde tüm silahlara sabit 0,24 m görsel geri tepme veriyordu; `:1468–1488` düşman modelinin tamamını düz turuncuya yakıp ölüm solmasını iki oyun saniyesine bağlıyordu. Son düşman öldüğünde zafer aynı frame'de açıldığından düşme animasyonu gösterilemiyor; oyuncu hasarında vinyet/yön oku/ses vardı ancak kamera tekmesi yoktu. Düşman saldırı döngüsünde (`:3158`) ön uyarı görseli bulunmuyordu.
- **Yapılanlar:** Düşman geri tepmesi melee silah boyuna göre 0,3–1,0 m arasında hesaplanıyor ve yalnızca sahne grubunu oynatıyor; ağır melee için ≤0,38 sn görsel diz çökme eklendi. Tüm rig malzemelerine bir kez rim shader hazırlanıyor, isabet kenar ışığı 90 ms sürüyor. Ölüm yönlü yatış/solma 1,5 gerçek saniyeye alındı; son düşman için 0,8 sn %25 zaman ölçeği ve kamera yaklaşması sonrası zafer gösteriliyor. Oyuncu hasarı mevcut yön göstergesi/vinyete/sese ek olarak kamera tekmesi veriyor. Mevcut komutan ateş döngüsünün son 0,45 saniyesinde kırmızı zemin yayı gösteriliyor; atış saati, isabet oranı ve düşman AI kararları değiştirilmedi. Hasar sayıları büyütülüp koyu kenarlık/pop stili eklendi. Yeni davranışların bayrakları varsayılan açık.
- **Hasar/iyileşme notu:** Düşman başına hasar kodda normal nöbetçi **9**, Kızıl Komutan **13** CAN. Kullanıcının görüntüsündeki **−43**, bu tek atış tablosundaki bir değer değil; bunun birikimli mi yoksa başka ekrandan mı geldiği bu kod akışında doğrulanamadı. Pasif yenilenme, öldürme iyileştirmesi ve şifa noktaları için birim testleri geçti; değerler Tur 2 Adım 5 bölümünde kayıtlı, bu fazda değiştirilmedi.
- **Değişen dosyalar:** `src/shafak/game/war-room-engine.ts`, `src/shafak/game/war-room-features.ts`, `src/shafak/game/war-room-reactions.ts`, `src/shafak/game/war-room-reactions.test.js`, `src/shafak/game/war-room.css`, `src/shafak/world/WarRoomScene3D.tsx`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama:** `npm run typecheck` ve `npm run build` geçti. `npm test`: 397 testten 389 geçti; 8 bilinen War Room dışı hata (6 mağaza, 1 düello süresi, 1 envanter) değişmedi. Faz D hedef testleri 33/33 geçti; mevcut FX testleri 4/4 ve iyileşme testleri 11/11. Headless önizlemede shader/WebGL görünümü ve gerçek iPhone testi **doğrulanamadı**.
- **Kalanlar:** Gerçek iPhone'da rim shader, uyarı yayı, geri tepme, ölme solması ve zafer yakınlaşmasını görsel olarak kontrol et.

### Faz E — Savaş Odası oda zinciri

- **Durum:** KISMEN — oda akışı, tema/yerleşim verisi, build/typecheck ve birim testleri doğrulandı; gerçek iPhone/WebGL görsel kabulü açık.
- **Kök neden:** Altı oda için tema, yerleşim ve düşman tanımları `src/shafak/game/war-room-rooms.ts` içinde bulunuyordu ancak savaş başlatma/sonuç akışı bunları kullanmayıp tek sabit runtime ve dokuz düşman gösteriyordu. `WarRoomScene3D.tsx` da temel harita engellerini, zemini ve ışığı doğrudan kullanıyordu; dolayısıyla oda tanımı HUD, düşman görseli, çarpışma ve sahneye ulaşmıyordu. İlk oda kesişim testinde ayrıca `war-room-data.ts` içindeki guard-05 yükseltilmiş platforma, guard-08 ise 5. ve 6. odadaki siperlere denk geldi.
- **Yapılanlar:** Başlangıç ekranı, oda numarası/HUD, komutan adı-unvanı, oda düşman sayısı ve zafer özeti dinamikleştirildi. Altı farklı tema ve döndürülen blocker/cover/spawn düzeni oyunun sahnesine, çarpışma, kamera, atış, melee, düşman hareketi ve ayak sesi yüzeyine bağlandı; düşman rengi/silah görünümü oda tanımlarından geliyor. Zaferde mevcut Savaş Odası altın ödülüne oda çarpanı uygulanıyor, ayrı yerel oda ilerlemesi (en yüksek oda ve toplam oda ödülü) saklanıyor, sonraki runtime zafer ekranı açılırken hazırlanıyor ve HP'nin %40'ı taşınıyor. Yenilgide mevcut odada tekrar deneme veya oda 1'den başlama seçenekleri var. Sahne unmount olduğunda pooled renderable, geometri ve materyal temizliği test edilen yardımcı üzerinden yapılıyor; ortak çatlak geometrisi korunuyor. Oda zinciri varsayılan açık (`WAR_ROOM_ROOM_CHAIN_ENABLED`), isteğe bağlı buff'lar kapalı (`WAR_ROOM_ROOM_BUFFS_ENABLED`); vuruş hasarı ve düşman AI kararları değiştirilmedi. Guard-05/08 güvenli noktalara taşındı, ek spawn koordinatlarının tipi açıkça belirtildi.
- **Değişen dosyalar:** `src/shafak/game/WarRoomGame.tsx`, `src/shafak/game/war-room-data.ts`, `src/shafak/game/war-room-engine.ts`, `src/shafak/game/war-room-features.ts`, `src/shafak/game/war-room-rooms.ts`, `src/shafak/game/war-room-rooms.test.js`, `src/shafak/game/war-room-dispose.ts`, `src/shafak/game/war-room-dispose.test.js`, `src/shafak/game/war-room.css`, `src/shafak/world/WarRoomScene3D.tsx`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama:** `npm run typecheck` geçti. `npm run build` geçti; var olan 500 kB üstü bundle uyarısı devam ediyor. `npm test`: 405 testten 397 geçti; 8 başarısızlık aynı bilinen Savaş Odası dışı taban hataları (mağaza/ekipman 6, düello süresi 1, varsayılan envanter 1). Oda sırası/ölçek/ödül/ilerleme, blocker çakışması, hasar değerlerinin sabit kalması ve sahne kaynak temizliği testleri geçti. Uygulama önizlemesi ve gerçek cihaz kabulü Faz F'de tekrar kontrol edilecek.
- **Kalanlar:** iPhone/Safari'de oda 2+ geçişi, yeni tema/yerleşim, düşman silahları ve renkleri, yenilgi seçenekleri, %40 HP aktarımı ve sonuç ekranı görünümü doğrulanmalı. İsteğe bağlı buff bayrağını açmak bu fazın kapsamında değil.

### Faz F — Son kontrol ve cihaz kabul listesi

- **Durum:** KISMEN — bayraklar, derleme, tür kontrolü ve test tabanı doğrulandı; gerçek iPhone/Safari görsel ve dokunma kabulü yapılamadı.
- **Kök neden / gözlem:** `Start application` iş akışı temiz başladı ve giriş/intro sayfası önizlemede göründü. Tarayıcı konsolu `THREE.WebGLRenderer: A WebGL context could not be created` ve `BindToCurrentSequence failed` verdi; ekran görüntüsü etkileşim kuramadığından Savaş Odası'na geçilemedi. Bu nedenle siyah/karanlık 3D sahne veya oda geçişi hakkında görsel bir sonuç çıkarılmadı; hata bu önizleme ortamındaki WebGL başlatma sınırı olarak kaydedildi, oyun hatası olduğu doğrulanmadı.
- **Yapılanlar:** Son bayrak kontrolünde oda zinciri açık, isteğe bağlı oda buff'ları kapalı ve sürüm `v16-oda-zinciri`. Oda sırası, hasar değerleri, ilerleme/ödül ve kaynak temizliği birim testleriyle kontrol edildi. Bu fazda oyun kodu değişmedi.
- **Değişen dosyalar:** `docs/WARROOM_PROGRESS.md`.
- **Doğrulama:** Uygulama iş akışı `RUNNING`, giriş/intro önizlemesi yüklendi. `npm run typecheck` başarılı. `npm run build` başarılı; Vite mevcut 500 kB üzeri chunk uyarısını yazdı. `npm test`: 405 testten 397 geçti; 8 taban başarısızlığı aynı kaldı: altı mağaza/ekipman testi, kolay düello süresi testi ve varsayılan envanter testi. Hiçbir yeni Savaş Odası testi başarısız olmadı.
- **iPhone/Safari kabul listesi:** (1) karakter yaw'ı ve saldırı yönü; (2) kamera engel açıklığı ve örtü saydamlaşması; (3) Kül Yolu'nda joystick ile aynı anda koş/zıpla/eğil; (4) silah laboratuvarında her silahın elde duruşu ve ikonları; (5) siyah darbe izi/iz efekti, hit-stop ve düşman ölüm tepkisi; (6) sonraki oda, tema/yerleşim, düşman görünümü, yenilgide tekrar/baştan seçenekleri, HP aktarımı ve yerel oda kaydı.

## Faz 1 — Karakter yönelimi

- **Durum:** BİTTİ (önceki oturumda tamamlandığı ve yerel commit alındığı ekran görüntüsünde bildirildi).
- **Yapılanlar:** Önceki oturum raporu, joystick hareket yönü ve strafe yön hesabının/testlerinin tamamlandığını söylüyor.
- **Kalanlar:** 3D görünüm cihaz önizlemesinde doğrulanamadı; telefonda `?debug=1` ile kabul testi bekliyor.
- **Değişen dosyalar:** Önceki oturumun dosya listesi ve commit ayrıntıları bu çalışma kopyasında bulunmuyor.
- **Doğrulama sonucu:** Önceki oturum build/typecheck/test ve yerel commit yaptığını bildirdi; bu kopyada yeniden çalıştırılmadı.

## Faz 2 — Heybe → Donanım Görünümü

- **Durum:** BİTTİ (kod); cihaz/WebGL görsel kabul testi açık.
- **Yapılanlar:** Mobil önizleme tam genişlik ve `min(60svh, 520px)` yüksekliğinde. Aynı Canvas tam ekrana genişliyor; sürükleyerek döndürme, sınırlı çimdik yakınlaştırma, çift dokunma/double-click sıfırlama ve yavaş otomatik dönüş var. Oyuncu `KnightActor` rig'i ve el montajı kullanılıyor; seçilen parça önizlemede deneniyor, donanımlı parça ayrı etiketleniyor. Key/rim/fill ışıkları, gölge diskleri, nadirlik parıltısı, vignette ve parça değişim geçişi eklendi. Canvas görünür değilken duruyor, DPR 2 ile sınırlı, panel kapanınca unmount/dispose oluyor; WebGL fallback statik simge gösteriyor. `DENE · DÜNYADA GÖR` korunuyor.
- **Kalanlar:** Telefonda `?debug=1` ile dönme/zoom/tam ekran ve ekipman kabul testi.
- **Değişen dosyalar:** `src/shafak/game/WarRoomGame.tsx`, `src/shafak/game/store-ui/StorePanel.tsx`, `src/shafak/game/store-ui/store-panel.css`, `src/shafak/game/store-ui/equipment-preview-config.ts`, `src/shafak/world/EquipmentPreview3D.tsx`, `src/shafak/world/WorldScene.tsx`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama sonucu:** `npm run typecheck` ve `npm run build` başarılı. `npm test`: 329 testten 321 geçti, 8 bilinen test başarısızlığı var; önceki protokolde belirtilen 321/8 tabanıyla aynı. Replit ekran görüntüsü donanım paneline ulaşmadı; tarayıcı WebGL bağlamı oluşturamadığı için 3D önizleme bu ortamda doğrulanamadı.

## Faz 3 — Yeni yakın dövüş silahları

- **Durum:** BİTTİ
- **Yapılanlar:** `war-room-staff.glb`, `war-room-spear.glb` ve `war-room-pickaxe.glb` analiz scriptiyle raporlandı. Üç model de 1,5 MB ve 6.000 üçgen sınırının altında; silaha göre lazy-load ve yükleme hatasında özel yedek geometri kullanılıyor. Savaş Odası'na Kül Asası (geniş savuruş), Surlu Mızrağı (uzun saplama) ve Surlu Kazması (yüksek hasar/ağır darbe) eklendi; her birinin ayrı tutuş, ölçek, model ve mağaza kaydı var. Sadece War Room kataloğunda yer alıyor.
- **Kalanlar:** GLB'lerin gerçek iPhone/WebGL görünümü ve eldeki oranı cihazda kabul testi bekliyor.
- **Değişen dosyalar:** `src/shafak/game/war-room-data.ts`, `src/shafak/game/store-catalog.ts`, `src/shafak/game/war-room-engine.test.js`, `src/shafak/game/WarRoomGame.tsx`, `src/shafak/world/WarRoomScene3D.tsx`, `scripts/analyze-war-room-weapons.mjs`, `package.json`, `docs/WARROOM_WEAPONS.md`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama sonucu:** GLB analizi, ilgili testler, `npm run build` ve `npm run typecheck` geçti. `npm test`: 330 testten 322 geçti, 8 başarısız; başarısız dosya/test başlıkları Faz 3 öncesi taban çizgisiyle aynı (önce 329/321/8). WebGL ve gerçek cihaz kabul testi doğrulanamadı.

## Faz 4 — Savaş hissi

- **Durum:** BİTTİ (kod); cihaz/WebGL görsel kabul testi açık.
- **Yapılanlar:** Çalışma kopyasında bulunan üç adımlı farklı savuruşlu kombo, 350 ms basılı tutmayla ağır saldırı, tek vuruş anı kontrolü, mevcut koni/engel testi, 0,34–0,48 m engel denetimli ileri atılma, 25° ile sınırlı yakın hedef yardımı, 50/90 ms hit-stop, kamera/FOV geri bildirimi, 0,24 sn ile sınırlı yalnız görsel sendeleme, yönlü geri tepme ve ölümde yatıp solma korundu. Faz 4 kapatma bayrağı ve saldırı debug alanı mevcut. Plan/yardımcı fonksiyon testleri eklendi; TS tür hatası düzeltildi.
- **Kalanlar:** Hit geri bildiriminin ve animasyonların iPhone/WebGL üzerinde `?debug=1` ile görsel kabul testi.
- **Değişen dosyalar:** `src/shafak/game/war-room-combat-feel.test.js`, `src/shafak/world/WarRoomScene3D.tsx`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama sonucu:** Build ve typecheck geçti. `npm test`: 334 testten 326 geçti, 8 başarısızlık; aynı 6 mağaza/ekipman ve 2 duel taban testi, Savaş Odası testleri dahil yeni başarısızlık yok. Build büyük-bundle uyarısı verdi. WebGL/cihaz kabulü doğrulanamadı.

## Faz 5 — Görsel efektler

- **Durum:** BİTTİ (kod); iPhone/WebGL görsel kabul testi açık.
- **Yapılanlar:** 72 parçacıklı ortak havuz (150 üst sınırın altında), 30 decal yuvası ve 10 segmentli additive silah izi korunup tek bayrakla (`WAR_ROOM_POOLED_FX_ENABLED`) kapatılabilir hale getirildi. Kan ayarı hafif varsayılanıyla korunuyor; kapalıyken et isabetinde kan yerine kıvılcım, komutan/metal isabetinde kıvılcım, engel isabetinde toz üretiliyor. Ağır vuruş şok dalgası ve kısa ömürlü çatlak decal kullanıyor. Kritik ve normal hasar sayıları ayrı stillerle, animasyonlu ve mevcut CAN bildiriminden ayrık gösteriliyor. Koşu/iniş tozu, hasar vinyeti ve efsanevi silah aurası mevcut. Havuz renk tamponları savaş başında hazırlanıyor.
- **Kalanlar:** İz, isabet/çatlak efektleri ve aura için gerçek iPhone/WebGL görsel kabulü. Replit önizlemesinde WebGL bağlamı oluşturulamadığından bu ortamda görsel efektler çalıştırılarak doğrulanamadı.
- **Değişen dosyalar:** `src/shafak/game/WarRoomGame.tsx`, `src/shafak/game/war-room-engine.ts`, `src/shafak/game/war-room-features.ts`, `src/shafak/game/war-room-fx.ts`, `src/shafak/game/war-room-fx.test.js`, `src/shafak/game/war-room.css`, `src/shafak/world/WarRoomScene3D.tsx`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama sonucu:** `npm run typecheck` ve `npm run build` başarılı. `npm test`: 336 testten 328 geçti, 8 başarısız; başarısızlar War Room dışı: 6 mağaza/eşya testi, 1 düello süresi testi, 1 envanter varsayılanı testi. War Room FX testleri dahil bu fazdaki testlerde yeni hata yok. Ekran görüntüsü savaş arayüzüne ulaşmadı; tarayıcı WebGL bağlamı oluşturamadığı için görsel kabul doğrulanamadı.

## Faz 6 — Ses

- **Durum:** BİTTİ (kod); iPhone/Safari işitsel kabul testi açık.
- **Yapılanlar:** WebAudio gürültü + osilatör katmanlı ses sentezi; hafif/ağır saldırılar ve sekiz yakın dövüş silahının her biri için ayrı savuruş profili; et, metal, taş/duvar ve toprak/taş ayak sesi profilleri. Perde varyasyonu, mesafe zayıflaması, dinleyici yönüne göre stereo pan ve sabit 4 ses kanalı kullanılıyor. Dört kanaldaki ses düğümleri ilk savaş etkileşiminde birlikte hazırlanıyor; savaş sırasında yeni WebAudio düğümü oluşturulmuyor. SESSİZ ana kontrolü tüm kanalı susturuyor; `beginBattle` ve ses açma düğmesi iOS kullanıcı etkileşimi içinde AudioContext'i devam ettiriyor. `v14-faz6` etiketi debug görünümünde.
- **Kalanlar:** Gerçek iPhone/Safari'de sesli/sessiz geçişi, arka plan/ön plan dönüşü ve WebAudio duyum kalitesi doğrulanamadı.
- **Değişen dosyalar:** `src/shafak/game/war-room-audio.ts`, `src/shafak/game/war-room-audio.test.js`, `src/shafak/game/WarRoomGame.tsx`, `src/shafak/game/war-room-features.ts`, `src/shafak/world/WarRoomScene3D.tsx`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama sonucu:** İlgili ses testleri 5/5 geçti; build ve typecheck geçti. `npm test`: 341 testten 333 geçti, 8 başarısız; aynı altı mağaza/ekipman, bir düello süresi ve bir envanter varsayılanı testi başarısız, War Room ses testlerinde yeni hata yok. Build büyük chunk uyarısı verdi. iPhone/Safari işitsel kabul testi doğrulanamadı.

## Faz 7 — Kalite katmanları ve performans

- **Durum:** BİTTİ (kod); iPhone kabul testi açık.
- **Yapılanlar:** Elle seçilebilir düşük/orta/yüksek ve otomatik profiller; FPS düşüşünde otomatik kalite azaltma; parçacık, iz ve DPR profilleri; mobil DPR'nin düşük profilde 0,75'e ve orta profilde 0,9'a inmesi eklendi. `WAR_ROOM_QUALITY_ENABLED` bayrağı varsayılan açık; kapatılınca eski ölçeklenmemiş efekt/DPR davranışı korunuyor. Kullanılmayan silah GLB'leri briefing ön yüklemesinden çıkarıldı; briefing'de 7 arena modeli yüklendi, hiç silah GLB'si istenmedi. Savaşta kullanılan havuz nesnelerine tam temizleme eklendi; ortak çatlak geometrisi korunuyor. `?debug=1` 60 saniyelik sayaç, saldırı aralıkları, FPS, efekt/decal tepesi ve renderer geometri/doku sayılarını raporluyor. Sürüm `v14-faz7`.
- **Kalanlar:** iPhone'da kalite profillerinin, kaynak sayaçlarının ve performansın kabul testi. 60 sn SwiftShader denemesi kesintisiz testi geçemedi; headless yazılım render'ı telefona karşılık gelmiyor.
- **Değişen dosyalar:** `src/shafak/App.tsx`, `src/shafak/game/WarRoomGame.tsx`, `src/shafak/game/war-room-features.ts`, `src/shafak/game/war-room-quality.ts`, `src/shafak/game/war-room-quality.test.js`, `src/shafak/world/WarRoomModels.tsx`, `src/shafak/world/WarRoomScene3D.tsx`, `src/shafak/world/war-room-model-preload.test.js`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama sonucu:** Build ve typecheck geçti; build büyük-bundle uyarısı verdi. `npm test`: 351 testten 343 geçti, 8 başarısız; aynı bilinen 6 mağaza/ekipman, 1 düello süresi ve 1 envanter testi, yeni War Room başarısızlığı yok. Faz 7 kalite/model hedef testleri 10/10 geçti. 60 sn SwiftShader ölçümü: 1,6 ortalama / 1,0 en düşük FPS; 10 kabul edilen saldırı, en uzun boşluk 7.419 ms; FX 0/28, decal 0/30; renderer 187 geometri (+0), 84 doku (+0). Bu ortam testi “kesintisiz saldırı yok” olarak işaretledi; sayaç sonucu doğruladı, fakat efekt havuzu stresi ve gerçek cihaz FPS'si doğrulanamadı. Replit ekran görüntüsü WebGL bağlamı oluşturamadı; SwiftShader'da WebGL sahnesi açıldı.

## Faz 8 — Son kontrol ve rapor

- **Durum:** BİTTİ (kod ve yerel doğrulama); cihaz kabulü açık.
- **Yapılanlar:** Faz 7 `ecc308c` yerel commit olarak alındı. Dört mevcut faz bayrağının varsayılanı `true` doğrulandı. Sürüm etiketi `v14-premium-dovus` yapıldı. Son build/typecheck/test ve uygulama yeniden başlatma kontrol edildi. iPhone kontrol listesi aşağıya eklendi.
- **Kalanlar:** Aşağıdaki iPhone/Safari/WebGL kabul maddeleri.
- **Değişen dosyalar:** `src/shafak/game/war-room-features.ts`, `docs/WARROOM_PROGRESS.md`, `.agents/memory/mobile-frame-rate-verification.md`.
- **Doğrulama sonucu:** Build ve typecheck geçti; build büyük chunk uyarısı verdi. `npm test`: 351 testten 343 geçti, 8 bilinen taban testi başarısız; önceki Faz 7 geçişindeki aynı 8 test, War Room kaynaklı yeni hata yok. Uygulama `Start application` iş akışında yeniden başladı. Headless SwiftShader'da `v14-premium-dovus` WebGL savaş sahnesi açıldı ve seçili Mızrak için yalnızca `spear.glb` yüklendi. Gerçek iPhone FPS, görsel kalite ve Safari sesi doğrulanamadı.

### Son doğrulama tablosu

| Madde | Durum (Doğrulandı / Kısmen / Doğrulanamadı) | Not |
|---|---|---|
| Faz 1 — Karakter yönelimi | Kısmen | Önceki oturum tamamlandı diye bildirdi; bu kopyada eski commit/dosya ayrıntısı yok. iPhone hareket kabulü açık. |
| Faz 2 — Donanım önizlemesi | Kısmen | Kod/build/test kayıtları mevcut; gerçek cihazda sürükleme, zoom ve tam ekran kabulü açık. |
| Faz 3 — Yakın dövüş silahları | Kısmen | Seçili Mızrak 3D sahnede yüklendi; üç yeni GLB'nin iPhone eldeki oranı doğrulanmadı. |
| Faz 4 — Savaş hissi | Kısmen | Kod ve hedef testler mevcut; iPhone animasyon/hit geri bildirimi görsel kabulü açık. |
| Faz 5 — Görsel efektler | Kısmen | Havuz sınırları test edildi; ölçümde isabet olmadığından gerçek efekt havuzu stresi doğrulanmadı. |
| Faz 6 — Ses | Kısmen | Ses testleri 5/5 geçti; iPhone/Safari işitsel kabulü açık. |
| Faz 7 — Kalite ve performans | Kısmen | 60 sn SwiftShader örneği 1,6 ort. / 1,0 en düşük FPS ve 10 saldırı verdi; kesintisiz kriteri geçmedi, telefona genellenemez. |
| Faz bayrakları | Doğrulandı | `WAR_ROOM_COMBAT_FEEL_ENABLED`, `WAR_ROOM_POOLED_FX_ENABLED`, `WAR_ROOM_SYNTH_AUDIO_ENABLED`, `WAR_ROOM_QUALITY_ENABLED` varsayılanları `true`. |
| WebGL sahnesi ve seçili silah yüklemesi | Doğrulandı | Headless SwiftShader sahneyi açtı; seçili Mızrak `spear.glb` isteği üretti. Donanım GPU doğrulaması değildir. |
| `npm run build` | Doğrulandı | Başarılı; 500 kB üzeri bundle uyarısı sürüyor. |
| `npm run typecheck` | Doğrulandı | Başarılı. |
| `npm test` | Kısmen | 351 toplam, 343 geçti, 8 başarısız; aynı bilinen mağaza/ekipman (6), düello süresi (1) ve envanter (1) taban testleri. |
| iPhone/Safari kabulü | Doğrulanamadı | Bu çalışma ortamında fiziksel cihaz erişimi yok. |

### iPhone kontrol listesi

1. Oyunu `?debug=1` ile açıp Savaş Odası'na gir; sürüm etiketinin `v15-kalibrasyon-ek` olduğunu doğrula.
2. Joystick ile ileri/geri/yan/çapraz hareket et; yönelimi, strafe sırasında nişan ve kamera takibini kontrol et.
3. Donanım önizlemesinde parçayı sürükle, pinch zoom yap, çift dokunarak sıfırla; paneli tam ekrana alıp kapat.
4. Kül Asası, Surlu Mızrağı ve Surlu Kazması'nı ayrı ayrı kuşan; GLB yüklenirken yedek geometriyi, tutuşu, ölçeği ve kadrajı kontrol et.
5. Hafif kombo ve en az 350 ms basılı ağır saldırıyı dene; tek vuruş anını, hit-stop'u, kamera tepkisini ve düşman hasar görselini kontrol et.
6. Bıçak, balta, sopa, asa, mızrak, kazma ve küreği dene; kan kapalıyken de kıvılcım/toz/flaşları, her isabet türünü, ıskada yalnızca savuruş izini ve havuz/decal üst sınırlarını kontrol et.
7. Düşük/orta/yüksek ve otomatik kaliteyi dene; 60 sn kesintisiz saldırı sırasında debug FPS, saldırı aralıkları, FX/decal tepesi ve renderer geometri/doku sayaçlarını kaydet.
8. Sesli/sessiz geçişini, ilk dokunuştan sonra iOS AudioContext'i, arka plan/ön plan dönüşünü ve yakın dövüş/zemin seslerini kontrol et.
9. WebGL siyah kare, model kaybı, kontrol kilitlenmesi, belirgin ısınma veya performans düşüşü varsa adım ve cihaz bilgisiyle not al.

## Tur 4 — iPhone hareketi, butonlar, animasyon, gökyüzü ve savaş HUD'u

- **Durum:** DEVAM EDİYOR — Faz 1 tamamlandı; Faz 2–6 sırada.
- **Kapsam:** `attached_assets` içindeki Tur 4 notu. Kül Yolu giriş/durum makinesi, ortak oyun butonları, hareket pozları, gün/gece, savaş efektleri ve son kabul raporu.
- **Kurallar:** Fazlar sırayla ve bağımsız commit edilir; her faz sonunda build, typecheck ve testler çalıştırılır. Push/deploy yok. Ekonomi, kayıtlar, düşman AI, hasar/ceza değerleri, silahlar ve oyun dengesi değiştirilmez. Savaş efekt havuzu/decal sınırları korunur; frame içinde yeni Three.js geometri/materyal/ışık yaratılmaz.
- **Cihaz kabulü:** Gerçek iPhone/Safari testi bu çalışma ortamında yapılamaz; WebGL görsel sonuçları cihazda ayrıca kontrol edilmeli.

### Faz 1 — Kül Yolu girdi ve hareket durumu

- **Durum:** TAMAMLANDI (kod ve yerel doğrulama); iPhone dokunma kabulü açık.
- **Kök neden:** `useWorldInput.ts` ve `world-touch-actions.test.js` `world-touch-actions.ts` modülünü içe aktarıyordu fakat kaynak dosya depoda yoktu. Bu nedenle typecheck `TS2307`, Vite build `UNRESOLVED_IMPORT`, dokunmatik davranışın uygulama içinde denenmesi de mümkün değildi. Ayrıca zıplama, sabit süreli tutuş darbesiyle temsil edildiğinden sabit-adım simülasyonunda zamanlama durumu açık değildi.
- **Yapılanlar:** Pointer kimliğine göre bağımsız basılı eylem kümeleri ve pointer sayacı eklendi; joystick ile KOŞ/ZIPLA/EĞİL aynı anda kullanılabiliyor. Pointer capture hataları güvenli biçimde tolere ediliyor. Klavye Shift/Space/Ctrl ve C eşlemesi korundu. Hareket simülasyonu artık yalnız `{ sprint, jumpPressed, crouch }` eylem durumunu okuyor. Saf FSM; zıplama tamponu 120 ms, kenar toleransı 100 ms, hazırlık/iniş, yürüyüş/sprint, eğilme ve koşu sonrası 0,6 sn kayma durumlarını yönetiyor. Mevcut 7,2 ilk zıplama hızı, 19,5 yerçekimi, 6,8 koşu hızı ve tuzak ceza süre/değerleri değişmedi. Diken/taş zıplama açıklığı ve alçak kiriş eğilme çarpışması korundu. `?debug=1` hareket eylemlerini, FSM durumunu, engel açıklığını, joystick'i ve etkin pointer sayısını gösteriyor. iOS sayfa kaydırma/çift dokunma yakınlaştırması/uzun basma menüsü oyun sahnesi ve kontrollerinde kapatıldı. Sürüm tek kaynak `GAME_BUILD_MARKER` üzerinden `v17-faz-1`.
- **Değişen dosyalar:** `src/shafak/build-info.ts`, `src/shafak/world/WorldScene.tsx`, `src/shafak/world/movement.ts`, `src/shafak/world/movement.test.js`, `src/shafak/world/useWorldInput.ts`, `src/shafak/world/world-features.ts`, `src/shafak/world/world-movement-machine.ts`, `src/shafak/world/world-movement-machine.test.js`, `src/shafak/world/world-scene.css`, `src/shafak/world/world-touch-actions.ts`, `src/shafak/world/world-touch-actions.test.js`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama sonucu:** Hareket/durum makinesi/dokunma/engel hedef testleri 41/41 geçti; typecheck ve build başarılı. Tam test paketi 412 testten 404 geçti; bilinen Savaş Odası dışı taban başarısızlıkları 6 mağaza/ekipman, 1 düello süresi ve 1 envanter varsayılanı testi. Eksik dokunma modülü kaynaklı test hatası giderildi. Build 500 kB üzeri bundle uyarısı verdi. Fiziksel iPhone/Safari kabulü doğrulanamadı.

### Faz 2 — Ortak kabartmalı oyun düğmeleri

- **Durum:** TAMAMLANDI (kod ve yerel doğrulama); iPhone/Safari görsel kabulü açık.
- **Yapılanlar:** Kül Yolu KOŞ/ZIPLA/EĞİL ve savaş SALDIRI/SİPER/NİŞAN/ZIPLA/KOR/YILDIRIM eylemleri aynı temalı `GameButton` bileşenine taşındı. Kül Yolu'nda 76–84 px görsel yüz ve 96 px dokunma alanı, klavye rozetleri, diken/kiriş için dikkat rozeti, basılı ve soğuma görselleri uygulandı. Savaş kontrollerinde mevcut klavye kısayolları, tetikleme/bırakma, bekleme süresi ve engellenme nedenleri korundu. Düğme sesi için ortak, yeniden kullanılan WebAudio düğüm eklendi; mevcut sessiz ayarıyla susturulur. CSS/SVG dışı referans görsel kullanılmadı; azaltılmış hareket tercihine uyuldu. Ekonomi ve oyun etkileri değiştirilmedi.
- **Değişen dosyalar:** `src/shafak/game/GameButton.tsx`, `src/shafak/game/game-button.css`, `src/shafak/game/DuelControls.tsx`, `src/shafak/audio/howler.ts`, `src/shafak/world/WorldScene.tsx`, `src/shafak/world/useWorldInput.ts`, `src/shafak/world/world-scene.css`, `src/shafak/build-info.ts`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama sonucu:** `npm run typecheck` ve `npm run build` başarılı. `npm test`: 412 testten 404 geçti; başarısız 8 test, bilinen mağaza/ekipman, düello süresi ve envanter varsayılanı taban başarısızlıklarıyla aynı; Faz 2'de yeni hata yok. Build büyük chunk uyarısı verdi. Fiziksel iPhone/Safari kabulü ve WebGL görsel kontrolü doğrulanamadı.

### Faz 3 — Koşu, zıplama ve eğilme pozları

- **Durum:** TAMAMLANDI (kod ve yerel doğrulama); gerçek iPhone/WebGL görsel kabulü doğrulanamadı.
- **Kök neden:** `player-hero.glb` klibi üstüne eklenen eski eğilme pozları diz, gövde ve başı aynı anda fazla büküyordu; ayrıca oyuncu klibi kareler arasında eklenmiş pozları temiz bir taban pozuna döndürmüyordu. Hareket durum makinesi ile animasyon katmanı arasında koşu/sprint hız ağırlığı ve iniş/slide görsel geçişi de yoktu.
- **Gerçek oyuncu rig kemikleri:** `Root`, `Foot.L`, `Body`, `Hips`, `Abdomen`, `Torso`, `Neck`, `Head`, `Shoulder.L`, `UpperArm.L`, `LowerArm.L`, `Fist.L`, `Fist1.L`, `Fist2.L`, `Thumb1.L`, `Thumb2.L`, `Shoulder.R`, `UpperArm.R`, `LowerArm.R`, `Fist.R`, `Fist1.R`, `Fist2.R`, `Thumb1.R`, `Thumb2.R`, `UpperLeg.L`, `LowerLeg.L`, `UpperLeg.R`, `LowerLeg.R`, `PoleTarget.L`, `Foot.R`, `PoleTarget.R`. Bu rigde ayrı saç/pelerin/kuşak kemiği yok.
- **Yapılanlar:** Gerçek rig adlarına çözümleme, temel poz geri yükleme ve sınırlandırılmış prosedürel durum pozları eklendi; koşu gövdesi 12°, sprint 20° öne eğilir, sprintte baş hafif öne gelir. GLB koşu/yürüme klibi hızı oyuncu hızına bağlandı. Zıplama hazırlığı/itiş/iniş squash-stretch, açık kollar, diz bükme, havada küçülüp solan gölge, kısa hayalet iz ve yeniden kullanılan zemin halkası eklendi. Eğilme dik başı korur; slide bir bacağı öne ve gövdeyi hafif geriye alır. Sprint FOV genişlemesi, eğilme kamera alçalması, iniş kamera darbesi, adım tozu/sprint hız çizgileri, iniş/itiş/slide tozu ve doğru engel geçişinde ödülsüz “MÜKEMMEL!” yazısı eklendi. Hareket efekt DOM havuzu en çok 10 burst × 12 parçacıkla sınırlandı; mevcut WebAudio ayarına uyan zıplama/slide ve zemin adım sesleri kullanılır.
- **Değişen dosyalar:** `src/shafak/world/character-pose.ts`, `src/shafak/world/character-model.test.js`, `src/shafak/world/WorldV2Actor.tsx`, `src/shafak/world/KnightActor.tsx`, `src/shafak/world/World3DV2.tsx`, `src/shafak/world/WorldScene.tsx`, `src/shafak/world/world-scene.css`, `src/shafak/audio/howler.ts`, `src/shafak/build-info.ts`, `docs/WARROOM_PROGRESS.md`.
- **Doğrulama sonucu:** Typecheck ve build başarılı. Faz 3 hareket/rig testleri 16/16 geçti. Tam paket 415 testten 407 geçti; başarısız 8 test, Faz 1/2’deki aynı mağaza/ekipman (6), düello süresi (1) ve envanter varsayılanı (1) taban hataları. Yeni test hatası yok. Build mevcut büyük Three.js/chunk uyarısını koruyor. Oyuncu riginde ayrı saç/pelerin/kuşak kemiği bulunmadı; bu nedenle bunlar için sahte animasyon eklenmedi. Fiziksel iPhone/Safari ve WebGL sahne görünümü doğrulanamadı.

### Faz 4 — Ortak gün/gece ve gökyüzü

- **Durum:** DEVAM EDİYOR.
