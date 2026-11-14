import type { AdsProvider } from "../../../server/adsConfigApi";
import { createH5GamesProvider } from "./h5GamesProvider";

export type AdsConsent = "unknown" | "granted" | "denied";
export type AdBreakType = "next" | "reward";

export interface AdsRuntimeConfig {
  ads_enabled: boolean;
  provider: AdsProvider;
  consent_required: true;
  adsense_client_id?: string;
}

export interface AdPlacementInfo {
  breakType?: string;
  breakName?: string;
  breakFormat?: string;
  breakStatus?: string;
}

export interface AdBreakOptions {
  type: AdBreakType;
  name: string;
  beforeAd?: () => void;
  afterAd?: () => void;
  beforeReward?: (showAd: () => void) => void;
  adDismissed?: () => void;
  adViewed?: () => void;
  adBreakDone?: (placementInfo: AdPlacementInfo) => void;
}

export interface AdPlacementApi {
  adBreak(options: AdBreakOptions): void;
  adConfig(options: { sound?: "on" | "off" }): void;
}

export interface AdCloseEvent {
  placement: string;
  format: "interstitial" | "rewarded";
  status: string;
  shown: boolean;
  viewed: boolean;
}

export interface AdService {
  init(): Promise<boolean>;
  getConsent(): AdsConsent;
  setConsent(consent: AdsConsent): void;
  getPersonalizedAdsConsent(): boolean;
  setPersonalizedAdsConsent(consent: boolean): void;
  showRewarded(placement: string): Promise<boolean>;
  showInterstitial(placement: string): Promise<boolean>;
  isReady(): boolean;
  onClose(listener: (event: AdCloseEvent) => void): () => void;
}

interface ConsentStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ProviderResult {
  status: string;
  shown: boolean;
  viewed: boolean;
}

export interface H5GamesProvider {
  init(): Promise<boolean>;
  isReady(): boolean;
  showRewarded(placement: string): Promise<ProviderResult>;
  showInterstitial(placement: string): Promise<ProviderResult>;
}

export interface AdServiceOptions {
  buildProvider?: "none" | "h5games" | "admob-native";
  fetchConfig?: () => Promise<AdsRuntimeConfig>;
  storage?: ConsentStorage | null;
  loadH5GamesApi?: (clientId: string) => Promise<AdPlacementApi | null>;
  onBeforeAd?: (placement: string, format: AdCloseEvent["format"]) => void;
  onAfterAd?: (placement: string, format: AdCloseEvent["format"]) => void;
}

const CONSENT_STORAGE_KEY = "safak-ads-consent-v1";
const PERSONALIZED_ADS_STORAGE_KEY = "safak-personalized-ads-consent-v1";

function getBuildProvider(): "none" | "h5games" | "admob-native" {
  const configured = import.meta.env?.VITE_ADS_PROVIDER?.trim().toLowerCase();
  if (configured === "h5games") return "h5games";
  if (configured === "admob" || configured === "admob-native") return "admob-native";
  return "none";
}

function getBrowserStorage(): ConsentStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseConsent(value: string | null | undefined): AdsConsent {
  return value === "granted" || value === "denied" ? value : "unknown";
}

async function fetchPublicAdsConfig(): Promise<AdsRuntimeConfig> {
  const response = await fetch("/api/ads/config", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Ads configuration is unavailable.");
  return response.json() as Promise<AdsRuntimeConfig>;
}

export function createAdService(options: AdServiceOptions = {}): AdService {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const buildProvider = options.buildProvider ?? getBuildProvider();
  let consent: AdsConsent = "unknown";
  try {
    consent = parseConsent(storage?.getItem(CONSENT_STORAGE_KEY));
  } catch {
    consent = "unknown";
  }

  const listeners = new Set<(event: AdCloseEvent) => void>();
  let provider: H5GamesProvider | null = null;
  let providerConfigKey: string | null = null;
  let initPromise: Promise<boolean> | null = null;
  const requestConfig = options.fetchConfig ?? fetchPublicAdsConfig;

  const notifyClose = (event: AdCloseEvent) => {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        console.warn("[ads] A close listener failed.");
      }
    }
  };

  const initialize = async (): Promise<boolean> => {
    if (buildProvider === "none" || buildProvider === "admob-native") return false;
    if (consent !== "granted") {
      provider = null;
      providerConfigKey = null;
      return false;
    }

    initPromise ??= (async () => {
      let config: AdsRuntimeConfig;
      try {
        config = await requestConfig();
      } catch {
        provider = null;
        providerConfigKey = null;
        console.warn("[ads] Configuration unavailable; ads remain disabled.");
        return false;
      }

      if (consent !== "granted") return false;
      if (
        !config.ads_enabled ||
        config.consent_required !== true ||
        config.provider !== buildProvider ||
        !config.adsense_client_id ||
        !/^ca-pub-\d+$/.test(config.adsense_client_id)
      ) {
        // AdMob remains passive until its native wrapper is implemented.
        provider = null;
        providerConfigKey = null;
        return false;
      }

      const configKey = `${config.provider}:${config.adsense_client_id}`;
      if (provider?.isReady() && providerConfigKey === configKey) return true;

      const candidate = createH5GamesProvider(config.adsense_client_id, options);
      let initialized = false;
      try {
        initialized = await candidate.init();
      } catch {
        console.warn("[ads] H5 Games SDK failed to initialize.");
      }
      if (!initialized || consent !== "granted") {
        provider = null;
        providerConfigKey = null;
        return false;
      }
      provider = candidate;
      providerConfigKey = configKey;
      return true;
    })();

    try {
      return await initPromise;
    } finally {
      initPromise = null;
    }
  };

  const runPlacement = async (
    placement: string,
    format: AdCloseEvent["format"],
  ): Promise<boolean> => {
    if (!(await initialize()) || !provider?.isReady()) return false;
    const result =
      format === "rewarded"
        ? await provider.showRewarded(placement)
        : await provider.showInterstitial(placement);
    notifyClose({ placement, format, ...result });
    return format === "rewarded" ? result.viewed : result.shown;
  };

  return {
    init: initialize,
    getConsent: () => consent,
    setConsent(nextConsent) {
      consent = nextConsent;
      try {
        if (nextConsent === "unknown") storage?.removeItem(CONSENT_STORAGE_KEY);
        else storage?.setItem(CONSENT_STORAGE_KEY, nextConsent);
      } catch {
        // Consent remains in memory for this session if browser storage is blocked.
      }
      if (nextConsent !== "granted") {
        provider = null;
        providerConfigKey = null;
      }
    },
    getPersonalizedAdsConsent() {
      try {
        return storage?.getItem(PERSONALIZED_ADS_STORAGE_KEY) === "granted";
      } catch {
        return false;
      }
    },
    setPersonalizedAdsConsent(nextConsent) {
      try {
        storage?.setItem(PERSONALIZED_ADS_STORAGE_KEY, nextConsent ? "granted" : "denied");
      } catch {
        // The preference remains in memory only when browser storage is unavailable.
      }
    },
    showRewarded: (placement) => runPlacement(placement, "rewarded"),
    showInterstitial: (placement) => runPlacement(placement, "interstitial"),
    isReady: () => consent === "granted" && (provider?.isReady() ?? false),
    onClose(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const adService = createAdService({
  onBeforeAd: () => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("shafak:ad-start"));
  },
  onAfterAd: () => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("shafak:ad-end"));
  },
});

