# İlerleme notu

## Aşama 1 — Performans ve akıcılık

**Durum:** Kod çalışmaları tamamlandı. Gerçek iPhone Safari kabul ölçümü henüz
yapılmadı.

### Tamamlananlar

- Sabit zaman adımı ve sekmeden dönüşte sınırlı delta kullanılıyor.
- 2D dünya çiziminde görünür parça/nesne listeleri yeniden kullanılıyor; arka
  plan işçisi yavaşlarsa eski kareleri biriktirmek yerine son kareyi çiziyor.
- Dünya parçaları önceden hazırlanıyor; eski 3D parçalar sahneden kaldırılıyor,
  parça verisi ve 2D çizim önbellekleri sınırlı tutuluyor.
- Statik çevre InstancedMesh ile çiziliyor; kalite ayarları, mobil piksel oranı
  ve gölge bütçeleri sınırlandırılmış durumda.
- Düello sahnesi görünür geçiş sırasında shader hazırlığı yapıyor.
- `?debug=1` panelinde FPS, draw call, üçgen, geometri/doku, heap ve uzun kare
  ölçümleri bulunuyor. Post-processing açıkken sayaçlar tüm render geçişlerini
  kapsayacak şekilde sıfırlanıyor.
- Adım sesi örneği/buffer'ı önbelleğe alınıyor; ses örneği oynatımı için Howler
  havuzu ayarlı. Düello efektleri ve toz patlamaları mevcut kodda üst sınırla
  tutuluyor. Oyunda mermi/proje nesnesi bulunmadığı için mermi havuzu eklenmedi.

### Yerel doğrulama

- `npm run typecheck` — geçti.
- `npm test` — 64 test geçti; 5 dakikalık dünya parçası/yeniden kullanılan
  tampon sınırı testi eklendi.
- `npm run build` — geçti. Vite, ana JavaScript paketinin 500 kB üstünde
  olduğunu bildiriyor.
- Preview açıldı; ekran görüntüsü aracı WebGL bağlamı oluşturamadığı için 3D
  sahnenin pikselleri ve debug sayaçları bu tarayıcıda doğrulanamadı.

### Kalan kabul ölçümü

Gerçek iPhone Safari'de `/?debug=1&scene=world` açıp yolda ve bir düelloda
oynarken 5 dakika ölçüm yap. FPS'nin 50 veya üstünde, 100 ms üzeri kare
sıçramalarının sıfır ve belleğin sabit kaldığını cihaz üzerinde doğrula.
