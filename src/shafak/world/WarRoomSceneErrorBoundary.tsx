import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  onRetry: () => void;
  onError: () => void;
};

type State = { error: Error | null };

export default class WarRoomSceneErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[war-room] 3D scene failed to render.", error, info.componentStack);
    }
    this.props.onError();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <section
        role="alert"
        aria-live="assertive"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 30,
          display: "grid",
          alignContent: "center",
          justifyItems: "center",
          gap: 12,
          padding: 24,
          background: "rgba(7, 10, 16, 0.96)",
          color: "#f4ead7",
          textAlign: "center",
          font: "600 14px/1.5 Manrope, sans-serif",
        }}
      >
        <strong style={{ font: "700 20px/1.3 Cinzel, Georgia, serif" }}>
          3D savaş alanı başlatılamadı
        </strong>
        <span>WebGL sahnesini yeniden başlatıp tekrar deneyebilirsin.</span>
        <small style={{ maxWidth: "min(720px, 90vw)", overflowWrap: "anywhere", opacity: 0.72 }}>
          {error.message}
        </small>
        <button
          type="button"
          onClick={this.props.onRetry}
          style={{
            minHeight: 44,
            padding: "0 20px",
            border: "1px solid rgba(212, 177, 111, .65)",
            borderRadius: 7,
            background: "linear-gradient(120deg, #f0d08a, #ba7b36)",
            color: "#1b1711",
            fontWeight: 800,
          }}
        >
          3D sahneyi yeniden başlat
        </button>
      </section>
    );
  }
}
