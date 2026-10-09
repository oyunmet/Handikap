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

İsteğe bağlı `public/models/hero.glb` bulunursa `KnightActor.tsx` modeli yükler
ve `AnimationMixer` ile klipleri yumuşak geçişlerle oynatır. Ad eşlemesi
`KNIGHT_CONFIG.animationClips` içindedir. Eksik/uyumsuz dosya durumunda
prosedürel şövalyeye dönülür. Modelin ölçeği ve yönü de aynı ayar dosyasındadır.
GLB ekleme adımları için kök `README.md` dosyasındaki “Şövalye ve model ekleme”
bölümüne bak.
