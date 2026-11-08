import { lazy, Suspense } from "react";
import { DeleteAccountPage, PrivacyPage } from "../LegalPages";

const ClerkApp = lazy(() => import("./AuthApp"));
const GuestGame = lazy(() => import("./GuestGame"));

function StartupFallback() {
  return <div className="entry-loading" role="status">Şafak Savaşçıları hazırlanıyor…</div>;
}

export default function EnvironmentRouter() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const pathname = window.location.pathname;
  const routePath = basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))
    ? pathname.slice(basePath.length) || "/"
    : pathname;
  const normalizedRoute = routePath.replace(/\/+$/, "") || "/";
  if (normalizedRoute === "/privacy") return <PrivacyPage />;
  if (normalizedRoute === "/delete-account") return <DeleteAccountPage />;

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
