import { lazy, Suspense, useState } from "react";
import { DeleteAccountPage, PrivacyPage } from "../LegalPages";
import AgeGate from "./AgeGate";
import { readAgeGateChoice, writeAgeGateChoice, type AgeGateChoice } from "./age-gate";

const ClerkApp = lazy(() => import("./AuthApp"));
const GuestGame = lazy(() => import("./GuestGame"));

function StartupFallback() {
  return <div className="entry-loading" role="status">Şafak Savaşçıları hazırlanıyor…</div>;
}

function readInitialAgeChoice(): AgeGateChoice {
  if (typeof window === "undefined") return "unknown";
  try {
    return readAgeGateChoice(window.localStorage);
  } catch {
    return "unknown";
  }
}

export default function EnvironmentRouter() {
  const [ageChoice, setAgeChoice] = useState<AgeGateChoice>(readInitialAgeChoice);
  useEffect(() => {
    let lastSentAt = 0;
    const report = (kind: "window-error" | "unhandled-rejection") => {
      const now = Date.now();
      if (now - lastSentAt < 2_000) return;
      lastSentAt = now;
      void fetch("/api/diagnostics/crash", {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      }).catch(() => undefined);
    };
    const onError = () => report("window-error");
    const onRejection = () => report("unhandled-rejection");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const pathname = window.location.pathname;
  const routePath = basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))
    ? pathname.slice(basePath.length) || "/"
    : pathname;
  const normalizedRoute = routePath.replace(/\/+$/, "") || "/";
  if (normalizedRoute === "/privacy") return <PrivacyPage />;
  if (normalizedRoute === "/delete-account") return <DeleteAccountPage />;

  if (ageChoice !== "adult") {
    return (
      <AgeGate
        blocked={ageChoice === "underage"}
        onChoice={(choice) => {
          try {
            writeAgeGateChoice(window.localStorage, choice);
          } catch {
            // The choice still blocks or unlocks the current page session.
          }
          setAgeChoice(choice);
        }}
      />
    );
  }

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
