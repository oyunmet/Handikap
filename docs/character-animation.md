# Şövalye animasyonu

Oyun içi varsayılan şövalye, `Knight3D.tsx` içinde Three.js geometrileriyle
oluşturulur. Yürüme ve koşma fazı kat edilen mesafeden sürülür; bacak açıları
iki kemikli IK ile hesaplanır ve yerde kalan ayak, adım boyunca dünya
konumunda kilitlenir. Toz ve adım sesi simülasyondaki adım anında tetiklenir.
Pelerin, kodla üretilmiş bir ağ üzerinde yay-zincir fiziği kullanır.

Paylaşılan animasyon durumları `idle`, `walk`, `run`, `attack`, `block`,
`dodge`, `hit` ve `die` şeklindedir. Savaş davranışları bu aşamada yalnızca
karakter hareket durumlarıdır; gerçek rakip ve savaş sistemi Aşama 3–4
kapsamındadır.

İsteğe bağlı `public/models/hero.glb` oyuncu modelidir; düelloda adı eşleşen bot
profilleri kendi GLB yolunu kullanır. `Gece Nöbetçisi` profili
`public/models/gece-nobetcisi.glb` dosyasını yükler. Yükleme GLTFLoader ve
MeshoptDecoder ile yapılır; dosya yoksa veya yükleme başarısızsa prosedürel
karakter görünümü korunur.

Bot modeli, ölçeği, yönü, fallback zırh/pelerin/silah görünümü, malzeme eşleme
adları ve klip takma adları `opponent-model-config.ts` içindedir. Klip adları
büyük/küçük harf ve boşluk farkını tolere eder; eşleşmeyen aksiyon klipleri
hatasız atlanır. Örneğin GLB klipleri `Idle`, `Run`, `Attack1`, `Block`,
`Dodge`, `HitReaction`, `Death` ve `Victory` olabilir. Her durum geçişi
0,2 saniye crossfade kullanır. Pelerin/vurgu malzemelerini otomatik boyamak
için GLB malzeme adlarını varsayılan takma adlarla (`Cape`/`Cloak`,
`Trim`/`Accent`) eşleştirin veya profildeki ad listesini düzenleyin.

`public/models/gece-nobetcisi.glb` için önerilen üst sınırlar 50.000 üçgen ve
2.048 px dokudur. Bunlar aşılırsa oyun devam eder, konsola uyarı yazılır.
Model yönü veya boyu farklıysa profildeki `modelFacing` ve `scale` değerlerini
düzenleyin. Klip alias'larını da aynı profilden değiştirebilirsiniz.
