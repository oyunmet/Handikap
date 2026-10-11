export type WorldDiagnostic = {
  at: string;
  category: string;
  message: string;
};

export function appendWorldDiagnostic(
  current: readonly WorldDiagnostic[],
  next: WorldDiagnostic,
  limit = 20,
) {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 20;
  return [...current, next].slice(-safeLimit);
}

export function formatWorldDiagnostics(events: readonly WorldDiagnostic[]) {
  return events.map(({ at, category, message }) => `[${at}] ${category}: ${message}`).join("\n");
}

export function emitWorldDiagnostic(category: string, message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("shafak:world-diagnostic", {
    detail: {
      at: new Date().toLocaleTimeString("tr-TR", { hour12: false }),
      category,
      message: message.slice(0, 2_000),
    } satisfies WorldDiagnostic,
  }));
}
