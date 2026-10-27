import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
  type WarRoomHudSnapshot,
  type WarRoomInputState,
  type WarRoomRuntime,
} from "./war-room-engine";
import { getWarRoomLoadoutFromProfile } from "./war-room-loadout";
import { isWarRoomMuted, resumeWarRoomAudio, setWarRoomMuted } from "./war-room-audio";
import { WAR_ROOM_BUILD_VERSION } from "./war-room-features";
import type { RenderQuality } from "../world/graphics-quality";
import { applyWarRoomLookDelta, type WarRoomLookPointerType } from "./war-room-look";
import type { WarRoomFacingSetting } from "./war-room-orientation";
import type { PlayerProfile } from "./profile";
import "./war-room.css";

type Props = {
  onExit: () => void;
  profile: PlayerProfile;
  invertLookY: boolean;
  onInvertLookYChange: (value: boolean) => void;
  facingSetting: WarRoomFacingSetting;
  onOpenSettings: () => void;
  settingsOpen: boolean;
  quality: RenderQuality;
};
type Phase = "briefing" | "battle" | "victory" | "defeat";
type PointerTrack = { id: number | null; x: number; y: number; button: number; pointerType: WarRoomLookPointerType };
type CalibrationField = "position" | "rotation" | "scale";

const GOLD_KEY = "shafak-war-room-gold-v1";
const BLOOD_EFFECTS_KEY = "shafak-war-room-blood-effects-v1";

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
    paused: false,
  };
}

function createEmptyHud(): WarRoomHudSnapshot {
  return {
    player: { x: 0, z: 0, yaw: 0, hp: 220, maxHp: 220, stamina: 100, maxStamina: 100 },
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

function ActionButton({
  label,
  hint,
  className = "",
  onDown,
  onUp,
  onClick,
}: {
  label: string;
  hint?: string;
  className?: string;
  onDown?: () => void;
  onUp?: () => void;
  onClick?: () => void;
}) {
  const pointer = useRef<number | null>(null);
  return (
    <button
      type="button"
      className={`war-room-control ${className}`}
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        onDown?.();
      }}
      onPointerUp={(event) => {
        if (pointer.current !== event.pointerId) return;
        pointer.current = null;
        onUp?.();
        onClick?.();
      }}
      onPointerCancel={() => {
        pointer.current = null;
        onUp?.();
      }}
      onLostPointerCapture={() => {
        pointer.current = null;
        onUp?.();
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (event.detail === 0) onClick?.();
      }}
    >
      <span className="war-room-control__symbol" aria-hidden="true">
        {className.includes("fire") ? "✹"
          : className.includes("aim") ? "⌖"
            : className.includes("reload") ? "↻"
              : className.includes("jump") ? "↑"
                : className.includes("dodge") ? "⤴"
                  : "⇄"}
      </span>
      <b>{label}</b>
      {hint && <kbd>{hint}</kbd>}
    </button>
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
  invertLookY,
  onInvertLookYChange,
  facingSetting,
  onOpenSettings,
  settingsOpen,
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
  const [phase, setPhase] = useState<Phase>("briefing");
  const [soundMuted, setSoundMuted] = useState(isWarRoomMuted);
  const [bloodEffects, setBloodEffects] = useState(() => {
    try {
      return window.localStorage.getItem(BLOOD_EFFECTS_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const [loadout, setLoadout] = useState<[WarRoomWeaponId, WarRoomWeaponId]>(
    () => getWarRoomLoadoutFromProfile(profile),
  );
  const [weaponMountOverrides, setWeaponMountOverrides] = useState<Partial<Record<WarRoomWeaponId, WarRoomWeaponMount>>>({});
  const [selectedSlot, setSelectedSlot] = useState<0 | 1>(0);
  const [runKey, setRunKey] = useState(0);
  const [hud, setHud] = useState<WarRoomHudSnapshot>(createEmptyHud);
  const [meleeDebugMessage, setMeleeDebugMessage] = useState("");
  const [meleeDebugMessageUntil, setMeleeDebugMessageUntil] = useState(0);
  const [meleeDebugActivity, setMeleeDebugActivity] = useState("");
  const [calibrationCollapsed, setCalibrationCollapsed] = useState(false);
  const [calibrationCoarseStep, setCalibrationCoarseStep] = useState(false);
  const [calibrationJson, setCalibrationJson] = useState("");
  const [calibrationCopyStatus, setCalibrationCopyStatus] = useState("");
  const [exitPrompt, setExitPrompt] = useState(false);
  const [summary, setSummary] = useState<{
    kills: number;
    headshots: number;
    accuracy: number;
    seconds: number;
    gold: number;
    totalGold: number | null;
  } | null>(null);
  const runtimeRef = useRef<WarRoomRuntime>(createWarRoomRuntime(loadout));
  const inputRef = useRef<WarRoomInputState>(createInputState(facingSetting));
  const pointerRef = useRef<PointerTrack>({ id: null, x: 0, y: 0, button: -1, pointerType: "mouse" });
  const settingsPauseRef = useRef(false);
  const stickRef = useRef<HTMLDivElement>(null);
  const stickPointerRef = useRef<number | null>(null);
  const debugMode = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("debug") === "1";
  const calibrationMode = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("calib") === "1";

  const beginBattle = () => {
    resumeWarRoomAudio();
    runtimeRef.current = createWarRoomRuntime(loadout);
    inputRef.current = createInputState(facingSetting);
    pointerRef.current.id = null;
    setHud(createEmptyHud());
    setMeleeDebugMessage("");
    setMeleeDebugMessageUntil(0);
    setMeleeDebugActivity("");
    setExitPrompt(false);
    setRunKey((key) => key + 1);
    setPhase("battle");
  };

  const finishBattle = useCallback((result: "victory" | "defeat", finalHud: WarRoomHudSnapshot) => {
    const gold = result === "victory" ? 90 + finalHud.kills * 7 + finalHud.headshots * 5 : 0;
    const totalGold = gold > 0 ? recordWarRoomGold(gold) : null;
    setHud(finalHud);
    setSummary({
      kills: finalHud.kills,
      headshots: finalHud.headshots,
      accuracy: finalHud.shots > 0 ? Math.round((finalHud.hits / finalHud.shots) * 100) : 0,
      seconds: finalHud.elapsedSeconds,
      gold,
      totalGold,
    });
    setPhase(result);
  }, []);

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
    pointerRef.current.id = null;
    setExitPrompt(true);
  }, []);

  useEffect(() => {
    if (!settingsOpen || phase !== "battle" || inputRef.current.paused) return;
    inputRef.current.paused = true;
    settingsPauseRef.current = true;
    inputRef.current.keys.clear();
    inputRef.current.fireHeld = false;
    inputRef.current.fireReleased = true;
    inputRef.current.aimHeld = false;
    runtimeRef.current.player.chargeStartedAt = 0;
    runtimeRef.current.player.meleeInputPending = false;
    pointerRef.current.id = null;
  }, [phase, settingsOpen]);

  useEffect(() => {
    if (settingsOpen || !settingsPauseRef.current) return;
    inputRef.current.paused = false;
    settingsPauseRef.current = false;
  }, [settingsOpen]);

  useEffect(() => {
    if (phase !== "battle") return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      const input = inputRef.current;
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", " ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
      if (event.repeat && ["r", "v", " ", "c", "shift"].includes(key)) return;
      if (key === "r") input.reloadPressed = true;
      else if (key === "v") input.swapPressed = true;
      else if (key === " ") input.jumpPressed = true;
      else if (key === "c") input.crouchPressed = true;
      else if (key === "shift") input.dodgePressed = true;
      else if (key === "escape") pauseBattle();
      if (["w", "a", "s", "d"].includes(key)) input.keys.add(key);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      inputRef.current.keys.delete(event.key.toLowerCase());
    };
    const onBlur = () => {
      inputRef.current.keys.clear();
      inputRef.current.fireHeld = false;
      inputRef.current.aimHeld = false;
      inputRef.current.fireReleased = true;
      runtimeRef.current.player.meleeInputPending = false;
      pointerRef.current.id = null;
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
    setLoadout((current) => {
      if (current[selectedSlot] === id) return current;
      const next: [WarRoomWeaponId, WarRoomWeaponId] = [...current];
      const otherSlot = selectedSlot === 0 ? 1 : 0;
      if (current[otherSlot] === id) next[otherSlot] = current[selectedSlot];
      next[selectedSlot] = id;
      return next;
    });
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

  const handleWorldPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button,.war-room-stick,.war-room-minimap,.war-room-weapon-debug,.war-room-calibration-panel")) return;
    if (event.pointerType === "touch" && event.clientX < window.innerWidth * 0.46) return;
    if (event.pointerType === "mouse" && event.button !== 0 && event.button !== 2) return;
    event.preventDefault();
    resumeWarRoomAudio();
    pointerRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      pointerType: event.pointerType === "touch" ? "touch" : event.pointerType === "pen" ? "pen" : "mouse",
    };
    if (event.pointerType === "mouse" && event.button === 0) {
      inputRef.current.fireHeld = true;
      inputRef.current.firePressed = true;
    } else if (event.pointerType === "mouse" && event.button === 2) {
      inputRef.current.aimHeld = true;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleWorldPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current.id !== event.pointerId) return;
    const dx = event.clientX - pointerRef.current.x;
    const dy = event.clientY - pointerRef.current.y;
    pointerRef.current.x = event.clientX;
    pointerRef.current.y = event.clientY;
    const input = inputRef.current;
    const sensitivity = input.aimHeld ? 0.0024 : 0.0041;
    applyWarRoomLookDelta(input, dx, dy, sensitivity, pointerRef.current.pointerType, invertLookY);
  };

  const handleWorldPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current.id !== event.pointerId) return;
    if (pointerRef.current.button === 0) {
      inputRef.current.fireHeld = false;
      inputRef.current.fireReleased = true;
    } else if (pointerRef.current.button === 2) {
      inputRef.current.aimHeld = false;
    }
    pointerRef.current.id = null;
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
    inputRef.current.moveX = x;
    inputRef.current.moveY = y;
  };

  const handleStickDown = (event: ReactPointerEvent<HTMLDivElement>) => {
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
    inputRef.current.moveX = 0;
    inputRef.current.moveY = 0;
    stickRef.current?.style.setProperty("--stick-x", "0px");
    stickRef.current?.style.setProperty("--stick-y", "0px");
  };

  return (
    <main className="war-room" data-phase={phase}>
      {phase === "briefing" && (
        <section className="war-room-briefing" role="dialog" aria-modal="true" aria-labelledby="war-room-title">
          <div className="war-room-briefing__backdrop" aria-hidden="true" />
          <button className="war-room-exit" type="button" onClick={closeMode} aria-label="Ana menüye dön">ÇIKIŞ</button>
          <header className="war-room-heading">
            <span className="war-room-eyebrow">YENİ OYUN MODU · TEK KİŞİLİK GÖREV · {WAR_ROOM_BUILD_VERSION}</span>
            <h1 id="war-room-title">SAVAŞ ODASI</h1>
            <p>Taş Avlu Kuşatması · Kızıl Komutan ve sekiz muhafızla karşılaş.</p>
          </header>
          <div className="war-room-briefing__content">
            <div className="war-room-mission-card">
              <div className="war-room-mission-card__symbol" aria-hidden="true">✦</div>
              <div>
                <span>GÖREV HEDEFİ</span>
                <strong>Komutan dâhil 9 düşmanı temizle</strong>
                <small>Siper al, menzili koru ve komutanın işaretini takip et.</small>
              </div>
              <b className="war-room-enemy-count">09</b>
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
                const owned = !weapon.storeItemId || profile.inventory.ownedItemIds.includes(weapon.storeItemId);
                return (
                  <button
                    key={weapon.id}
                    type="button"
                    className={`war-room-weapon-card${selected ? " is-selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => setLoadoutWeapon(weapon.id)}
                    disabled={!owned}
                  >
                    <span className="war-room-weapon-card__icon" aria-hidden="true">{weapon.icon}</span>
                    <span className="war-room-weapon-card__copy">
                      <b>{weapon.name}</b>
                    <small>{weapon.className} · {weapon.rarity ?? "Sıradan"} · {weapon.weaponClass === "melee" ? `${weapon.range.toFixed(1)} m · sınırsız` : `${weapon.magazine} mermi`}</small>
                    </span>
                    <span className="war-room-weapon-card__status">
                      {selected ? "SEÇİLİ" : otherSlotSelected ? `YUVA ${otherSlot + 1}` : owned ? "SEÇ" : "MAĞAZADA"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="war-room-briefing__bottom">
              <p>WASD / joystick hareket · Fare sürükle / sağ tarafı kaydır bakış · Sol tık / ATEŞ</p>
              <button className="war-room-start" type="button" onClick={beginBattle} disabled={!modelsReady}>
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
            weaponIds={loadout}
            weaponMountOverrides={weaponMountOverrides}
            bloodEffects={bloodEffects}
            quality={quality}
            debugMode={debugMode}
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
              <aside className={`war-room-calibration-panel${calibrationCollapsed ? " is-collapsed" : ""}`}
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
          <div className={`war-room-hud${hud.aiming ? " is-aiming" : ""}${hud.damageVignette ? " is-hit" : ""}`}>
            <div className="war-room-hud__top">
              <div className="war-room-kill-feed" aria-live="polite" aria-label="Düşman düşürme bildirimi">
                {hud.killFeed.slice(0, 3).map((feed) => <span key={feed.id}>{feed.text}</span>)}
              </div>
              <div className="war-room-enemies-left">
                <span>KALAN DÜŞMAN</span><b>{String(hud.remaining).padStart(2, "0")}</b>
              </div>
              <MiniMap hud={hud} />
            </div>
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
            <button
              className="war-room-blood"
              type="button"
              aria-pressed={!bloodEffects}
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
              className="war-room-settings"
              type="button"
              aria-label="Oyun ayarlarını aç"
              title="Oyun ayarları"
              onClick={onOpenSettings}
            >
              ⚙
            </button>
            <div className="war-room-commander">
              <div><span>KUŞATMA KOMUTANI</span><b>KIZIL KOMUTAN</b></div>
              <strong>{Math.ceil(hud.bossHp)} / {hud.bossMaxHp}</strong>
              <i><em style={{ width: `${Math.max(0, (hud.bossHp / hud.bossMaxHp) * 100)}%` }} /></i>
            </div>
            <div className={`war-room-crosshair${hud.targetVisible ? " is-target" : ""}${hud.hitMarker ? " is-hit" : ""}${hud.headshotMarker ? " is-headshot" : ""}${hud.aiming ? " is-zoomed" : ""}${hud.firing ? " is-firing" : ""}`} aria-label={hud.targetVisible ? "Hedef nişangâhta" : "Nişangâh"}>
              <i /><i /><i /><i />
            </div>
            {hud.damageVignette && (
              <div
                className="war-room-hit-direction"
                style={{ transform: `translate(-50%, -50%) rotate(${(hud.damageDirection * 180) / Math.PI}deg)` }}
                aria-hidden="true"
              >▼</div>
            )}
            <div className="war-room-notice" aria-live="polite">
              {hud.hitMessage && <span>{hud.hitMessage}</span>}
            </div>
            <div className="war-room-hud__bottom">
              <div className="war-room-vitals">
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
                {WAR_ROOM_WEAPON_BY_ID.get(hud.weaponId)?.weaponClass === "melee" ? (
                  <strong className="war-room-ammo__melee" aria-label="Sınırsız kullanım">
                    {WAR_ROOM_WEAPON_BY_ID.get(hud.weaponId)?.icon} ∞
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
                    ? `${formatDuration(hud.elapsedSeconds)} · DOKUNUŞ: HAFİF · BASILI TUT ≥350 ms: AĞIR`
                    : `${formatDuration(hud.elapsedSeconds)} · V: DEĞİŞTİR`}
                </small>
              </div>
              <div className="war-room-controls">
                <ActionButton
                  label="Nişan al"
                  hint="SAĞ TIK"
                  className={`is-aim${hud.aiming ? " is-active" : ""}`}
                  onDown={() => { inputRef.current.aimHeld = true; }}
                  onUp={() => { inputRef.current.aimHeld = false; }}
                />
                {WAR_ROOM_WEAPON_BY_ID.get(hud.weaponId)?.weaponClass !== "melee" && (
                  <ActionButton
                    label="Yeniden doldur"
                    hint="R"
                    className="is-reload"
                    onClick={() => { inputRef.current.reloadPressed = true; }}
                  />
                )}
                <ActionButton
                  label="Zıpla"
                  hint="SPACE"
                  className="is-jump"
                  onClick={() => { inputRef.current.jumpPressed = true; }}
                />
                <ActionButton
                  label="Eğil ve kaçın"
                  hint="C / SHIFT"
                  className={`is-dodge${hud.crouched ? " is-active" : ""}`}
                  onDown={() => { inputRef.current.dodgePressed = true; }}
                  onClick={() => { inputRef.current.crouchPressed = true; }}
                />
                <ActionButton
                  label="Silah değiştir"
                  hint="V"
                  className="is-swap"
                  onClick={() => { inputRef.current.swapPressed = true; }}
                />
                <ActionButton
                  label="Ateş et"
                  className="is-fire"
                  onDown={() => {
                    resumeWarRoomAudio();
                    inputRef.current.fireHeld = true;
                    inputRef.current.firePressed = true;
                  }}
                  onUp={() => {
                    inputRef.current.fireHeld = false;
                    inputRef.current.fireReleased = true;
                  }}
                />
              </div>
              <div
                ref={stickRef}
                className="war-room-stick"
                role="application"
                aria-label="Hareket joystick'i"
                onPointerDown={handleStickDown}
                onPointerMove={handleStickMove}
                onPointerUp={handleStickUp}
                onPointerCancel={handleStickUp}
              >
                <i aria-hidden="true" />
              </div>
            </div>
            <button className="war-room-pause" type="button" onClick={pauseBattle}>DURAKLAT · ÇIK</button>
          </div>
          {hud.hitMarker && (
            <div
              key={hud.damageEventId}
              className={`war-room-damage-number${hud.damageNumberCritical ? " is-critical" : ""}`}
              aria-hidden="true"
            >
              {`−${hud.lastHitDamage}`}
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
            <span className="war-room-eyebrow">TAŞ AVLUSU KUŞATMASI · GÖREV RAPORU</span>
            <h1>{phase === "victory" ? "ZAFER" : "YENİLGİ"}</h1>
            <p>{phase === "victory" ? "Kızıl Komutan’ın kuşatması sona erdi." : "Savaş alanı hâlâ orada. Hazırlan ve yeniden dene."}</p>
            <div className="war-room-stat-grid">
              <div><span>DÜŞÜRÜLEN</span><b>{summary.kills} / 9</b></div>
              <div><span>KAFA VURUŞU</span><b>{summary.headshots}</b></div>
              <div><span>İSABET</span><b>%{summary.accuracy}</b></div>
              <div><span>SÜRE</span><b>{formatDuration(summary.seconds)}</b></div>
            </div>
            {phase === "victory" && (
              <div className="war-room-gold-reward">
                <span>BU MODUN ALTIN ÖDÜLÜ</span><b>+{summary.gold} ◈</b>
                {summary.totalGold !== null && <small>Savaş Odası toplamı: {summary.totalGold} altın</small>}
              </div>
            )}
            <div className="war-room-result__actions">
              <button type="button" className="war-room-start" onClick={beginBattle}>YENİDEN DENE</button>
              <button type="button" onClick={closeMode}>ÇIK</button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
