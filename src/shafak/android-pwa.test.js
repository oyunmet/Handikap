import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const publicDirectory = join(process.cwd(), "public");

test("PWA manifest has installable Turkish TWA metadata and local icons", () => {
  const manifest = JSON.parse(
    readFileSync(join(publicDirectory, "manifest.webmanifest"), "utf8"),
  );

  assert.equal(manifest.id, "/");
  assert.equal(manifest.name, "Şafak Savaşçıları");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
  assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));

  for (const icon of manifest.icons) {
    assert.ok(existsSync(join(publicDirectory, icon.src.slice(1))), `${icon.src} exists`);
  }
});

test("offline service worker leaves game APIs network-only", () => {
  const serviceWorker = readFileSync(join(publicDirectory, "sw.js"), "utf8");
  assert.match(serviceWorker, /request\.method !== "GET"/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/socket\.io"\)/);
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
