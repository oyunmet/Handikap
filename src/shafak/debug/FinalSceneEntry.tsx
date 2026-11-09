import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import type { FinalSceneDebugRequest } from "./final-scene-access.ts";

const CampaignEnding = lazy(() => import("../world/CampaignEnding"));

type FinalSceneEntryProps = {
  request: FinalSceneDebugRequest;
  normalGame: ReactNode;
};

function LoadingStatus() {
  return (
    <main className="entry-loading" role="status" aria-busy="true">
      Final sahne test anahtarı kontrol ediliyor…
    </main>
  );
}

export default function FinalSceneEntry({
  request,
  normalGame,
}: FinalSceneEntryProps) {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/debug-tools/status", {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return false;
      const payload = await response.json() as { enabled?: unknown };
      return payload.enabled === true;
    }).then(setEnabled).catch(() => {
      setEnabled(false);
    });

    return () => controller.abort();
  }, []);

  if (enabled === null) return <LoadingStatus />;
  if (!enabled) return normalGame;

  const closePreview = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("debug");
    url.searchParams.delete("fallback");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    setEnabled(false);
  };

  return (
    <Suspense fallback={<LoadingStatus />}>
      <CampaignEnding
        rewards={null}
        previewMode
        forceFallback={request.forceFallback}
        onStartNewGamePlus={async () => undefined}
        onMainMenu={closePreview}
      />
    </Suspense>
  );
}
