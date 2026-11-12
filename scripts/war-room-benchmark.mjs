import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.WAR_ROOM_BENCHMARK_BASE_URL
  ?? (process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://127.0.0.1:5000");
const executablePath = process.env.CHROMIUM_PATH ?? "/repl/tools/bin/chromium";
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--use-gl=angle",
    "--use-angle=swiftshader",
  ],
});
const context = await browser.newContext({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  await page.goto(`${baseUrl}/?benchmark=1`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.locator('.war-room[data-benchmark-status="running"]').waitFor({ timeout: 120_000 });
  await page.locator('.war-room[data-benchmark-status="complete"]').waitFor({ timeout: 180_000 });
  const raw = await page.getByTestId("war-room-benchmark-report").innerText();
  const report = JSON.parse(raw);
  assert.equal(report.privacy, "local-only");
  assert.ok(report.sampleCount > 0, "Benchmark completed without frame samples.");
  assert.deepEqual(pageErrors, [], `Browser errors:\n${pageErrors.join("\n")}`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await page.close().catch(() => {});
  await browser.close();
}
