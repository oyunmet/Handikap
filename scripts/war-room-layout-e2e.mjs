import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.WAR_ROOM_E2E_BASE_URL
  ?? (process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://127.0.0.1:5000");
const executablePath = process.env.CHROMIUM_PATH ?? "/repl/tools/bin/chromium";
const outputDir = process.env.WAR_ROOM_LAYOUT_SCREENSHOTS ?? "/tmp/war-room-12-6";
const viewports = [
  { width: 772, height: 330 },
  { width: 844, height: 390 },
  { width: 360, height: 640 },
  { width: 360, height: 740 },
  { width: 390, height: 664 },
  { width: 412, height: 780 },
  { width: 430, height: 800 },
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

const pageErrors = [];
let landscapeCanvasPixelReference = null;
try {
  const context = await browser.newContext({
    viewport: viewports[0],
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${baseUrl}/?mod=savas`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.locator(".war-room-briefing").waitFor({ timeout: 45_000 });
  await page.waitForFunction(() => {
    const button = document.querySelector(".war-room-start");
    return button instanceof HTMLButtonElement && !button.disabled;
  }, null, { timeout: 60_000 });

  const checkLayout = async (screen) => page.evaluate((screenName) => {
    const root = document.querySelector(".war-room");
    if (!root) throw new Error("Savaş Odası kapsayıcısı bulunamadı.");
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const entries = [];
    const clipRect = (rect, element) => {
      let left = Math.max(0, rect.left);
      let top = Math.max(0, rect.top);
      let right = Math.min(viewport.width, rect.right);
      let bottom = Math.min(viewport.height, rect.bottom);
      for (let parent = element.parentElement; parent && parent !== root.parentElement; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if ([style.overflow, style.overflowX, style.overflowY].some((value) => value === "auto" || value === "scroll" || value === "hidden" || value === "clip")) {
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
    const describe = (kind, label, rect) => ({ kind, label: label.replace(/\s+/g, " ").trim().slice(0, 80), rect });
    const isRendered = (element) => {
      for (let current = element; current && current !== root.parentElement; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) < 0.05) return false;
      }
      return true;
    };

    for (const button of root.querySelectorAll("button")) {
      if (!isRendered(button)) continue;
      const bounds = clipRect(button.getBoundingClientRect(), button);
      if (bounds) entries.push(describe("button", button.innerText || button.getAttribute("aria-label") || "button", bounds));
    }
    const textElements = root.querySelectorAll("h1,h2,h3,p,span,strong,b,small,label,output,kbd");
    for (const element of textElements) {
      if (
        element.closest("button")
        || element.closest("[aria-hidden='true']")
        || element.parentElement?.closest("h1,h2,h3,p,span,strong,b,small,label,output,kbd")
        || !isRendered(element)
      ) continue;
      const text = element.textContent?.replace(/\s+/g, " ").trim();
      const bounds = clipRect(element.getBoundingClientRect(), element);
      if (text && bounds) entries.push(describe("text", text, bounds));
    }
    const outside = entries.filter(({ rect }) =>
      rect.left < -1 || rect.top < -1 || rect.right > viewport.width + 1 || rect.bottom > viewport.height + 1);
    const overlaps = [];
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const a = entries[i].rect;
        const b = entries[j].rect;
        const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (width > 1 && height > 1) overlaps.push({ first: entries[i], second: entries[j], intersection: { width, height } });
      }
    }
    return { screen: screenName, viewport, entryCount: entries.length, outside, overlaps };
  }, screen);

  const capture = async (screen) => {
    const failures = [];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(240);
      const report = await checkLayout(screen);
      const touchHud = screen === "hud" ? await page.evaluate(() => {
        const root = document.querySelector(".war-room");
        const controls = root?.querySelector(".war-room-controls:not(.is-custom-layout)");
        const actions = controls
          ? Array.from(controls.querySelectorAll(":scope > .shafak-hud-button"))
          : [];
        const slots = Array.from(root?.querySelectorAll(
          ".war-room-weapon-select:not(.is-custom-layout) .war-room-weapon-slot",
        ) ?? []);
        const boxes = [
          root?.querySelector(".war-room-ammo"),
          root?.querySelector(".war-room-weapon-select:not(.is-custom-layout)"),
          controls,
        ].filter(Boolean).map((element) => ({
          label: element.className,
          rect: element.getBoundingClientRect().toJSON(),
        }));
        const intersections = [];
        for (let first = 0; first < boxes.length; first += 1) {
          for (let second = first + 1; second < boxes.length; second += 1) {
            const a = boxes[first].rect;
            const b = boxes[second].rect;
            if (Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1
              && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1) {
              intersections.push([boxes[first].label, boxes[second].label]);
            }
          }
        }
        const outside = boxes.filter(({ rect }) =>
          rect.left < -1 || rect.top < -1
          || rect.right > window.innerWidth + 1
          || rect.bottom > window.innerHeight + 1,
        ).map(({ label }) => label);
        const undersized = [...actions, ...slots].filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width < 48 || rect.height < 48;
        }).map((element) => element.getAttribute("aria-label") ?? element.className);
        const rowGap = controls ? Number.parseFloat(getComputedStyle(controls).rowGap) : 0;
        const canvas = root?.querySelector("canvas");
        return {
          actionCount: actions.length,
          slotCount: slots.length,
          rowGap,
          intersections,
          outside,
          undersized,
          canvasPixels: canvas ? canvas.width * canvas.height : 0,
          battlePhase: root?.getAttribute("data-phase") === "battle",
        };
      }) : null;
      const name = `${screen}-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({ path: `${outputDir}/${name}` });
      if (touchHud && viewport.width === 844 && viewport.height === 390) {
        landscapeCanvasPixelReference = touchHud.canvasPixels;
      }
      if (report.outside.length || report.overlaps.length
        || (touchHud && (
          touchHud.actionCount !== 7
          || touchHud.rowGap < 8
          || touchHud.intersections.length
          || touchHud.outside.length
          || touchHud.undersized.length
          || touchHud.slotCount < 1
          || !touchHud.battlePhase
          || (viewport.width < viewport.height
            && landscapeCanvasPixelReference !== null
            && touchHud.canvasPixels > landscapeCanvasPixelReference * 1.01)
        ))) failures.push({ ...report, touchHud });
      console.log(
        `${name}: ${report.entryCount} görünür kutu; taşma ${report.outside.length}, çakışma ${report.overlaps.length}`
        + (touchHud
          ? `; kontrol ${touchHud.actionCount}, yuva ${touchHud.slotCount}, aralık ${touchHud.rowGap}px`
            + `, canvas ${touchHud.canvasPixels}px²`
          : ""),
      );
    }
    if (failures.length) {
      const detail = failures.slice(0, 4).map((report) => JSON.stringify({
        screen: report.screen,
        viewport: report.viewport,
        outside: report.outside.slice(0, 4),
        overlaps: report.overlaps.slice(0, 5),
      })).join("\n");
      throw new Error(`${screen}: görünür metin/düğme kutuları çakıştı veya viewport dışına çıktı.\n${detail}`);
    }
  };

  await capture("briefing");
  await page.setViewportSize(viewports[0]);
  await page.locator(".war-room-start").click();
  await page.locator(".war-room-battle").waitFor({ timeout: 45_000 });
  await page.waitForTimeout(4_200);
  const objectiveStatus = page.locator(".war-room-objective-status");
  assert.equal(await objectiveStatus.getAttribute("data-expanded"), "false", "Görev kartı 4 saniye sonra daralmadı.");
  await objectiveStatus.click();
  assert.equal(await objectiveStatus.getAttribute("data-expanded"), "true", "Görev kartına dokununca genişlemedi.");
  await objectiveStatus.click();
  assert.equal(await objectiveStatus.getAttribute("data-expanded"), "false", "Görev kartı tekrar daraltılamadı.");
  await capture("hud");
  assert.deepEqual(pageErrors, [], `Tarayıcı hataları: ${pageErrors.join("; ")}`);
  console.log(`Ekran görüntüleri: ${outputDir}`);
} finally {
  await browser.close();
}
