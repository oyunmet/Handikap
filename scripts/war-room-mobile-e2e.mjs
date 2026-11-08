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

  await page.goto(`${baseUrl}/?mod=savas&debug=1`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const beginButton = page.locator(".war-room-start");
  await beginButton.waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const button = document.querySelector(".war-room-start");
    return button instanceof HTMLButtonElement && !button.disabled;
  }, null, { timeout: 60_000 });
  await beginButton.click();
  const debug = page.locator(".war-room-camera-debug [data-touch-diagnostics]");
  await debug.waitFor({ timeout: 60_000 });
  await page.locator(".war-room-battle").waitFor();
  await page.waitForTimeout(1_500);
  console.log("War Room E2E: battle and touch diagnostics are ready.");

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
      }, null, { timeout: 10_000 });
    } catch {
      throw new Error(`Joystick movement was not recorded: ${await diagnostics()}`);
    }
  };
  const waitForNoActiveTouches = async () => {
    try {
      await page.waitForFunction(() => {
        const text = document.querySelector("[data-touch-diagnostics]")?.getAttribute("data-touch-diagnostics") ?? "";
        return text.includes("aktif yok");
      }, null, { timeout: 10_000 });
    } catch {
      throw new Error(`Touch roles remained after release: ${await diagnostics()}`);
    }
  };
  const waitForAimState = async (active) => {
    try {
      await page.waitForFunction((expected) => {
        return document.querySelector(".war-room-hud")?.classList.contains("is-aiming") === expected;
      }, active, { timeout: 10_000 });
    } catch {
      throw new Error(`Aim state did not become ${active ? "active" : "inactive"}; diagnostics=${await diagnostics()}`);
    }
  };
  const waitForTouchRole = async (id, role) => {
    try {
      await page.waitForFunction(({ expectedId, expectedRole }) => {
        const text = document.querySelector("[data-touch-diagnostics]")?.getAttribute("data-touch-diagnostics") ?? "";
        return text.includes(`${expectedId}:${expectedRole}`);
      }, { expectedId: id, expectedRole: role }, { timeout: 10_000 });
    } catch {
      throw new Error(`Touch ${id} did not retain ${role} ownership: ${await diagnostics()}`);
    }
  };
  const findOpenTouchPoint = async (side) => {
    const point = await page.evaluate((requestedSide) => {
      const stage = document.querySelector(".war-room-battle");
      if (!stage) return null;
      const bounds = stage.getBoundingClientRect();
      const start = requestedSide === "left" ? 0.025 : 0.525;
      const end = requestedSide === "left" ? 0.475 : 0.975;
      for (let y = 0.12; y < 0.96; y += 0.035) {
        for (let x = start; x < end; x += 0.035) {
          const clientX = Math.round(bounds.left + bounds.width * x);
          const clientY = Math.round(bounds.top + bounds.height * y);
          const target = document.elementFromPoint(clientX, clientY);
          if (target?.tagName === "CANVAS" && stage.contains(target)) return { x: clientX, y: clientY };
        }
      }
      return null;
    }, side);
    assert.ok(point, `Could not find an unobstructed ${side}-side game touch area`);
    return point;
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
    for (let index = 0; index < 3; index += 1) {
      const id = touchId++;
      const point = await findOpenTouchPoint("left");
      await swipe(id, point.x, point.y, 0, -42);
      await waitForMovement();
      const text = await diagnostics();
      assert.ok(text?.includes(`${id}:joystick`), `Left swipe ${id} did not own the joystick: ${text}`);
      await endTouch(id);
      await waitForNoActiveTouches();
    }
  }
  console.log("War Room E2E: joystick swipes passed in both landscape sizes.");

  touchId = 40;
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 932, height: 430 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(250);
    for (let index = 0; index < 3; index += 1) {
      const before = await getYaw();
      const id = touchId++;
      const point = await findOpenTouchPoint("right");
      await swipe(id, point.x, point.y, 36, 0);
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
  console.log("War Room E2E: camera-look swipes passed in both landscape sizes.");

  const startYaw = await getYaw();
  const simultaneousMovePoint = await findOpenTouchPoint("left");
  const simultaneousLookPoint = await findOpenTouchPoint("right");
  await startTouch(71, simultaneousMovePoint.x, simultaneousMovePoint.y);
  await startTouch(72, simultaneousLookPoint.x, simultaneousLookPoint.y);
  await moveTouch(71, simultaneousMovePoint.x, simultaneousMovePoint.y - 45);
  await moveTouch(72, simultaneousLookPoint.x + 35, simultaneousLookPoint.y - 15);
  await page.waitForFunction(() => {
    const text = document.querySelector("[data-touch-diagnostics]")?.getAttribute("data-touch-diagnostics") ?? "";
    return text.includes("71:joystick") && text.includes("72:look");
      }, null, { timeout: 10_000 });
  const simultaneous = await diagnostics();
  const simultaneousMoveY = Number(simultaneous?.match(/moveY\s+(-?\d+(?:\.\d+)?)/)?.[1]);
  assert.ok(Number.isFinite(simultaneousMoveY) && simultaneousMoveY > 0.6,
    `Simultaneous movement did not reach the joystick: ${simultaneous}`);
  assert.notEqual(await getYaw(), startYaw, "Simultaneous right-side look did not rotate the camera");
  await endTouch(72);
  await waitForTouchRole(71, "joystick");
  const leftStillActive = await diagnostics();
  assert.ok(leftStillActive?.includes("71:joystick"),
    `Ending camera look also ended movement: ${leftStillActive}`);
  await endTouch(71);
  await waitForNoActiveTouches();
  console.log("War Room E2E: joystick movement and right-side camera look stayed independent.");

  // Hold movement, aim, and fire with three real touch identifiers. Releasing
  // fire must not release aim or cancel the movement pointer.
  const aimButton = page.locator(".war-room-control.is-aim");
  const fireButton = page.locator(".war-room-control.is-fire");
  const aimBounds = await aimButton.boundingBox();
  const fireBounds = await fireButton.boundingBox();
  assert.ok(aimBounds && fireBounds, "Aim and fire touch controls were not visible");
  assert.ok(aimBounds.width >= 48 && aimBounds.height >= 48,
    `Aim control is smaller than the 48 px touch target: ${JSON.stringify(aimBounds)}`);
  assert.ok(fireBounds.width >= 48 && fireBounds.height >= 48,
    `Fire control is smaller than the 48 px touch target: ${JSON.stringify(fireBounds)}`);
  const tripleTouchMovePoint = await findOpenTouchPoint("left");
  await startTouch(82, tripleTouchMovePoint.x, tripleTouchMovePoint.y);
  await moveTouch(82, tripleTouchMovePoint.x, tripleTouchMovePoint.y - 60);
  await startTouch(83, aimBounds.x + aimBounds.width / 2, aimBounds.y + aimBounds.height / 2);
  await startTouch(84, fireBounds.x + fireBounds.width / 2, fireBounds.y + fireBounds.height / 2);
  await page.waitForFunction(() => {
    const aim = document.querySelector(".war-room-control.is-aim");
    const fire = document.querySelector(".war-room-control.is-fire");
    const hud = document.querySelector(".war-room-hud");
    return aim?.dataset.held === "true"
      && fire?.dataset.held === "true"
      && hud?.classList.contains("is-aiming");
  }, null, { timeout: 5_000 });
  const tripleTouch = await diagnostics();
  assert.ok(tripleTouch?.includes("82:joystick"), `Movement lost ownership during aim/fire: ${tripleTouch}`);
  assert.ok(Number(tripleTouch?.match(/moveY\s+(-?\d+(?:\.\d+)?)/)?.[1]) > 0.6,
    `Movement was not active during aim/fire: ${tripleTouch}`);
  await page.screenshot({ path: "/tmp/war-room-ads-844x390.png" });

  await endTouch(84);
  await page.waitForFunction(() => {
    return document.querySelector(".war-room-control.is-fire")?.dataset.held !== "true";
  }, null, { timeout: 5_000 });
  await waitForAimState(true);
  assert.equal(await aimButton.getAttribute("data-held"), "true",
    "Releasing fire also released the independently held aim button");
  await waitForTouchRole(82, "joystick");
  assert.ok((await diagnostics())?.includes("82:joystick"),
    `Releasing fire also ended the movement pointer: ${await diagnostics()}`);

  await endTouch(83);
  await waitForAimState(false);
  await waitForTouchRole(82, "joystick");
  assert.ok((await diagnostics())?.includes("82:joystick"),
    `Releasing aim also ended the movement pointer: ${await diagnostics()}`);
  await endTouch(82);
  await waitForNoActiveTouches();
  console.log("War Room E2E: three-touch movement, ADS, and fire passed; releasing fire kept aim active.");

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
  await waitForNoActiveTouches();
  assert.equal(await page.locator(".war-room-orientation-overlay").count(), 0,
    "Portrait rotation unexpectedly blocked the War Room HUD");
  assert.equal(await page.locator(".war-room-controls").isVisible(), true,
    "Touch controls did not remain visible after portrait rotation");
  activeTouches.clear();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => window.dispatchEvent(new Event("orientationchange")));
  assert.equal(await page.locator(".war-room-orientation-overlay").count(), 0,
    "Landscape rotation unexpectedly showed an orientation blocker");

  await page.screenshot({ path: "/tmp/war-room-mobile-844x390.png" });
  assert.deepEqual(pageErrors, [], `Browser page errors:\n${pageErrors.join("\n")}`);
  assert.deepEqual(consoleWarnings, [], `Browser console warnings/errors:\n${consoleWarnings.join("\n")}`);
  console.log("War Room mobile E2E passed: joystick/look, three simultaneous controls, independent releases, cancel, HUD button, pause, and both orientations.");
} finally {
  await browser.close();
}
