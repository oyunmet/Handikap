import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.WAR_ROOM_RESOURCE_LEAK_BASE_URL
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
    "--enable-unsafe-swiftshader",
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

const statsLocator = page.getByTestId("war-room-resource-leak-stats");
const readStats = async () => statsLocator.evaluate((element) => ({
  sequence: Number(element.getAttribute("data-sequence")),
  generation: Number(element.getAttribute("data-generation")),
  geometries: Number(element.getAttribute("data-geometries")),
  textures: Number(element.getAttribute("data-textures")),
  materials: Number(element.getAttribute("data-materials")),
}));

async function waitForSample(generation, afterSequence) {
  await page.waitForFunction(
    ({ expectedGeneration, previousSequence }) => {
      const element = document.querySelector('[data-testid="war-room-resource-leak-stats"]');
      return element
        && Number(element.getAttribute("data-generation")) === expectedGeneration
        && Number(element.getAttribute("data-sequence")) > previousSequence;
    },
    { expectedGeneration: generation, previousSequence: afterSequence },
    { timeout: 120_000 },
  );
  return readStats();
}

async function waitForStableCounts(generation, afterSequence) {
  let sequence = afterSequence;
  let previousCounts = null;
  for (let sampleIndex = 0; sampleIndex < 8; sampleIndex += 1) {
    const sample = await waitForSample(generation, sequence);
    sequence = sample.sequence;
    const counts = {
      geometries: sample.geometries,
      textures: sample.textures,
      materials: sample.materials,
    };
    if (previousCounts && JSON.stringify(counts) === JSON.stringify(previousCounts)) {
      return { ...sample, counts };
    }
    previousCounts = counts;
  }
  throw new Error(`Renderer resource counts did not settle for generation ${generation}.`);
}

try {
  await page.goto(`${baseUrl}/?mod=savas&resourceLeakTest=1`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.locator('.war-room[data-resource-leak-test="true"][data-phase="battle"]')
    .waitFor({ timeout: 120_000 });
  const initialScene = await waitForStableCounts(0, 0);
  assert.ok(initialScene.geometries > 0, "The training scene did not allocate geometry.");
  assert.ok(initialScene.materials > 0, "The training scene did not allocate materials.");

  const warmupSamples = [];
  let baseline = initialScene;
  let warmupGeneration = 0;
  let unchangedWarmups = 0;
  while (warmupGeneration < 8 && unchangedWarmups < 2) {
    warmupGeneration += 1;
    await page.evaluate(() => {
      window.dispatchEvent(new Event("shafak:war-room-resource-leak-remount"));
    });
    const current = await waitForStableCounts(warmupGeneration, baseline.sequence);
    unchangedWarmups = JSON.stringify(current.counts) === JSON.stringify(baseline.counts)
      ? unchangedWarmups + 1
      : 0;
    baseline = current;
    warmupSamples.push({ generation: warmupGeneration, ...current.counts });
  }
  assert.ok(
    unchangedWarmups >= 2,
    `Renderer resources did not stabilize after ${warmupGeneration} warm-up remounts: ${JSON.stringify(warmupSamples)}`,
  );

  const samples = [];
  for (let match = 1; match <= 10; match += 1) {
    const generation = warmupGeneration + match;
    const previous = await readStats();
    await page.evaluate(() => {
      window.dispatchEvent(new Event("shafak:war-room-resource-leak-remount"));
    });
    const current = await waitForStableCounts(generation, previous.sequence);
    assert.deepEqual(
      current.counts,
      baseline.counts,
      `Renderer resource counts increased after training match ${generation}.`,
    );
    samples.push(current.counts);
  }

  assert.deepEqual(pageErrors, [], `Browser errors:\n${pageErrors.join("\n")}`);
  console.log(JSON.stringify({
    cycles: 10,
    warmupRemounts: warmupGeneration,
    mode: "same-renderer training-scene remounts",
    renderer: "SwiftShader or host WebGL",
    initialScene: initialScene.counts,
    warmupSamples,
    baseline: baseline.counts,
    final: samples.at(-1),
    samples,
    privacy: "local-only; no profile or economy writes",
  }, null, 2));
} finally {
  await page.close().catch(() => {});
  await browser.close();
}
