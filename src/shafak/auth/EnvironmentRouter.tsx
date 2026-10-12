import { lazy, Suspense } from "react";
import { getAuthExperience } from "./environment";

declare const __VERCEL_ENV__: string;

const ClerkApp = lazy(() => import("./AuthApp"));
const GuestGame = lazy(() => import("./GuestGame"));

function StartupFallback() {
  return <div className="entry-loading" role="status">Şafak Savaşçıları hazırlanıyor…</div>;
}

export default function EnvironmentRouter() {
  const experience = getAuthExperience({
    hasClerkKey: Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY),
    isDevelopment: import.meta.env.DEV,
    vercelEnvironment: __VERCEL_ENV__,
  });

  if (experience === "clerk") {
    return <Suspense fallback={<StartupFallback />}><ClerkApp /></Suspense>;
  }

  if (experience === "guest") {
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
