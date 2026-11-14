import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import test from "node:test";
import {
  createAdsConfigApi,
  getPublicAdsConfig,
} from "./adsConfigApi.ts";

test("ads stay disabled and provider-free unless the server enables them", () => {
  assert.deepEqual(
    getPublicAdsConfig({
      ADS_PROVIDER: "h5games",
      ADSENSE_CLIENT_ID: "ca-pub-123456789",
    }),
    { ads_enabled: false, provider: "none", consent_required: true },
  );
});

test("H5 Games requires an enabled server flag and a valid publisher ID", () => {
  const enabled = getPublicAdsConfig({
    ADS_ENABLED: "true",
    ADS_CONSENT_CMP_READY: "true",
    ADS_REWARD_VERIFICATION_READY: "true",
    ADS_PROVIDER: "h5games",
    ADSENSE_CLIENT_ID: "ca-pub-123456789",
  });
  const missingClientId = getPublicAdsConfig({
    ADS_ENABLED: "1",
    ADS_CONSENT_CMP_READY: "true",
    ADS_REWARD_VERIFICATION_READY: "true",
    ADS_PROVIDER: "h5games",
    ADSENSE_CLIENT_ID: "not-a-publisher-id",
  });

  assert.deepEqual(enabled, {
    ads_enabled: true,
    provider: "h5games",
    consent_required: true,
    adsense_client_id: "ca-pub-123456789",
  });
  assert.deepEqual(missingClientId, {
    ads_enabled: false,
    provider: "none",
    consent_required: true,
  });
});

test("AdMob remains disabled until a native SDK and signed reward verifier exist", () => {
  assert.deepEqual(
    getPublicAdsConfig({
      ADS_ENABLED: "1",
      ADS_PROVIDER: "admob-native",
      ADMOB_APP_ID: "ca-app-pub-example",
    }),
    {
      ads_enabled: false,
      provider: "none",
      consent_required: true,
    },
  );
});

test("ads config is public, uncached, and contains only the configured provider data", async (t) => {
  const app = express();
  app.use(
    createAdsConfigApi({
      ADS_ENABLED: "1",
    ADS_CONSENT_CMP_READY: "1",
    ADS_REWARD_VERIFICATION_READY: "1",
      ADS_PROVIDER: "h5games",
      ADSENSE_CLIENT_ID: "ca-pub-123456789",
      ADMOB_APP_ID: "must-not-be-returned",
    }),
  );
  const server = createServer(app);

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const response = await fetch(`http://127.0.0.1:${address.port}/api/ads/config`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    ads_enabled: true,
    provider: "h5games",
    consent_required: true,
    adsense_client_id: "ca-pub-123456789",
  });
});
