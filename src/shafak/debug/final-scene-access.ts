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

export function formatStartupErrorDiagnostic(error: unknown): string {
  const message = error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);

  return message
    .replace(/\b(?:pk|sk)_(?:live|test)_[A-Za-z0-9_-]+\b/gi, "[key redacted]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b(token|secret|password|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/\s+/g, " ")
    .slice(0, 320);
}
