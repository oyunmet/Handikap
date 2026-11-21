import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const publicDirectory = join(process.cwd(), "public");

test("PWA manifest has installable Turkish TWA metadata and local icons", () => {
  const manifest = JSON.parse(
    readFileSync(join(publicDirectory, "manifest.webmanifest"), "utf8"),
  );

  assert.equal(manifest.id, "/");
  assert.equal(manifest.name, "Sunvoria");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
  assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));

  for (const icon of manifest.icons) {
    assert.ok(existsSync(join(publicDirectory, icon.src.slice(1))), `${icon.src} exists`);
  }

  const assetLinks = JSON.parse(
    readFileSync(join(publicDirectory, ".well-known/assetlinks.json"), "utf8"),
  );
  assert.equal(assetLinks[0]?.target?.namespace, "android_app");
  assert.equal(assetLinks[0]?.target?.package_name, "com.safaksavascilari.game");
  const fingerprints = assetLinks[0]?.target?.sha256_cert_fingerprints;
  assert.ok(Array.isArray(fingerprints));
  assert.equal(fingerprints.length, 2);
  const isSha256Fingerprint = (value) =>
    typeof value === "string" && /^([a-f\d]{2}:){31}[a-f\d]{2}$/i.test(value);
  assert.ok(
    fingerprints[0] === "REPLACE_WITH_DEBUG_SHA256_CERT_FINGERPRINT" ||
      isSha256Fingerprint(fingerprints[0]),
    "debug signing fingerprint is present or explicitly marked for setup",
  );
  assert.ok(
    fingerprints[1] === "REPLACE_WITH_PLAY_APP_SIGNING_SHA256_CERT_FINGERPRINT" ||
      isSha256Fingerprint(fingerprints[1]),
    "Play App Signing fingerprint is present or explicitly marked for setup",
  );
});

test("privacy and account deletion pages are public and linked from settings", () => {
  const router = readFileSync(join(process.cwd(), "src/shafak/auth/EnvironmentRouter.tsx"), "utf8");
  const pages = readFileSync(join(process.cwd(), "src/shafak/LegalPages.tsx"), "utf8");
  const app = readFileSync(join(process.cwd(), "src/shafak/App.tsx"), "utf8");

  assert.match(router, /normalizedRoute === "\/privacy"/);
  assert.match(router, /normalizedRoute === "\/delete-account"/);
  assert.match(pages, /\/api\/profile\/account/);
  assert.match(pages, /clearLocalProfileCopies\(\)/);
  assert.match(app, /\/privacy/);
  assert.match(app, /\/delete-account/);
});

test("Android Play version follows package version and the home screen shows its build marker", () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
  const buildInfo = readFileSync(join(process.cwd(), "src/shafak/build-info.ts"), "utf8");
  const app = readFileSync(join(process.cwd(), "src/shafak/App.tsx"), "utf8");
  const androidBuild = readFileSync(join(process.cwd(), "android/app/build.gradle"), "utf8");

  assert.match(packageJson.version, /^\d+\.\d+\.\d+$/);
  assert.match(androidBuild, /versionName appPackage\.version/);
  assert.match(buildInfo, /GAME_BUILD_MARKER = "[^"]+"/);
  assert.match(app, /\{GAME_BUILD_MARKER\}/);
});

test("large art and the interface chime use compressed formats", () => {
  const compressedAssets = [
    ["shafak-warrior.webp", "shafak-warrior.png", 250_000],
    ["shafak-environment.webp", "shafak-environment.png", 200_000],
    ["images/gece-nobetcisi.webp", "images/gece-nobetcisi.png", 250_000],
    ["shafak-ui-chime.ogg", "shafak-ui-chime.wav", 12_000],
  ];
  for (const [current, legacy, sizeLimit] of compressedAssets) {
    const currentPath = join(publicDirectory, current);
    assert.ok(existsSync(currentPath), `${current} exists`);
    assert.ok(statSync(currentPath).size < sizeLimit, `${current} stays compact`);
    assert.equal(existsSync(join(publicDirectory, legacy)), false, `${legacy} is unused`);
  }
});

test("offline service worker leaves game APIs network-only without obsolete socket routes", () => {
  const serviceWorker = readFileSync(join(publicDirectory, "sw.js"), "utf8");
  assert.match(serviceWorker, /request\.method !== "GET"/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.equal(serviceWorker.includes("/socket.io"), false);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.ok(existsSync(join(publicDirectory, "offline.html")));
});

test("Android wrapper keeps the chosen Play identity and current target API", () => {
  const androidBuild = readFileSync(
    join(process.cwd(), "android/app/build.gradle"),
    "utf8",
  );
  const androidManifest = readFileSync(
    join(process.cwd(), "android/app/src/main/AndroidManifest.xml"),
    "utf8",
  );

  assert.match(androidBuild, /applicationId "com\.safaksavascilari\.game"/);
  assert.match(androidBuild, /compileSdk 36/);
  assert.match(androidBuild, /targetSdk 36/);
  assert.match(androidBuild, /androidbrowserhelper:androidbrowserhelper:2\.7\.4/);
  assert.match(androidManifest, /https:\/\/handikap\.vercel\.app\//);
  assert.match(androidManifest, /android:autoVerify="true"/);
});
