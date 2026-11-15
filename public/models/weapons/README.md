# Savaş Odası silah modelleri

Silah GLB dosyaları `war-room-data.ts` içindeki silah tanımlarıyla eşleşir.
İndirilen ya da kullanıcı tarafından eklenen modellerde kaynak ve lisans bilgisi
`../CREDITS.md` dosyasına eklenmelidir. Eksik veya açılamayan modeller için sahne
prosedürel yedeği kullanır.

Proje içinde üretilen fantastik silahlar
`scripts/generate-war-room-weapon-models.mjs` ile oluşturulur. Silah tanımlarında
el tutuşu, hedef boyutları ve namlu yönü ayarlanır; animasyon parçaları GLB
modelinin kendi başlangıç konumuna göre hareket ettirilir.
