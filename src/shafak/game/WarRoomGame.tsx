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
import { createWarRoomLeaderboard, type WarRoomLeaderboardEntry } from "./war-room-leaderboard";
import { getWarRoomBuildingLocalPoint } from "./war-room-rooms";
import { getWarRoomLoadoutFromProfile, isWarRoomWeaponOwned } from "./war-room-loadout";
import { isWarRoomMuted, playWarRoomSound, resumeWarRoomAudio, setWarRoomMuted } from "./war-room-audio";
import { advanceWarRoomKillStreak, isWarRoomLowHealth } from "./war-room-feedback";
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
import { HudButton, HudIcon, type HudButtonIconKey } from "./HudButton";
import { playGameButtonClick } from "../audio/howler";
import type { RenderQuality } from "../world/graphics-quality";
import { isWithinWarRoomDrawCallBudget, WAR_ROOM_DRAW_CALL_BUDGET, type WarRoomFrameStats } from "./war-room-quality";
import { applyWarRoomLookDelta, type WarRoomLookPointerType } from "./war-room-look";
import type { WarRoomFacingSetting } from "./war-room-orientation";
import {
  beginWarRoomPointer,
  endWarRoomPointer,
  moveWarRoomPointer,
  pressWarRoomAction,
  releaseWarRoomAction,
  resolveWarRoomStanceTap,
  setWarRoomMoveVector,
  type WarRoomPointerPosition,
} from "./war-room-input";
import type { PlayerProfile } from "./profile";
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
  invertLookY: boolean;
  onInvertLookYChange: (value: boolean) => void;
  facingSetting: WarRoomFacingSetting;
  lookSensitivityX: number;
  lookSensitivityY: number;
  aimSensitivityMultiplier: number;
  joystickMode: "dynamic" | "fixed";
  cameraMode: "first-person" | "third-person";
  shoulderSide: "left" | "right";
  shoulderOffset: number;
  onOpenSettings: () => void;
  settingsOpen: boolean;
  controlsEditorOpen: boolean;
  onCloseControlsEditor: () => void;
  quality: RenderQuality;
};
type Phase = "briefing" | "battle" | "victory" | "defeat";
type CalibrationField = "position" | "rotation" | "scale";

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

function createInputState(facingSetting: WarRoomFacingSetting): WarRoomInputState {
  return {
    keys: new Set(),
    moveX: 0,
    moveY: 0,
    yaw: 0,
    pitch: -0.08,
    facingSetting,
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
    paused: false,
  };
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
  };
}

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
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

function ActionButton({
  label,
  hint,
  className = "",
  showHint = false,
  vibrationEnabled = false,
  style,
  icon,
  title,
  onDown,
  onUp,
  onClick,
  onPointerStart,
  onPointerMove,
  onPointerEnd,
}: {
  label: string;
  hint?: string;
  className?: string;
  showHint?: boolean;
  vibrationEnabled?: boolean;
  style?: CSSProperties;
  icon?: HudButtonIconKey;
  title?: string;
  onDown?: () => void;
  onUp?: () => void;
  onClick?: () => void;
  onPointerStart?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerEnd?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const pointer = useRef<number | null>(null);
  const [held, setHeld] = useState(false);
  const actionIcon: HudButtonIconKey = icon ?? (
    className.includes("fire") ? "fire"
      : className.includes("aim") ? "aim"
        : className.includes("melee-heavy") ? "melee-heavy"
          : className.includes("melee-light") ? "knife"
            : className.includes("reload") ? "reload"
              : className.includes("jump") ? "jump"
                : className.includes("dodge") ? "crouch"
                  : className.includes("sprint") ? "sprint"
                    : className.includes("swap") ? "swap"
                      : "weapon"
  );
  const playFeedback = () => {
    if (!isWarRoomMuted()) playGameButtonClick();
    if (vibrationEnabled && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(8); } catch { /* Haptics are optional. */ }
    }
  };
  return (
    <HudButton
      type="button"
      icon={actionIcon}
      label={label}
      title={title}
      keyboardHint={showHint ? hint : undefined}
      held={held}
      className={`war-room-control${showHint && hint ? " has-keyboard-hint" : ""} ${className}`}
      style={style}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        setHeld(true);
        onPointerStart?.(event);
        onDown?.();
        playFeedback();
      }}
      onPointerMove={(event) => {
        if (pointer.current === event.pointerId) onPointerMove?.(event);
      }}
      onPointerUp={(event) => {
        if (pointer.current !== event.pointerId) return;
        pointer.current = null;
        setHeld(false);
        onPointerEnd?.(event);
        onUp?.();
        onClick?.();
      }}
      onPointerCancel={(event) => {
        if (pointer.current !== event.pointerId) return;
        pointer.current = null;
        setHeld(false);
        onPointerEnd?.(event);
        onUp?.();
      }}
      onLostPointerCapture={(event) => {
        if (pointer.current !== event.pointerId) return;
        pointer.current = null;
        setHeld(false);
        onPointerEnd?.(event);
        onUp?.();
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (event.detail === 0) {
          onClick?.();
          playFeedback();
        }
      }}
    />
  );
}

function MiniMap({ hud }: { hud: WarRoomHudSnapshot }) {
  const pointX = (x: number) => 9 + ((Math.max(-34, Math.min(34, x)) + 34) / 68) * 102;
  const pointY = (z: number) => 9 + ((Math.max(-34, Math.min(34, z)) + 34) / 68) * 102;
  return (
    <svg className="war-room-minimap" viewBox="0 0 120 120" role="img" aria-label="Savaş alanı mini haritası">
      <rect x="2" y="2" width="116" height="116" rx="14" />
      <path d="M12 12h96v96H12zM60 12v96M12 60h96" />
      {hud.enemies.map((enemy) => enemy.alive && (
        <circle
          key={enemy.id}
          className={enemy.commander ? "is-commander" : ""}
          cx={pointX(enemy.x)}
          cy={pointY(enemy.z)}
          r={enemy.commander ? 4.8 : 2.8}
        />
      ))}
      {hud.healingPoints.map((point) => (
        <circle
          key={`heal-${point.id}`}
          className={`is-heal-point${point.available ? "" : " is-depleted"}`}
          cx={pointX(point.x)}
          cy={pointY(point.z)}
          r={3.2}
        />
      ))}
      <path
        className="war-room-minimap__player"
        d="M60 53 65 66 60 63 55 66Z"
        transform={`translate(${pointX(hud.player.x) - 60} ${pointY(hud.player.z) - 60}) rotate(${(hud.player.yaw * 180) / Math.PI} ${pointX(hud.player.x)} ${pointY(hud.player.z)})`}
      />
    </svg>
  );
}

export default function WarRoomGame({
  onExit,
  profile,
  vibrationEnabled,
  motionReduced,
  invertLookY,
  onInvertLookYChange,
  facingSetting,
  lookSensitivityX,
  lookSensitivityY,
  aimSensitivityMultiplier,
  joystickMode,
  cameraMode,
  shoulderSide,
  shoulderOffset,
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
  const [damagePopup, setDamagePopup] = useState<{
    id: number;
    damage: number;
    critical: boolean;
    source: "dealt" | "received";
  } | null>(null);
  const [debugRenderStats, setDebugRenderStats] = useState<WarRoomFrameStats>({ drawCalls: 0, fps: 0 });
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
    if (previousPhase !== null && bossHudPhase > previousPhase) {
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
  }, [bossHudPhase, phase]);
  useEffect(() => () => {
    if (bossPhaseAnnouncementTimerRef.current !== null) {
      window.clearTimeout(bossPhaseAnnouncementTimerRef.current);
    }
  }, []);
  const [summary, setSummary] = useState<{
    kills: number;
    headshots: number;
    accuracy: number;
    seconds: number;
    gold: number;
    totalGold: number | null;
    roomNumber: number;
    roomName: string;
    commanderTitle: string;
    enemyCount: number;
    nextRoom: WarRoomRoom | null;
    leaderboard: WarRoomLeaderboardEntry[];
  } | null>(null);
  const runtimeRef = useRef<WarRoomRuntime>(
    weaponLabMode ? createWarRoomTrainingRuntime(loadout) : createWarRoomRuntime(loadout, 0, 1),
  );
  const preparedNextRoomRef = useRef<WarRoomRuntime | null>(null);
  const inputRef = useRef<WarRoomInputState>(createInputState(facingSetting));
  const pointerRef = useRef(new Map<number, WarRoomPointerPosition>());
  const settingsPauseRef = useRef(false);
  const stickRef = useRef<HTMLDivElement>(null);
  const stickPointerRef = useRef<number | null>(null);
  const dynamicStickOriginRef = useRef<{ x: number; y: number } | null>(null);
  const debugMode = searchParams?.get("debug") === "1";
  const calibrationMode = weaponLabMode || searchParams?.get("calib") === "1";
  const currentRoom = runtimeRef.current.room;
  const floorBuilding = currentRoom.buildings.find((building) => {
    const local = getWarRoomBuildingLocalPoint(building, hud.player.x, hud.player.z);
    return Math.abs(local.x) < building.width / 2 - 0.28
      && Math.abs(local.z) < building.depth / 2 - 0.28;
  });
  const floorProgress = floorBuilding
    ? Math.max(0, Math.min(1, hud.player.floorHeight / floorBuilding.storyHeight))
    : 0;
  const floorLabel = !floorBuilding
    ? null
    : floorProgress >= 0.78
      ? "ÜST KAT"
      : floorProgress > 0.05
        ? "MERDİVEN ↑"
        : "ALT KAT";
  const controlLayoutEnabled = savedControlLayout.customized;

  const beginBattle = (targetRoomNumber = roomNumber, preparedRuntime?: WarRoomRuntime) => {
    resumeWarRoomAudio();
    runtimeRef.current = weaponLabMode
      ? createWarRoomTrainingRuntime(loadout)
      : preparedRuntime ?? createWarRoomRuntime(
        loadout,
        0,
        WAR_ROOM_ROOM_CHAIN_ENABLED ? targetRoomNumber : 1,
      );
    setRoomNumber(runtimeRef.current.room.number);
    preparedNextRoomRef.current = null;
    inputRef.current = createInputState(facingSetting);
    pointerRef.current.clear();
    stickPointerRef.current = null;
    dynamicStickOriginRef.current = null;
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
    const nextRoom = result === "victory" && WAR_ROOM_ROOM_CHAIN_ENABLED
      ? getWarRoomRoom(completedRoom.number + 1)
      : null;
    const baseReward = 90 + finalHud.kills * 7 + finalHud.headshots * 5;
    const gold = result === "victory"
      ? Math.round(baseReward * (
        WAR_ROOM_ROOM_CHAIN_ENABLED ? getWarRoomRoomRewardMultiplier(completedRoom.number) : 1
      ))
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
      const prepared = createWarRoomRuntime(loadout, 0, completedRoom.number + 1);
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

  useEffect(() => {
    inputRef.current.facingSetting = facingSetting;
  }, [facingSetting]);

  const pauseBattle = useCallback(() => {
    const input = inputRef.current;
    input.paused = true;
    input.keys.clear();
    input.fireHeld = false;
    input.fireReleased = true;
    input.aimHeld = false;
    runtimeRef.current.player.chargeStartedAt = 0;
    runtimeRef.current.player.meleeInputPending = false;
    pointerRef.current.clear();
    stickPointerRef.current = null;
    dynamicStickOriginRef.current = null;
    setDynamicStickActive(false);
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
    pointerRef.current.clear();
    stickPointerRef.current = null;
    dynamicStickOriginRef.current = null;
    setDynamicStickActive(false);
  }, [controlsEditorOpen, phase, settingsOpen]);

  useEffect(() => {
    if (settingsOpen || controlsEditorOpen || exitPrompt || !settingsPauseRef.current) return;
    inputRef.current.paused = false;
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
    if (event.pointerType === "touch") {
      setKeyboardHintsVisible(false);
    } else if (hasKeyboardPointer()) {
      setKeyboardHintsVisible(true);
    }
  };

  useEffect(() => {
    if (phase !== "battle") return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      const input = inputRef.current;
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", " ", "arrowup", "arrowdown", "arrowleft", "arrowright", "r", "v", "c", "shift", "x", "f"].includes(key)) {
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
      else if (key === "f") input.lootHeld = true;
      else if (key === "escape") pauseBattle();
      if (["w", "a", "s", "d"].includes(key)) input.keys.add(key);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      inputRef.current.keys.delete(event.key.toLowerCase());
      if (event.key.toLowerCase() === "f") inputRef.current.lootHeld = false;
    };
    const onBlur = () => {
      inputRef.current.keys.clear();
      inputRef.current.fireHeld = false;
      inputRef.current.aimHeld = false;
      inputRef.current.fireReleased = true;
      inputRef.current.lootHeld = false;
      runtimeRef.current.player.meleeInputPending = false;
      pointerRef.current.clear();
      stickPointerRef.current = null;
      dynamicStickOriginRef.current = null;
      setDynamicStickActive(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
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
    inputRef.current = createInputState(facingSetting);
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

  const handleActionLookStart = (event: ReactPointerEvent<HTMLElement>) => {
    beginWarRoomPointer(pointerRef.current, event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      pointerType: pointerTypeForEvent(event),
    });
  };

  const handleActionLookEnd = (event: ReactPointerEvent<HTMLElement>) => {
    endWarRoomPointer(pointerRef.current, event.pointerId);
  };

  const readDynamicStick = (event: ReactPointerEvent<HTMLElement>) => {
    const stick = stickRef.current;
    const origin = dynamicStickOriginRef.current;
    const stage = event.currentTarget.closest(".war-room-battle");
    if (!stick || !origin || !stage) return;
    const bounds = stage.getBoundingClientRect();
    const radius = 48;
    const dx = (event.clientX - origin.x) / radius;
    const dy = (origin.y - event.clientY) / radius;
    const length = Math.hypot(dx, dy);
    const scale = length > 1 ? 1 / length : 1;
    const x = Math.max(-1, Math.min(1, dx * scale));
    const y = Math.max(-1, Math.min(1, dy * scale));
    stick.style.setProperty("--dynamic-stick-x", `${origin.x - bounds.left}px`);
    stick.style.setProperty("--dynamic-stick-y", `${origin.y - bounds.top}px`);
    stick.style.setProperty("--stick-x", `${x * radius}px`);
    stick.style.setProperty("--stick-y", `${-y * radius}px`);
    setWarRoomMoveVector(inputRef.current, x, y);
  };

  const handleWorldPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button,.war-room-stick,.war-room-minimap,.war-room-weapon-debug,.war-room-calibration-panel")) return;
    if (event.pointerType === "touch" && event.clientX < window.innerWidth * 0.46) {
      if (joystickMode !== "dynamic" || stickPointerRef.current !== null) return;
      event.preventDefault();
      resumeWarRoomAudio();
      stickPointerRef.current = event.pointerId;
      dynamicStickOriginRef.current = { x: event.clientX, y: event.clientY };
      setDynamicStickActive(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      readDynamicStick(event);
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0 && event.button !== 2) return;
    event.preventDefault();
    resumeWarRoomAudio();
    beginWarRoomPointer(pointerRef.current, event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      pointerType: pointerTypeForEvent(event),
    });
    if (event.pointerType === "mouse" && event.button === 0) {
      pressWarRoomAction(inputRef.current, "fire");
    } else if (event.pointerType === "mouse" && event.button === 2) {
      pressWarRoomAction(inputRef.current, "aim");
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleWorldPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (stickPointerRef.current === event.pointerId && dynamicStickOriginRef.current) {
      readDynamicStick(event);
      return;
    }
    const pointer = pointerRef.current.get(event.pointerId);
    if (!pointer) return;
    const delta = moveWarRoomPointer(pointerRef.current, event.pointerId, event.clientX, event.clientY);
    if (!delta) return;
    const input = inputRef.current;
    const aimScale = input.aimHeld ? aimSensitivityMultiplier : 1;
    applyWarRoomLookDelta(input, delta.dx, delta.dy, {
      x: lookSensitivityX * aimScale,
      y: lookSensitivityY * aimScale,
    }, pointer.pointerType, invertLookY);
  };

  const handleWorldPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (stickPointerRef.current === event.pointerId) {
      stickPointerRef.current = null;
      dynamicStickOriginRef.current = null;
      setDynamicStickActive(false);
      setWarRoomMoveVector(inputRef.current, 0, 0);
      stickRef.current?.style.setProperty("--stick-x", "0px");
      stickRef.current?.style.setProperty("--stick-y", "0px");
      return;
    }
    const pointer = pointerRef.current.get(event.pointerId);
    if (!pointer) return;
    if (pointer.button === 0) releaseWarRoomAction(inputRef.current, "fire");
    else if (pointer.button === 2) releaseWarRoomAction(inputRef.current, "aim");
    endWarRoomPointer(pointerRef.current, event.pointerId);
  };

  const readStick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const stick = stickRef.current;
    if (!stick) return;
    const rect = stick.getBoundingClientRect();
    const radius = Math.max(1, rect.width * 0.37);
    const dx = (event.clientX - (rect.left + rect.width / 2)) / radius;
    const dy = ((rect.top + rect.height / 2) - event.clientY) / radius;
    const length = Math.hypot(dx, dy);
    const scale = length > 1 ? 1 / length : 1;
    const x = Math.max(-1, Math.min(1, dx * scale));
    const y = Math.max(-1, Math.min(1, dy * scale));
    stick.style.setProperty("--stick-x", `${x * radius}px`);
    stick.style.setProperty("--stick-y", `${-y * radius}px`);
    setWarRoomMoveVector(inputRef.current, x, y);
  };

  const handleStickDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (stickPointerRef.current !== null) return;
    event.preventDefault();
    event.stopPropagation();
    resumeWarRoomAudio();
    stickPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    readStick(event);
  };
  const handleStickMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (stickPointerRef.current === event.pointerId) readStick(event);
  };
  const handleStickUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (stickPointerRef.current !== event.pointerId) return;
    stickPointerRef.current = null;
    setWarRoomMoveVector(inputRef.current, 0, 0);
    stickRef.current?.style.setProperty("--stick-x", "0px");
    stickRef.current?.style.setProperty("--stick-y", "0px");
  };

  return (
    <main className="war-room" data-phase={phase} onPointerDownCapture={handleRootPointerType}>
      {phase === "briefing" && (
        <section className="war-room-briefing" role="dialog" aria-modal="true" aria-labelledby="war-room-title">
          <div className="war-room-briefing__backdrop" aria-hidden="true" />
          <button className="war-room-exit" type="button" onClick={closeMode} aria-label="Ana menüye dön">ÇIKIŞ</button>
          <header className="war-room-heading">
            <span className="war-room-eyebrow">YENİ OYUN MODU · TEK KİŞİLİK GÖREV · {WAR_ROOM_BUILD_VERSION}</span>
            <h1 id="war-room-title">SAVAŞ ODASI</h1>
            <p>{currentRoom.name} · {currentRoom.commanderName} ve {currentRoom.enemyCount - 1} muhafızla karşılaş.</p>
          </header>
          <div className="war-room-briefing__content">
            <div className="war-room-mission-card">
              <div className="war-room-mission-card__symbol" aria-hidden="true">✦</div>
              <div>
                <span>GÖREV HEDEFİ</span>
                <strong>Komutan dâhil {currentRoom.enemyCount} düşmanı temizle</strong>
                <small>{currentRoom.commanderTitle} · {currentRoom.layoutName} · Siper al ve komutanın işaretini takip et.</small>
              </div>
              <b className="war-room-enemy-count">{String(currentRoom.enemyCount).padStart(2, "0")}</b>
            </div>
            <div className="war-room-loadout-head">
              <div>
                <span className="war-room-eyebrow">SAVAŞ ÖNCESİ HAZIRLIK</span>
                <h2>İki silah kuşan</h2>
              </div>
              <div className="war-room-slot-tabs" role="group" aria-label="Silah yuvası seç">
                {([0, 1] as const).map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={selectedSlot === slot ? "is-selected" : ""}
                    aria-pressed={selectedSlot === slot}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot === 0 ? "I · ANA" : "II · YEDEK"}
                  </button>
                ))}
              </div>
            </div>
            <div className="war-room-weapon-grid">
              {WAR_ROOM_WEAPONS.map((weapon) => {
                const selected = loadout[selectedSlot] === weapon.id;
                const otherSlot = selectedSlot === 0 ? 1 : 0;
                const otherSlotSelected = loadout[otherSlot] === weapon.id;
                const owned = isWarRoomWeaponOwned(weapon.id, profile.inventory.ownedItemIds);
                return (
                  <button
                    key={weapon.id}
                    type="button"
                    className={`war-room-weapon-card${selected ? " is-selected" : ""}`}
                    aria-pressed={selected}
                    aria-disabled={!owned}
                    title={!owned ? "Satın alınmadı; seçmek için mağazadan al." : undefined}
                    onClick={() => setLoadoutWeapon(weapon.id)}
                  >
                    {WAR_ROOM_WEAPON_ICONS_ENABLED
                      ? <WarRoomWeaponIcon className="war-room-weapon-card__icon" weaponId={weapon.id} />
                      : <span className="war-room-weapon-card__icon" aria-hidden="true">{weapon.icon}</span>}
                    <span className="war-room-weapon-card__copy">
                      <b>{weapon.name}</b>
                    <small>{weapon.className} · {weapon.rarity ?? "Sıradan"} · {weapon.weaponClass === "melee" ? `${weapon.range.toFixed(1)} m · sınırsız` : `${weapon.magazine} mermi`}</small>
                    </span>
                    <span className="war-room-weapon-card__status">
                      {selected ? "SEÇİLİ" : otherSlotSelected ? `YUVA ${otherSlot + 1}` : owned ? "SEÇ" : "SATIN AL"}
                    </span>
                  </button>
                );
              })}
            </div>
            {loadoutNotice && <p className="war-room-loadout-notice" role="status" aria-live="polite">{loadoutNotice}</p>}
            <div className="war-room-briefing__bottom">
              <p>WASD / joystick hareket · Fare sürükle / sağ tarafı kaydır bakış · Sol tık / ATEŞ</p>
              <button className="war-room-start" type="button" onClick={() => beginBattle()} disabled={!modelsReady}>
                <span>{modelsReady ? "BAŞLA" : `MODELLER YÜKLENİYOR %${Math.round(modelProgress)}`}</span>
                <i aria-hidden="true">{modelsReady ? "➜" : "…"}</i>
              </button>
              <div className="war-room-model-progress" role="progressbar" aria-label="Savaş Odası modelleri"
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(modelProgress)}>
                <i style={{ width: `${Math.max(0, Math.min(100, modelProgress))}%` }} />
              </div>
              <small className="war-room-model-status" aria-live="polite">
                {modelsReady
                  ? modelErrors.length
                    ? "Bazı modeller yüklenemedi; yedek görünümler hazır."
                    : "3D modeller hazır."
                  : "Karakterler ve savaş alanı hazırlanıyor."}
              </small>
            </div>
          </div>
        </section>
      )}

      {phase === "battle" && (
        <div
          className="war-room-battle"
          onPointerDown={handleWorldPointerDown}
          onPointerMove={handleWorldPointerMove}
          onPointerUp={handleWorldPointerUp}
          onPointerCancel={handleWorldPointerUp}
          onContextMenu={(event) => event.preventDefault()}
        >
          <WarRoomScene3D
            key={runKey}
            runtimeRef={runtimeRef}
            inputRef={inputRef}
            weaponIds={runtimeRef.current.player.weaponSlots}
            weaponMountOverrides={weaponMountOverrides}
            cameraMode={cameraMode}
            motionReduced={motionReduced}
            shoulderSide={shoulderSide}
            shoulderOffset={shoulderOffset}
            bloodEffects={bloodEffects}
            trainingMode={weaponLabMode}
            quality={quality}
            debugMode={debugMode}
            onRenderStats={setDebugRenderStats}
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
                    className={`war-room-floor-indicator${floorLabel === "MERDİVEN ↑" ? " is-stair" : ""}`}
                    aria-live="polite"
                    aria-label={`Bulunduğun kat: ${floorLabel}`}
                  >
                    {floorLabel}
                  </div>
                )}
              </div>
              <div className="war-room-kill-feed" aria-live="polite" aria-label="Düşman düşürme bildirimi">
                {hud.killFeed.slice(0, 4).map((feed) => <span key={feed.id}>{feed.text}</span>)}
              </div>
              <div className="war-room-enemies-left">
                <span>KALAN DÜŞMAN</span><b>{String(hud.remaining).padStart(2, "0")}</b>
              </div>
              <MiniMap hud={hud} />
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
            {bossPhaseAnnouncement !== null && (
              <div className="war-room-boss-phase" role="status" aria-live="polite">
                <small>KOMUTAN</small>
                <b>FAZ {getBossHudPhaseRoman(bossPhaseAnnouncement)}</b>
              </div>
            )}
            <div className={`war-room-crosshair${hud.targetVisible ? " is-target" : ""}${hud.hitMarker ? " is-hit" : ""}${hud.headshotMarker ? " is-headshot" : ""}${hud.aiming ? " is-zoomed" : ""}${hud.firing ? " is-firing" : ""}`} aria-label={hud.targetVisible ? "Hedef nişangâhta" : "Nişangâh"}>
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
                {hud.hitMessage && <span key={hud.hitMessage}>{hud.hitMessage}</span>}
            </div>
            <div className="war-room-hud__bottom">
              <div className={`war-room-vitals${hud.damageVignette ? " is-damaged" : ""}`}>
                <div className="war-room-bar-row">
                  <span>CAN</span><b>{Math.ceil(hud.player.hp)} / {hud.player.maxHp}</b>
                </div>
                <i className={`war-room-bar${hud.regenerationActive ? " is-regenerating" : ""}`}>
                  <em className="is-health" style={{ width: `${Math.max(0, (hud.player.hp / hud.player.maxHp) * 100)}%` }} />
                </i>
                <div className="war-room-bar-row">
                  <span>DAYANIKLILIK</span><b>{Math.ceil(hud.player.stamina)}%</b>
                </div>
                <i className="war-room-bar"><em className="is-stamina" style={{ width: `${Math.max(0, hud.player.stamina)}%` }} /></i>
              </div>
              <div className="war-room-ammo">
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
                  <strong>
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
                    ? `${formatDuration(hud.elapsedSeconds)} · Kısa bas: saldır · Basılı tut: yüklü saldır`
                    : `${formatDuration(hud.elapsedSeconds)} · V: DEĞİŞTİR`}
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
                  onPointerStart={handleActionLookStart}
                  onPointerMove={handleWorldPointerMove}
                  onPointerEnd={handleActionLookEnd}
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
                  onPointerStart={handleActionLookStart}
                  onPointerMove={handleWorldPointerMove}
                  onPointerEnd={handleActionLookEnd}
                  onDown={() => {
                    resumeWarRoomAudio();
                    pressWarRoomAction(inputRef.current, "fire");
                  }}
                  onUp={() => releaseWarRoomAction(inputRef.current, "fire")}
                />
              </div>
              <div
                ref={stickRef}
                className={`war-room-stick${joystickMode === "dynamic" ? " is-dynamic" : ""}${dynamicStickActive ? " is-active" : ""}${controlLayoutEnabled && joystickMode === "fixed" ? " is-custom-layout" : ""}`}
                role="application"
                aria-label="Hareket joystick'i"
                style={controlLayoutEnabled && joystickMode === "fixed" ? getControlPlacementStyle("move-stick", savedControlLayout.layout) : undefined}
                onPointerDown={joystickMode === "fixed" ? handleStickDown : undefined}
                onPointerMove={handleStickMove}
                onPointerUp={handleStickUp}
                onPointerCancel={handleStickUp}
              >
                <HudIcon icon="move" className="war-room-stick__move-icon" />
                <i aria-hidden="true" />
              </div>
              </div>
            </div>
            <button className="war-room-pause" type="button" onClick={pauseBattle}>DURAKLAT · ÇIK</button>
          </div>
          {hud.nearbyLootChest && (
            <button
              className={`war-room-loot-action${hud.nearbyLootChest.progress > 0 ? " is-opening" : ""}`}
              type="button"
              aria-label={`Sandığı ara: ${hud.nearbyLootChest.contents}`}
              onContextMenu={(event) => event.preventDefault()}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
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
              <span>{hud.nearbyLootChest.progress > 0 ? "AÇILIYOR" : "SANDIĞI ARA"}</span>
              <strong>{hud.nearbyLootChest.contents}</strong>
              <small>{hud.nearbyLootChest.progress > 0
                ? `%${Math.round(hud.nearbyLootChest.progress * 100)}`
                : keyboardHintsVisible ? "F TUŞUNA BASILI TUT" : "BASILI TUT"}</small>
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
                      inputRef.current.paused = false;
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
        </div>
      )}

      {(phase === "victory" || phase === "defeat") && summary && (
        <section className={`war-room-result${phase === "defeat" ? " is-defeat" : ""}`} role="dialog" aria-modal="true">
          <div className="war-room-result__card">
            <span className="war-room-eyebrow">{summary.roomName.toLocaleUpperCase("tr-TR")} · ODA {summary.roomNumber} · GÖREV RAPORU</span>
            <h1>{phase === "victory" ? "ZAFER" : "YENİLGİ"}</h1>
            <p>{phase === "victory"
              ? `Görev tamamlandı; ${summary.commanderTitle} ve kuvvetleri yenildi.`
              : `${summary.roomName} düşmedi. Bu odadan yeniden başlayabilir veya zinciri baştan alabilirsin.`}</p>
            <div className="war-room-stat-grid">
              <div><span>DÜŞÜRÜLEN</span><b>{summary.kills} / {summary.enemyCount}</b></div>
              <div><span>KAFA VURUŞU</span><b>{summary.headshots}</b></div>
              <div><span>İSABET</span><b>%{summary.accuracy}</b></div>
              <div><span>SÜRE</span><b>{formatDuration(summary.seconds)}</b></div>
            </div>
            <section className="war-room-leaderboard" aria-label="Maç liderlik tablosu">
              <header>
                <span>MAÇ LİDERLİK TABLOSU</span>
                <small>{summary.leaderboard.length} karakter</small>
              </header>
              <ol>
                {summary.leaderboard.map((entry) => (
                  <li
                    key={entry.id}
                    className={entry.id === "player" ? "is-player" : undefined}
                    aria-current={entry.id === "player" ? "true" : undefined}
                  >
                    <span className="war-room-leaderboard__rank">{entry.rank}</span>
                    <span className="war-room-leaderboard__identity">
                      <strong>
                        <span>{entry.name}</span>
                        {entry.id === "player" && <em>SEN</em>}
                      </strong>
                      <small>{entry.role} · {entry.status}</small>
                    </span>
                    <b>{entry.score.toLocaleString("tr-TR")}</b>
                  </li>
                ))}
              </ol>
            </section>
            {phase === "victory" && summary.nextRoom && (
              <div className="war-room-next-room" aria-label="Sonraki oda önizlemesi">
                <span>SONRAKİ ODA · {summary.nextRoom.number} / ∞</span>
                <strong>{summary.nextRoom.name}</strong>
                <small>{summary.nextRoom.layoutName} · {summary.nextRoom.enemyCount} düşman · {summary.nextRoom.commanderName}</small>
                <i
                  className="war-room-next-room__swatch"
                  style={{
                    background: `linear-gradient(135deg, ${summary.nextRoom.theme.sky}, ${summary.nextRoom.theme.floorTint})`,
                  }}
                  aria-hidden="true"
                />
              </div>
            )}
            {phase === "victory" && (
              <div className="war-room-gold-reward">
                <span>BU MODUN ALTIN ÖDÜLÜ</span><b>+{summary.gold} ◈</b>
                {summary.totalGold !== null && <small>Savaş Odası toplamı: {summary.totalGold} altın</small>}
                {WAR_ROOM_ROOM_CHAIN_ENABLED && (
                  <small>Oda ödülleri toplamı: {roomProgress.totalRoomRewards} altın · En yüksek oda: {roomProgress.highestRoom}</small>
                )}
              </div>
            )}
            <div className="war-room-result__actions">
              {phase === "victory" && summary.nextRoom && (
                <button
                  type="button"
                  className="war-room-start"
                  onClick={() => beginBattle(summary.nextRoom!.number, preparedNextRoomRef.current ?? undefined)}
                >
                  SONRAKİ ODA
                </button>
              )}
              <button
                type="button"
                className={phase === "victory" ? "" : "war-room-start"}
                onClick={() => beginBattle(summary.roomNumber)}
              >
                {phase === "victory" ? "YENİDEN DENE" : "BU ODAYI TEKRAR DENE"}
              </button>
              {phase === "defeat" && (
                <button type="button" onClick={() => beginBattle(1)}>BAŞTAN</button>
              )}
              {phase === "victory" && <button type="button" onClick={closeMode}>ÇIK</button>}
            </div>
          </div>
        </section>
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
