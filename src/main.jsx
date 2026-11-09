import React from "react";
import { createRoot } from "react-dom/client";
import AuthEntry from "./shafak/auth/EnvironmentRouter.tsx";
import {
  formatStartupErrorDiagnostic,
  isStartupErrorDiagnosticRequest,
  resolveFinalSceneDebugRequest,
} from "./shafak/debug/final-scene-access.ts";
import "./shafak/tokens.css";
import "./shafak/App.css";

const FinalSceneEntry = React.lazy(() => import("./shafak/debug/FinalSceneEntry.tsx"));

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[shafak-pwa] Service worker registration failed.", error);
    });
  });
}

class StartupErrorBoundary extends React.Component {
  state = { error: null, diagnosticsEnabled: false };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[shafak-startup] The application could not render.", error, info.componentStack);

    if (!isStartupErrorDiagnosticRequest(window.location.search, document.referrer)) return;

    fetch("/api/debug-tools/status", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : null)
      .then((status) => {
        if (status?.enabled === true) this.setState({ diagnosticsEnabled: true });
      })
      .catch(() => {});
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main
        role="alert"
        style={{
          display: "grid",
          minHeight: "100dvh",
          placeContent: "center",
          gap: "12px",
          padding: "24px",
          background: "#080a10",
          color: "#f4ead7",
          font: "14px/1.6 Manrope, sans-serif",
          textAlign: "center",
        }}
      >
        <strong style={{ font: "600 22px/1.3 Cinzel, Georgia, serif" }}>
          Oyun başlatılamadı
        </strong>
        <span>Sayfayı yeniden yükleyip tekrar deneyebilirsin.</span>
        {import.meta.env.DEV && (
          <code style={{ maxWidth: "min(720px, 90vw)", color: "#e6b2a5", overflowWrap: "anywhere" }}>
            {this.state.error?.message ?? String(this.state.error)}
          </code>
        )}
        {this.state.diagnosticsEnabled && (
          <code style={{ maxWidth: "min(720px, 90vw)", color: "#e6b2a5", overflowWrap: "anywhere" }}>
            {formatStartupErrorDiagnostic(this.state.error)}
          </code>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            justifySelf: "center",
            minHeight: "44px",
            padding: "0 20px",
            border: "1px solid rgba(212, 177, 111, .65)",
            borderRadius: "7px",
            background: "linear-gradient(120deg, #f0d08a, #ba7b36)",
            color: "#1b1711",
            fontWeight: 800,
          }}
        >
          Yeniden yükle
        </button>
      </main>
    );
  }
}

function ApplicationEntry() {
  const [debugRequest] = React.useState(() =>
    resolveFinalSceneDebugRequest(window.location.search, document.referrer),
  );

  if (!debugRequest) return <AuthEntry />;

  return (
    <React.Suspense
      fallback={
        <main className="entry-loading" role="status" aria-busy="true">
          Şafak Savaşçıları hazırlanıyor…
        </main>
      }
    >
      <FinalSceneEntry request={debugRequest} normalGame={<AuthEntry />} />
    </React.Suspense>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <StartupErrorBoundary>
      <ApplicationEntry />
    </StartupErrorBoundary>
  </React.StrictMode>,
);
