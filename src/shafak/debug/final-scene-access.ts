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
