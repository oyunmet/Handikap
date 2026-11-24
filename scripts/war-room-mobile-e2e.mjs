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
  await context.addInitScript(() => {
    localStorage.setItem("safak-age-gate-v1", "adult");
    localStorage.setItem("shafak.war-room-debug", "on");
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleWarnings.push(message.text());
    }
  });

  await page.goto(`${baseUrl}/?mod=savas`, {
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
  const waitForDiagnostics = async (predicate, message, timeout = 10_000) => {
    const deadline = Date.now() + timeout;
    let text = "";
    while (Date.now() < deadline) {
      text = await diagnostics() ?? "";
      if (predicate(text)) return text;
      await page.waitForTimeout(50);
    }
    throw new Error(`${message}: ${text}`);
  };
  const getYaw = async () => {
    const text = await page.locator(".war-room-camera-debug").innerText();
    const match = text.match(/YAW\s+(-?\d+(?:\.\d+)?)°/);
    assert.ok(match, `Camera yaw was not present in debug text: ${text}`);
    return Number(match[1]);
  };
  const waitForMovement = async () => {
    await waitForDiagnostics((text) => {
      const match = text.match(/moveY\s+(-?\d+(?:\.\d+)?)/);
      return Boolean(match && Math.abs(Number(match[1])) > 0.12);
    }, "Joystick movement was not recorded");
  };
  const waitForNoActiveTouches = async () => {
    await waitForDiagnostics(
      (text) => text.includes("aktif yok"),
      "Touch roles remained after release",
    );
  };
  const waitForAimState = async (active) => {
    try {
      await page.waitForFunction((expected) => {
        const aim = document.querySelector(".war-room-control.is-aim");
        const crosshair = document.querySelector(".war-room-crosshair");
        const held = aim?.getAttribute("data-held");
        return document.querySelector(".war-room-hud")?.classList.contains("is-aiming") === expected
          && (expected ? held === "true" : held === null || held === "false")
          && aim?.classList.contains("is-active") === expected
          && crosshair?.classList.contains("is-zoomed") === expected;
      }, active, { timeout: 10_000 });
    } catch {
      const state = await page.evaluate(() => {
        const aim = document.querySelector(".war-room-control.is-aim");
        const hud = document.querySelector(".war-room-hud");
        const crosshair = document.querySelector(".war-room-crosshair");
        return {
          buttonHeld: aim?.getAttribute("data-held"),
          buttonActive: aim?.classList.contains("is-active"),
          hudAiming: hud?.classList.contains("is-aiming"),
          crosshairZoomed: crosshair?.classList.contains("is-zoomed"),
        };
      });
      throw new Error(`Aim state did not become ${active ? "active" : "inactive"}; state=${JSON.stringify(state)}; diagnostics=${await diagnostics()}`);
    }
  };
  const waitForTouchRole = async (id, role) => {
    await waitForDiagnostics(
      (text) => text.includes(`${id}:${role}`),
      `Touch ${id} did not retain ${role} ownership`,
    );
  };
  const findOpenTouchPoint = async (side) => {
    const point = await page.evaluate((requestedSide) => {
      const stage = document.querySelector(".war-room-battle");
      if (!stage) return null;
      const bounds = stage.getBoundingClientRect();
      const xCandidates = requestedSide === "left"
        ? [0.25, 0.17, 0.33, 0.09, 0.41, 0.03, 0.47]
        : [0.75, 0.83, 0.67, 0.91, 0.59, 0.53, 0.97];
      const yCandidates = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.12, 0.88];
      for (const y of yCandidates) {
        for (const x of xCandidates) {
          const clientX = Math.round(bounds.left + bounds.width * x);
          const clientY = Math.round(bounds.top + bounds.height * y);
          const target = document.elementFromPoint(clientX, clientY);
          if (
            target?.closest(".game-canvas-viewport")
            && stage.contains(target)
            && !target.closest("button,[role='button']")
          ) return { x: clientX, y: clientY };
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
    const touch = activeTouches.get(id);
    assert.ok(touch, `Touch ${id} was not active`);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [touch],
    });
    activeTouches.delete(id);
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
    console.log(`War Room E2E: checking three-touch controls at ${viewport.width}x${viewport.height}.`);
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
      await waitForDiagnostics(
        (text) => text.includes(`${id}:look`),
        `Touch ${id} did not receive camera-look control`,
        5_000,
      );
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
  await waitForDiagnostics(
    (text) => text.includes("71:joystick") && text.includes("72:look"),
    "Simultaneous pointers lost their control roles",
  );
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

  // Hold movement, aim, and fire with three real touch identifiers on both
  // landscape sizes. Releasing one action must not release either other touch.
  let tripleTouchId = 82;
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 932, height: 430 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(250);
    const aimButton = page.locator(".war-room-control.is-aim");
    const fireButton = page.locator(".war-room-control.is-fire");
    const aimBounds = await aimButton.boundingBox();
    const fireBounds = await fireButton.boundingBox();
    assert.ok(aimBounds && fireBounds, "Aim and fire touch controls were not visible");
    assert.ok(aimBounds.width >= 48 && aimBounds.height >= 48,
      `Aim control is smaller than the 48 px touch target: ${JSON.stringify(aimBounds)}`);
    assert.ok(fireBounds.width >= 48 && fireBounds.height >= 48,
      `Fire control is smaller than the 48 px touch target: ${JSON.stringify(fireBounds)}`);

    const moveId = tripleTouchId++;
    const aimId = tripleTouchId++;
    const fireId = tripleTouchId++;
    const tripleTouchMovePoint = await findOpenTouchPoint("left");
    await startTouch(moveId, tripleTouchMovePoint.x, tripleTouchMovePoint.y);
    await moveTouch(moveId, tripleTouchMovePoint.x, tripleTouchMovePoint.y - 60);
    await startTouch(aimId, aimBounds.x + aimBounds.width / 2, aimBounds.y + aimBounds.height / 2);
    await startTouch(fireId, fireBounds.x + fireBounds.width / 2, fireBounds.y + fireBounds.height / 2);
    await page.waitForFunction(() => {
      return document.querySelector(".war-room-control.is-fire")?.dataset.held === "true";
    }, null, { timeout: 5_000 });
    await waitForAimState(true);
    const tripleTouch = await diagnostics();
    assert.ok(tripleTouch?.includes(`${moveId}:joystick`),
      `Movement lost ownership during aim/fire: ${tripleTouch}`);
    assert.ok(Number(tripleTouch?.match(/moveY\s+(-?\d+(?:\.\d+)?)/)?.[1]) > 0.6,
      `Movement was not active during aim/fire: ${tripleTouch}`);
    if (viewport.width === 844) {
      await page.screenshot({ path: "/tmp/war-room-ads-844x390.png" });
    }

    await endTouch(fireId);
    await page.waitForFunction(() => {
      return document.querySelector(".war-room-control.is-fire")?.dataset.held !== "true";
    }, null, { timeout: 5_000 });
    await waitForAimState(true);
    await waitForTouchRole(moveId, "joystick");
    console.log(`War Room E2E: fire released independently at ${viewport.width}x${viewport.height}.`);
    assert.ok((await diagnostics())?.includes(`${moveId}:joystick`),
      `Releasing fire also ended movement: ${await diagnostics()}`);

    await endTouch(aimId);
    await waitForAimState(false);
    await waitForTouchRole(moveId, "joystick");
    console.log(`War Room E2E: aim released independently at ${viewport.width}x${viewport.height}.`);
    assert.ok((await diagnostics())?.includes(`${moveId}:joystick`),
      `Releasing aim also ended movement: ${await diagnostics()}`);
    await endTouch(moveId);
    await waitForNoActiveTouches();
    console.log(`War Room E2E: all three touch roles cleared at ${viewport.width}x${viewport.height}.`);
  }
  console.log("War Room E2E: three-touch movement, visible ADS, fire, and independent releases passed at both landscape sizes.");

  await startTouch(81, 130, 230);
  await moveTouch(81, 130, 170);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  activeTouches.clear();
  await waitForDiagnostics(
    (text) => text.includes("touchcancel") && text.includes("aktif yok"),
    "Touch cancellation did not clear active controls",
    5_000,
  );

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
