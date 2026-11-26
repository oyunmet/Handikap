# Prenses modeli — dosya yükleme gerekmiyor

Final sahnesindeki prenses harici bir `princess.glb` dosyası kullanmaz. Sahne, bütün oyun modlarının paylaştığı statik `fantasy_knight.glb` modelini yalnızca kampanya finali açıldığında yükler ve klonlar; uzun elbise, saç ve taç Three.js geometrisiyle oluşturulur.

Karakter gövdesinde iskelet veya animasyon klibi bulunmaz. Final sahnesindeki konum ve yön, Three.js grup dönüşümleriyle belirlenir.

Oyuncu GLB'si eksikse, yüklenemezse veya WebGL bağlamı açılamazsa final ekranındaki SVG silueti görünür kalır. Bu nedenle `public/models/princess.glb` yüklemek gerekmez.
