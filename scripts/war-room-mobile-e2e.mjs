import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.WAR_ROOM_E2E_BASE_URL
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

const pageErrors = [];
const consoleWarnings = [];
try {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error") {
      consoleWarnings.push(`${message.type()}: ${message.text()}`);
    }
  });

  await page.goto(`${baseUrl}/?mod=savas&lab=1&debug=1`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const debug = page.locator(".war-room-camera-debug [data-touch-diagnostics]");
  await debug.waitFor({ timeout: 60_000 });
  await page.locator(".war-room-battle").waitFor();
  await page.waitForTimeout(1_500);

  const diagnostics = () => debug.getAttribute("data-touch-diagnostics");
  const getYaw = async () => {
    const text = await page.locator(".war-room-camera-debug").innerText();
    const match = text.match(/YAW\s+(-?\d+(?:\.\d+)?)°/);
    assert.ok(match, `Camera yaw was not present in debug text: ${text}`);
    return Number(match[1]);
  };
  const waitForMovement = async () => {
    try {
      await page.waitForFunction(() => {
        const text = document.querySelector("[data-touch-diagnostics]")?.getAttribute("data-touch-diagnostics") ?? "";
        const match = text.match(/moveY\s+(-?\d+(?:\.\d+)?)/);
        return Boolean(match && Math.abs(Number(match[1])) > 0.12);
      }, null, { timeout: 5_000 });
    } catch {
      throw new Error(`Joystick movement was not recorded: ${await diagnostics()}`);
    }
  };
  const waitForNoActiveTouches = async () => {
    try {
      await page.waitForFunction(() => {
        const text = document.querySelector("[data-touch-diagnostics]")?.getAttribute("data-touch-diagnostics") ?? "";
        return text.includes("aktif yok");
      }, null, { timeout: 5_000 });
    } catch {
      throw new Error(`Touch roles remained after release: ${await diagnostics()}`);
    }
  };
  const activeTouches = new Map();
  const cdp = await context.newCDPSession(page);
  const dispatch = (type) => cdp.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: [...activeTouches.values()],
  });
  const startTouch = async (id, x, y) => {
    activeTouches.set(id, { id, x, y, radiusX: 1, radiusY: 1, force: 1 });
    await dispatch("touchStart");
  };
  const moveTouch = async (id, x, y) => {
    const current = activeTouches.get(id);
    assert.ok(current, `Touch ${id} was not active`);
    activeTouches.set(id, { ...current, x, y });
    await dispatch("touchMove");
  };
  const endTouch = async (id) => {
    assert.ok(activeTouches.has(id), `Touch ${id} was not active`);
    activeTouches.delete(id);
    await dispatch("touchEnd");
  };
  const swipe = async (id, x, y, dx, dy) => {
    await startTouch(id, x, y);
    await moveTouch(id, x + dx, y + dy);
  };
  let touchId = 10;
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 932, height: 430 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(250);
    for (let index = 0; index < 5; index += 1) {
      const id = touchId++;
      await swipe(id, 115 + index * 12, 165, 0, -42);
      await waitForMovement();
      const text = await diagnostics();
      assert.ok(text?.includes(`${id}:joystick`), `Left swipe ${id} did not own the joystick: ${text}`);
      await endTouch(id);
      await waitForNoActiveTouches();
    }
  }

  touchId = 40;
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 932, height: 430 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(250);
    for (let index = 0; index < 5; index += 1) {
      const before = await getYaw();
      const id = touchId++;
      await swipe(id, 550, 190, 36, 0);
      await page.waitForFunction((expectedId) => {
        const text = document.querySelector("[data-touch-diagnostics]")?.getAttribute("data-touch-diagnostics") ?? "";
        return text.includes(`${expectedId}:look`);
      }, id, { timeout: 5_000 });
      try {
        await page.waitForFunction((previousYaw) => {
          const text = document.querySelector(".war-room-camera-debug")?.textContent ?? "";
          const match = text.match(/YAW\s+(-?\d+(?:\.\d+)?)°/);
          if (!match) return false;
          const difference = Math.abs(((Number(match[1]) - previousYaw + 540) % 360) - 180);
          return difference > 0.1;
        }, before, { timeout: 5_000 });
      } catch {
        throw new Error(`Camera did not rotate after right swipe ${id}; debug=${await page.locator(".war-room-camera-debug").innerText()}`);
      }
      const text = await diagnostics();
      assert.ok(text?.includes(`${id}:look`), `Right swipe ${id} did not own camera look: ${text}`);
      await endTouch(id);
      await waitForNoActiveTouches();
    }
  }

  const startYaw = await getYaw();
  await startTouch(71, 120, 240);
  await startTouch(72, 690, 180);
  await moveTouch(71, 120, 195);
  await moveTouch(72, 725, 165);
  await page.waitForFunction(() => {
    const text = document.querySelector("[data-touch-diagnostics]")?.getAttribute("data-touch-diagnostics") ?? "";
    return text.includes("71:joystick") && text.includes("72:look");
  }, null, { timeout: 5_000 });
  const simultaneous = await diagnostics();
  assert.ok(simultaneous?.includes("moveY 0.75") || simultaneous?.includes("moveY 1.00"),
    `Simultaneous movement did not reach the joystick: ${simultaneous}`);
  assert.notEqual(await getYaw(), startYaw, "Simultaneous right-side look did not rotate the camera");
  await endTouch(72);
  const leftStillActive = await diagnostics();
  assert.ok(leftStillActive?.includes("71:joystick"), "Ending camera look also ended movement");
  await endTouch(71);
  await waitForNoActiveTouches();

  await startTouch(81, 130, 230);
  await moveTouch(81, 130, 170);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  activeTouches.clear();
  await page.waitForFunction(() => {
    const text = document.querySelector("[data-touch-diagnostics]")?.getAttribute("data-touch-diagnostics") ?? "";
    return text.includes("touchcancel") && text.includes("aktif yok");
  }, null, { timeout: 5_000 });

  const pauseButton = page.locator(".war-room-pause");
  const pauseBounds = await pauseButton.boundingBox();
  assert.ok(pauseBounds, "Pause button was not visible");
  const pauseTouchId = 91;
  await startTouch(
    pauseTouchId,
    pauseBounds.x + pauseBounds.width / 2,
    pauseBounds.y + pauseBounds.height / 2,
  );
  const buttonDiagnostics = await diagnostics();
  assert.ok(buttonDiagnostics && !buttonDiagnostics.includes(`${pauseTouchId}:`),
    "A HUD button touch was incorrectly assigned a gameplay role");
  await endTouch(pauseTouchId);
  await page.getByRole("alertdialog", { name: "Savaş odasından çık" }).waitFor();
  await page.getByRole("button", { name: "DEVAM ET" }).click();

  await startTouch(101, 125, 230);
  await moveTouch(101, 125, 170);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.dispatchEvent(new Event("orientationchange")));
  await page.locator(".war-room-orientation-overlay").waitFor();
  await waitForNoActiveTouches();
  activeTouches.clear();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => window.dispatchEvent(new Event("orientationchange")));
  await page.locator(".war-room-orientation-overlay").waitFor({ state: "detached" });

  await page.screenshot({ path: "/tmp/war-room-mobile-844x390.png" });
  assert.deepEqual(pageErrors, [], `Browser page errors:\n${pageErrors.join("\n")}`);
  assert.deepEqual(consoleWarnings, [], `Browser console warnings/errors:\n${consoleWarnings.join("\n")}`);
  console.log("War Room mobile E2E passed: 10 joystick swipes, 10 look swipes, simultaneous touch, cancel, HUD button, pause, and orientation recovery.");
} finally {
  await browser.close();
}
