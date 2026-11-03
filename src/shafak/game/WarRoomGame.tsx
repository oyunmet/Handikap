import { getWarRoomFloorPresentation } from "./war-room-floor-indicator";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useProgress } from "@react-three/drei";
import WarRoomScene3D from "../world/WarRoomScene3D";
import { preloadWarRoomModels } from "../world/WarRoomModels";
import {
  WAR_ROOM_WEAPONS,
  WAR_ROOM_WEAPON_BY_ID,
  WAR_ROOM_WEAPON_MOUNTS,
  type WarRoomWeaponMount,
  type WarRoomWeaponId,
} from "./war-room-data";
import {
  createWarRoomRuntime,
  createWarRoomTrainingRuntime,
  type WarRoomHudSnapshot,
  type WarRoomInputState,
  type WarRoomRuntime,
} from "./war-room-engine";
import { createWarRoomLeaderboard } from "./war-room-leaderboard";
import {
  getWarRoomContractProgress,
  getWarRoomContractReward,
} from "./war-room-contract";
import { getWarRoomDoorOpenProgress } from "./war-room-doors";
import { getWarRoomLoadoutFromProfile, isWarRoomWeaponOwned } from "./war-room-loadout";
import { isWarRoomMuted, playWarRoomSound, resumeWarRoomAudio, setWarRoomMuted } from "./war-room-audio";
import {
  advanceWarRoomKillStreak,
  getWarRoomHealthBand,
  isWarRoomLowHealth,
} from "./war-room-feedback";
import {
  WAR_ROOM_BUILD_VERSION,
  WAR_ROOM_ROOM_CHAIN_ENABLED,
  WAR_ROOM_WEAPON_ICONS_ENABLED,
  WAR_ROOM_WEAPON_LAB_ENABLED,
} from "./war-room-features";
import {
  getNextWarRoomLabWeaponIndex,
  getWarRoomLabWeaponLength,
} from "./war-room-lab";
import { WarRoomWeaponIcon } from "./WarRoomWeaponIcon";
import { HudIcon } from "./HudButton";
import { default as ActionButton } from "./WarRoomActionButton";
import WarRoomBriefing from "./WarRoomBriefing";
import { default as MiniMap } from "./WarRoomMiniMap";
import WarRoomResult, { type WarRoomResultSummary } from "./WarRoomResult";
import type { RenderQuality } from "../world/graphics-quality";
import { isWithinWarRoomDrawCallBudget, WAR_ROOM_DRAW_CALL_BUDGET, type WarRoomFrameStats } from "./war-room-quality";
import {
  type WarRoomLookPointerType,
} from "./war-room-look";
import {
  beginWarRoomJoystick,
  beginWarRoomButtonPointer,
  beginWarRoomLook,
  createWarRoomMobileControlsState,
  endWarRoomMobilePointer,
  getWarRoomAutoFollowYaw,
  getWarRoomTouchControlSide,
  readWarRoomJoystick,
  readWarRoomMouseLook,
  resetWarRoomMobileControls,
  type WarRoomPointerRole,
} from "./war-room-mobile-controls";
import {
  createWarRoomTouchInputState,
  endWarRoomTouch,
  formatWarRoomTouchDiagnostics,
  moveWarRoomTouch,
  resetWarRoomTouchInput,
  startWarRoomTouch,
  WAR_ROOM_TOUCH_JOYSTICK_RADIUS,
} from "./war-room-touch-input";
import {
  beginWarRoomPointer,
  endWarRoomPointer,
  pressWarRoomAction,
  releaseWarRoomAction,
  resolveWarRoomStanceTap,
  setWarRoomMoveVector,
  type WarRoomPointerPosition,
} from "./war-room-input";
import type { PlayerProfile } from "./profile";
import type { WarRoomWeaponSwayLevel } from "./war-room-viewmodel-settings";
import {
  getWarRoomProgressAfterVictory,
  getWarRoomRoom,
  getWarRoomRoomCarryHp,
  getWarRoomRoomRewardMultiplier,
  normalizeWarRoomSavedProgress,
  type WarRoomRoom,
  type WarRoomSavedProgress,
} from "./war-room-rooms";
import { getBossHudPhase, getBossHudPhaseRoman, type BossHudPhase } from "./boss-hud";
import WarRoomControlsEditor from "./WarRoomControlsEditor";
import {
  CONTROLS_CONFIG,
  createDefaultWarRoomControlLayout,
  isWarRoomMovementTouchAllowed,
  loadWarRoomControlLayout,
  saveWarRoomControlLayout,
  type WarRoomControlId,
  type WarRoomControlLayout,
} from "./war-room-controls";
import "./war-room.css";
import "./war-room-layout.css";
import "./war-room-responsive.css";

type Props = {
  onExit: () => void;
  profile: PlayerProfile;
  vibrationEnabled: boolean;
  motionReduced: boolean;
  weaponSway: WarRoomWeaponSwayLevel;
  armsVisible: boolean;
  debugDiagnosticsEnabled: boolean;
  onOpenSettings: () => void;
  settingsOpen: boolean;
  controlsEditorOpen: boolean;
  onCloseControlsEditor: () => void;
  quality: RenderQuality;
};
type Phase = "briefing" | "battle" | "victory" | "defeat";
type CalibrationField = "position" | "rotation" | "scale";
type WarRoomLookDebugSnapshot = {
  yaw: number;
  pitch: number;
  x: number;
  y: number;
  z: number;
  deltaX: number;
  deltaY: number;
};

const GOLD_KEY = "shafak-war-room-gold-v1";
const ROOM_PROGRESS_KEY = "shafak-war-room-room-progress-v1";
const BLOOD_EFFECTS_KEY = "shafak-war-room-blood-effects-v1";

function getWarRoomControlStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readSavedControlLayout() {
  return loadWarRoomControlLayout(getWarRoomControlStorage());
}

function hasKeyboardPointer() {
  return typeof window !== "undefined"
    && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function getControlPlacementStyle(
  id: WarRoomControlId,
  layout: WarRoomControlLayout,
): CSSProperties {
  const definition = CONTROLS_CONFIG.find((control) => control.id === id);
  const position = layout[id];
  if (!definition) return {};
  const width = definition.width * position.size / 100;
  const height = definition.height * position.size / 100;
  return {
    top: `${position.y * 100}%`,
    left: `${position.x * 100}%`,
    right: "auto",
    bottom: "auto",
    width: `${width}px`,
    minWidth: `${width}px`,
    height: `${height}px`,
    minHeight: `${height}px`,
    opacity: position.opacity,
    transform: "translate(-50%, -50%)",
  };
}

function createInputState(): WarRoomInputState {
  return {
    keys: new Set(),
    moveX: 0,
    moveY: 0,
    yaw: 0,
    cameraTargetYaw: 0,
    movementBaseYaw: null,
    manualLookActive: false,
    lookDeltaX: 0,
    lookDeltaY: 0,
    lookPointerType: "touch",
    pitch: -0.08,
    fireHeld: false,
    firePressed: false,
    fireReleased: false,
    aimHeld: false,
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

function isPortraitMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.innerHeight > window.innerWidth
    && (window.innerWidth <= 760
      || (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches));
}

function createEmptyHud(): WarRoomHudSnapshot {
  return {
    player: { x: 0, z: 0, floorHeight: 0, yaw: 0, hp: 220, maxHp: 220, stamina: 100, maxStamina: 100 },
    orientation: {
      facingYaw: 0,
      mode: "HAREKET",
      joystickAngleDegrees: null,
      facingCamera: false,
    },
    enemies: [],
    healingPoints: [],
    regenerationActive: false,
    regenerationWaitSeconds: 0,
    regenerationAtCap: false,
    remaining: 9,
    bossHp: 360,
    bossMaxHp: 360,
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

function recordWarRoomGold(amount: number) {
  try {
    const prior = Number(window.localStorage.getItem(GOLD_KEY) ?? "0");
    const total = (Number.isFinite(prior) ? Math.max(0, prior) : 0) + amount;
    window.localStorage.setItem(GOLD_KEY, String(total));
    return total;
  } catch {
    return null;
  }
}

function readWarRoomRoomProgress(): WarRoomSavedProgress {
  try {
    const serialized = window.localStorage.getItem(ROOM_PROGRESS_KEY);
    return normalizeWarRoomSavedProgress(serialized ? JSON.parse(serialized) : null);
  } catch {
    return normalizeWarRoomSavedProgress(null);
  }
}

function writeWarRoomRoomProgress(progress: WarRoomSavedProgress) {
  try {
    window.localStorage.setItem(ROOM_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Keep the current session's counter available even if storage is disabled.
  }
}

function requestWarRoomImmersiveDisplay() {
  if (typeof window === "undefined") return false;
  const stage = document.querySelector<HTMLElement>(".war-room");
  if (!stage) return false;
  try {
    if (!document.fullscreenElement && typeof stage.requestFullscreen === "function") {
      void stage.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
    }
    const orientation = window.screen.orientation;
    if (typeof orientation?.lock === "function") {
      void orientation.lock("landscape").catch(() => undefined);
    }
  } catch {
    // Fullscreen and orientation locking are optional on mobile browsers.
  }
  return true;
}

export default function WarRoomGame({
  onExit,
  profile,
  vibrationEnabled,
  motionReduced,
  weaponSway,
  armsVisible,
  debugDiagnosticsEnabled,
  onOpenSettings,
  settingsOpen,
  controlsEditorOpen,
  onCloseControlsEditor,
  quality,
}: Props) {
  const { active: modelsLoading, errors: modelErrors, progress: modelProgress } = useProgress();
  const [modelsPreloadStarted, setModelsPreloadStarted] = useState(false);
  useEffect(() => {
    preloadWarRoomModels();
    setModelsPreloadStarted(true);
  }, []);
  const modelsReady = modelsPreloadStarted
    && !modelsLoading
    && (modelProgress >= 100 || modelErrors.length > 0);
  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;
  const weaponLabMode = WAR_ROOM_WEAPON_LAB_ENABLED && searchParams?.get("lab") === "1";
  const [phase, setPhase] = useState<Phase>(() => weaponLabMode ? "battle" : "briefing");
  const [soundMuted, setSoundMuted] = useState(isWarRoomMuted);
  const [bloodEffects, setBloodEffects] = useState(() => {
    try {
      return window.localStorage.getItem(BLOOD_EFFECTS_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const [loadout, setLoadout] = useState<[WarRoomWeaponId, WarRoomWeaponId]>(
    () => weaponLabMode
      ? [WAR_ROOM_WEAPONS[0].id, WAR_ROOM_WEAPONS[0].id]
      : getWarRoomLoadoutFromProfile(profile),
  );
  const [loadoutNotice, setLoadoutNotice] = useState("");
  const [weaponMountOverrides, setWeaponMountOverrides] = useState<Partial<Record<WarRoomWeaponId, WarRoomWeaponMount>>>({});
  const [selectedSlot, setSelectedSlot] = useState<0 | 1>(0);
  const [labWeaponIndex, setLabWeaponIndex] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const [hud, setHud] = useState<WarRoomHudSnapshot>(createEmptyHud);
  const nearbyDoorRef = useRef<WarRoomHudSnapshot["nearbyDoor"]>(null);
  nearbyDoorRef.current = hud.nearbyDoor;
  const [damagePopup, setDamagePopup] = useState<{
    id: number;
    damage: number;
    critical: boolean;
    source: "dealt" | "received";
  } | null>(null);
  const [debugRenderStats, setDebugRenderStats] = useState<WarRoomFrameStats>({
    drawCalls: 0,
    fps: 0,
    frameTimeMs: 0,
    triangles: 0,
  });
  const [lookDebugSnapshot, setLookDebugSnapshot] = useState<WarRoomLookDebugSnapshot>({
    yaw: 0, pitch: 0, x: 0, y: 0, z: 0, deltaX: 0, deltaY: 0,
  });
  const [killConfirmation, setKillConfirmation] = useState<{ id: number; streak: number } | null>(null);
  const previousKillCountRef = useRef(0);
  const killStreakRef = useRef({ count: 0, at: 0 });
  useEffect(() => {
    if (hud.kills < previousKillCountRef.current) {
      previousKillCountRef.current = hud.kills;
      killStreakRef.current = { count: 0, at: 0 };
      setKillConfirmation(null);
      return;
    }
    if (hud.kills > previousKillCountRef.current) {
      killStreakRef.current = advanceWarRoomKillStreak(killStreakRef.current, performance.now());
      setKillConfirmation({ id: hud.kills, streak: killStreakRef.current.count });
      playWarRoomSound("kill", 0.72);
    }
    previousKillCountRef.current = hud.kills;
  }, [hud.kills]);
  useEffect(() => {
    if (!killConfirmation) return undefined;
    const timeout = window.setTimeout(() => setKillConfirmation(null), 1_350);
    return () => window.clearTimeout(timeout);
  }, [killConfirmation?.id]);
  useEffect(() => {
    if (hud.damageEventId <= 0 || hud.lastHitDamage <= 0 || !hud.lastHitSource) {
      setDamagePopup(null);
      return undefined;
    }
    const popup = {
      id: hud.damageEventId,
      damage: hud.lastHitDamage,
      critical: hud.damageNumberCritical,
      source: hud.lastHitSource,
    };
    setDamagePopup(popup);
    const timeout = window.setTimeout(() => {
      setDamagePopup((current) => current?.id === popup.id ? null : current);
    }, 680);
    return () => window.clearTimeout(timeout);
  }, [hud.damageEventId]);
  const bossHudPhase = getBossHudPhase(hud.bossHp, hud.bossMaxHp);
  const [bossPhaseAnnouncement, setBossPhaseAnnouncement] = useState<BossHudPhase | null>(null);
  const previousBossPhaseRef = useRef<number | null>(null);
  const bossPhaseAnnouncementTimerRef = useRef<number | null>(null);
  const [meleeDebugMessage, setMeleeDebugMessage] = useState("");
  const [meleeDebugMessageUntil, setMeleeDebugMessageUntil] = useState(0);
  const [meleeDebugActivity, setMeleeDebugActivity] = useState("");
  const [calibrationCollapsed, setCalibrationCollapsed] = useState(weaponLabMode);
  const [calibrationCoarseStep, setCalibrationCoarseStep] = useState(false);
  const [calibrationJson, setCalibrationJson] = useState("");
  const [calibrationCopyStatus, setCalibrationCopyStatus] = useState("");
  const [exitPrompt, setExitPrompt] = useState(false);
  const [portraitMode, setPortraitMode] = useState(() => isPortraitMobileViewport());
  const [roomNumber, setRoomNumber] = useState(1);
  const [roomProgress, setRoomProgress] = useState(readWarRoomRoomProgress);
  const [savedControlLayout, setSavedControlLayout] = useState(readSavedControlLayout);
  const [controlLayoutDraft, setControlLayoutDraft] = useState<WarRoomControlLayout>(
    () => createDefaultWarRoomControlLayout(),
  );
  const [keyboardHintsVisible, setKeyboardHintsVisible] = useState(hasKeyboardPointer);
  const [dynamicStickActive, setDynamicStickActive] = useState(false);
  const [sprintLockActive, setSprintLockActive] = useState(false);
  const crouchTapAtRef = useRef<number | null>(null);
  const roomProgressRef = useRef(roomProgress);
  useEffect(() => {
    if (phase !== "battle") {
      previousBossPhaseRef.current = null;
      setBossPhaseAnnouncement(null);
      if (bossPhaseAnnouncementTimerRef.current !== null) {
        window.clearTimeout(bossPhaseAnnouncementTimerRef.current);
        bossPhaseAnnouncementTimerRef.current = null;
      }
      return;
    }
    const previousPhase = previousBossPhaseRef.current;
    if (previousPhase !== null && bossHudPhase > previousPhase && hud.bossHp > 0) {
      setBossPhaseAnnouncement(bossHudPhase);
      if (bossPhaseAnnouncementTimerRef.current !== null) {
        window.clearTimeout(bossPhaseAnnouncementTimerRef.current);
      }
      bossPhaseAnnouncementTimerRef.current = window.setTimeout(() => {
        setBossPhaseAnnouncement(null);
        bossPhaseAnnouncementTimerRef.current = null;
      }, 1_500);
    }
    previousBossPhaseRef.current = bossHudPhase;
  }, [bossHudPhase, hud.bossHp, phase]);
  useEffect(() => () => {
    if (bossPhaseAnnouncementTimerRef.current !== null) {
      window.clearTimeout(bossPhaseAnnouncementTimerRef.current);
    }
  }, []);
  const [summary, setSummary] = useState<WarRoomResultSummary | null>(null);
  const runtimeRef = useRef<WarRoomRuntime>(
    weaponLabMode ? createWarRoomTrainingRuntime(loadout) : createWarRoomRuntime(loadout, 0, 1),
  );
  const preparedNextRoomRef = useRef<WarRoomRuntime | null>(null);
  const inputRef = useRef<WarRoomInputState>(createInputState());
  const pointerRef = useRef(new Map<number, WarRoomPointerPosition>());
  const mobileControlsRef = useRef(createWarRoomMobileControlsState());
  const touchInputRef = useRef(createWarRoomTouchInputState());
  const battleStageRef = useRef<HTMLDivElement>(null);
  const fullscreenRequestedRef = useRef(false);
  const settingsPauseRef = useRef(false);
  const orientationPauseRef = useRef(false);
  const portraitModeRef = useRef(portraitMode);
  const stickRef = useRef<HTMLDivElement>(null);
  const debugMode = searchParams?.get("debug") === "1";
  const calibrationMode = weaponLabMode || searchParams?.get("calib") === "1";
  const currentRoom = runtimeRef.current.room;
  const contractProgress = getWarRoomContractProgress(currentRoom.contract, hud);
  const contractBonus = getWarRoomContractReward(currentRoom.contract, contractProgress);
  const floorPresentation = getWarRoomFloorPresentation(
    currentRoom.buildings,
    hud.player.x,
    hud.player.z,
    hud.player.floorHeight,
  );
  const floorLabel = floorPresentation?.label ?? null;
  const controlLayoutEnabled = savedControlLayout.customized;

  useEffect(() => () => {
    if (typeof window === "undefined") return;
    const stage = document.querySelector(".war-room");
    if (fullscreenRequestedRef.current && stage && document.fullscreenElement === stage) {
      void document.exitFullscreen().catch(() => undefined);
    }
    try {
      window.screen.orientation.unlock();
    } catch {
      // Some mobile browsers do not expose orientation unlock.
    }
  }, []);

  const resetTouchControls = useCallback(() => {
    const fireWasHeld = inputRef.current.fireHeld;
    resetWarRoomMobileControls(mobileControlsRef.current);
    resetWarRoomTouchInput(touchInputRef.current);
    inputRef.current.moveX = 0;
    inputRef.current.moveY = 0;
    inputRef.current.movementBaseYaw = null;
    inputRef.current.manualLookActive = false;
    inputRef.current.lookDeltaX = 0;
    inputRef.current.lookDeltaY = 0;
    inputRef.current.keys.clear();
    inputRef.current.fireHeld = false;
    inputRef.current.firePressed = false;
    inputRef.current.fireReleased = fireWasHeld;
    inputRef.current.aimHeld = false;
    inputRef.current.reloadPressed = false;
    inputRef.current.swapPressed = false;
    inputRef.current.jumpPressed = false;
    inputRef.current.dodgePressed = false;
    inputRef.current.crouchPressed = false;
    inputRef.current.pronePressed = false;
    inputRef.current.weaponSlotPressed = null;
    inputRef.current.sprintLocked = false;
    inputRef.current.lootHeld = false;
    inputRef.current.doorPressed = false;
    pointerRef.current.clear();
    stickRef.current?.style.setProperty("--stick-x", "0px");
    stickRef.current?.style.setProperty("--stick-y", "0px");
    stickRef.current?.style.removeProperty("--dynamic-stick-x");
    stickRef.current?.style.removeProperty("--dynamic-stick-y");
    setDynamicStickActive(false);
    setSprintLockActive(false);
  }, []);

  useEffect(() => {
    if (phase !== "battle") return undefined;
    document.documentElement.classList.add("war-room-touch-mode");
    return () => document.documentElement.classList.remove("war-room-touch-mode");
  }, [phase]);

  useEffect(() => {
    const syncOrientation = () => {
      const portrait = isPortraitMobileViewport();
      portraitModeRef.current = portrait;
      setPortraitMode(portrait);
      if (phase !== "battle") {
        orientationPauseRef.current = false;
        return;
      }
      const input = inputRef.current;
      if (portrait && !settingsOpen && !controlsEditorOpen && !exitPrompt) {
        if (!input.paused) {
          orientationPauseRef.current = true;
          input.paused = true;
          input.keys.clear();
          input.fireHeld = false;
          input.fireReleased = true;
          input.firePressed = false;
          input.aimHeld = false;
          input.reloadPressed = false;
          input.swapPressed = false;
          input.jumpPressed = false;
          input.dodgePressed = false;
          input.crouchPressed = false;
          input.pronePressed = false;
          input.weaponSlotPressed = null;
          input.sprintLocked = false;
          input.lootHeld = false;
          input.doorPressed = false;
          runtimeRef.current.player.chargeStartedAt = 0;
          runtimeRef.current.player.meleeInputPending = false;
          resetTouchControls();
        }
        return;
      }
      if (!portrait && orientationPauseRef.current) {
        orientationPauseRef.current = false;
        if (!settingsOpen && !controlsEditorOpen && !exitPrompt && !settingsPauseRef.current) {
          input.paused = false;
        }
      }
    };
    syncOrientation();
    window.addEventListener("resize", syncOrientation, { passive: true });
    window.addEventListener("orientationchange", syncOrientation);
    const screenOrientation = window.screen.orientation;
    screenOrientation?.addEventListener?.("change", syncOrientation);
    return () => {
      window.removeEventListener("resize", syncOrientation);
      window.removeEventListener("orientationchange", syncOrientation);
      screenOrientation?.removeEventListener?.("change", syncOrientation);
    };
  }, [controlsEditorOpen, exitPrompt, phase, resetTouchControls, settingsOpen]);

  const beginBattle = (targetRoomNumber = roomNumber, preparedRuntime?: WarRoomRuntime) => {
    fullscreenRequestedRef.current = requestWarRoomImmersiveDisplay();
    resumeWarRoomAudio();
    const runSeed = preparedRuntime?.room.runSeed
      ?? Math.floor(Math.random() * 4_294_967_296);
    runtimeRef.current = weaponLabMode
      ? createWarRoomTrainingRuntime(loadout)
      : preparedRuntime ?? createWarRoomRuntime(
        loadout,
        0,
        WAR_ROOM_ROOM_CHAIN_ENABLED ? targetRoomNumber : 1,
        runSeed,
      );
    setRoomNumber(runtimeRef.current.room.number);
    preparedNextRoomRef.current = null;
    inputRef.current = createInputState();
    orientationPauseRef.current = false;
    resetTouchControls();
    crouchTapAtRef.current = null;
    setDynamicStickActive(false);
    setSprintLockActive(false);
    setHud(createEmptyHud());
    setMeleeDebugMessage("");
    setMeleeDebugMessageUntil(0);
    setMeleeDebugActivity("");
    setExitPrompt(false);
    setSummary(null);
    setRunKey((key) => key + 1);
    setPhase("battle");
  };

  const finishBattle = useCallback((result: "victory" | "defeat", finalHud: WarRoomHudSnapshot) => {
    const completedRoom = runtimeRef.current.room;
    const contractProgress = getWarRoomContractProgress(completedRoom.contract, finalHud);
    const contractBonus = result === "victory"
      ? getWarRoomContractReward(completedRoom.contract, contractProgress)
      : 0;
    const nextRoom = result === "victory" && WAR_ROOM_ROOM_CHAIN_ENABLED
      ? getWarRoomRoom(completedRoom.number + 1, completedRoom.runSeed)
      : null;
    const baseReward = 90 + finalHud.kills * 7 + finalHud.headshots * 5;
    const gold = result === "victory"
      ? Math.round(baseReward * (
        WAR_ROOM_ROOM_CHAIN_ENABLED ? getWarRoomRoomRewardMultiplier(completedRoom.number) : 1
      )) + contractBonus
      : 0;
    const totalGold = gold > 0 ? recordWarRoomGold(gold) : null;
    if (result === "victory" && WAR_ROOM_ROOM_CHAIN_ENABLED) {
      const updatedProgress = getWarRoomProgressAfterVictory(
        roomProgressRef.current,
        completedRoom.number,
        gold,
      );
      roomProgressRef.current = updatedProgress;
      setRoomProgress(updatedProgress);
      writeWarRoomRoomProgress(updatedProgress);
      const prepared = createWarRoomRuntime(
        loadout,
        0,
        completedRoom.number + 1,
        completedRoom.runSeed,
      );
      prepared.player.hp = getWarRoomRoomCarryHp(finalHud.player.hp, finalHud.player.maxHp);
      preparedNextRoomRef.current = prepared;
    } else {
      preparedNextRoomRef.current = null;
    }
    setHud(finalHud);
    setSummary({
      kills: finalHud.kills,
      headshots: finalHud.headshots,
      accuracy: finalHud.shots > 0 ? Math.round((finalHud.hits / finalHud.shots) * 100) : 0,
      seconds: finalHud.elapsedSeconds,
      gold,
      totalGold,
      roomNumber: completedRoom.number,
      roomName: completedRoom.name,
      commanderTitle: completedRoom.commanderTitle,
      enemyCount: completedRoom.enemyCount,
      nextRoom,
      contract: {
        ...completedRoom.contract,
        progress: contractProgress,
        completed: contractBonus > 0,
      },
      leaderboard: createWarRoomLeaderboard(
        profile.name,
        result,
        finalHud.kills,
        finalHud.headshots,
        runtimeRef.current.enemies,
      ),
    });
    setPhase(result);
  }, [loadout, profile.name]);

  const pauseBattle = useCallback(() => {
    const input = inputRef.current;
    input.paused = true;
    input.keys.clear();
    input.fireHeld = false;
    input.fireReleased = true;
    input.aimHeld = false;
    runtimeRef.current.player.chargeStartedAt = 0;
    runtimeRef.current.player.meleeInputPending = false;
    resetTouchControls();
    setExitPrompt(true);
  }, []);

  useEffect(() => {
    if (!(settingsOpen || controlsEditorOpen) || phase !== "battle" || inputRef.current.paused) return;
    inputRef.current.paused = true;
    settingsPauseRef.current = true;
    inputRef.current.keys.clear();
    inputRef.current.fireHeld = false;
    inputRef.current.fireReleased = true;
    inputRef.current.aimHeld = false;
    runtimeRef.current.player.chargeStartedAt = 0;
    runtimeRef.current.player.meleeInputPending = false;
    resetTouchControls();
  }, [controlsEditorOpen, phase, settingsOpen]);

  useEffect(() => {
    if (settingsOpen || controlsEditorOpen || exitPrompt || !settingsPauseRef.current) return;
    inputRef.current.paused = portraitModeRef.current;
    orientationPauseRef.current = portraitModeRef.current;
    settingsPauseRef.current = false;
  }, [controlsEditorOpen, exitPrompt, settingsOpen]);

  useEffect(() => {
    if (controlsEditorOpen) setControlLayoutDraft(savedControlLayout.layout);
  }, [controlsEditorOpen, savedControlLayout.layout]);

  const saveControlLayoutDraft = () => {
    if (!saveWarRoomControlLayout(getWarRoomControlStorage(), controlLayoutDraft)) return false;
    setSavedControlLayout({ layout: controlLayoutDraft, customized: true });
    onCloseControlsEditor();
    return true;
  };

  const handleRootPointerType = (event: ReactPointerEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("button,[role='button']")) {
      beginWarRoomButtonPointer(mobileControlsRef.current, event.pointerId);
    }
    if (event.pointerType === "touch") {
      setKeyboardHintsVisible(false);
    } else if (hasKeyboardPointer()) {
      setKeyboardHintsVisible(true);
    }
  };

  const handleRootPointerEndCapture = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.type === "pointercancel") touchInputRef.current.pointercancel += 1;
    if (mobileControlsRef.current.roles.get(event.pointerId) === "button") {
      endWarRoomMobilePointer(mobileControlsRef.current, event.pointerId);
    }
  };

  useEffect(() => {
    if (phase !== "battle") return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      const input = inputRef.current;
      const key = event.key.toLowerCase();
      if (input.paused) {
        if (["w", "a", "s", "d", " ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
          event.preventDefault();
        }
        return;
      }
      if (["w", "a", "s", "d", " ", "arrowup", "arrowdown", "arrowleft", "arrowright", "r", "v", "c", "shift", "x", "f", "e"].includes(key)) {
        setKeyboardHintsVisible(true);
      }
      if (["w", "a", "s", "d", " ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
      if (event.repeat && ["r", "v", " ", "c", "shift", "x"].includes(key)) return;
      if (key === "r") pressWarRoomAction(input, "reload");
      else if (key === "v") pressWarRoomAction(input, "swap");
      else if (key === " ") pressWarRoomAction(input, "jump");
      else if (key === "c") pressWarRoomAction(input, "crouch");
      else if (key === "shift") pressWarRoomAction(input, "dodge");
      else if (key === "x") {
        pressWarRoomAction(input, "sprint-lock");
        setSprintLockActive(input.sprintLocked);
      }
      else if (key === "e" && nearbyDoorRef.current) {
        if (!event.repeat) input.doorPressed = true;
      }
      else if (key === "f" || key === "e") input.lootHeld = true;
      else if (key === "escape") pauseBattle();
      if (["w", "a", "s", "d"].includes(key)) input.keys.add(key);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      inputRef.current.keys.delete(event.key.toLowerCase());
      if (["f", "e"].includes(event.key.toLowerCase())) inputRef.current.lootHeld = false;
    };
    const onBlur = () => {
      inputRef.current.keys.clear();
      inputRef.current.fireHeld = false;
      inputRef.current.aimHeld = false;
      inputRef.current.fireReleased = true;
      inputRef.current.lootHeld = false;
      runtimeRef.current.player.meleeInputPending = false;
      runtimeRef.current.player.chargeStartedAt = 0;
      resetTouchControls();
    };
    const onVisibilityChange = () => {
      if (document.hidden) onBlur();
    };
    const preventGesture = (event: Event) => event.preventDefault();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("gesturestart", preventGesture, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("gesturestart", preventGesture);
      inputRef.current.keys.clear();
      inputRef.current.fireHeld = false;
      inputRef.current.aimHeld = false;
    };
  }, [phase, pauseBattle]);

  const closeMode = () => {
    setExitPrompt(false);
    onExit();
  };

  const setLoadoutWeapon = (id: WarRoomWeaponId) => {
    if (!isWarRoomWeaponOwned(id, profile.inventory.ownedItemIds)) {
      const weaponName = WAR_ROOM_WEAPON_BY_ID.get(id)?.name ?? "Bu silah";
      setLoadoutNotice(`${weaponName} henüz satın alınmadı. Mağazadaki Silahlar bölümünden aldıktan sonra burada seçebilirsin.`);
      return;
    }
    setLoadoutNotice("");
    setLoadout((current) => {
      if (current[selectedSlot] === id) return current;
      const next: [WarRoomWeaponId, WarRoomWeaponId] = [...current];
      const otherSlot = selectedSlot === 0 ? 1 : 0;
      if (current[otherSlot] === id) next[otherSlot] = current[selectedSlot];
      next[selectedSlot] = id;
      return next;
    });
  };
  const advanceWeaponLab = () => {
    const nextIndex = getNextWarRoomLabWeaponIndex(labWeaponIndex);
    const nextWeaponId = WAR_ROOM_WEAPONS[nextIndex].id;
    const nextLoadout: [WarRoomWeaponId, WarRoomWeaponId] = [nextWeaponId, nextWeaponId];
    setLabWeaponIndex(nextIndex);
    setLoadout(nextLoadout);
    setSelectedSlot(0);
    runtimeRef.current = createWarRoomTrainingRuntime(nextLoadout);
    inputRef.current = createInputState();
    setHud(createEmptyHud());
    setRunKey((key) => key + 1);
  };
  const updateDebugMount = (
    field: "position" | "rotation",
    index: 0 | 1 | 2,
    value: number,
    weaponId: WarRoomWeaponId,
  ) => {
    setWeaponMountOverrides((current) => {
      const base = current[weaponId] ?? WAR_ROOM_WEAPON_MOUNTS[weaponId];
      const nextVector = [...base[field]] as [number, number, number];
      nextVector[index] = value;
      return { ...current, [weaponId]: { ...base, [field]: nextVector } };
    });
  };
  const updateDebugNumber = (
    field: "scale" | "muzzleOffsetZ",
    value: number,
    weaponId: WarRoomWeaponId,
  ) => {
    setWeaponMountOverrides((current) => ({
      ...current,
      [weaponId]: {
        ...(current[weaponId] ?? WAR_ROOM_WEAPON_MOUNTS[weaponId]),
        [field]: value,
      },
    }));
  };
  const updateCalibrationValue = (
    weaponId: WarRoomWeaponId,
    field: CalibrationField,
    index: 0 | 1 | 2 | null,
    delta: number,
  ) => {
    setWeaponMountOverrides((current) => {
      const base = current[weaponId] ?? WAR_ROOM_WEAPON_MOUNTS[weaponId];
      if (field === "scale") {
        return {
          ...current,
          [weaponId]: {
            ...base,
            scale: Math.max(0.1, Math.min(2, Math.round((base.scale + delta) * 1000) / 1000)),
          },
        };
      }

      const vector = [...base[field]] as [number, number, number];
      const change = field === "rotation" ? delta * Math.PI / 180 : delta;
      const next = vector[index ?? 0] + change;
      vector[index ?? 0] = field === "rotation"
        ? Math.atan2(Math.sin(next), Math.cos(next))
        : Math.max(-1.5, Math.min(1.5, Math.round(next * 10000) / 10000));
      return { ...current, [weaponId]: { ...base, [field]: vector } };
    });
  };
  useEffect(() => {
    setCalibrationJson("");
    setCalibrationCopyStatus("");
  }, [hud.weaponId]);
  const copyCalibrationMount = async (weaponId: WarRoomWeaponId) => {
    const mount = weaponMountOverrides[weaponId] ?? WAR_ROOM_WEAPON_MOUNTS[weaponId];
    const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId);
    const json = JSON.stringify({
      id: weaponId,
      name: weapon?.name,
      mount: {
        position: mount.position.map((value) => Number(value.toFixed(6))),
        rotation: mount.rotation.map((value) => Number(value.toFixed(6))),
        scale: Number(mount.scale.toFixed(4)),
        ...(mount.gripRatio === undefined ? {} : { gripRatio: mount.gripRatio }),
      },
      rotationDegrees: mount.rotation.map((value) => Number((value * 180 / Math.PI).toFixed(2))),
    }, null, 2);
    setCalibrationJson(json);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(json);
      setCalibrationCopyStatus("Panoya kopyalandı.");
    } catch {
      setCalibrationCopyStatus("Panoya erişilemiyor; JSON'u aşağıdan seçip kopyalayın.");
    }
  };

  const pointerTypeForEvent = (event: ReactPointerEvent<HTMLElement>): WarRoomLookPointerType => (
    event.pointerType === "touch" ? "touch" : event.pointerType === "pen" ? "pen" : "mouse"
  );

  const handleActionPointerStart = (event: ReactPointerEvent<HTMLElement>) => {
    beginWarRoomButtonPointer(mobileControlsRef.current, event.pointerId);
    beginWarRoomPointer(pointerRef.current, event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      pointerType: pointerTypeForEvent(event),
    });
  };

  const handleActionPointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    endWarRoomPointer(pointerRef.current, event.pointerId);
    endWarRoomMobilePointer(mobileControlsRef.current, event.pointerId);
  };

  const updateTouchJoystick = (pointerId: number, x: number, y: number) => {
    const gesture = mobileControlsRef.current.joystick;
    const reading = readWarRoomJoystick(mobileControlsRef.current, pointerId, x, y);
    const stick = stickRef.current;
    if (!gesture || !reading) return;
    setWarRoomMoveVector(inputRef.current, reading.x, reading.y);
    inputRef.current.movementBaseYaw = reading.baseYaw;
    if (reading.cameraYaw !== null && !inputRef.current.manualLookActive) {
      inputRef.current.cameraTargetYaw = reading.cameraYaw;
    }
    if (!stick) return;
    stick.style.setProperty("--dynamic-stick-x", `${gesture.originX}px`);
    stick.style.setProperty("--dynamic-stick-y", `${gesture.originY}px`);
    stick.style.setProperty("--stick-x", `${reading.x * 40}px`);
    stick.style.setProperty("--stick-y", `${-reading.y * 40}px`);
  };

  const handleWorldPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const role = mobileControlsRef.current.roles.get(event.pointerId);
    if (role === "joystick" && mobileControlsRef.current.joystick?.pointerId === event.pointerId) {
      updateTouchJoystick(event.pointerId, event.clientX, event.clientY);
      return;
    }
    if (role !== "look") return;
    const delta = readWarRoomMouseLook(
      mobileControlsRef.current,
      event.pointerId,
      event.clientX,
      event.clientY,
    );
    if (!delta) return;
    inputRef.current.lookDeltaX += delta.dx;
    inputRef.current.lookDeltaY += delta.dy;
    inputRef.current.lookPointerType = delta.pointerType;
  };

  const handleWorldPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (
      target?.closest(
        "button,[role='button'],.war-room-vitals,.war-room-ammo,.war-room-minimap,.war-room-hud-settings,.war-room-location-status,.war-room-weapon-debug,.war-room-calibration-panel,.war-room-control-editor",
      )
    ) return;
    if (event.pointerType === "touch") return;
    event.preventDefault();
    resumeWarRoomAudio();

    if (event.button !== 0 && event.button !== 2) return;
    const pointerType = pointerTypeForEvent(event);
    if (!beginWarRoomLook(mobileControlsRef.current, {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      pointerType,
      button: event.button,
    })) return;
    inputRef.current.manualLookActive = true;
    inputRef.current.cameraTargetYaw = inputRef.current.yaw;
    if (pointerType === "mouse" && event.button === 0) {
      pressWarRoomAction(inputRef.current, "fire");
    } else if (pointerType === "mouse" && event.button === 2) {
      pressWarRoomAction(inputRef.current, "aim");
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer cancellation and window blur still clear the look gesture.
    }
  };

  const handleWorldPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const ended = endWarRoomMobilePointer(mobileControlsRef.current, event.pointerId);
    if (ended.endedJoystick) {
      setWarRoomMoveVector(inputRef.current, 0, 0);
      inputRef.current.movementBaseYaw = null;
      setDynamicStickActive(false);
      stickRef.current?.style.setProperty("--stick-x", "0px");
      stickRef.current?.style.setProperty("--stick-y", "0px");
    }
    if (ended.endedLook?.pointerType === "mouse") {
      if (ended.endedLook.button === 0) releaseWarRoomAction(inputRef.current, "fire");
      if (ended.endedLook.button === 2) releaseWarRoomAction(inputRef.current, "aim");
    }
    if (ended.endedLook) {
      inputRef.current.manualLookActive = mobileControlsRef.current.look !== null;
    }
  };

  useEffect(() => {
    if (phase !== "battle") return undefined;
    const stage = battleStageRef.current;
    if (!stage) return undefined;

    const pointerIdForTouch = (identifier: number) => 10_000_000 + identifier;
    const isGameplayTouch = (event: TouchEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      return Boolean(target && stage.contains(target));
    };
    const isHudTarget = (target: Element) => Boolean(target.closest(
      "button,[role='button'],[role='alertdialog'],.war-room-vitals,.war-room-ammo,.war-room-minimap,.war-room-hud-settings,.war-room-location-status,.war-room-weapon-debug,.war-room-weapon-lab,.war-room-calibration-panel,.war-room-control-editor,.war-room-confirm,.war-room-orientation-overlay",
    ));
    const releaseTouch = (identifier: number) => {
      const state = touchInputRef.current;
      if (!state.roles.has(identifier)) return;
      const endedTouch = endWarRoomTouch(state, identifier);
      const endedControl = endWarRoomMobilePointer(
        mobileControlsRef.current,
        pointerIdForTouch(identifier),
      );
      if (endedTouch.endedJoystick || endedControl.endedJoystick) {
        setWarRoomMoveVector(inputRef.current, 0, 0);
        inputRef.current.movementBaseYaw = null;
        setDynamicStickActive(false);
        stickRef.current?.style.setProperty("--stick-x", "0px");
        stickRef.current?.style.setProperty("--stick-y", "0px");
      }
      if (endedTouch.endedLook || endedControl.endedLook) {
        inputRef.current.manualLookActive = mobileControlsRef.current.look !== null;
      }
    };
    const onTouchStart = (event: TouchEvent) => {
      if (!isGameplayTouch(event)) return;
      const target = event.target instanceof Element ? event.target : null;
      const state = touchInputRef.current;
      state.touchstart += event.changedTouches.length;
      if (inputRef.current.paused || !target || isHudTarget(target)) return;
      if (event.cancelable) event.preventDefault();
      setKeyboardHintsVisible(false);
      resumeWarRoomAudio();
      const bounds = stage.getBoundingClientRect();
      for (const touch of Array.from(event.changedTouches)) {
        const side = getWarRoomTouchControlSide(touch.clientX, bounds.left, bounds.width);
        if (!side) continue;
        const x = touch.clientX - bounds.left;
        const y = touch.clientY - bounds.top;
        if (side === "movement" && !isWarRoomMovementTouchAllowed(x, y, bounds.width, bounds.height)) {
          continue;
        }

        const previousIdentifier = side === "movement" ? state.joy.id : state.look.id;
        if (previousIdentifier !== -1 && previousIdentifier !== touch.identifier) {
          releaseTouch(previousIdentifier);
        }

        const role = startWarRoomTouch(state, touch.identifier, x, y, bounds.width);
        if (!role) continue;
        const controlPointerId = pointerIdForTouch(touch.identifier);
        const input = inputRef.current;
        if (role === "joystick") {
          if (!beginWarRoomJoystick(
            mobileControlsRef.current,
            controlPointerId,
            touch.clientX,
            touch.clientY,
            WAR_ROOM_TOUCH_JOYSTICK_RADIUS,
            input.yaw,
          )) {
            endWarRoomTouch(state, touch.identifier);
            continue;
          }
          input.movementBaseYaw = input.yaw;
          input.cameraTargetYaw = input.yaw;
          setDynamicStickActive(true);
          updateTouchJoystick(controlPointerId, touch.clientX, touch.clientY);
        } else {
          if (!beginWarRoomLook(mobileControlsRef.current, {
            pointerId: controlPointerId,
            x: touch.clientX,
            y: touch.clientY,
            pointerType: "touch",
            button: 0,
          })) {
            endWarRoomTouch(state, touch.identifier);
            continue;
          }
          input.manualLookActive = true;
          input.cameraTargetYaw = input.yaw;
          input.lookPointerType = "touch";
        }
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!isGameplayTouch(event)) return;
      const state = touchInputRef.current;
      state.touchmove += event.changedTouches.length;
      let handled = false;
      const bounds = stage.getBoundingClientRect();
      for (const touch of Array.from(event.changedTouches)) {
        const reading = moveWarRoomTouch(
          state,
          touch.identifier,
          touch.clientX - bounds.left,
          touch.clientY - bounds.top,
        );
        if (!reading) continue;
        handled = true;
        const input = inputRef.current;
        const controlPointerId = pointerIdForTouch(touch.identifier);
        if (reading.role === "joystick") {
          updateTouchJoystick(controlPointerId, touch.clientX, touch.clientY);
          input.moveX = reading.moveX;
          input.moveY = reading.moveY;
          const baseYaw = mobileControlsRef.current.joystick?.baseYaw ?? input.yaw;
          input.movementBaseYaw = baseYaw;
          const cameraYaw = getWarRoomAutoFollowYaw(baseYaw, reading.moveX, reading.moveY);
          if (cameraYaw !== null && !input.manualLookActive) {
            input.cameraTargetYaw = cameraYaw;
          }
        } else {
          input.lookDeltaX += reading.dx;
          input.lookDeltaY += reading.dy;
          input.lookPointerType = "touch";
        }
      }
      if (handled && event.cancelable) event.preventDefault();
    };
    const onTouchEnd = (event: TouchEvent) => {
      const state = touchInputRef.current;
      state.touchend += event.changedTouches.length;
      let handled = false;
      for (const touch of Array.from(event.changedTouches)) {
        handled ||= state.roles.has(touch.identifier);
        releaseTouch(touch.identifier);
      }
      if (handled && event.cancelable) event.preventDefault();
    };
    const onTouchCancel = (event: TouchEvent) => {
      const state = touchInputRef.current;
      state.touchcancel += event.changedTouches.length;
      let handled = false;
      for (const touch of Array.from(event.changedTouches)) {
        handled ||= state.roles.has(touch.identifier);
        releaseTouch(touch.identifier);
      }
      if (handled && event.cancelable) event.preventDefault();
    };
    const onOrientationChange = () => resetTouchControls();

    window.addEventListener("touchstart", onTouchStart, { passive: false, capture: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    window.addEventListener("touchend", onTouchEnd, { passive: false, capture: true });
    window.addEventListener("touchcancel", onTouchCancel, { passive: false, capture: true });
    window.addEventListener("orientationchange", onOrientationChange, true);
    return () => {
      window.removeEventListener("touchstart", onTouchStart, true);
      window.removeEventListener("touchmove", onTouchMove, true);
      window.removeEventListener("touchend", onTouchEnd, true);
      window.removeEventListener("touchcancel", onTouchCancel, true);
      window.removeEventListener("orientationchange", onOrientationChange, true);
      resetTouchControls();
    };
  }, [phase, resetTouchControls]);

  return (
    <main
      className="war-room"
      data-phase={phase}
      onPointerDownCapture={handleRootPointerType}
      onPointerUpCapture={handleRootPointerEndCapture}
      onPointerCancelCapture={handleRootPointerEndCapture}
    >
      {phase === "briefing" && (
        <WarRoomBriefing
          room={currentRoom}
          ownedItemIds={profile.inventory.ownedItemIds}
          loadout={loadout}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          onSelectWeapon={setLoadoutWeapon}
          loadoutNotice={loadoutNotice}
          modelsReady={modelsReady}
          modelProgress={modelProgress}
          hasModelErrors={modelErrors.length > 0}
          onExit={closeMode}
          onBegin={() => beginBattle()}
        />
      )}

      {phase === "battle" && (
        <div
          ref={battleStageRef}
          className="war-room-battle"
          onPointerDownCapture={handleWorldPointerDown}
          onPointerUpCapture={handleWorldPointerUp}
          onPointerCancelCapture={handleWorldPointerUp}
          onLostPointerCapture={handleWorldPointerUp}
          onContextMenu={(event) => event.preventDefault()}
          onPointerMoveCapture={handleWorldPointerMove}
        >
          <WarRoomScene3D
            key={runKey}
            runtimeRef={runtimeRef}
            inputRef={inputRef}
            mobileControlsRef={mobileControlsRef}
            weaponIds={runtimeRef.current.player.weaponSlots}
            weaponMountOverrides={weaponMountOverrides}
            cameraMode="first-person"
            motionReduced={motionReduced}
            weaponSway={weaponSway}
            armsVisible={armsVisible}
            shoulderSide="right"
            shoulderOffset={0}
            bloodEffects={bloodEffects}
            trainingMode={weaponLabMode}
            quality={quality}
            debugMode={debugMode}
            debugDiagnosticsEnabled={debugDiagnosticsEnabled}
            onRenderStats={setDebugRenderStats}
            onLookDebugUpdate={setLookDebugSnapshot}
            onMeleeDebugUpdate={(message) => {
              if (message.startsWith("İSABET:") || message.startsWith("ISKA:")) {
                setMeleeDebugMessage(message);
                setMeleeDebugMessageUntil(Date.now() + 2000);
              } else {
                setMeleeDebugActivity(message);
              }
            }}
            onHudUpdate={setHud}
            onFinish={finishBattle}
          />
          {weaponLabMode && (() => {
            const weapon = WAR_ROOM_WEAPONS[labWeaponIndex];
            const measuredLength = getWarRoomLabWeaponLength(weapon);
            return (
              <aside className="war-room-weapon-lab" aria-label="Silah test laboratuvarı">
                <small>SİLAH LAB · {labWeaponIndex + 1}/{WAR_ROOM_WEAPONS.length}</small>
                <strong>{weapon.name}</strong>
                <span>ÖLÇÜLEN UZUNLUK · {measuredLength.toFixed(2)} m</span>
                <span>{weapon.weaponClass === "melee"
                  ? "DURUŞ · 3 HAFİF KOMBO · BASILI TUT: YÜKLÜ SALDIRI · İSABET EFEKTİ · MANKEN"
                  : "DURUŞ · ATEŞ · İSABET EFEKTİ · MANKEN"}
                </span>
                <button type="button" onClick={advanceWeaponLab}>SONRAKİ SİLAH · TEK DOKUNUŞ</button>
              </aside>
            );
          })()}
          {(debugMode || debugDiagnosticsEnabled) && (
            <div className="war-room-camera-debug" aria-label="Kamera ve dokunmatik hata ayıklama">
              <span data-touch-diagnostics={formatWarRoomTouchDiagnostics(touchInputRef.current)}>
                TOUCH {touchInputRef.current.touchstart}/{touchInputRef.current.touchmove}/
                {touchInputRef.current.touchend}/{touchInputRef.current.touchcancel}
                {" · AKTİF "}{[...touchInputRef.current.roles.entries()]
                  .map(([id, role]) => `${id}:${role}`)
                  .join(", ") || "—"}
                {" · HAREKET "}{touchInputRef.current.input.moveX.toFixed(2)},
                {touchInputRef.current.input.moveY.toFixed(2)}
                {" · BAKIŞ "}{touchInputRef.current.input.lookDX.toFixed(1)},
                {touchInputRef.current.input.lookDY.toFixed(1)}
              </span>
              <span>
                YAW {((lookDebugSnapshot.yaw * 180 / Math.PI) % 360).toFixed(1)}°
                {" · PITCH "}{(lookDebugSnapshot.pitch * 180 / Math.PI).toFixed(1)}°
                {" · KONUM "}{lookDebugSnapshot.x.toFixed(2)}, {lookDebugSnapshot.y.toFixed(2)}, {lookDebugSnapshot.z.toFixed(2)}
              </span>
              <span>
                DELTA {lookDebugSnapshot.deltaX.toFixed(1)}, {lookDebugSnapshot.deltaY.toFixed(1)} px
                {" · POINTER "}{[...mobileControlsRef.current.roles.entries()]
                  .map(([id, role]: [number, WarRoomPointerRole]) => `${id}:${role}`)
                  .join(", ") || "—"}
                {" · FPS "}{debugRenderStats.fps.toFixed(0)}
              </span>
            </div>
          )}
          {debugMode && (
            <div className="war-room-melee-debug-result" aria-live="polite">
              <span>
                {`${WAR_ROOM_BUILD_VERSION} · MELEE DEBUG · ${hud.meleePhase} · KOMBO ${hud.meleeComboCount}/3 · ${hud.meleeLastResult}`}
                {meleeDebugMessage && Date.now() < meleeDebugMessageUntil
                  ? ` · ${meleeDebugMessage}`
                  : meleeDebugActivity ? ` · ${meleeDebugActivity}` : ""}
              </span>
              <span>
                YÖN: {hud.orientation.facingCamera ? "YÜZ" : "SIRT"} · MOD: {hud.orientation.mode}
                {" · JOYSTICK: "}
                {hud.orientation.joystickAngleDegrees === null ? "—" : `${hud.orientation.joystickAngleDegrees.toFixed(0)}°`}
                {" · KARAKTER YAW: "}
                {`${Math.round((((hud.orientation.facingYaw * 180 / Math.PI) % 360) + 360) % 360)}°`}
                {" · YENİLENME: "}
                {hud.regenerationActive
                  ? "AKTİF"
                  : hud.regenerationWaitSeconds > 0
                    ? `BEKLİYOR (${hud.regenerationWaitSeconds.toFixed(1)} sn)`
                    : hud.regenerationAtCap ? "SINIRDA" : "KAPALI"}
                {" · HEDEF: "}
                {hud.targetName ?? "—"}
                {" · FİLTRE: "}
                {hud.targetReason}
              </span>
              <span>
                HARİTA: {currentRoom.name} · ÇİZİM: {debugRenderStats.drawCalls}/{WAR_ROOM_DRAW_CALL_BUDGET}
                {" · BÜTÇE: "}{isWithinWarRoomDrawCallBudget(debugRenderStats.drawCalls) ? "OK" : "AŞILDI"}
                {" · FPS: "}{debugRenderStats.fps.toFixed(0)}
                {" · KARE: "}{debugRenderStats.frameTimeMs.toFixed(1)} ms
                {" · ÜÇGEN: "}{debugRenderStats.triangles.toLocaleString("tr-TR")}
              </span>
            </div>
          )}
          {debugMode && !calibrationMode && phase === "battle" && (() => {
            const weaponId = hud.weaponId;
            const mount = weaponMountOverrides[weaponId] ?? WAR_ROOM_WEAPON_MOUNTS[weaponId];
            const controls: Array<{ label: string; field: "position" | "rotation"; index: 0 | 1 | 2; value: number; min: number; max: number; step: number }> = [
              { label: "El X", field: "position", index: 0, value: mount.position[0], min: -0.3, max: 0.3, step: 0.005 },
              { label: "El Y", field: "position", index: 1, value: mount.position[1], min: -0.3, max: 0.3, step: 0.005 },
              { label: "El Z", field: "position", index: 2, value: mount.position[2], min: -0.3, max: 0.3, step: 0.005 },
              { label: "Yön", field: "rotation", index: 1, value: mount.rotation[1], min: -3.14, max: 3.14, step: 0.02 },
            ];
            return (
              <aside className="war-room-weapon-debug" aria-label="Silah elde tutuş ayarları">
                <b>EL AYARI · {WAR_ROOM_WEAPON_BY_ID.get(weaponId)?.name}</b>
                {controls.map((control) => (
                  <label key={control.label}>
                    <span>{control.label} <output>{control.value.toFixed(3)}</output></span>
                    <input type="range" min={control.min} max={control.max} step={control.step} value={control.value}
                      onChange={(event) => updateDebugMount(control.field, control.index, Number(event.currentTarget.value), weaponId)} />
                  </label>
                ))}
                <label>
                  <span>Ölçek <output>{mount.scale.toFixed(2)}</output></span>
                  <input type="range" min="0.45" max="1.3" step="0.01" value={mount.scale}
                    onChange={(event) => updateDebugNumber("scale", Number(event.currentTarget.value), weaponId)} />
                </label>
                <label>
                  <span>Namlu Z <output>{(mount.muzzleOffsetZ ?? 0).toFixed(3)}</output></span>
                  <input type="range" min="-0.25" max="0.25" step="0.005" value={mount.muzzleOffsetZ ?? 0}
                    onChange={(event) => updateDebugNumber("muzzleOffsetZ", Number(event.currentTarget.value), weaponId)} />
                </label>
              </aside>
            );
          })()}
          {calibrationMode && phase === "battle" && (() => {
            const weaponId = hud.weaponId;
            const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId);
            const mount = weaponMountOverrides[weaponId] ?? WAR_ROOM_WEAPON_MOUNTS[weaponId];
            const positionStep = calibrationCoarseStep ? 0.05 : 0.01;
            const rotationStep = calibrationCoarseStep ? 5 : 1;
            const controls = [
              ...(["x", "y", "z"] as const).map((axis, index) => ({
                id: `position-${axis}`,
                label: `KONUM ${axis.toUpperCase()}`,
                field: "position" as const,
                index: index as 0 | 1 | 2,
                value: mount.position[index],
                step: positionStep,
                unit: "m",
                digits: 3,
              })),
              ...(["x", "y", "z"] as const).map((axis, index) => ({
                id: `rotation-${axis}`,
                label: `DÖNÜŞ ${axis.toUpperCase()}`,
                field: "rotation" as const,
                index: index as 0 | 1 | 2,
                value: mount.rotation[index] * 180 / Math.PI,
                step: rotationStep,
                unit: "°",
                digits: 0,
              })),
              {
                id: "scale",
                label: "ÖLÇEK",
                field: "scale" as const,
                index: null,
                value: mount.scale,
                step: calibrationCoarseStep ? 0.05 : 0.01,
                unit: "×",
                digits: 2,
              },
            ];
            return (
              <aside className={`war-room-calibration-panel${calibrationCollapsed ? " is-collapsed" : ""}${weaponLabMode ? " is-lab" : ""}`}
                aria-label="Silah kalibrasyon paneli">
                <header className="war-room-calibration-panel__header">
                  <span>
                    <small>CANLI SİLAH KALİBRASYONU</small>
                    <strong>{weapon?.name ?? weaponId}</strong>
                  </span>
                  <button type="button" aria-label={calibrationCollapsed ? "Kalibrasyonu genişlet" : "Kalibrasyonu daralt"}
                    aria-expanded={!calibrationCollapsed}
                    onClick={() => setCalibrationCollapsed((collapsed) => !collapsed)}>
                    {calibrationCollapsed ? "+" : "−"}
                  </button>
                </header>
                {!calibrationCollapsed && (
                  <>
                    <button className="war-room-calibration-panel__step" type="button"
                      onClick={() => setCalibrationCoarseStep((coarse) => !coarse)}>
                      ADIM: {calibrationCoarseStep ? "BÜYÜK · 0,05 m / 5°" : "KÜÇÜK · 0,01 m / 1°"}
                    </button>
                    <div className="war-room-calibration-panel__controls">
                      {controls.map((control) => (
                        <div className="war-room-calibration-panel__row" key={control.id}>
                          <span>{control.label}</span>
                          <button type="button" aria-label={`${control.label} azalt`}
                            onClick={() => updateCalibrationValue(weaponId, control.field, control.index, -control.step)}>
                            −
                          </button>
                          <output>{control.value.toFixed(control.digits)} {control.unit}</output>
                          <button type="button" aria-label={`${control.label} artır`}
                            onClick={() => updateCalibrationValue(weaponId, control.field, control.index, control.step)}>
                            +
                          </button>
                        </div>
                      ))}
                    </div>
                    <button className="war-room-calibration-panel__copy" type="button"
                      onClick={() => void copyCalibrationMount(weaponId)}>
                      KOPYALA · JSON
                    </button>
                    {calibrationCopyStatus && <small className="war-room-calibration-panel__status" aria-live="polite">{calibrationCopyStatus}</small>}
                    {calibrationJson && <pre className="war-room-calibration-panel__json" aria-label="Kopyalanan silah ayarları">{calibrationJson}</pre>}
                  </>
                )}
              </aside>
            );
          })()}
          <div
            className={`war-room-hud${hud.aiming ? " is-aiming" : ""}${hud.damageVignette ? " is-hit" : ""}${isWarRoomLowHealth(hud.player.hp, hud.player.maxHp) ? " is-low-health" : ""}`}
            data-boss-phase={bossHudPhase}
          >
            <div className="war-room-hud__top">
              <div className="war-room-location-status">
                {WAR_ROOM_ROOM_CHAIN_ENABLED && (
                  <div className="war-room-room-indicator" aria-label={`Oda ${currentRoom.number} / sonsuz`}>
                    <span>ODA</span><b>{currentRoom.number}</b><small>/ ∞</small>
                  </div>
                )}
                {floorLabel && (
                  <div
                    className={`war-room-floor-indicator${floorLabel === "MERDİVEN" ? " is-stair" : ""}`}
                    aria-live="polite"
                    aria-label={`Bulunduğun kat: ${floorLabel}`}
                  >
                    {floorLabel}
                  </div>
                )}
                <div
                  className={`war-room-side-contract${contractBonus > 0 ? " is-complete" : ""}`}
                  role="status"
                  aria-label={`Ek hedef: ${currentRoom.contract.description}, ${contractProgress}/${currentRoom.contract.target}`}
                >
                  <span>EK HEDEF</span>
                  <strong>{currentRoom.contract.title}</strong>
                  <small>{contractProgress}/{currentRoom.contract.target} · +{currentRoom.contract.bonusGold} altın</small>
                </div>
              </div>
              <div className="war-room-kill-feed" aria-live="polite" aria-label="Düşman düşürme bildirimi">
                {hud.killFeed.slice(0, 4).map((feed) => <span key={feed.id}>{feed.text}</span>)}
              </div>
              <div className="war-room-enemies-left">
                <span>KALAN DÜŞMAN</span><b>{String(hud.remaining).padStart(2, "0")}</b>
              </div>
              <MiniMap hud={hud} room={currentRoom} />
            </div>
            <div className="war-room-hud-settings" role="group" aria-label="Oyun seçenekleri">
              <button
                className="war-room-settings"
                type="button"
                aria-label="Oyun ayarlarını aç"
                title="Oyun ayarları"
                onClick={onOpenSettings}
              >
                ⚙
              </button>
              <button
                className="war-room-blood"
                type="button"
                aria-pressed={bloodEffects}
                aria-label={bloodEffects ? "Kan efektlerini kapat" : "Hafif kan efektlerini aç"}
                onClick={() => {
                  const nextEnabled = !bloodEffects;
                  setBloodEffects(nextEnabled);
                  try {
                    window.localStorage.setItem(BLOOD_EFFECTS_KEY, nextEnabled ? "light" : "off");
                  } catch {
                    // Keep the in-session toggle usable when browser storage is unavailable.
                  }
                }}
              >
                KAN: {bloodEffects ? "HAFİF" : "KAPALI"}
              </button>
              <button
                className="war-room-mute"
                type="button"
                aria-pressed={soundMuted}
                aria-label={soundMuted ? "Sesi aç" : "Sesi kapat"}
                onClick={() => {
                  const nextMuted = !soundMuted;
                  setSoundMuted(nextMuted);
                  setWarRoomMuted(nextMuted);
                }}
              >
                {soundMuted ? "SES AÇ" : "SESSİZ"}
              </button>
            </div>
            {hud.bossHp > 0 && hud.bossMaxHp > 0 && (
            <div className="war-room-commander" data-boss-phase={bossHudPhase}>
              <div className="war-room-commander__identity">
                <span>{currentRoom.commanderTitle.toLocaleUpperCase("tr-TR")}</span>
                <b>{currentRoom.commanderName.toLocaleUpperCase("tr-TR")}</b>
              </div>
              <div className="war-room-commander__health">
                <small>FAZ {getBossHudPhaseRoman(bossHudPhase)}</small>
                <strong>{Math.ceil(hud.bossHp)} / {hud.bossMaxHp}</strong>
              </div>
              <i><em style={{ width: `${Math.max(0, (hud.bossHp / hud.bossMaxHp) * 100)}%` }} /></i>
            </div>
            )}
            {bossPhaseAnnouncement !== null && (
              <div className="war-room-boss-phase" role="status" aria-live="polite">
                <small>KOMUTAN</small>
                <b>FAZ {getBossHudPhaseRoman(bossPhaseAnnouncement)}</b>
              </div>
            )}
            <div className={`war-room-crosshair${hud.targetVisible ? " is-target" : ""}${hud.hitMarker ? " is-hit" : ""}${hud.headshotMarker ? " is-headshot" : ""}${hud.aiming ? " is-zoomed" : ""}${hud.firing ? " is-firing" : ""}`} aria-label={hud.hitMarker ? "İsabet" : hud.targetVisible ? "Hedef nişangâhta" : "Nişangâh"}>
              <i /><i /><i /><i />
            </div>
            {killConfirmation && (
              <div className="war-room-kill-confirmation" key={killConfirmation.id} role="status" aria-live="polite">
                <strong>ELENDİ</strong>
                {killConfirmation.streak > 1 && <span>×{killConfirmation.streak} SERİ</span>}
              </div>
            )}
            {hud.damageVignette && (
              <div
                className="war-room-hit-direction"
                style={{ transform: `translate(-50%, -50%) rotate(${(hud.damageDirection * 180) / Math.PI}deg)` }}
                aria-hidden="true"
              >▼</div>
            )}
              <div className="war-room-notice" aria-live="polite">
                {hud.hitMessage && hud.lastHitSource === null && (
                  <span key={hud.hitMessage}>{hud.hitMessage}</span>
                )}
            </div>
            <div className="war-room-hud__bottom">
              <div className={`war-room-vitals${hud.damageVignette ? " is-damaged" : ""}`}>
                <div className="war-room-bar-row">
                  <span>CAN{hud.regenerationActive ? " · YENİLENİYOR" : ""}</span>
                  <b>{Math.ceil(hud.player.hp)} / {hud.player.maxHp}</b>
                </div>
                <i className={`war-room-bar${hud.regenerationActive ? " is-regenerating" : ""}`}>
                    <em
                      className={`is-health ${getWarRoomHealthBand(hud.player.hp, hud.player.maxHp)}`}
                      style={{ width: `${Math.max(0, (hud.player.hp / hud.player.maxHp) * 100)}%` }}
                    />
                </i>
                <div className="war-room-bar-row">
                  <span>DAYANIKLILIK</span><b>{Math.ceil(hud.player.stamina)}%</b>
                </div>
                <i className="war-room-bar"><em className="is-stamina" style={{ width: `${Math.max(0, hud.player.stamina)}%` }} /></i>
              </div>
              <div className={`war-room-ammo${hud.magazine <= 0 && !hud.reloading ? " is-empty" : ""}`}>
                <span>
                  {WAR_ROOM_WEAPON_BY_ID.get(hud.weaponId)?.name ?? "Silah"}
                  <small>{WAR_ROOM_WEAPON_BY_ID.get(hud.weaponId)?.className ?? ""}</small>
                </span>
                {WAR_ROOM_WEAPON_BY_ID.get(hud.weaponId)?.weaponClass !== "melee" && (
                  <HudIcon
                    icon={hud.reloading ? "magazine" : "ammo"}
                    className="war-room-ammo__icon"
                  />
                )}
                {WAR_ROOM_WEAPON_BY_ID.get(hud.weaponId)?.weaponClass === "melee" ? (
                  <strong className="war-room-ammo__melee" aria-label="Sınırsız kullanım">
                    {WAR_ROOM_WEAPON_ICONS_ENABLED
                      ? <WarRoomWeaponIcon className="war-room-ammo__weapon-icon" weaponId={hud.weaponId} />
                      : WAR_ROOM_WEAPON_BY_ID.get(hud.weaponId)?.icon} ∞
                  </strong>
                ) : (
                  <strong className={hud.magazine <= 0 && !hud.reloading ? "is-empty" : ""}>
                    {hud.reloading
                      ? "DOLDURULUYOR"
                      : <>{hud.magazine}<small> / {hud.reserve}</small></>}
                  </strong>
                )}
                {hud.reloading && WAR_ROOM_WEAPON_BY_ID.get(hud.weaponId)?.weaponClass !== "melee" && (
                  <i className="war-room-reload-progress" role="progressbar" aria-label="Şarjör dolduruluyor"
                    aria-valuemin={0} aria-valuemax={100}>
                    <em style={{ animationDuration: `${WAR_ROOM_WEAPON_BY_ID.get(hud.weaponId)?.reloadSeconds ?? 2}s` }} />
                  </i>
                )}
                <small>
                  {WAR_ROOM_WEAPON_BY_ID.get(hud.weaponId)?.weaponClass === "melee"
                    ? "KISA BAS: SALDIR · BASILI TUT: GÜÇLÜ"
                    : hud.magazine <= 0 && !hud.reloading
                      ? keyboardHintsVisible ? "R: DOLDUR" : "DOLDUR"
                    : keyboardHintsVisible
                      ? "R: DOLDUR · V: SİLAH DEĞİŞTİR"
                      : "DOLDUR · SİLAH SEÇ"}
                </small>
              </div>
              <div className={`war-room-touch-layout${controlLayoutEnabled ? " is-custom-layout" : ""}`}>
              <div
                className={`war-room-weapon-select${controlLayoutEnabled ? " is-custom-layout" : ""}`}
                role="group"
                aria-label="Silah seçimi"
                style={controlLayoutEnabled ? getControlPlacementStyle("weapon-select", savedControlLayout.layout) : undefined}
              >
                {hud.weaponSlots.map((weaponId, slot) => {
                  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId);
                  const active = hud.weaponId === weaponId;
                  return (
                    <button
                      key={`${slot}-${weaponId}`}
                      type="button"
                      className={`war-room-weapon-slot${active ? " is-active" : ""}`}
                      aria-label={`${slot + 1}. silah: ${weapon?.name ?? "Silah"}${active ? ", seçili" : ""}`}
                      title={weapon?.name ?? "Silah"}
                      aria-pressed={active}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!active) pressWarRoomAction(inputRef.current, "weapon-slot", slot);
                      }}
                    >
                      <span className="war-room-weapon-slot__key">{slot + 1}</span>
                      <span className="war-room-weapon-slot__icon" aria-hidden="true">
                        {weapon?.icon ?? "—"}
                      </span>
                      <span className="war-room-weapon-slot__name">{weapon?.name ?? "Silah"}</span>
                    </button>
                  );
                })}
              </div>
              <div className={`war-room-controls${controlLayoutEnabled ? " is-custom-layout" : ""}`}>
                <ActionButton
                  label="Nişan"
                  hint="SAĞ TIK"
                  showHint={keyboardHintsVisible}
                  vibrationEnabled={vibrationEnabled}
                  className={`is-aim${hud.aiming ? " is-active" : ""}`}
                  style={controlLayoutEnabled ? getControlPlacementStyle("aim", savedControlLayout.layout) : undefined}
                  onPointerStart={handleActionPointerStart}
                  onPointerEnd={handleActionPointerEnd}
                  onDown={() => pressWarRoomAction(inputRef.current, "aim")}
                  onUp={() => releaseWarRoomAction(inputRef.current, "aim")}
                />
                {WAR_ROOM_WEAPON_BY_ID.get(hud.weaponId)?.weaponClass === "melee" ? (
                  <ActionButton
                    label="Hafif"
                    title="Hafif saldırı"
                    hint="DOKUN"
                    showHint={keyboardHintsVisible}
                    vibrationEnabled={vibrationEnabled}
                    icon="knife"
                    className="is-reload is-melee-light"
                    style={controlLayoutEnabled ? getControlPlacementStyle("reload", savedControlLayout.layout) : undefined}
                    onClick={() => {
                      inputRef.current.firePressed = true;
                      inputRef.current.fireReleased = true;
                    }}
                  />
                ) : (
                  <ActionButton
                    label="Doldur"
                    hint="R"
                    showHint={keyboardHintsVisible}
                    vibrationEnabled={vibrationEnabled}
                    className={`is-reload${hud.reloading ? " is-active is-reloading" : ""}`}
                    style={controlLayoutEnabled ? getControlPlacementStyle("reload", savedControlLayout.layout) : undefined}
                    onClick={() => pressWarRoomAction(inputRef.current, "reload")}
                  />
                )}
                <ActionButton
                  label="Zıpla"
                  hint="SPACE"
                  showHint={keyboardHintsVisible}
                  vibrationEnabled={vibrationEnabled}
                  className="is-jump"
                  style={controlLayoutEnabled ? getControlPlacementStyle("jump", savedControlLayout.layout) : undefined}
                  onClick={() => pressWarRoomAction(inputRef.current, "jump")}
                />
                <ActionButton
                  label="Çömel"
                  hint="C"
                  showHint={keyboardHintsVisible}
                  vibrationEnabled={vibrationEnabled}
                  title="Çift dokunuş: yat"
                  className={`is-dodge${hud.crouched ? " is-active" : ""}`}
                  style={controlLayoutEnabled ? getControlPlacementStyle("dodge", savedControlLayout.layout) : undefined}
                  onClick={() => {
                    const result = resolveWarRoomStanceTap(crouchTapAtRef.current, performance.now());
                    crouchTapAtRef.current = result.nextTapAt;
                    if (result.action === "prone") {
                      inputRef.current.crouchPressed = false;
                      inputRef.current.pronePressed = true;
                    } else {
                      inputRef.current.crouchPressed = true;
                    }
                  }}
                />
                <ActionButton
                  label="Koşu"
                  hint="X"
                  showHint={keyboardHintsVisible}
                  vibrationEnabled={vibrationEnabled}
                  className={`is-sprint-lock${sprintLockActive ? " is-active" : ""}`}
                  style={controlLayoutEnabled ? getControlPlacementStyle("sprint-lock", savedControlLayout.layout) : undefined}
                  onClick={() => {
                    pressWarRoomAction(inputRef.current, "sprint-lock");
                    setSprintLockActive(inputRef.current.sprintLocked);
                  }}
                />
                <ActionButton
                  label="Değiştir"
                  title="Silahı değiştir"
                  hint="V"
                  showHint={keyboardHintsVisible}
                  vibrationEnabled={vibrationEnabled}
                  className="is-swap"
                  style={controlLayoutEnabled ? getControlPlacementStyle("swap", savedControlLayout.layout) : undefined}
                  onClick={() => pressWarRoomAction(inputRef.current, "swap")}
                />
                <ActionButton
                  label={WAR_ROOM_WEAPON_BY_ID.get(hud.weaponId)?.weaponClass === "melee" ? "Saldır" : "Ateş"}
                  title={WAR_ROOM_WEAPON_BY_ID.get(hud.weaponId)?.weaponClass === "melee"
                    ? "Yakın dövüş saldırısı"
                    : "Ateş et"}
                  icon={WAR_ROOM_WEAPON_BY_ID.get(hud.weaponId)?.weaponClass === "melee" ? "melee-heavy" : undefined}
                  vibrationEnabled={vibrationEnabled}
                  className="is-fire"
                  style={controlLayoutEnabled ? getControlPlacementStyle("fire", savedControlLayout.layout) : undefined}
                  onPointerStart={handleActionPointerStart}
                  onPointerEnd={handleActionPointerEnd}
                  onDown={() => {
                    resumeWarRoomAudio();
                    pressWarRoomAction(inputRef.current, "fire");
                  }}
                  onUp={() => releaseWarRoomAction(inputRef.current, "fire")}
                />
              </div>
              <div
                ref={stickRef}
        className={`war-room-stick is-dynamic${dynamicStickActive ? " is-active" : ""}`}
        aria-hidden="true"
              >
                <HudIcon icon="move" className="war-room-stick__move-icon" />
                <i aria-hidden="true" />
              </div>
              </div>
            </div>
            <button className="war-room-pause" type="button" onClick={pauseBattle}>DURAKLAT · ÇIK</button>
          </div>
          {hud.nearbyDoor && (
            <button
              className={`war-room-door-action${hud.nearbyDoor.openProgress > 0.95 ? " is-open" : ""}`}
              type="button"
              aria-label={`Kapıyı aç: ${hud.nearbyDoor.id}`}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                inputRef.current.doorPressed = true;
              }}
            >
              <span>{hud.nearbyDoor.openProgress > 0.95 ? "KAPI AÇIK" : "KAPIYI AÇ"}</span>
              <small>{hud.nearbyDoor.openProgress > 0.95
                ? `AÇIK · ${hud.nearbyDoor.secondsRemaining.toFixed(1)} SN · E`
                : "BAS · KAPI 6 SN AÇIK KALIR · E"}</small>
            </button>
          )}
          {hud.nearbyLootChest && (
            <button
              className={`war-room-loot-action${hud.nearbyLootChest.progress > 0 ? " is-opening" : ""}`}
              type="button"
              aria-label={`Sandığı aç: ${hud.nearbyLootChest.contents}`}
              onContextMenu={(event) => event.preventDefault()}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                inputRef.current.lootHeld = true;
              }}
              onPointerUp={(event) => {
                event.preventDefault();
                event.stopPropagation();
                inputRef.current.lootHeld = false;
              }}
              onPointerCancel={() => {
                inputRef.current.lootHeld = false;
              }}
              onLostPointerCapture={() => {
                inputRef.current.lootHeld = false;
              }}
            >
              <span>{hud.nearbyLootChest.progress > 0 ? "ALINIYOR" : "AL"}</span>
              <strong>{hud.nearbyLootChest.contents}</strong>
              <small>{hud.nearbyLootChest.progress > 0
                ? `%${Math.round(hud.nearbyLootChest.progress * 100)}`
                : keyboardHintsVisible ? "F / E TUŞUNA BASILI TUT" : "BASILI TUT"}</small>
            </button>
          )}
          {damagePopup && (
            <div
              key={damagePopup.id}
              className={`war-room-damage-number${damagePopup.critical ? " is-critical" : ""}${damagePopup.source === "received" ? " is-received" : ""}`}
              aria-hidden="true"
            >
              {damagePopup.source === "received"
                ? `−${damagePopup.damage} CAN`
                : `−${damagePopup.damage}`}
            </div>
          )}
          {exitPrompt && (
            <div className="war-room-confirm" role="alertdialog" aria-modal="true" aria-label="Savaş odasından çık">
              <section>
                <span className="war-room-eyebrow">GÖREV DURDURULACAK</span>
                <h2>Savaştan çıkılsın mı?</h2>
                <p>Bu karşılaşmanın ilerlemesi kaydedilmez.</p>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      inputRef.current.paused = portraitModeRef.current;
                      orientationPauseRef.current = portraitModeRef.current;
                      setExitPrompt(false);
                    }}
                  >
                    DEVAM ET
                  </button>
                  <button type="button" className="is-danger" onClick={closeMode}>ÇIKIŞ</button>
                </div>
              </section>
            </div>
          )}
          {portraitMode && (
            <div className="war-room-orientation-overlay" role="alertdialog" aria-modal="true">
              <div>
                <span className="war-room-orientation-overlay__icon" aria-hidden="true">↻</span>
                <h2>Telefonu yatay çevir</h2>
                <p>Savaşın devam etmesi için ekranı yatay konuma getir.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {(phase === "victory" || phase === "defeat") && summary && (
        <WarRoomResult
          phase={phase}
          summary={summary}
          roomProgress={roomProgress}
          onNextRoom={() => beginBattle(summary.nextRoom!.number, preparedNextRoomRef.current ?? undefined)}
          onRetryRoom={() => beginBattle(summary.roomNumber)}
          onRestart={() => beginBattle(1)}
          onExit={closeMode}
        />
      )}
      {controlsEditorOpen && (
        <WarRoomControlsEditor
          layout={controlLayoutDraft}
          onChange={setControlLayoutDraft}
          onSave={saveControlLayoutDraft}
          onCancel={onCloseControlsEditor}
        />
      )}
    </main>
  );
}
