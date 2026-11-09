# Prenses modeli — dosya yükleme gerekmiyor

Final sahnesindeki prenses harici bir `princess.glb` dosyası kullanmaz. Sahne, oyuncunun mevcut iskeletli `player-hero.glb` modelini yalnızca kampanya finali açıldığında yükler ve klonlar; uzun elbise, saç ve taç Three.js geometrisiyle oluşturulur.

Animasyonlar aynı oyuncu iskeletini kullanır: Idle ve Walk klipleri oyuncu modelinden alınır; Wave ve Talk hareketleri iskelet kemiklerine kodla eklenir. Finalde karakter kamera/oyuncu yönüne döner.

Oyuncu GLB'si eksikse, yüklenemezse veya WebGL bağlamı açılamazsa final ekranındaki SVG silueti görünür kalır. Bu nedenle `public/models/princess.glb` yüklemek gerekmez.
