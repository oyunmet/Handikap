import {
  getWarRoomCommanderHealth,
  getNearbyWarRoomLootChest,
  getWarRoomRemaining,
  applyWarRoomDamage,
  applyWarRoomLootChest,
  getWarRoomFallDamage,
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
import { getWarRoomFloorHeight } from "./war-room-rooms";
import {
  getWarRoomMissionOutcome,
  type WarRoomMissionOutcome,
} from "./war-room-missions";
import { RESTORE_CONFIG } from "./war-room-restore";
import {
  advanceWarRoomPassiveRegen,
  collectWarRoomHealingPoint,
} from "./war-room-restore";
import {
  WAR_ROOM_WEAPON_BY_ID,
  type WarRoomWeapon,
  type WarRoomWeaponId,
} from "./war-room-data";
import { getWarRoomPostAttackStrafeUntil } from "./war-room-orientation";
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

export type WarRoomPlayerVerticalStep = {
  landed: boolean;
  fallDamage: number;
  healthDamage: number;
};

export function updateWarRoomPlayerFloor(runtime: WarRoomRuntime) {
  const player = runtime.player;
  const previousFloorHeight = player.floorHeight;
  const nextFloorHeight = getWarRoomFloorHeight(
    player.x,
    player.z,
    player.floorHeight,
    runtime.room.buildings,
  );
  const lostFloorHeight = previousFloorHeight - nextFloorHeight;
  if (lostFloorHeight > 0.45) {
    player.fallStartHeight = Math.max(
      player.fallStartHeight ?? Number.NEGATIVE_INFINITY,
      previousFloorHeight + player.previousJumpHeight,
    );
    player.jumpHeight += lostFloorHeight;
  }
  player.floorHeight = nextFloorHeight;
}

export function advanceWarRoomPlayerVerticalMotion(
  runtime: WarRoomRuntime,
  delta: number,
  now: number,
): WarRoomPlayerVerticalStep {
  const player = runtime.player;
  const previousJumpHeight = player.previousJumpHeight;

  if (player.fallStartHeight !== null) {
    player.fallStartHeight = Math.max(
      player.fallStartHeight,
      player.floorHeight + player.jumpHeight,
    );
  }
  player.jumpVelocity -= 14 * delta;
  player.jumpHeight = Math.max(0, player.jumpHeight + player.jumpVelocity * delta);
  if (player.jumpHeight === 0) player.jumpVelocity = 0;

  if (previousJumpHeight > 0.08 || player.jumpHeight > 0.08) {
    player.jumpWasAirborne = true;
  }
  const landed = player.jumpWasAirborne && player.jumpHeight <= 0.001;
  if (landed) player.jumpWasAirborne = false;
  let fallDamage = 0;
  let healthDamage = 0;
  if (landed && player.fallStartHeight !== null) {
    fallDamage = getWarRoomFallDamage(player.fallStartHeight - player.floorHeight);
    player.fallStartHeight = null;
    if (fallDamage > 0) {
      const hit = applyWarRoomDamage(player, fallDamage);
      healthDamage = hit.damage;
      if (hit.damage > 0) {
        player.lastDamageAt = now;
        player.lastCombatAt = now;
        player.invulnerableUntil = Math.max(player.invulnerableUntil, now + 0.4);
        player.damageDirection = 0;
        player.lastHitText = `−${hit.damage} CAN · DÜŞME`;
        player.hitMessageUntil = now + 1.2;
        player.lastHitDamage = hit.damage;
        player.lastHitArmorDamage = hit.armorDamage ?? 0;
        player.lastHitSource = "received";
        player.lastHitCritical = false;
        player.damageEventId += 1;
      }
    }
  }

  player.previousJumpHeight = player.jumpHeight;
  return { landed, fallDamage, healthDamage };
}

export function advanceWarRoomPlayerRestoration(
  runtime: WarRoomRuntime,
  now: number,
  delta: number,
) {
  const restoration = advanceWarRoomPassiveRegen(runtime.player, now, delta, RESTORE_CONFIG);
  runtime.player.regenerationActive = restoration.active;
  runtime.player.regenerationWaitSeconds = restoration.secondsUntilReady;
  return restoration;
}

export function advanceWarRoomPlayerStamina(runtime: WarRoomRuntime, delta: number) {
  const player = runtime.player;
  player.stamina = player.sprinting
    ? Math.max(0, player.stamina - delta * 10)
    : Math.min(player.maxStamina, player.stamina + delta * (player.crouched ? 22 : 15));
  return player.stamina;
}

export function advanceWarRoomReload(
  runtime: WarRoomRuntime,
  input: WarRoomInputState,
  now: number,
) {
  const player = runtime.player;
  let started = false;
  if (input.reloadPressed) {
    const weaponId = player.weaponSlots[player.activeSlot];
    const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId);
    const ammo = player.ammo[weaponId];
    if (weapon && ammo && ammo.magazine < weapon.magazine && ammo.reserve > 0 && !player.reloadingWeapon) {
      player.reloadingWeapon = weaponId;
      player.reloadUntil = now + weapon.reloadSeconds;
      started = true;
    }
    input.reloadPressed = false;
  }

  if (player.reloadingWeapon && now >= player.reloadUntil) {
    const weapon = WAR_ROOM_WEAPON_BY_ID.get(player.reloadingWeapon);
    const ammo = player.ammo[player.reloadingWeapon];
    if (weapon && ammo) {
      const moved = Math.min(weapon.magazine - ammo.magazine, ammo.reserve);
      ammo.magazine += moved;
      ammo.reserve -= moved;
    }
    player.reloadingWeapon = null;
    player.reloadUntil = 0;
  }
  return { started };
}

export type WarRoomPlayerFireRequest = { charge: number; holdSeconds: number };

export function consumeWarRoomPlayerFireInput(
  runtime: WarRoomRuntime,
  input: WarRoomInputState,
  now: number,
): WarRoomPlayerFireRequest | null {
  const player = runtime.player;
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(player.weaponSlots[player.activeSlot]);
  let request: WarRoomPlayerFireRequest | null = null;

  if (weapon?.weaponClass === "melee") {
    if (input.firePressed && !player.meleeInputPending) {
      player.meleeInputStartedAt = now;
      player.meleeInputPending = true;
    }
    if (input.fireReleased && player.meleeInputPending) {
      const holdSeconds = Math.max(0, now - player.meleeInputStartedAt);
      player.meleeInputPending = false;
      player.meleeInputStartedAt = 0;
      request = { charge: 1, holdSeconds };
    }
  } else if (weapon?.charge && input.firePressed) {
    player.chargeStartedAt = now || 0.0001;
  } else if (weapon?.charge && input.fireReleased && player.chargeStartedAt > 0) {
    const charge = Math.max(0.15, Math.min(1, (now - player.chargeStartedAt) / 0.95));
    player.chargeStartedAt = 0;
    request = { charge, holdSeconds: 0 };
  } else if (weapon && !weapon.charge && (
    input.firePressed
    || (weapon.automatic && input.fireHeld)
  )) {
    request = { charge: 1, holdSeconds: 0 };
  }

  input.firePressed = false;
  input.fireReleased = false;
  return request;
}

export type WarRoomRangedShotPreparation =
  | { status: "blocked"; weaponId: WarRoomWeaponId }
  | { status: "empty"; weaponId: WarRoomWeaponId }
  | {
    status: "ready";
    weaponId: WarRoomWeaponId;
    weapon: WarRoomWeapon;
    shotStyle: "shotgun" | "pistol" | "rifle";
    pellets: number;
    spread: number;
    chargeMultiplier: number;
  };

export function prepareWarRoomRangedShot(
  runtime: WarRoomRuntime,
  now: number,
  charge = 1,
): WarRoomRangedShotPreparation {
  const player = runtime.player;
  const weaponId = player.weaponSlots[player.activeSlot];
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId);
  if (
    !weapon
    || weapon.weaponClass === "melee"
    || now < player.nextShotAt
    || player.reloadingWeapon
  ) {
    return { status: "blocked", weaponId };
  }
  const ammo = player.ammo[weaponId];
  if (!ammo || ammo.magazine <= 0) return { status: "empty", weaponId };

  player.nextShotAt = now + weapon.fireInterval;
  player.strafeUntil = getWarRoomPostAttackStrafeUntil(now);
  ammo.magazine -= 1;
  player.shots += 1;
  player.lastCombatAt = now;
  player.lastHitDamage = 0;
  player.lastHitCritical = false;
  player.hitMarkerUntil = 0;
  player.hitMarkerHeadshot = false;
  player.shotFlashUntil = now + 0.06;
  player.shotFeedbackUntil = now + 0.2;
  player.recoil = Math.min(0.17, player.recoil + weapon.recoil);

  const shotStyle = weapon.weaponClass === "shotgun" || weaponId === "scattergun"
    ? "shotgun"
    : weapon.weaponClass === "pistol" || weaponId === "sidearm"
      ? "pistol"
      : "rifle";
  return {
    status: "ready",
    weaponId,
    weapon,
    shotStyle,
    pellets: weapon.pellets ?? 1,
    spread: weapon.spread + player.recoil * 0.18,
    chargeMultiplier: weapon.charge ? 0.65 + charge * 0.55 : 1,
  };
}

export function collectWarRoomPlayerHealing(runtime: WarRoomRuntime, now: number) {
  const player = runtime.player;
  const pickup = collectWarRoomHealingPoint(
    runtime.healingPoints,
    player,
    player.x,
    player.z,
    now,
    RESTORE_CONFIG,
  );
  if (pickup.point && pickup.healed > 0) {
    player.lastHitSource = null;
    player.lastHitDamage = 0;
    player.lastHitText = `+${Math.round(pickup.healed)} CAN`;
    player.hitMessageUntil = now + 1.35;
  }
  return pickup;
}

export function advanceWarRoomLootInteraction(
  runtime: WarRoomRuntime,
  input: WarRoomInputState,
  now: number,
) {
  const player = runtime.player;
  const nearbyLoot = getNearbyWarRoomLootChest(runtime);
  if (!input.lootHeld || !nearbyLoot) {
    player.lootChestId = null;
    player.lootStartedAt = 0;
    player.lootProgress = 0;
    return null;
  }

  const chest = nearbyLoot.chest;
  if (player.lootChestId !== chest.id) {
    player.lootChestId = chest.id;
    player.lootStartedAt = now;
    player.lootProgress = 0;
  } else {
    player.lootProgress = Math.min(1, (now - player.lootStartedAt) / 1.8);
  }
  if (player.lootProgress < 1) return null;

  player.lastHitText = applyWarRoomLootChest(player, chest);
  player.lastHitSource = null;
  player.lastHitDamage = 0;
  player.hitMessageUntil = now + 1.6;
  chest.opened = true;
  player.lootChestId = null;
  player.lootStartedAt = 0;
  player.lootProgress = 0;
  input.lootHeld = false;
  return chest;
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
