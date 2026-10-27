import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceWorldMovementMachine,
  createWorldMovementMachine,
  markWorldMovementLanded,
  WORLD_COYOTE_SECONDS,
  WORLD_JUMP_BUFFER_SECONDS,
  WORLD_JUMP_PREPARATION_SECONDS,
  WORLD_LANDING_SECONDS,
  WORLD_SLIDE_SECONDS,
} from "./world-movement-machine.ts";

const idle = { sprint: false, jumpPressed: false, crouch: false };
const grounded = { grounded: true, verticalVelocity: 0, speed: 0, deltaSeconds: 1 / 60 };

test("movement state machine distinguishes idle, run, and sprint", () => {
  assert.equal(advanceWorldMovementMachine(createWorldMovementMachine(), idle, grounded).state, "YERDE_DURUYOR");
  assert.equal(advanceWorldMovementMachine(createWorldMovementMachine(), idle, { ...grounded, speed: 4 }).state, "KOŞUYOR");
  assert.equal(advanceWorldMovementMachine(createWorldMovementMachine(), { ...idle, sprint: true }, { ...grounded, speed: 4 }).state, "SPRINT");
});

test("jump press is buffered for 120 ms and enters the 80 ms preparation state", () => {
  const prepared = advanceWorldMovementMachine(
    createWorldMovementMachine(),
    { ...idle, jumpPressed: true },
    grounded,
  );
  assert.equal(prepared.state, "ZIPLAMA_HAZIRLIK");
  assert.equal(prepared.jumpBufferSeconds, 0);
  assert.equal(prepared.jumpPreparationSeconds, WORLD_JUMP_PREPARATION_SECONDS);
  assert.equal(WORLD_JUMP_BUFFER_SECONDS, 0.12);

  let machine = { ...prepared, launchJump: undefined, crouching: undefined };
  for (let index = 0; index < 4; index += 1) {
    const frame = advanceWorldMovementMachine(machine, idle, grounded);
    machine = frame;
  }
  const launch = advanceWorldMovementMachine(machine, idle, grounded);
  assert.equal(launch.launchJump, true);
});

test("jump presses received in the air remain buffered until landing, but expire after 120 ms", () => {
  const airborne = {
    grounded: false,
    verticalVelocity: -1,
    speed: 0,
    deltaSeconds: 1 / 60,
  };
  const buffered = advanceWorldMovementMachine(
    { ...createWorldMovementMachine(), coyoteSeconds: 0 },
    { ...idle, jumpPressed: true },
    airborne,
  );
  assert.equal(buffered.jumpBufferSeconds, WORLD_JUMP_BUFFER_SECONDS);

  const expired = advanceWorldMovementMachine(
    buffered,
    idle,
    { ...airborne, deltaSeconds: 0.05 },
  );
  assert.ok(Math.abs(expired.jumpBufferSeconds - 0.07) < 1e-12);
  const expiredAfterMoreTime = advanceWorldMovementMachine(
    expired,
    idle,
    { ...airborne, deltaSeconds: 0.05 },
  );
  assert.ok(Math.abs(expiredAfterMoreTime.jumpBufferSeconds - 0.02) < 1e-12);
  const noLongerBuffered = advanceWorldMovementMachine(
    expiredAfterMoreTime,
    idle,
    { ...airborne, deltaSeconds: 0.05 },
  );
  assert.equal(noLongerBuffered.jumpBufferSeconds, 0);
});

test("coyote grace is 100 ms and is unavailable once it expires in the air", () => {
  const initial = createWorldMovementMachine();
  assert.equal(initial.coyoteSeconds, WORLD_COYOTE_SECONDS);
  const airborne = {
    grounded: false,
    verticalVelocity: -1,
    speed: 0,
    deltaSeconds: 0.05,
  };
  const grace = advanceWorldMovementMachine(initial, idle, airborne);
  assert.ok(Math.abs(grace.coyoteSeconds - 0.05) < 1e-9);
  const expired = advanceWorldMovementMachine(grace, idle, { ...airborne, deltaSeconds: 0.06 });
  assert.equal(expired.coyoteSeconds, 0);
});

test("running into crouch starts a 600 ms slide before crouched movement", () => {
  const slide = advanceWorldMovementMachine(
    createWorldMovementMachine(),
    { ...idle, crouch: true },
    { ...grounded, speed: 5.2 },
  );
  assert.equal(slide.state, "KAYIYOR");
  assert.equal(slide.slideSeconds, WORLD_SLIDE_SECONDS);
  const stillSliding = advanceWorldMovementMachine(
    slide,
    idle,
    { ...grounded, speed: 3 },
  );
  assert.equal(stillSliding.state, "KAYIYOR");
  const crouching = advanceWorldMovementMachine(
    { ...stillSliding, slideSeconds: 0 },
    { ...idle, crouch: true },
    grounded,
  );
  assert.equal(crouching.state, "EĞİLİYOR");
});

test("crouching does not start a slide from a walk and landing has a short recovery state", () => {
  const crouch = advanceWorldMovementMachine(
    createWorldMovementMachine(),
    { ...idle, crouch: true },
    { ...grounded, speed: 3.4 },
  );
  assert.equal(crouch.state, "EĞİLİYOR");
  const landed = markWorldMovementLanded(crouch);
  assert.equal(landed.state, "İNİŞ");
  assert.equal(landed.landingSeconds, WORLD_LANDING_SECONDS);
});
