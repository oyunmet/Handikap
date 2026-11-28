import {
  getWarRoomCommanderHealth,
  getNearbyWarRoomLootChest,
  getWarRoomRemaining,
  type WarRoomHudSnapshot,
  type WarRoomInputState,
  type WarRoomRuntime,
} from "./war-room-engine";
import {
  advanceWarRoomFixedMovementFromFrame,
  type WarRoomFixedMovementInput,
  type WarRoomFixedMovementResult,
  type WarRoomMovementClock,
} from "./war-room-fixed-movement";
import {
  getNearestWarRoomDoor,
  getWarRoomDoorOpenProgress,
} from "./war-room-doors";
import {
  getWarRoomMissionOutcome,
  type WarRoomMissionOutcome,
} from "./war-room-missions";
import { RESTORE_CONFIG } from "./war-room-restore";
import type { FixedStepResult } from "../../core/fixed-step-loop";

export function createWarRoomInputState(
  aimAssistEnabled = true,
): WarRoomInputState {
  return {
    keys: new Set(),
    moveX: 0,
    moveY: 0,
    yaw: 0,
    cameraTargetYaw: 0,
    manualLookActive: false,
    cameraLookLocked: false,
    cameraLookBodyYaw: 0,
    lookDeltaX: 0,
    lookDeltaY: 0,
    lookPointerType: "touch",
    pitch: -0.08,
    fireHeld: false,
    firePressed: false,
    fireReleased: false,
    aimHeld: false,
    aimAssistEnabled,
    reloadPressed: false,
    swapPressed: false,
    jumpPressed: false,
    dodgePressed: false,
    crouchPressed: false,
    sprintLocked: false,
    weaponSlotPressed: null,
    pronePressed: false,
    lootHeld: false,
    doorPressed: false,
    paused: false,
  };
}

export function resolveWarRoomSimulationOutcome(
  runtime: WarRoomRuntime,
  now: number,
): WarRoomMissionOutcome {
  let openedChests = 0;
  for (const chest of runtime.lootChests) {
    if (chest.opened) openedChests += 1;
  }
  return getWarRoomMissionOutcome(runtime.mission.mode, {
    remaining: getWarRoomRemaining(runtime),
    openedChests,
    elapsedSeconds: Math.max(0, now - runtime.player.startTime),
    playerHp: runtime.player.hp,
    defenseHp: runtime.mission.defenseHp,
  }, runtime.mission);
}

export type WarRoomActionInputContext = {
  now: number;
  moveX: number;
  moveY: number;
  forwardX: number;
  forwardZ: number;
  rightX: number;
  rightZ: number;
  weaponSlotCount: number;
};

export function consumeWarRoomActionInputs(
  runtime: WarRoomRuntime,
  input: WarRoomInputState,
  context: WarRoomActionInputContext,
): void {
  const player = runtime.player;
  const {
    now,
    moveX,
    moveY,
    forwardX,
    forwardZ,
    rightX,
    rightZ,
    weaponSlotCount,
  } = context;

  if (input.pronePressed) {
    player.prone = !player.prone;
    player.crouched = player.prone;
    input.pronePressed = false;
  }
  if (input.crouchPressed) {
    player.prone = false;
    player.crouched = !player.crouched;
    input.crouchPressed = false;
  }
  if (input.weaponSlotPressed !== null) {
    const requestedSlot = input.weaponSlotPressed;
    if (requestedSlot >= 0
      && requestedSlot < weaponSlotCount
      && requestedSlot !== player.activeSlot) {
      player.activeSlot = requestedSlot as 0 | 1;
      player.reloadingWeapon = null;
      player.reloadUntil = 0;
      player.meleeInputPending = false;
      player.meleeComboIndex = 0;
      player.meleeComboCount = 0;
    }
    input.weaponSlotPressed = null;
  }
  if (input.swapPressed) {
    player.activeSlot = player.activeSlot === 0 ? 1 : 0;
    player.reloadingWeapon = null;
    player.reloadUntil = 0;
    player.meleeInputPending = false;
    player.meleeComboIndex = 0;
    player.meleeComboCount = 0;
    input.swapPressed = false;
  }
  if (input.jumpPressed) {
    if (player.jumpHeight <= 0.001) player.jumpVelocity = 5.4;
    input.jumpPressed = false;
  }
  if (input.dodgePressed) {
    if (player.stamina >= 18 && now >= player.dodgeUntil) {
      const dodgeLength = Math.hypot(moveX, moveY);
      const localX = dodgeLength > 0.05 ? moveX / dodgeLength : 0;
      const localY = dodgeLength > 0.05 ? moveY / dodgeLength : -1;
      player.dodgeX = rightX * localX + forwardX * localY;
      player.dodgeZ = rightZ * localX + forwardZ * localY;
      player.stamina = Math.max(0, player.stamina - 18);
      player.dodgeUntil = now + 0.26;
      player.invulnerableUntil = now + 0.18;
    }
    input.dodgePressed = false;
  }
}

export type WarRoomPlayerMovementIntent = Pick<
  WarRoomFixedMovementInput,
  "velocityX" | "velocityZ" | "now" | "blockers" | "radius" | "dodge"
>;

export type WarRoomPlayerMovementStep = WarRoomFixedMovementResult & {
  previousX: number;
  previousZ: number;
  deltaX: number;
  deltaZ: number;
};

export function advanceWarRoomPlayerMovement(
  runtime: WarRoomRuntime,
  clock: WarRoomMovementClock,
  intent: WarRoomPlayerMovementIntent,
  frame: Readonly<Pick<FixedStepResult, "steps" | "alpha" | "droppedSeconds">>,
  timeScale = 1,
): WarRoomPlayerMovementStep {
  const player = runtime.player;
  const previousX = player.x;
  const previousZ = player.z;
  const movement = advanceWarRoomFixedMovementFromFrame(clock, {
    ...intent,
    x: player.x,
    z: player.z,
    floorHeight: player.floorHeight,
    jumpHeight: player.jumpHeight,
  }, frame, timeScale);
  player.x = movement.x;
  player.z = movement.z;
  return {
    ...movement,
    previousX,
    previousZ,
    deltaX: movement.x - previousX,
    deltaZ: movement.z - previousZ,
  };
}

export function createEmptyWarRoomHudSnapshot(): WarRoomHudSnapshot {
  return {
    mission: {
      mode: "raid",
      dailyObjective: null,
      wave: 1,
      score: 0,
      timeLimitSeconds: null,
      targetChests: 0,
      defenseHp: 0,
      defenseMaxHp: 0,
    },
    player: {
      x: 0,
      z: 0,
      floorHeight: 0,
      yaw: 0,
      hp: 220,
      maxHp: 220,
      armor: 0,
      maxArmor: 60,
      stamina: 100,
      maxStamina: 100,
    },
    orientation: {
      facingYaw: 0,
      mode: "HAREKET",
      joystickAngleDegrees: null,
      facingCamera: false,
    },
    enemies: [],
    healingPoints: [],
    armorPoints: [],
    regenerationActive: false,
    regenerationWaitSeconds: 0,
    regenerationAtCap: false,
    remaining: 9,
    bossHp: 360,
    bossMaxHp: 360,
    bossAttack: null,
    kills: 0,
    headshots: 0,
    shots: 0,
    hits: 0,
    elapsedSeconds: 0,
    weaponId: "powder_rifle",
    weaponSlots: ["powder_rifle", "crossbow"],
    magazine: 30,
    reserve: 90,
    reloading: false,
    aiming: false,
    firing: false,
    targetVisible: false,
    targetName: null,
    targetReason: "no-target",
    hitMarker: false,
    headshotMarker: false,
    damageNumberCritical: false,
    lastHitSource: null,
    damageEventId: 0,
    damageVignette: false,
    damageDirection: 0,
    lastHitDamage: 0,
    lastHitArmorDamage: 0,
    hitMessage: "",
    killFeed: [],
    crouched: false,
    meleePhase: "HAZIR",
    meleeComboCount: 0,
    meleeLastResult: "Henüz isabet yok",
    nearbyLootChest: null,
    lootChestsOpened: 0,
    nearbyDoor: null,
  };
}

export function buildWarRoomHudSnapshot(
  runtime: WarRoomRuntime,
  now: number,
  input: WarRoomInputState,
): WarRoomHudSnapshot {
  const player = runtime.player;
  const weaponId = player.weaponSlots[player.activeSlot];
  const ammo = player.ammo[weaponId];
  const bossHealth = getWarRoomCommanderHealth(runtime.enemies);
  const bossAttackEnemy = runtime.enemies.find(
    (enemy) => enemy.commander && enemy.alive && enemy.bossAttack,
  );
  const nearbyChest = getNearbyWarRoomLootChest(runtime);
  const nearbyDoor = getNearestWarRoomDoor(
    runtime.room.buildings,
    player.x,
    player.z,
    player.floorHeight,
    input.yaw,
  );
  const meleeProgress = player.meleeUntil > now
    ? Math.max(0, Math.min(1, (now - player.meleeStartedAt) / Math.max(0.01, player.meleeDuration)))
    : 0;
  const meleePhase = player.meleeUntil <= now
    ? "HAZIR"
    : meleeProgress < (player.meleeAttackHeavy ? 0.4 : 0.28)
      ? "HAZIRLIK"
      : meleeProgress < 0.72 ? "VURUŞ" : "TOPARLAN";

  return {
    mission: {
      mode: runtime.mission.mode,
      dailyObjective: runtime.mission.dailyObjective,
      wave: runtime.mission.wave,
      score: runtime.mission.score,
      timeLimitSeconds: runtime.mission.timeLimitSeconds,
      targetChests: runtime.mission.targetChests,
      defenseHp: runtime.mission.defenseHp,
      defenseMaxHp: runtime.mission.defenseMaxHp,
    },
    player: {
      x: player.x,
      z: player.z,
      floorHeight: player.floorHeight,
      yaw: player.yaw,
      hp: player.hp,
      maxHp: player.maxHp,
      armor: player.armor,
      maxArmor: player.maxArmor,
      stamina: player.stamina,
      maxStamina: player.maxStamina,
    },
    weaponSlots: [...player.weaponSlots],
    orientation: {
      facingYaw: player.facingYaw,
      mode: player.facingMode,
      joystickAngleDegrees: player.joystickAngleDegrees,
      facingCamera: player.facingCamera,
    },
    enemies: runtime.enemies.map(({ id, x, z, floorHeight = 0, alive, commander }) => ({
      id,
      x,
      z,
      floorHeight,
      alive,
      commander,
    })),
    healingPoints: RESTORE_CONFIG.enabled ? runtime.healingPoints.map(({ id, x, z, availableAt }) => ({
      id,
      x,
      z,
      floorHeight: 0,
      available: availableAt <= now,
    })) : [],
    armorPoints: RESTORE_CONFIG.enabled ? runtime.armorPoints.map(({ id, x, z, availableAt }) => ({
      id,
      x,
      z,
      floorHeight: 0,
      available: availableAt <= now,
    })) : [],
    regenerationActive: player.regenerationActive,
    regenerationWaitSeconds: player.regenerationWaitSeconds,
    regenerationAtCap: RESTORE_CONFIG.enabled
      && player.hp >= player.maxHp * RESTORE_CONFIG.passive.maxHealthRatio,
    remaining: getWarRoomRemaining(runtime),
    bossHp: bossHealth.hp,
    bossMaxHp: bossHealth.maxHp,
    bossAttack: bossAttackEnemy?.bossAttack
      ? {
        attack: bossAttackEnemy.bossAttack,
        telegraphing: now < bossAttackEnemy.nextShotAt,
      }
      : null,
    kills: player.kills,
    headshots: player.headshots,
    shots: player.shots,
    hits: player.hits,
    targetName: player.targetName,
    targetReason: player.targetReason,
    elapsedSeconds: Math.max(0, now - player.startTime),
    weaponId,
    magazine: ammo?.magazine ?? 0,
    reserve: ammo?.reserve ?? 0,
    reloading: player.reloadingWeapon === weaponId,
    aiming: input.aimHeld,
    targetVisible: Boolean(player.targetId),
    hitMarker: player.hitMarkerUntil > now,
    headshotMarker: player.hitMarkerUntil > now && player.hitMarkerHeadshot,
    damageNumberCritical: player.lastHitCritical,
    lastHitSource: player.lastHitSource,
    damageEventId: player.damageEventId,
    firing: player.shotFeedbackUntil > now,
    damageVignette: player.lastDamageAt > 0 && now - player.lastDamageAt < 0.72,
    damageDirection: player.damageDirection,
    lastHitDamage: player.lastHitDamage,
    lastHitArmorDamage: player.lastHitArmorDamage,
    hitMessage: player.hitMessageUntil > now ? player.lastHitText : "",
    killFeed: player.killFeed.map(({ id, text }) => ({ id, text })),
    crouched: player.crouched,
    meleePhase,
    meleeComboCount: player.meleeComboCount,
    meleeLastResult: player.meleeLastResult,
    nearbyDoor: nearbyDoor
      ? {
        id: nearbyDoor.key,
        openProgress: getWarRoomDoorOpenProgress(runtime.doorStates[nearbyDoor.key], now),
      }
      : null,
    nearbyLootChest: nearbyChest
      ? {
        id: nearbyChest.chest.id,
        label: nearbyChest.label,
        contents: nearbyChest.contents,
        progress: player.lootChestId === nearbyChest.chest.id ? player.lootProgress : 0,
      }
      : null,
    lootChestsOpened: runtime.lootChests.filter((chest) => chest.opened).length,
  };
}
