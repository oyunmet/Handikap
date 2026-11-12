import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.WAR_ROOM_E2E_BASE_URL
  ?? (process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://127.0.0.1:5000");
const executablePath = process.env.CHROMIUM_PATH ?? "/repl/tools/bin/chromium";
const outputDir = process.env.WAR_ROOM_FINAL_SCREENSHOTS ?? "/tmp/war-room-11-9";
const viewports = [
  { width: 772, height: 330 },
  { width: 667, height: 375 },
  { width: 740, height: 360 },
  { width: 800, height: 360 },
  { width: 844, height: 390 },
  { width: 915, height: 412 },
  { width: 932, height: 430 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
];

await mkdir(outputDir, { recursive: true });
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
  viewport: viewports[0],
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});

const pageErrors = [];
const pages = [];
const createPage = async () => {
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  pages.push(page);
  return page;
};

const inspectLayout = async (page, rootSelector, screenName) => page.evaluate(
  ({ rootSelector: selector, screenName: name }) => {
    const root = document.querySelector(selector);
    if (!(root instanceof HTMLElement)) {
      throw new Error(`${name}: ${selector} ekranı bulunamadı.`);
    }
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const entries = [];
    const isRendered = (element) => {
      for (let current = element; current && current !== root.parentElement; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (
          style.display === "none"
          || style.visibility === "hidden"
          || Number(style.opacity) < 0.05
        ) return false;
      }
      return true;
    };
    const clipRect = (rect, element) => {
      let left = Math.max(0, rect.left);
      let top = Math.max(0, rect.top);
      let right = Math.min(viewport.width, rect.right);
      let bottom = Math.min(viewport.height, rect.bottom);
      for (let parent = element.parentElement; parent && parent !== root.parentElement; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if ([style.overflow, style.overflowX, style.overflowY].some((value) =>
          ["auto", "scroll", "hidden", "clip"].includes(value))) {
          const bounds = parent.getBoundingClientRect();
          left = Math.max(left, bounds.left);
          top = Math.max(top, bounds.top);
          right = Math.min(right, bounds.right);
          bottom = Math.min(bottom, bounds.bottom);
        }
      }
      if (right - left <= 1 || bottom - top <= 1) return null;
      return { left, top, right, bottom };
    };
    const addEntry = (kind, element, label) => {
      if (!isRendered(element)) return;
      const rect = clipRect(element.getBoundingClientRect(), element);
      if (!rect) return;
      entries.push({
        kind,
        label: label.replace(/\s+/g, " ").trim().slice(0, 80),
        rect,
      });
    };

    for (const button of root.querySelectorAll("button")) {
      addEntry("button", button, button.innerText || button.getAttribute("aria-label") || "button");
    }
    for (const element of root.querySelectorAll("h1,h2,h3,h4,p,span,strong,b,small,label,output,kbd")) {
      if (
        element.closest("button")
        || element.closest("[aria-hidden='true']")
        || element.parentElement?.closest("h1,h2,h3,h4,p,span,strong,b,small,label,output,kbd")
      ) continue;
      const text = element.textContent?.replace(/\s+/g, " ").trim();
      if (text) addEntry("text", element, text);
    }

    const outside = entries.filter(({ rect }) =>
      rect.left < -1
      || rect.top < -1
      || rect.right > viewport.width + 1
      || rect.bottom > viewport.height + 1);
    const overlaps = [];
    for (let first = 0; first < entries.length; first += 1) {
      for (let second = first + 1; second < entries.length; second += 1) {
        const a = entries[first].rect;
        const b = entries[second].rect;
        const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (width > 1 && height > 1) {
          overlaps.push({
            first: entries[first],
            second: entries[second],
            intersection: { width, height },
          });
        }
      }
    }
    return { screen: name, viewport, entryCount: entries.length, outside, overlaps };
  },
  { rootSelector, screenName },
);

const captureMatrix = async (page, screenName, rootSelector) => {
  const session = await page.context().newCDPSession(page);
  const hideCanvas = [".safak-store", ".war-room-battle", ".war-room-result"].includes(rootSelector);
  const originalCanvasVisibility = hideCanvas
    ? await page.evaluate(() => [...document.querySelectorAll("canvas")].map((canvas) => canvas.style.visibility))
    : [];
  if (hideCanvas) {
    await page.evaluate(() => {
      document.querySelectorAll("canvas").forEach((canvas) => {
        canvas.style.visibility = "hidden";
      });
    });
  }
  const failures = [];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(180);
    const report = await inspectLayout(page, rootSelector, screenName);
    const fileName = `${screenName}-${viewport.width}x${viewport.height}.jpg`;
    const screenshot = await session.send("Page.captureScreenshot", {
      format: "jpeg",
      quality: 88,
      captureBeyondViewport: false,
      fromSurface: true,
    });
    await writeFile(`${outputDir}/${fileName}`, Buffer.from(screenshot.data, "base64"));
    console.log(
      `${fileName}: ${report.entryCount} görünür kutu; taşma ${report.outside.length}, çakışma ${report.overlaps.length}`,
    );
    if (report.outside.length || report.overlaps.length) failures.push(report);
  }
  if (failures.length) {
    const detail = failures.slice(0, 6).map((report) => JSON.stringify({
      screen: report.screen,
      viewport: report.viewport,
      outside: report.outside.slice(0, 4),
      overlaps: report.overlaps.slice(0, 5),
    })).join("\n");
    throw new Error(`${screenName}: metin/düğme çakışması veya ekran taşması bulundu.\n${detail}`);
  }
  if (hideCanvas) {
    await page.evaluate((visibility) => {
      document.querySelectorAll("canvas").forEach((canvas, index) => {
        canvas.style.visibility = visibility[index] ?? "";
      });
    }, originalCanvasVisibility);
  }
  await session.detach();
};

try {
  const menuPage = await createPage();
  await menuPage.goto(`${baseUrl}/?debug=1&scene=menu`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await menuPage.locator(".screen--menu").waitFor({ timeout: 45_000 });
  await menuPage.waitForTimeout(700);
  await captureMatrix(menuPage, "menu", ".screen--menu");

  await menuPage.evaluate(async () => {
    const react = await import("/node_modules/.vite/deps/react.js");
    const reactDom = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { default: StorePanel } = await import("/src/shafak/game/store-ui/StorePanel.tsx");
    const { defaultProfile } = await import("/src/shafak/game/profile.ts");
    const { STORE_CATALOG } = await import("/src/shafak/game/store-catalog.ts");
    const fixtureRoot = document.createElement("div");
    fixtureRoot.dataset.testFixture = "store";
    document.body.append(fixtureRoot);
    reactDom.default.createRoot(fixtureRoot).render(react.default.createElement(StorePanel, {
      profile: defaultProfile,
      items: STORE_CATALOG,
      isGuest: true,
      accountReady: true,
      loading: false,
      busyItemId: null,
      message: "",
      error: "",
      trialItemId: null,
      celebrationSignal: 0,
      onClose() {},
      onTry() {},
      onPurchase() {},
      onEquip() {},
      onEquipWarRoom() {},
      onClearFeedback() {},
      onUpgrade() {},
      onSell() {},
      onSalvage() {},
      onAssignQuickSlot() {},
      onSetSecondaryWeapon() {},
      loadoutBusy: false,
      renderPreview() { return null; },
    }));
  });
  await menuPage.locator(".safak-store").waitFor({ timeout: 90_000 });
  await menuPage.waitForTimeout(900);
  await captureMatrix(menuPage, "store", ".safak-store");
  await menuPage.locator("#store-tab-inventory").click();
  await menuPage.waitForTimeout(300);
  await captureMatrix(menuPage, "inventory", ".safak-store");

  const warRoomPage = await createPage();
  await warRoomPage.goto(`${baseUrl}/?mod=savas`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await warRoomPage.locator(".war-room-briefing").waitFor({ timeout: 60_000 });
  await warRoomPage.waitForFunction(() => {
    const button = document.querySelector(".war-room-start");
    return button instanceof HTMLButtonElement && !button.disabled;
  }, null, { timeout: 90_000 });
  await captureMatrix(warRoomPage, "preparation", ".war-room-briefing");
  await warRoomPage.setViewportSize(viewports[0]);
  await warRoomPage.locator(".war-room-start").click();
  await warRoomPage.locator(".war-room-battle").waitFor({ timeout: 60_000 });
  await warRoomPage.waitForTimeout(800);
  await captureMatrix(warRoomPage, "hud", ".war-room-battle");

  const resultPage = await createPage();
  await resultPage.goto(`${baseUrl}/?mod=savas`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await resultPage.locator(".war-room-briefing").waitFor({ timeout: 60_000 });
  await resultPage.evaluate(async () => {
    const react = await import("/node_modules/.vite/deps/react.js");
    const reactDom = await import("/node_modules/.vite/deps/react-dom_client.js");
    const { default: WarRoomResult } = await import("/src/shafak/game/WarRoomResult.tsx");
    const warRoom = document.querySelector(".war-room");
    if (!warRoom) throw new Error("Savaş Odası sonuç fixture kökü bulunamadı.");
    const fixtureRoot = document.createElement("div");
    fixtureRoot.dataset.testFixture = "war-room-result";
    warRoom.append(fixtureRoot);
    const summary = {
      kills: 12,
      headshots: 5,
      accuracy: 72,
      seconds: 208,
      gold: 180,
      totalGold: 720,
      mode: "raid",
      difficulty: "normal",
      modifiers: [],
      wave: 1,
      score: 1_325,
      grade: "A",
      xp: 95,
      sealFragments: 1,
      profileRewardState: "saved",
      roomNumber: 1,
      roomName: "Taş Avlu",
      commanderTitle: "Kuşatma Komutanı",
      enemyCount: 14,
      contract: {
        title: "Sandık avı",
        description: "Bir savaş sandığı aç",
        target: 1,
        progress: 1,
        bonusGold: 70,
        completed: true,
      },
      nextRoom: null,
      leaderboard: [
        { id: "player", name: "Yolcu", role: "OYUNCU", score: 1_325, status: "ZAFER", rank: 1 },
        { id: "commander", name: "Kızıl Komutan", role: "KOMUTAN", score: 800, status: "ELENDİ", rank: 2 },
        { id: "guard", name: "Avlu Muhafızı", role: "MUHAFIZ", score: 350, status: "ELENDİ", rank: 3 },
      ],
    };
    const root = reactDom.default.createRoot(fixtureRoot);
    root.render(react.default.createElement(WarRoomResult, {
      phase: "victory",
      summary,
      roomProgress: { highestRoom: 1, totalRoomRewards: 720 },
      onNextRoom() {},
      onRetryRoom() {},
      onRestart() {},
      onExit() {},
    }));
  });
  await resultPage.locator(".war-room-result").waitFor({ timeout: 30_000 });
  await captureMatrix(resultPage, "results", ".war-room-result");

  assert.deepEqual(pageErrors, [], `Tarayıcı hataları:\n${pageErrors.join("\n")}`);
  console.log(`Final ekran doğrulaması geçti: 6 ekran × 9 ölçü = 54 görüntü (${outputDir}).`);
} finally {
  await Promise.all(pages.map((page) => page.close().catch(() => {})));
  await browser.close();
}
