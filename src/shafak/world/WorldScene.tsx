import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import WorldAtmosphere from "./WorldAtmosphere";
import worldText from "./strings";
import useTravelAudio from "./useTravelAudio";
import type { PlayerProfile } from "../game/profile";
import type { Opponent } from "../game/types";
import "./world-scene.css";

type WorldSceneProps = {
  quality: "high" | "balanced";
  motionReduced: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  onExit: () => void;
  onOpenSettings: () => void;
  profile: PlayerProfile;
  onOpenProfile: () => void;
  onEncounterStart: (opponent: Opponent) => void;
};
type Panel = "inventory" | "settings" | null;
type Vector = { x: number; y: number };

function Icon({ name }: { name: "bag" | "settings" | "exit" }) {
  if (name === "bag") {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 8h14l1 12H4L5 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 9V6a3 3 0 0 1 6 0v3M8 13h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
  }
  if (name === "settings") {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m10.2 3.8.5-1h2.6l.5 1a1.9 1.9 0 0 0 2.3.8l1-.4 1.8 1.8-.4 1a1.9 1.9 0 0 0 .8 2.3l1 .5v2.6l-1 .5a1.9 1.9 0 0 0-.8 2.3l.4 1-1.8 1.8-1-.4a1.9 1.9 0 0 0-2.3.8l-.5 1h-2.6l-.5-1a1.9 1.9 0 0 0-2.3-.8l-1 .4-1.8-1.8.4-1a1.9 1.9 0 0 0-.8-2.3l-1-.5V9.8l1-.5a1.9 1.9 0 0 0 .8-2.3l-.4-1 1.8-1.8 1 .4a1.9 1.9 0 0 0 2.3-.8Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round"/><circle cx="12" cy="11.1" r="3.1" stroke="currentColor" strokeWidth="1.35"/></svg>;
  }
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export default function WorldScene({
  quality,
  motionReduced,
  soundEnabled,
  vibrationEnabled,
  onExit,
  onOpenSettings,
  profile,
  onOpenProfile,
  onEncounterStart,
}: WorldSceneProps) {
  const sceneRef = useRef<HTMLElement>(null);
  const heldKeys = useRef(new Set<string>());
  const inputRef = useRef<Vector>({ x: 0, y: 0 });
  const velocityRef = useRef<Vector>({ x: 0, y: 0 });
  const playerXRef = useRef(0);
  const travelRef = useRef(0);
  const tapTimerRef = useRef<number | undefined>(undefined);
  const lastVibrationRef = useRef(0);
  const lastMotionRef = useRef<"idle" | "walking" | "running" | "stopped">("idle");
  const panelTriggerRef = useRef<HTMLButtonElement>(null);
  const [motion, setMotion] = useState<"idle" | "walking" | "running" | "stopped">("idle");
  const [panel, setPanel] = useState<Panel>(null);
  const [rain, setRain] = useState(false);
  const [audioOn, setAudioOn] = useState(soundEnabled);
  const [vibrationOn, setVibrationOn] = useState(vibrationEnabled);
  const [travel, setTravel] = useState(0);
  const startAudio = useTravelAudio(audioOn, motion === "walking" || motion === "running", rain);
  const opponents: (Opponent & { distance: number })[] = [
    { id: "ash-scout", name: "Kül İzci", level: 2, winRate: 42, loot: 48, taunt: "Bu yolun sonu sana kapalı!", difficulty: "easy", distance: 18 },
    { id: "iron-vow", name: "Demir Yemin", level: 4, winRate: 57, loot: 76, taunt: "Ganimetini almaya geldim.", difficulty: "medium", distance: 58 },
    { id: "dusk-wolf", name: "Alacakaranlık Kurdu", level: 6, winRate: 68, loot: 112, taunt: "Şafak burada sönecek.", difficulty: "hard", distance: 112 },
  ];
  const nextOpponent = opponents.find((candidate) => !profile.defeatedOpponents.includes(candidate.id));
  const encounterDistance = nextOpponent ? Math.abs(nextOpponent.distance - travel) : Number.POSITIVE_INFINITY;
  const encounterVisible = Boolean(nextOpponent && encounterDistance <= 25);
  const canChallenge = Boolean(nextOpponent && encounterDistance <= 8);

  const wake = useCallback(() => {
    if (audioOn) startAudio();
  }, [audioOn, startAudio]);

  useEffect(() => {
    setAudioOn(soundEnabled);
  }, [soundEnabled]);
  useEffect(() => {
    setVibrationOn(vibrationEnabled);
  }, [vibrationEnabled]);

  useEffect(() => {
    let frame = 0;
    let previous = 0;
    let lastReactUpdate = 0;
    let lastActive = 0;
    let didMove = false;
    const animate = (now: number) => {
      const dt = Math.min((now - (previous || now)) / 1000, .05);
      previous = now;
      const keys = heldKeys.current;
      const keyX = Number(keys.has("arrowright") || keys.has("d")) - Number(keys.has("arrowleft") || keys.has("a"));
      const keyY = Number(keys.has("arrowup") || keys.has("w")) - Number(keys.has("arrowdown") || keys.has("s"));
      const requested = inputRef.current;
      const targetX = Math.max(-1, Math.min(1, keyX || requested.x));
      const targetY = Math.max(-1, Math.min(1, keyY || requested.y));
      const sprint = keys.has("shift") || requested.y > .86;
      const targetSpeed = targetY === 0 && targetX === 0 ? 0 : sprint ? 248 : 126;
      const velocity = velocityRef.current;
      const accel = targetSpeed ? 1 - Math.pow(.0018, dt) : 1 - Math.pow(.055, dt);
      velocity.y += (targetY * targetSpeed - velocity.y) * accel;
      velocity.x += (targetX * targetSpeed * .72 - velocity.x) * accel;
      travelRef.current += Math.abs(velocity.y) * dt;
      playerXRef.current = Math.max(-1, Math.min(1, playerXRef.current + velocity.x * dt / 180));

      const root = sceneRef.current;
      if (root) {
        const zoom = 1 + Math.min(Math.abs(velocity.y) / 248, 1) * .045;
        const followX = playerXRef.current * 76;
        root.style.setProperty("--ws-travel", `${travelRef.current}px`);
        root.style.setProperty("--world-zoom", String(zoom));
        root.style.setProperty("--ws-player-x", `${followX}px`);
        root.style.setProperty("--ws-ridge-x", `${followX * .16}px`);
        root.style.setProperty("--ws-ridge-y", `${-travelRef.current * .018}px`);
        root.style.setProperty("--ws-haze-x", `${-followX * .16 + Math.sin(now / 13000) * 14}px`);
        root.style.setProperty("--ws-ruins-x", `${followX * .5}px`);
        root.style.setProperty("--ws-ruins-parallax", `${-travelRef.current * .045}px`);
        root.style.setProperty("--ws-road-x", `${-followX * .25}px`);
        root.style.setProperty("--ws-road-y", `${-travelRef.current * .075}px`);
        root.style.setProperty("--ws-foreground-x", `${-followX * .4}px`);
        root.style.setProperty("--ws-foreground-y", `${-travelRef.current * .16}px`);
        root.style.setProperty("--ws-travel", `${travelRef.current % 1800}px`);
        root.style.setProperty("--ws-sky-y", `${-travelRef.current * .014}px`);
      }
      const isMoving = Math.abs(velocity.x) + Math.abs(velocity.y) > 15;
      if (isMoving) {
        lastActive = now;
        didMove = true;
      }
      const nextMotion = isMoving
        ? Math.abs(velocity.y) > 175 ? "running" : "walking"
        : didMove && now - lastActive < 850 ? "stopped" : "idle";
      if (nextMotion !== lastMotionRef.current) {
        lastMotionRef.current = nextMotion;
        setMotion(nextMotion);
      }
      if (isMoving && vibrationOn && now - lastVibrationRef.current > (sprint ? 650 : 900)) {
        lastVibrationRef.current = now;
        if ("vibrate" in navigator) {
          try { navigator.vibrate(rain ? 10 : 7); } catch { /* Haptics are optional. */ }
        }
      }
      if (now - lastReactUpdate > 220) {
        lastReactUpdate = now;
        setTravel(Math.floor(travelRef.current / 10) * 10);
      }
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [rain, vibrationOn]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPanel(null);
        return;
      }
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "shift"].includes(key)) {
        if (event.target instanceof HTMLElement && /input|textarea|select/i.test(event.target.tagName)) return;
        event.preventDefault();
        heldKeys.current.add(key);
        wake();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => heldKeys.current.delete(event.key.toLowerCase());
    const onBlur = () => { heldKeys.current.clear(); inputRef.current = { x: 0, y: 0 }; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [wake]);

  useEffect(() => {
    if (!panel) return undefined;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => sceneRef.current?.querySelector<HTMLElement>(".world-panel__close")?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", closeOnEscape);
      (previous ?? panelTriggerRef.current)?.focus();
    };
  }, [panel]);

  useEffect(() => () => {
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    if ("vibrate" in navigator) navigator.vibrate(0);
  }, []);

  const openPanel = (next: Exclude<Panel, null>) => {
    wake();
    panelTriggerRef.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
    if (next === "settings") onOpenSettings();
    setPanel(next);
  };
  const onStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, .world-panel, .world-joystick")) return;
    wake();
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) / bounds.width;
    inputRef.current = { x: relativeX < .32 ? -.38 : relativeX > .68 ? .38 : 0, y: 1 };
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    tapTimerRef.current = window.setTimeout(() => { inputRef.current = { x: 0, y: 0 }; }, 1350);
  };
  const onJoystickPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    wake();
    updateJoystick(event);
  };
  const updateJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const max = rect.width * .34;
    const length = Math.min(Math.hypot(dx, dy), max);
    const scale = length > 0 ? length / Math.hypot(dx, dy) : 0;
    const x = dx * scale;
    const y = dy * scale;
    inputRef.current = { x: x / max, y: -y / max };
    const nub = event.currentTarget.querySelector<HTMLElement>(".world-joystick__nub");
    nub?.style.setProperty("transform", `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`);
  };
  const releaseJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    inputRef.current = { x: 0, y: 0 };
    event.currentTarget.querySelector<HTMLElement>(".world-joystick__nub")?.style.setProperty("transform", "translate(-50%,-50%)");
  };

  return (
    <main
      ref={sceneRef}
      className={`world-scene${rain ? " world-rain" : ""}`}
      data-quality={quality}
      data-reduced={motionReduced}
      aria-label={worldText.brand}
    >
      <div className="world-stage" onPointerDown={onStagePointerDown}>
        <div className="world-stage__sky" />
        <div className="world-stage__horizon" />
        <div className="world-plane world-plane--ridge" />
        <div className="world-plane world-plane--haze" />
        <div className="world-plane world-plane--ruins" />
        <div className="world-plane world-plane--road" />
        <div className="world-plane world-plane--foreground" />
        <div className="world-rays" />
        <WorldAtmosphere quality={quality} motionReduced={motionReduced} rain={rain} travel={travel} />
        <div className="world-splashes" aria-hidden="true" />
        <div className="world-figure" data-motion={motion} aria-hidden="true">
          <img src="/shafak-warrior.png" alt="" draggable={false} />
        </div>
        <div className="world-vignette" />
      </div>
      <header className="world-topbar">
        <button className="world-profile" type="button" onClick={onOpenProfile} aria-label={`${profile.name}, seviye ${profile.level}, profili aç`}>
          <span className="world-profile__crest" aria-hidden="true">Ş</span>
          <span className="world-profile__identity">
            <strong className="world-profile__name">{profile.name}</strong>
            <span className="world-profile__demo">YOLCU PROFİLİ</span>
          </span>
          <span className="world-profile__level"><span>{worldText.level}</span><b>{String(profile.level).padStart(2, "0")}</b></span>
        </button>
        <div className="world-currency" aria-label={`${worldText.gold}: ${profile.gold}`} title={worldText.gold}>
          <span className="world-currency__coin" aria-hidden="true" />
          <span>{profile.gold.toLocaleString("tr-TR")}</span>
        </div>
      </header>
      <div className={`world-weather${rain ? " world-weather--rain" : ""}`}>
        <span>{worldText.weather}: {rain ? worldText.rain : worldText.clear}</span>
        <button
          className="world-weather__switch"
          type="button"
          role="switch"
          aria-checked={rain}
          aria-label={`${worldText.weather}: ${rain ? worldText.rain : worldText.clear}`}
          onClick={() => { wake(); setRain((current) => !current); }}
        ><span /></button>
      </div>
      <div
        className="world-joystick"
        role="application"
        aria-label={worldText.controls}
        onPointerDown={onJoystickPointerDown}
        onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updateJoystick(event); }}
        onPointerUp={releaseJoystick}
        onPointerCancel={releaseJoystick}
      ><span className="world-joystick__nub" /></div>
      <span className="world-mobile-hint" aria-hidden="true">{worldText.controls}</span>
      {encounterVisible && nextOpponent && (
        <div className={`world-encounter${canChallenge ? " is-near" : ""}`} aria-live="polite">
          <div className="world-encounter__rival" aria-hidden="true"><img src="/shafak-warrior.png" alt="" /></div>
          <div className="world-encounter__card">
            <span className="world-encounter__eyebrow">{canChallenge ? "YAKINDA · MEYDAN OKUMA" : `YOL KESEN · ${Math.ceil(encounterDistance)} M`}</span>
            <strong>{nextOpponent.name}</strong>
            <span>Seviye {nextOpponent.level} <i>·</i> Kazanma %{nextOpponent.winRate} <i>·</i> {nextOpponent.loot} altın</span>
            <em>“{nextOpponent.taunt}”</em>
            {canChallenge && (
              <button type="button" className="world-encounter__fight" onClick={() => onEncounterStart(nextOpponent)}>
                <span aria-hidden="true">⚔</span> SAVAŞ
              </button>
            )}
          </div>
        </div>
      )}
      <footer className="world-controls">
        <div className="world-navigation">
          <button className="world-exit" type="button" onClick={onExit} aria-label={worldText.exit}>
            <Icon name="exit" /><span>{worldText.exit}</span>
          </button>
          <div className="world-status" aria-live="polite" aria-atomic="true">
            <span className="world-status__label">{worldText.world}</span>
            <strong className="world-status__value">{worldText[motion]}</strong>
          </div>
        </div>
        <div className="world-actions">
          <button type="button" className="world-action" aria-label={worldText.inventory} onClick={() => openPanel("inventory")}>
            <Icon name="bag" /><span>{worldText.inventory}</span>
          </button>
          <button type="button" className="world-action" aria-label={worldText.settingsOpen} onClick={() => openPanel("settings")}>
            <Icon name="settings" /><span>{worldText.settings}</span>
          </button>
        </div>
      </footer>
      {panel && (
        <div className="world-panel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPanel(null); }}>
          <section className="world-panel" role="dialog" aria-modal="true" aria-labelledby="world-panel-title">
            <div className="world-panel__heading">
              <div>
                <span className="world-panel__eyebrow">{worldText.brand}</span>
                <h2 id="world-panel-title">{panel === "inventory" ? worldText.inventoryTitle : worldText.settingsTitle}</h2>
              </div>
              <button className="world-panel__close" type="button" aria-label={worldText.close} onClick={() => setPanel(null)}>×</button>
            </div>
            {panel === "inventory" ? (
              <>
                <div className="world-inventory">
                  {Array.from({ length: 8 }, (_, index) => (
                    <div className={`world-inventory__slot${profile.items[index] ? " world-inventory__slot--filled" : ""}`} key={index} aria-label={`${profile.items[index] ?? "Boş"} ${index + 1}`}>
                      {profile.items[index] ? <><i>✦</i><small>{profile.items[index]}</small></> : <span>{String(index + 1).padStart(2, "0")}</span>}
                    </div>
                  ))}
                </div>
                <p className="world-inventory__note">{profile.items.length ? `${profile.items.length} ganimet heybenin içinde.` : worldText.inventoryNote}</p>
              </>
            ) : (
              <>
                <div className="world-setting">
                  <span><strong>{worldText.sound}</strong><small>{worldText.soundDescription}</small></span>
                  <button type="button" role="switch" aria-checked={audioOn} aria-label={audioOn ? worldText.soundOn : worldText.soundOff} onClick={() => {
                    const next = !audioOn;
                    setAudioOn(next);
                    if (next) startAudio();
                  }}>{audioOn ? worldText.soundOn : worldText.soundOff}</button>
                </div>
                <div className="world-setting">
                  <span><strong>{worldText.vibration}</strong><small>{worldText.vibrationDescription}</small></span>
                  <button type="button" role="switch" aria-checked={vibrationOn} aria-label={vibrationOn ? worldText.vibrationOn : worldText.vibrationOff} onClick={() => setVibrationOn((current) => !current)}>{vibrationOn ? worldText.vibrationOn : worldText.vibrationOff}</button>
                </div>
                <p className="world-inventory__note">{worldText.settingsNote}</p>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
