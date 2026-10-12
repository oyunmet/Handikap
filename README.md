# Şafak Savaşçıları

Kayıp kaleler arasında yol alan karanlık-fantastik bir oyun.

## Geliştirme

Replit'te `npm run dev` ile oyunu aç. Masaüstünde `W/A/S/D` veya yön tuşları,
telefonda sol joystick kullanılır. İleri itiş yolda ilerletir; joystick'in
itiliş miktarı yürüme-koşma hızını belirler.

3D hata ayıklama paneli için oyunu `?debug=1` ile aç. Doğrudan oyun sahnesini
açmak ve açılış ekranını atlamak için `?debug=1&scene=world` kullan. Panel
konumu, mesafeyi, hızı, FPS'yi, üçgen sayısını, animasyon durumunu, ayak kayması
ölçümünü ve yüklü dünya parçası sayısını gösterir. Dünya 48 metrelik tohumlu
parçalara bölünür; bölüm kapısı her 144 metrede bir görünür.

## Şövalye ve model ekleme

Varsayılan oyun içi şövalye harici dosya gerektirmeden kodla oluşturulur.
Renkleri, vücut oranlarını, pelerin yayını ve isteğe bağlı GLB ayarlarını
`src/shafak/world/knight-config.ts` içindeki `KNIGHT_CONFIG` üzerinden değiştir.

İleride kendi GLB modelini kullanmak istersen:

1. Modeli `public/models/hero.glb` konumuna koy.
2. Modelin ayak tabanını zeminin başlangıç noktasına yerleştir; boyunu yaklaşık
   2,14 dünya biriminde tut.
3. Yönü yanlışsa `modelFacing` değerini, boyu yanlışsa `modelScale` değerini
   `KNIGHT_CONFIG` içinde ayarla.
4. Modelde animasyon klipleri varsa adlarını `animationClips` tablosuna ekle.
   Ad eşlemesi büyük/küçük harfe duyarsızdır; Walk/Run yoksa en yakın hareket
   klibine, son olarak Idle klibine döner.
5. Değişiklikten sonra `npm run typecheck`, `npm test` ve `npm run build`
   komutlarını çalıştır. Model bulunamaz veya yüklenemezse prosedürel şövalye
   kullanılmaya devam eder.

## Vercel'e yayınlama

Bu proje yalnızca statik Vite sayfasından oluşmuyor: `api/[...path].ts`
profil ve düello API'lerini Vercel Function olarak sunar. Vercel yapılandırması
SPA sayfa yollarını ve Replit içi npm adreslerinin derleme sırasında herkese açık
npm adreslerine çevrilmesini ayarlar.

### Supabase PostgreSQL kurulumu

1. Vercel Production ortamındaki `DATABASE_URL` için Supabase **Connect → Transaction
   pooler** URI'sini kullan (port `6543`). Uygulama Supabase adreslerinde SSL
   bağlantısını zorunlu tutar ve Vercel Function pool boyutunu 1 bağlantıyla
   sınırlar.
2. Yeni şemayı oluşturmak için Supabase **Connect → Session pooler** URI'sini
   kullan (port `5432`). Bu URI'yi yalnızca migration çalıştıracağın güvenli
   yerel ortamda `DATABASE_URL` olarak ayarla; parola içindeki özel karakterleri
   URI kurallarına göre percent-encode et.
3. Depo kökünde `npm run db:migrate` çalıştır. Komut `db/migrations` içindeki
   migration'ları sıralı uygular; profiller, düellolar, pickup ödülleri ve mağaza
   tablolarını oluşturur. `DATABASE_URL` tanımlı değilse komut açık hata verir.
4. Migration tamamlandıktan sonra Vercel Production `DATABASE_URL` değerinin
   Transaction pooler URI'si olduğundan emin ol ve yeni deploy'da `/api/health`
   yanıtının `200` ve `"database": "connected"` olduğunu kontrol et.

Yeni ve boş veritabanında migration'lar güvenle uygulanabilir. `002` migration'ı
eski düello verilerindeki `moves` ve `result` sütunlarını siler; bunu mevcut
verisi olan bir veritabanına uygulamadan önce yedek al.

1. Projeyi GitHub'a gönder, sonra Vercel'de **Add New → Project** üzerinden
   depoyu içe aktar. Proje kökü olarak depo kökünü seç.
2. Framework ayarını **Vite** olarak doğrula. `vercel.json` şu komutları ayarlar:
   `node scripts/normalize-npm-lock.mjs && npm ci`, `npm run build`, çıktı
   klasörü `dist`.
3. Profil verilerinin kalıcı olması için Vercel **Settings → Environment
   Variables** içine Vercel'den erişilebilen PostgreSQL'in `DATABASE_URL`
   değerini ekle. Bu çalışma alanında Clerk şu an yapılandırılmamış; giriş
   özelliklerini Vercel'de de kullanmak istersen kendi Clerk uygulamanı
   yapılandırıp `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY` ve
   `CLERK_SECRET_KEY` değerlerini güvenli biçimde ekle. Sunucu ve istemci
   publishable key'leri aynı Clerk uygulamasına ait olmalı; kimliği doğrulanmış
   API isteklerinde Clerk session Bearer token'ı kullanılır. Clerk anahtarlarını
   Git'e veya README'ye koyma.
   Clerk anahtarı olmayan Vercel Preview deploy'ları yalnızca cihazda saklanan
   misafir oyununu açar; Production ortamı Clerk yapılandırılana kadar kapalı
   kalır.
4. Clerk kullanıyorsan Vercel alan adını Clerk uygulamasında izin verilen
   alan adlarına ekle. Veritabanı Vercel'den erişilebilir olmalı.
5. Vercel'de **Deploy**'a bas. Yayın sonrası `/api/health` ve giriş/profil
   akışlarını doğrula; oyun ekranında `?debug=1` ile 3D bilgilerini kontrol et.

**Socket.IO notu:** Replit'te `server/index.ts` Socket.IO sunucusu açar;
Vercel'in `api/[...path].ts` işlevi bunu açmaz. Aşama 1–2 için bu gerçek zamanlı
kanal kullanılmıyor; sokete bağlı özellikler için ayrıca çalışan bir sunucu veya
uyumlu bir gerçek zamanlı hizmet gerekir.

Bu görevde Vercel'e yayın yapılmadı; bu nedenle canlı Vercel adresinden ekran
görüntüsü ya da iPhone Safari performans ölçümü doğrulanmış değildir.
