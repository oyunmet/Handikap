import React from "react";
import { createRoot } from "react-dom/client";
import AuthEntry from "./shafak/auth/EnvironmentRouter.tsx";
import "./shafak/tokens.css";
import "./shafak/App.css";

class StartupErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[shafak-startup] The application could not render.", error, info.componentStack);
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

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <StartupErrorBoundary>
      <AuthEntry />
    </StartupErrorBoundary>
  </React.StrictMode>,
);
