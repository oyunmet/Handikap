import express from "express";

export type AdsProvider = "none" | "h5games" | "admob-native";

export interface PublicAdsConfig {
  ads_enabled: boolean;
  provider: AdsProvider;
  consent_required: true;
  adsense_client_id?: string;
}

type AdsEnvironment = Readonly<Record<string, string | undefined>>;

function isEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "1" || value?.trim().toLowerCase() === "true";
}

function isValidAdsenseClientId(value: string | undefined): value is string {
  return Boolean(value && /^ca-pub-\d+$/.test(value.trim()));
}

export function getPublicAdsConfig(
  environment: AdsEnvironment = process.env,
): PublicAdsConfig {
  if (!isEnabled(environment.ADS_ENABLED)) {
    return { ads_enabled: false, provider: "none", consent_required: true };
  }

  const configuredProvider = environment.ADS_PROVIDER?.trim().toLowerCase();
  if (configuredProvider === "h5games") {
    const clientId = environment.ADSENSE_CLIENT_ID?.trim();
    if (!isValidAdsenseClientId(clientId)) {
      return { ads_enabled: false, provider: "none", consent_required: true };
    }
    return {
      ads_enabled: true,
      provider: "h5games",
      consent_required: true,
      adsense_client_id: clientId,
    };
  }

  if (configuredProvider === "admob-native") {
    return {
      ads_enabled: true,
      provider: "admob-native",
      consent_required: true,
    };
  }

  return { ads_enabled: false, provider: "none", consent_required: true };
}

export function createAdsConfigApi(environment: AdsEnvironment = process.env) {
  const router = express.Router();

  router.get("/api/ads/config", (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.json(getPublicAdsConfig(environment));
  });

  return router;
}
