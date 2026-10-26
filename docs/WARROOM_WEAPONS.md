# Savaş Odası yakın dövüş modeli analizi

Rapor `npm run warroom:weapons:inspect` ile yerel GLB dosyalarından üretilmiştir. Boyutlar, mesh konum verisi ve düğüm ölçeği uygulanarak hesaplanır; doku boyutları gömülü WebP başlıklarından okunur.

| Tahmin | Dosya | Mesh | Sınır ölçüsü (m) | Üçgen | Doku | GLB boyutu |
|---|---|---|---:|---:|---:|---:|
| Kül Asası (Staff) | `war-room-staff.glb` | `Staff` | 0,235 × 1,6 × 0,192 | 4.704 | 1024 × 1024 WebP | 150.916 B |
| Surlu Mızrağı (Spear) | `war-room-spear.glb` | `Spear` | 0,15 × 0,7 × 0,112 | 4.702 | 1024 × 1024 WebP | 95.232 B |
| Surlu Kazması (Pickaxe) | `war-room-pickaxe.glb` | `Pickaxe` | 0,666 × 0,9 × 0,172 | 4.410 | 512 × 512 WebP | 63.348 B |

Mesh adları ve siluet oranları asa, mızrak ve kazma tahminleriyle tutarlıdır. Dosyaların tümü faz protokolündeki 1,5 MB / 6.000 üçgen sınırına uygundur; ek sıkıştırma/yeniden örnekleme gerekmedi.
