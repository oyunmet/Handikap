export type FinalSceneDebugRequest = {
  forceFallback: boolean;
};

const PLAY_STORE_TWA_REFERRER = "android-app://com.safaksavascilari.game";

export function isPlayStoreTwaReferrer(referrer: string): boolean {
  return referrer === PLAY_STORE_TWA_REFERRER
    || referrer.startsWith(`${PLAY_STORE_TWA_REFERRER}/`);
}

export function resolveFinalSceneDebugRequest(
  search: string,
  referrer = "",
): FinalSceneDebugRequest | null {
  if (isPlayStoreTwaReferrer(referrer)) return null;

  const query = new URLSearchParams(search);
  if (query.get("debug") !== "final") return null;

  return { forceFallback: query.get("fallback") === "1" };
}

export function isStartupErrorDiagnosticRequest(
  search: string,
  referrer = "",
): boolean {
  if (isPlayStoreTwaReferrer(referrer)) return false;
  return new URLSearchParams(search).get("debug") === "diagnostics";
}

export function wasStartupErrorDiagnosticRequested(
  initialSearch: string,
  currentSearch: string,
  referrer = "",
): boolean {
  return isStartupErrorDiagnosticRequest(initialSearch, referrer)
    || isStartupErrorDiagnosticRequest(currentSearch, referrer);
}

export function formatStartupErrorDiagnostic(error: unknown, componentStack = ""): string {
  const message = error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
  const javascriptStack = error instanceof Error && componentStack
    ? (error.stack ?? "")
      .split(/\r?\n/)
      .slice(1, 5)
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" > ")
    : "";
  const componentPath = componentStack
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(" > ");
  const diagnostic = [message, javascriptStack, componentPath].filter(Boolean).join(" | ");

  return diagnostic
    .replace(/\b(?:pk|sk)_(?:live|test)_[A-Za-z0-9_-]+\b/gi, "[key redacted]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b(token|secret|password|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/\s+/g, " ")
    .slice(0, componentStack ? 1_100 : 320);
}
