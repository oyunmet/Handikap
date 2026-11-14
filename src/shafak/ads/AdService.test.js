import assert from "node:assert/strict";
import test from "node:test";
import { createAdService } from "./AdService.ts";

function createStorage(initialValue = null) {
  const values = new Map();
  if (initialValue !== null) values.set("safak-ads-consent-v1", initialValue);
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("unknown or denied consent prevents config requests and third-party loading", async () => {
  let configRequests = 0;
  let scriptLoads = 0;
  const storage = createStorage();
  const service = createAdService({
    storage,
    fetchConfig: async () => {
      configRequests += 1;
      return {
        ads_enabled: true,
        provider: "h5games",
        consent_required: true,
        adsense_client_id: "ca-pub-123456789",
      };
    },
    loadH5GamesApi: async () => {
      scriptLoads += 1;
      return null;
    },
  });

  assert.equal(service.getConsent(), "unknown");
  assert.equal(await service.init(), false);
  assert.equal(await service.showRewarded("daily-bonus"), false);
  assert.equal(await service.showInterstitial("between-rounds"), false);
  service.setConsent("denied");
  assert.equal(storage.values.get("safak-ads-consent-v1"), "denied");
  assert.equal(await service.init(), false);
  assert.equal(configRequests, 0);
  assert.equal(scriptLoads, 0);
});

test("server kill switch and provider none prevent SDK loading", async () => {
  let scriptLoads = 0;
  const service = createAdService({
    storage: createStorage(),
    fetchConfig: async () => ({
      ads_enabled: false,
      provider: "none",
      consent_required: true,
    }),
    loadH5GamesApi: async () => {
      scriptLoads += 1;
      return null;
    },
  });

  service.setConsent("granted");
  assert.equal(await service.init(), false);
  assert.equal(service.isReady(), false);
  assert.equal(scriptLoads, 0);
});

test("server kill switch is rechecked before each ad placement", async () => {
  let enabled = true;
  let placements = 0;
  const service = createAdService({
    storage: createStorage(),
    fetchConfig: async () => ({
      ads_enabled: enabled,
      provider: enabled ? "h5games" : "none",
      consent_required: true,
      ...(enabled ? { adsense_client_id: "ca-pub-123456789" } : {}),
    }),
    loadH5GamesApi: async () => ({
      adConfig: () => undefined,
      adBreak: () => {
        placements += 1;
      },
    }),
  });

  service.setConsent("granted");
  assert.equal(await service.init(), true);
  assert.equal(service.isReady(), true);
  enabled = false;
  assert.equal(await service.showInterstitial("between-rounds"), false);
  assert.equal(service.isReady(), false);
  assert.equal(placements, 0);
});

test("AdMob native is passive and does not load a web SDK", async () => {
  let scriptLoads = 0;
  const service = createAdService({
    storage: createStorage(),
    fetchConfig: async () => ({
      ads_enabled: true,
      provider: "admob-native",
      consent_required: true,
    }),
    loadH5GamesApi: async () => {
      scriptLoads += 1;
      return null;
    },
  });

  service.setConsent("granted");
  assert.equal(await service.init(), false);
  assert.equal(service.isReady(), false);
  assert.equal(scriptLoads, 0);
});

test("H5 Games initializes only after consent and emits close results", async () => {
  let configRequests = 0;
  let loadedClientId = "";
  let configOptions;
  const placements = [];
  const service = createAdService({
    storage: createStorage(),
    fetchConfig: async () => {
      configRequests += 1;
      return {
        ads_enabled: true,
        provider: "h5games",
        consent_required: true,
        adsense_client_id: "ca-pub-123456789",
      };
    },
    loadH5GamesApi: async (clientId) => {
      loadedClientId = clientId;
      return {
        adConfig: (options) => {
          configOptions = options;
        },
        adBreak: (options) => {
          placements.push(options);
          if (options.type === "reward") {
            options.beforeReward?.((() => undefined));
            options.adViewed?.();
            options.adBreakDone?.({
              breakType: "reward",
              breakName: options.name,
              breakStatus: "viewed",
            });
          } else {
            options.beforeAd?.();
            options.afterAd?.();
            options.adBreakDone?.({
              breakType: "next",
              breakName: options.name,
              breakStatus: "noAdPreloaded",
            });
          }
        },
      };
    },
  });
  const closed = [];
  service.onClose((event) => closed.push(event));

  assert.equal(await service.init(), false);
  assert.equal(configRequests, 0);
  service.setConsent("granted");
  assert.equal(await service.init(), true);
  assert.equal(service.isReady(), true);
  assert.equal(configRequests, 1);
  assert.equal(loadedClientId, "ca-pub-123456789");
  assert.deepEqual(configOptions, { sound: "off" });

  assert.equal(await service.showRewarded("daily-bonus"), true);
  assert.equal(placements[0].type, "reward");
  assert.equal(placements[0].name, "daily-bonus");
  assert.equal(await service.showInterstitial("between-rounds"), true);
  assert.equal(placements[1].type, "next");
  assert.equal(placements[1].name, "between-rounds");
  assert.deepEqual(closed, [
    {
      placement: "daily-bonus",
      format: "rewarded",
      status: "viewed",
      shown: false,
      viewed: true,
    },
    {
      placement: "between-rounds",
      format: "interstitial",
      status: "noAdPreloaded",
      shown: true,
      viewed: false,
    },
  ]);
});

