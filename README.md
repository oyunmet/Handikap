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
   `CLERK_SECRET_KEY` değerlerini güvenli biçimde ekle. İsteğe bağlı aynı-kaynak
   Clerk proxy adresi `VITE_CLERK_PROXY_URL=/api/__clerk` şeklindedir. Clerk
   anahtarlarını Git'e veya README'ye koyma.
4. Clerk kullanıyorsan Vercel alan adını Clerk uygulamasında izin verilen
   alan adlarına ekle. Veritabanı Vercel'den erişilebilir olmalı.
5. İlk yayın öncesi veritabanı yedeği al ve `db/migrations` içeriğini incele.
   `npm run db:migrate`, `002_remove_match_duel_data.sql` içindeki eski `moves`
   ve `result` sütunlarını kalıcı olarak siler; üretim veritabanında yalnızca bu
   işlemi onaylayarak çalıştır.
6. Vercel'de **Deploy**'a bas. Yayın sonrası `/api/health` ve giriş/profil
   akışlarını doğrula; oyun ekranında `?debug=1` ile 3D bilgilerini kontrol et.

**Socket.IO notu:** Replit'te `server/index.ts` Socket.IO sunucusu açar;
Vercel'in `api/[...path].ts` işlevi bunu açmaz. Aşama 1–2 için bu gerçek zamanlı
kanal kullanılmıyor; sokete bağlı özellikler için ayrıca çalışan bir sunucu veya
uyumlu bir gerçek zamanlı hizmet gerekir.

Bu görevde Vercel'e yayın yapılmadı; bu nedenle canlı Vercel adresinden ekran
görüntüsü ya da iPhone Safari performans ölçümü doğrulanmış değildir.
