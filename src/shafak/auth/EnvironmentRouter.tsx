import { lazy, Suspense } from "react";

const ClerkApp = lazy(() => import("./AuthApp"));
const GuestGame = lazy(() => import("./GuestGame"));

function StartupFallback() {
  return <div className="entry-loading" role="status">Şafak Savaşçıları hazırlanıyor…</div>;
}

export default function EnvironmentRouter() {
  if (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
    return <Suspense fallback={<StartupFallback />}><ClerkApp /></Suspense>;
  }

  if (import.meta.env.DEV) {
    return <Suspense fallback={<StartupFallback />}><GuestGame /></Suspense>;
  }

  return (
    <main className="entry-setup-screen" role="alert">
      <section className="entry-setup-card">
        <strong>Giriş hizmeti yapılandırılmamış</strong>
        <span>Üretim ortamında misafir oyunu kapalıdır. Oyunu açmak için Clerk yapılandırması gerekir.</span>
      </section>
    </main>
  );
}
