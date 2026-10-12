export type WorldDiagnostic = {
  at: string;
  category: string;
  message: string;
  playerState?: string;
  travelPercent?: number;
};

export type WorldDiagnosticContext = {
  playerState: string;
  travelPercent: number;
};

const MAX_DIAGNOSTIC_MESSAGE_LENGTH = 8_000;
let readContext: (() => WorldDiagnosticContext) | null = null;

export function setWorldDiagnosticContext(
  provider: (() => WorldDiagnosticContext) | null,
) {
  readContext = provider;
  return () => {
    if (readContext === provider) readContext = null;
  };
}

export function appendWorldDiagnostic(
  current: readonly WorldDiagnostic[],
  next: WorldDiagnostic,
  limit = 200,
) {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 200;
  return [...current, next].slice(-safeLimit);
}

export function appendWorldDiagnostics(
  current: readonly WorldDiagnostic[],
  additions: readonly WorldDiagnostic[],
  limit = 200,
) {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 200;
  if (additions.length === 0) return [...current];
  return [...current, ...additions.slice(-safeLimit)].slice(-safeLimit);
}

export function formatWorldDiagnostics(events: readonly WorldDiagnostic[]) {
  return events.map(({ at, category, message, playerState, travelPercent }) => {
    const context = [
      playerState ? `durum=${playerState}` : "",
      Number.isFinite(travelPercent) ? `yol=${travelPercent?.toFixed(1)}%` : "",
    ].filter(Boolean).join(" ");
    return `[${at}]${context ? ` [${context}]` : ""} ${category}: ${message}`;
  }).join("\n");
}

export function emitWorldDiagnostic(category: string, message: string) {
  if (typeof window === "undefined") return;
  let context: WorldDiagnosticContext | undefined;
  try {
    context = readContext?.();
  } catch {
    context = undefined;
  }
  window.dispatchEvent(new CustomEvent("shafak:world-diagnostic", {
    detail: {
      at: new Date().toISOString(),
      category,
      message: message.slice(0, MAX_DIAGNOSTIC_MESSAGE_LENGTH),
      ...context,
    } satisfies WorldDiagnostic,
  }));
}
