import type {
  AdBreakOptions,
  AdBreakType,
  AdCloseEvent,
  AdPlacementApi,
  AdPlacementInfo,
  AdServiceOptions,
  H5GamesProvider,
  ProviderResult,
} from "./AdService.ts";

interface AdPlacementWindow extends Window {
  adsbygoogle?: Array<AdBreakOptions | { sound?: "on" | "off" }>;
  adBreak?: (options: AdBreakOptions) => void;
  adConfig?: (options: { sound?: "on" | "off" }) => void;
}

const AD_BREAK_TIMEOUT_MS = 30_000;

async function loadH5GamesApi(clientId: string): Promise<AdPlacementApi | null> {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  if (!/^ca-pub-\d+$/.test(clientId)) return null;

  const browserWindow = window as AdPlacementWindow;
  const queue = (browserWindow.adsbygoogle ??= []);
  const enqueue = (options: AdBreakOptions | { sound?: "on" | "off" }) => {
    queue.push(options);
  };
  browserWindow.adBreak ??= enqueue as (options: AdBreakOptions) => void;
  browserWindow.adConfig ??= enqueue as (options: { sound?: "on" | "off" }) => void;

  let script = document.querySelector<HTMLScriptElement>(
    'script[data-safak-ads-sdk="h5games"]',
  );
  if (script?.dataset.safakAdsState === "error") return null;
  if (script?.dataset.safakAdsState === "loaded") {
    return {
      adBreak: (options) => browserWindow.adBreak?.(options),
      adConfig: (options) => browserWindow.adConfig?.(options),
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (loaded: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      if (script) script.dataset.safakAdsState = loaded ? "loaded" : "error";
      resolve(
        loaded
          ? {
              adBreak: (options) => browserWindow.adBreak?.(options),
              adConfig: (options) => browserWindow.adConfig?.(options),
            }
          : null,
      );
    };
    const timeoutId = window.setTimeout(() => finish(false), 10_000);
    const onLoad = () => finish(true);
    const onError = () => finish(false);

    if (!script) {
      script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.safakAdsSdk = "h5games";
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
        encodeURIComponent(clientId);
      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });
      document.head.appendChild(script);
      return;
    }

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
  });
}

export function createH5GamesProvider(
  clientId: string,
  options: AdServiceOptions,
): H5GamesProvider {
  let api: AdPlacementApi | null = null;
  let initPromise: Promise<boolean> | null = null;

  const show = (
    type: AdBreakType,
    placement: string,
    format: AdCloseEvent["format"],
  ): Promise<ProviderResult> => {
    if (!api) {
      return Promise.resolve({ status: "notReady", shown: false, viewed: false });
    }

    return new Promise((resolve) => {
      let settled = false;
      let shown = false;
      let viewed = false;
      const timeoutId = globalThis.setTimeout(() => {
        finish({ breakStatus: "timeout" });
      }, AD_BREAK_TIMEOUT_MS);
      const finish = (info: AdPlacementInfo = {}) => {
        if (settled) return;
        settled = true;
        globalThis.clearTimeout(timeoutId);
        resolve({
          status: info.breakStatus ?? "unknown",
          shown,
          viewed: viewed || info.breakStatus === "viewed",
        });
      };
      const runHook = (
        callback: ((placement: string, format: AdCloseEvent["format"]) => void) | undefined,
      ) => {
        try {
          callback?.(placement, format);
        } catch {
          console.warn("[ads] A gameplay lifecycle callback failed.");
        }
      };

      try {
        api.adBreak({
          type,
          name: placement,
          beforeAd: () => {
            shown = true;
            runHook(options.onBeforeAd);
          },
          afterAd: () => runHook(options.onAfterAd),
          ...(type === "reward"
            ? {
                beforeReward: (showAd: () => void) => showAd(),
                adDismissed: () => {
                  viewed = false;
                },
                adViewed: () => {
                  viewed = true;
                },
              }
            : {}),
          adBreakDone: finish,
        });
      } catch {
        finish({ breakStatus: "error" });
      }
    });
  };

  return {
    async init() {
      initPromise ??= (async () => {
        const loader = options.loadH5GamesApi ?? loadH5GamesApi;
        api = await loader(clientId);
        if (!api) return false;
        api.adConfig({ sound: "off" });
        return true;
      })();
      try {
        return await initPromise;
      } finally {
        initPromise = null;
      }
    },
    isReady: () => api !== null,
    showRewarded: (placement) => show("reward", placement, "rewarded"),
    showInterstitial: (placement) => show("next", placement, "interstitial"),
  };
}
