import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import CityHubScene from "./CityHubScene";
import {
  CITY_DOORS,
  CITY_JOYSTICK_TRAVEL_RATIO,
  CITY_JOYSTICK_SIZE,
  CITY_START_POSITION,
  placeCityJoystick,
  readCityJoystick,
  type CityMissionMode,
  type CityDoor,
  type CityDoorId,
  type CityInput,
  type CityJoystickBounds,
  type CityPosition,
} from "./city-hub-layout";
import {
  stepCityCameraLook,
  type CityCameraControl,
} from "./city-hub-controls";
import { CAMPAIGN_NARRATIVE } from "./campaign-narrative";
import { CAMPAIGN_ACT_COUNT, CAMPAIGN_LEVEL_COUNT } from "./campaign-progression";
import type { EquipmentVisual } from "../game/store-types";
import "./city-hub.css";

type CityHubProps = {
  playerName: string;
  campaignChapter: number;
  campaignActNumber: number;
  campaignActName: string;
  campaignProgressPercent: number;
  campaignObjective: string;
  campaignSummary: string;
  playerAppearance: EquipmentVisual;
  onOpenCampaign: () => void;
  onOpenWarRoom: (mode: CityMissionMode) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onExit: () => void;
};

type JoystickPosition = { x: number; z: number };
type CameraPointerGesture = { pointerId: number; x: number; y: number };
type JoystickAnchor = { x: number; y: number };

const clampAxis = (value: number) => Math.max(-1, Math.min(1, value));

export default function CityHub({
  playerName,
  campaignChapter,
  campaignActNumber,
  campaignActName,
  campaignProgressPercent,
  campaignObjective,
  campaignSummary,
  playerAppearance,
  onOpenCampaign,
  onOpenWarRoom,
  onOpenProfile,
  onOpenSettings,
  onExit,
}: CityHubProps) {
  const positionRef = useRef<CityPosition>({ ...CITY_START_POSITION });
  const inputRef = useRef<CityInput>({ x: 0, z: 0 });
  const keysRef = useRef(new Set<string>());
  const joystickRef = useRef<JoystickPosition>({ x: 0, z: 0 });
  const joystickBoundsRef = useRef<CityJoystickBounds>({
    left: 0,
    top: 0,
    width: CITY_JOYSTICK_SIZE,
    height: CITY_JOYSTICK_SIZE,
  });
  const cameraControlRef = useRef<CityCameraControl>({ yaw: 0, pitch: 0 });
  const cameraPointerRef = useRef<CameraPointerGesture | null>(null);
  const joystickKnobRef = useRef<HTMLElement>(null);
  const activeDoorIdRef = useRef<CityDoorId | null>(null);
  const joystickPointerRef = useRef<number | null>(null);
  const [activeDoor, setActiveDoor] = useState<CityDoor | null>(null);
  const [joystickAnchor, setJoystickAnchor] = useState<JoystickAnchor | null>(null);

  const updateInput = useCallback(() => {
    const keys = keysRef.current;
    const keyboardX = Number(keys.has("arrowright") || keys.has("d"))
      - Number(keys.has("arrowleft") || keys.has("a"));
    const keyboardZ = Number(keys.has("arrowdown") || keys.has("s"))
      - Number(keys.has("arrowup") || keys.has("w"));
    let x = clampAxis(keyboardX + joystickRef.current.x);
    let z = clampAxis(keyboardZ + joystickRef.current.z);
    const magnitude = Math.hypot(x, z);
    if (magnitude > 1) {
      x /= magnitude;
      z /= magnitude;
    }
    inputRef.current = {
      x,
      z,
    };
  }, []);

  const enterDoor = useCallback((door: CityDoor | null) => {
    if (!door) return;
    if (door.id === "campaign") {
      onOpenCampaign();
      return;
    }
    if (door.missionMode) onOpenWarRoom(door.missionMode);
  }, [onOpenCampaign, onOpenWarRoom]);
  const focusDoor = useCallback((door: CityDoor) => {
    activeDoorIdRef.current = door.id;
    setActiveDoor(door);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      const key = event.key.toLocaleLowerCase("en-US");
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
        keysRef.current.add(key);
        updateInput();
        return;
      }
      if (key === "e" || key === "enter") {
        const door = CITY_DOORS.find((item) => item.id === activeDoorIdRef.current) ?? null;
        enterDoor(door);
      } else if (key === "escape") {
        onExit();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLocaleLowerCase("en-US"));
      updateInput();
    };
    const onBlur = () => {
      keysRef.current.clear();
      joystickPointerRef.current = null;
      cameraPointerRef.current = null;
      joystickRef.current = { x: 0, z: 0 };
      setJoystickAnchor(null);
      if (joystickKnobRef.current) joystickKnobRef.current.style.transform = "translate(-50%, -50%)";
      updateInput();
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (joystickPointerRef.current === event.pointerId) {
        joystickPointerRef.current = null;
        joystickRef.current = { x: 0, z: 0 };
        setJoystickAnchor(null);
        if (joystickKnobRef.current) joystickKnobRef.current.style.transform = "translate(-50%, -50%)";
        updateInput();
      }
      if (cameraPointerRef.current?.pointerId === event.pointerId) cameraPointerRef.current = null;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") onBlur();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enterDoor, onExit, updateInput]);

  const updateJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = joystickBoundsRef.current;
    const reading = readCityJoystick(event.clientX, event.clientY, bounds);
    joystickRef.current = reading;
    if (joystickKnobRef.current) {
      const travel = Math.min(bounds.width, bounds.height) * CITY_JOYSTICK_TRAVEL_RATIO;
      joystickKnobRef.current.style.transform = (
        `translate(calc(-50% + ${reading.x * travel}px), calc(-50% + ${reading.z * travel}px))`
      );
    }
    updateInput();
  };

  const handleJoystickPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointerRef.current !== null) return;
    event.preventDefault();
    joystickPointerRef.current = event.pointerId;
    const zone = event.currentTarget.getBoundingClientRect();
    const placement = placeCityJoystick(event.clientX, event.clientY, zone);
    joystickBoundsRef.current = placement.bounds;
    setJoystickAnchor(placement.anchor);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Window-level pointer end handlers still release the stick if capture is unavailable.
    }
    updateJoystick(event);
  };

  const handleJoystickPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointerRef.current !== event.pointerId) return;
    updateJoystick(event);
  };

  const releaseJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointerRef.current !== event.pointerId) return;
    joystickPointerRef.current = null;
    joystickRef.current = { x: 0, z: 0 };
    setJoystickAnchor(null);
    if (joystickKnobRef.current) joystickKnobRef.current.style.transform = "translate(-50%, -50%)";
    updateInput();
  };

  const beginCameraLook = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (
      event.pointerType !== "mouse"
      && event.clientX < bounds.left + bounds.width * 0.46
    ) return;
    event.preventDefault();
    cameraPointerRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The scene fills the screen, so bubbling pointer events remain available as a fallback.
    }
  };

  const updateCameraLook = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = cameraPointerRef.current;
    if (gesture?.pointerId !== event.pointerId) return;
    cameraControlRef.current = stepCityCameraLook(
      cameraControlRef.current,
      event.clientX - gesture.x,
      event.clientY - gesture.y,
    );
    gesture.x = event.clientX;
    gesture.y = event.clientY;
  };

  const endCameraLook = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (cameraPointerRef.current?.pointerId === event.pointerId) cameraPointerRef.current = null;
  };

  const onNearbyDoorChange = useCallback((door: CityDoor | null) => {
    if (door) {
      focusDoor(door);
      return;
    }
    activeDoorIdRef.current = null;
    setActiveDoor(null);
  }, [focusDoor]);

  return (
    <main className="city-hub" aria-label={`${CAMPAIGN_NARRATIVE.cityName} şehir merkezi`}>
      <div
        className="city-hub__scene"
        onPointerDown={beginCameraLook}
        onPointerMove={updateCameraLook}
        onPointerUp={endCameraLook}
        onPointerCancel={endCameraLook}
        onLostPointerCapture={endCameraLook}
      >
        <CityHubScene
          positionRef={positionRef}
          inputRef={inputRef}
          cameraControlRef={cameraControlRef}
          activeDoorId={activeDoor?.id ?? null}
          onNearbyDoorChange={onNearbyDoorChange}
          playerAppearance={playerAppearance}
        />
      </div>

      <header className="city-hub__header">
        <div className="city-hub__brand">
          <span className="city-hub__crest" aria-hidden="true">✦</span>
          <div>
            <p>KIRIK ŞAFAK · YAŞAYAN MERKEZ</p>
            <h1>{CAMPAIGN_NARRATIVE.cityName}</h1>
          </div>
        </div>
        <div className="city-hub__top-actions">
          <span className="city-hub__traveler">{playerName} <small>· Bölüm {campaignChapter}</small></span>
          <button type="button" onClick={onOpenProfile} aria-label="Operatör profilini aç">PROFİL</button>
          <button type="button" onClick={onOpenSettings} aria-label="Ayarları aç">AYARLAR</button>
          <button type="button" onClick={onExit} aria-label="Ana menüye dön">MENÜ</button>
        </div>
      </header>

      <section className="city-hub__quest" aria-label="Ana hikâye görevi">
        <div className="city-hub__quest-kicker">
          <span>ANA HİKÂYE</span>
          <b>OPERASYON {campaignActNumber} / {CAMPAIGN_ACT_COUNT}</b>
        </div>
        <h2>{campaignActName}</h2>
        <p>{campaignSummary}</p>
        <div className="city-hub__quest-objective">
          <b>BU BÖLÜMÜN HEDEFİ</b>
          <span>{campaignObjective}</span>
        </div>
        <div className="city-hub__quest-progress">
          <div
            role="progressbar"
            aria-label="Sefer ilerlemesi"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(campaignProgressPercent)}
          >
            <i style={{ width: `${Math.max(0, Math.min(100, campaignProgressPercent))}%` }} />
          </div>
          <small>BÖLÜM {campaignChapter} / {CAMPAIGN_LEVEL_COUNT} · {Math.floor(campaignProgressPercent)}%</small>
        </div>
        <button type="button" onClick={onOpenCampaign}>
          SEFERE DEVAM ET <span aria-hidden="true">↗</span>
        </button>
      </section>

      {activeDoor && (
        <section className="city-hub__door-card" aria-live="polite" aria-atomic="true">
          <div className="city-hub__door-mark" style={{ backgroundColor: activeDoor.color }} aria-hidden="true">↗</div>
          <div className="city-hub__door-copy">
            <small>{activeDoor.street} · {activeDoor.category}</small>
            <h2>{activeDoor.title}</h2>
            <p>{activeDoor.description}</p>
          </div>
          <button type="button" onClick={() => enterDoor(activeDoor)}>
            GİR <span aria-hidden="true">↗</span>
          </button>
        </section>
      )}

      <aside
        className={`city-hub__route-guide${activeDoor ? " is-door-active" : ""}`}
        aria-label="Görevler ve oyun modları"
      >
        <span className="city-hub__route-guide-title">GÖREVLER VE MODLAR</span>
        {CITY_DOORS.map((door) => (
          <button
            type="button"
            key={door.id}
            aria-current={activeDoor?.id === door.id ? "location" : undefined}
            className={`city-hub__route-item${activeDoor?.id === door.id ? " is-active" : ""}`}
            onClick={() => enterDoor(door)}
          >
            <i style={{ backgroundColor: door.color }} aria-hidden="true" />
            <span>{door.title}</span>
            <small>{door.category}</small>
          </button>
        ))}
      </aside>

      <div
        className="city-hub__joystick-zone"
        aria-label="Sol ekranda dokunup sürükleyerek yürü"
        role="application"
        onPointerDown={handleJoystickPointerDown}
        onPointerMove={handleJoystickPointerMove}
        onPointerUp={releaseJoystick}
        onPointerCancel={releaseJoystick}
        onLostPointerCapture={releaseJoystick}
      >
        <div
          className="city-hub__joystick"
          aria-hidden="true"
          style={joystickAnchor
            ? {
              left: joystickAnchor.x,
              top: joystickAnchor.y,
              bottom: "auto",
              transform: "translate(-50%, -50%)",
            }
            : undefined}
        >
          <span className="city-hub__joystick-arrow city-hub__joystick-arrow--up">▲</span>
          <span className="city-hub__joystick-arrow city-hub__joystick-arrow--down">▼</span>
          <span className="city-hub__joystick-arrow city-hub__joystick-arrow--left">◀</span>
          <span className="city-hub__joystick-arrow city-hub__joystick-arrow--right">▶</span>
          <i
            ref={joystickKnobRef}
            className="city-hub__joystick-knob"
            style={{ transform: "translate(-50%, -50%)" }}
          />
        </div>
      </div>

      <div className="city-hub__controls-hint" aria-hidden="true">
        <kbd>W A S D</kbd><span>veya ok tuşları</span><b>·</b><kbd>E</kbd><span>kapıda etkileşim</span>
      </div>
      <p className="city-hub__screen-reader-help">
        Masaüstünde W, A, S, D veya ok tuşlarıyla; telefonda ekranın sol tarafına dokunup sürükleyerek dört yönde yürü.
        Kamerayı sahnenin sağ tarafından sürükleyerek çevir.
        Yakındaki bir kapı için E tuşunu veya giriş düğmesini kullan.
      </p>
    </main>
  );
}
