import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { StoreTab } from "../game/store-types.ts";
import CityHubScene from "./CityHubScene";
import {
  CITY_DOORS,
  CITY_START_POSITION,
  type CityDoor,
  type CityDoorId,
  type CityInput,
  type CityPosition,
} from "./city-hub-layout";
import { CAMPAIGN_NARRATIVE } from "./campaign-narrative";
import "./city-hub.css";

type CityHubProps = {
  playerName: string;
  campaignChapter: number;
  onOpenCampaign: () => void;
  onOpenWarRoom: () => void;
  onOpenStore: (tab: StoreTab) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onExit: () => void;
};

type JoystickPosition = { x: number; z: number };

const clampAxis = (value: number) => Math.max(-1, Math.min(1, value));

export default function CityHub({
  playerName,
  campaignChapter,
  onOpenCampaign,
  onOpenWarRoom,
  onOpenStore,
  onOpenProfile,
  onOpenSettings,
  onExit,
}: CityHubProps) {
  const positionRef = useRef<CityPosition>({ ...CITY_START_POSITION });
  const inputRef = useRef<CityInput>({ x: 0, z: 0 });
  const keysRef = useRef(new Set<string>());
  const joystickRef = useRef<JoystickPosition>({ x: 0, z: 0 });
  const activeDoorIdRef = useRef<CityDoorId | null>(null);
  const joystickPointerRef = useRef<number | null>(null);
  const [activeDoor, setActiveDoor] = useState<CityDoor | null>(null);
  const [joystickPosition, setJoystickPosition] = useState<JoystickPosition>({ x: 0, z: 0 });

  const updateInput = useCallback(() => {
    const keys = keysRef.current;
    const keyboardX = Number(keys.has("arrowright") || keys.has("d"))
      - Number(keys.has("arrowleft") || keys.has("a"));
    const keyboardZ = Number(keys.has("arrowdown") || keys.has("s"))
      - Number(keys.has("arrowup") || keys.has("w"));
    inputRef.current = {
      x: clampAxis(keyboardX + joystickRef.current.x),
      z: clampAxis(keyboardZ + joystickRef.current.z),
    };
  }, []);

  const enterDoor = useCallback((door: CityDoor | null) => {
    if (!door) return;
    switch (door.id) {
      case "campaign":
        onOpenCampaign();
        break;
      case "war-room":
        onOpenWarRoom();
        break;
      case "weapons":
        onOpenStore("weapons");
        break;
      case "smithy":
        onOpenStore("smithy");
        break;
    }
  }, [onOpenCampaign, onOpenStore, onOpenWarRoom]);

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
      joystickRef.current = { x: 0, z: 0 };
      setJoystickPosition({ x: 0, z: 0 });
      updateInput();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [enterDoor, onExit, updateInput]);

  const updateJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    const radius = Math.max(1, rect.width * 0.34);
    const x = clampAxis(dx / radius);
    const z = clampAxis(dy / radius);
    joystickRef.current = { x, z };
    setJoystickPosition({ x, z });
    updateInput();
  };

  const handleJoystickPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    joystickPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
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
    setJoystickPosition({ x: 0, z: 0 });
    updateInput();
  };

  const onNearbyDoorChange = useCallback((door: CityDoor | null) => {
    activeDoorIdRef.current = door?.id ?? null;
    setActiveDoor(door);
  }, []);

  return (
    <main className="city-hub" aria-label={`${CAMPAIGN_NARRATIVE.cityName} şehir merkezi`}>
      <div className="city-hub__scene">
        <CityHubScene
          positionRef={positionRef}
          inputRef={inputRef}
          activeDoorId={activeDoor?.id ?? null}
          onNearbyDoorChange={onNearbyDoorChange}
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
          <button type="button" onClick={onOpenProfile} aria-label="Yolcu profilini aç">PROFİL</button>
          <button type="button" onClick={onOpenSettings} aria-label="Ayarları aç">AYARLAR</button>
          <button type="button" onClick={onExit} aria-label="Ana menüye dön">MENÜ</button>
        </div>
      </header>

      <div className="city-hub__welcome">
        <span>ŞEHRİN İLK SABAHI</span>
        <p>Çan yeniden çaldı. Sokaklarda tanıklar, açık kapılar ve farklı yollar seni bekliyor.</p>
      </div>

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

      <aside className="city-hub__route-guide" aria-label="Şehirdeki oyun alanları">
        <span className="city-hub__route-guide-title">SOKAKLARDAKİ KAPILAR</span>
        {CITY_DOORS.map((door) => (
          <div
            key={door.id}
            className={`city-hub__route-item${activeDoor?.id === door.id ? " is-active" : ""}`}
          >
            <i style={{ backgroundColor: door.color }} aria-hidden="true" />
            <span>{door.title}</span>
            <small>{door.street}</small>
          </div>
        ))}
      </aside>

      <div
        className="city-hub__joystick"
        aria-label="Yürüyüş kontrolü"
        role="application"
        onPointerDown={handleJoystickPointerDown}
        onPointerMove={handleJoystickPointerMove}
        onPointerUp={releaseJoystick}
        onPointerCancel={releaseJoystick}
      >
        <span className="city-hub__joystick-arrow city-hub__joystick-arrow--up">▲</span>
        <span className="city-hub__joystick-arrow city-hub__joystick-arrow--down">▼</span>
        <span className="city-hub__joystick-arrow city-hub__joystick-arrow--left">◀</span>
        <span className="city-hub__joystick-arrow city-hub__joystick-arrow--right">▶</span>
        <i
          className="city-hub__joystick-knob"
          style={{
            transform: `translate(calc(-50% + ${joystickPosition.x * 27}px), calc(-50% + ${joystickPosition.z * 27}px))`,
          }}
        />
      </div>

      <div className="city-hub__controls-hint" aria-hidden="true">
        <kbd>W A S D</kbd><span>veya ok tuşları</span><b>·</b><kbd>E</kbd><span>kapıda etkileşim</span>
      </div>
      <p className="city-hub__screen-reader-help">
        Masaüstünde W, A, S, D veya ok tuşlarıyla; telefonda sol alttaki kontrolle dört yönde yürü.
        Yakındaki bir kapı için E tuşunu veya giriş düğmesini kullan.
      </p>
    </main>
  );
}
