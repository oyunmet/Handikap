import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { playFootstep } from "../audio/howler";
import CharacterRenderer from "./CharacterRenderer";
import WorldAtmosphere from "./WorldAtmosphere";
import WorldRenderer from "./WorldRenderer";
import {
  createWorldMotion,
  readWorldInput,
  stepWorldMotion,
  WORLD_GATE_INTERVAL_METERS,
  WORLD_METERS_TO_PIXELS,
} from "./movement";
import { nextGateDistance } from "./world-generation";
import worldText from "./strings";
import useTravelAudio from "./useTravelAudio";
import useWorldInput from "./useWorldInput";
import type { PlayerProfile } from "../game/profile";
import type { Opponent } from "../game/types";
import "./world-scene.css";

type WorldSceneProps = {
  quality: "high" | "balanced" | "low";
  motionReduced: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  onExit: () => void;
  onOpenSettings: () => void;
  profile: PlayerProfile;
  onOpenProfile: () => void;
};
type Panel = "inventory" | "settings" | null;
type StepBurst = { id: number; x: number; running: boolean; expires: number };

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
}: WorldSceneProps) {
  const sceneRef = useRef<HTMLElement>(null);
  const motionRef = useRef(createWorldMotion());
  const worldRenderRef = useRef<((now: number) => void) | null>(null);
  const lastMotionRef = useRef<"idle" | "walking" | "running" | "stopped">("idle");
  const panelTriggerRef = useRef<HTMLButtonElement>(null);
  const [motion, setMotion] = useState<"idle" | "walking" | "running" | "stopped">("idle");
  const [panel, setPanel] = useState<Panel>(null);
  const [airEnabled, setAirEnabled] = useState(true);
  const [audioOn, setAudioOn] = useState(soundEnabled);
  const [vibrationOn, setVibrationOn] = useState(vibrationEnabled);
  const [travel, setTravel] = useState(0);
  const [stepBursts, setStepBursts] = useState<StepBurst[]>([]);
  const startAudio = useTravelAudio(audioOn, motion === "walking" || motion === "running", airEnabled);
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
  const worldInput = useWorldInput(wake);

  useEffect(() => {
    setAudioOn(soundEnabled);
  }, [soundEnabled]);
  useEffect(() => {
    setVibrationOn(vibrationEnabled);
  }, [vibrationEnabled]);

  useEffect(() => () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(0);
  }, []);

  useEffect(() => {
    let frame = 0;
    let previous = 0;
    let lastReactUpdate = 0;
    let lastVisualUpdate = 0;
    let lastCanvasRender = 0;
    let sceneWidth = sceneRef.current?.getBoundingClientRect().width || window.innerWidth;
    const appliedCssVariables = new Map<string, string>();
    const resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width;
      if (nextWidth && Number.isFinite(nextWidth)) sceneWidth = nextWidth;
    });
    if (sceneRef.current) resizeObserver.observe(sceneRef.current);
    const setSceneVariable = (root: HTMLElement, property: string, value: string) => {
      if (appliedCssVariables.get(property) === value) return;
      appliedCssVariables.set(property, value);
      root.style.setProperty(property, value);
    };
    const animate = (now: number) => {
      const dt = Math.min((now - (previous || now)) / 1000, .05);
      previous = now;
      const frameState = stepWorldMotion(
        motionRef.current,
        readWorldInput(worldInput.heldKeys.current, worldInput.joystick.current),
        dt,
      );
      motionRef.current = frameState;
      if (now - lastCanvasRender >= 1000 / 20) {
        lastCanvasRender = now;
        worldRenderRef.current?.(now);
      }

      const root = sceneRef.current;
      if (root && now - lastVisualUpdate >= 1000 / 60) {
        lastVisualUpdate = now;
        const pixelsPerMeter = Math.max(30, Math.min(48, sceneWidth * .095));
        const cameraPixels = frameState.cameraX * pixelsPerMeter;
        const distance = frameState.distance;
        const farOffset = ((cameraPixels * .075) % sceneWidth + sceneWidth) % sceneWidth;
        setSceneVariable(root, "--ws-travel", `${distance}m`);
        setSceneVariable(root, "--world-zoom", String(frameState.zoom));
        setSceneVariable(root, "--ws-player-drift-x", `${motionReduced ? 0 : frameState.cameraLead}px`);
        setSceneVariable(root, "--ws-facing-angle", frameState.facing < 0 ? "180deg" : "0deg");
        setSceneVariable(root, "--ws-far-offset", `${farOffset}px`);
        setSceneVariable(root, "--ws-ridge-shift", `${-cameraPixels * .15}px`);
        setSceneVariable(root, "--ws-haze-shift", `${-cameraPixels * .25}px`);
        setSceneVariable(root, "--ws-road-shift", `${-cameraPixels * .76}px`);
        setSceneVariable(root, "--ws-road-detail-shift", `${-cameraPixels * .54}px`);
        setSceneVariable(root, "--ws-foreground-shift", `${-cameraPixels * 1.04}px`);
        setSceneVariable(root, "--ws-depth-y", `${motionReduced ? 0 : -frameState.depth * 46}px`);
        setSceneVariable(root, "--ws-depth-bottom", `${frameState.depth * 46}px`);
        setSceneVariable(root, "--ws-bob", `${motionReduced ? 0 : frameState.bob}px`);
        setSceneVariable(root, "--ws-lean", `${motionReduced ? 0 : frameState.lean}deg`);
        setSceneVariable(root, "--ws-weight-shift", `${motionReduced ? 0 : frameState.weightShift}px`);
        setSceneVariable(root, "--ws-squash", String(motionReduced ? 1 : 1 - frameState.squash));
        setSceneVariable(root, "--ws-shadow-scale", String(frameState.shadowScale));
      }
      if (frameState.motion !== lastMotionRef.current) {
        lastMotionRef.current = frameState.motion;
        setMotion(frameState.motion);
      }
      if (frameState.footsteps > 0) {
        const count = Math.min(frameState.footsteps, 2);
        const firstId = frameState.stepCount - count + 1;
        const running = frameState.motion === "running";
        setStepBursts((current) => [
          ...current.filter((burst) => burst.expires > now),
          ...Array.from({ length: count }, (_, index) => ({
            id: firstId + index,
            x: frameState.cameraLead,
            running,
            expires: now + 720,
          })),
        ].slice(-16));
        for (let index = 0; index < count; index += 1) {
          playFootstep({ running, surface: "stone", enabled: audioOn });
          if (vibrationOn && "vibrate" in navigator) {
            try { navigator.vibrate(running ? 8 : 5); } catch { /* Haptics are optional. */ }
          }
        }
      }
      if (now - lastReactUpdate > 220) {
        lastReactUpdate = now;
        setTravel(Math.floor(frameState.distance));
      }
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [audioOn, motionReduced, vibrationOn, worldInput.heldKeys, worldInput.joystick]);

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

  const openPanel = (next: Exclude<Panel, null>) => {
    wake();
    panelTriggerRef.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
    if (next === "settings") onOpenSettings();
    setPanel(next);
  };
  const gateDistance = nextGateDistance(travel);
  const chapterProgress = Math.max(0, Math.min(100, ((travel % WORLD_GATE_INTERVAL_METERS) / WORLD_GATE_INTERVAL_METERS) * 100));
  return (
    <main
      ref={sceneRef}
      className="world-scene"
      data-quality={quality}
      data-reduced={motionReduced}
      data-air={airEnabled}
      data-motion={motion}
      aria-label={worldText.brand}
    >
      <div className="world-stage" onPointerDown={worldInput.onStagePointerDown}>
        <svg className="world-motion-filters" aria-hidden="true" focusable="false">
          <defs>
            <filter id="world-cape-wind" x="-12%" y="-8%" width="124%" height="116%">
              <feTurbulence type="fractalNoise" baseFrequency=".014 .042" numOctaves="1" seed="8" result="wind">
                {!motionReduced && (
                  <animate attributeName="baseFrequency" values=".014 .042;.023 .06;.014 .042" dur="3.2s" repeatCount="indefinite" />
                )}
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="wind" scale="5" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
        <div className="world-stage__sky">
          {[-1, 0, 1, 2].map((tileIndex) => (
            <div
              className={`world-stage__sky-tile${Math.abs(tileIndex) % 2 === 1 ? " is-mirrored" : ""}`}
              key={tileIndex}
              style={{ left: `calc(${tileIndex * 100}% - var(--ws-far-offset, 0px))` }}
            />
          ))}
        </div>
        <div className="world-stage__horizon" />
        <div className="world-plane world-plane--ridge" />
        <div className="world-plane world-plane--haze" />
        <div className="world-plane world-plane--road" />
        <div className="world-plane world-plane--foreground" />
        <div className="world-rays" />
        <WorldRenderer
          motionRef={motionRef}
          renderRef={worldRenderRef}
          quality={quality}
          motionReduced={motionReduced}
          level={profile.level}
          relicCount={profile.items.length}
        />
        <WorldAtmosphere
          quality={quality}
          motionReduced={motionReduced}
          enabled={airEnabled}
          travel={motionRef.current.cameraX * WORLD_METERS_TO_PIXELS}
        />
        <div className="world-speed-lines" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <i
              key={index}
              style={{
                "--line-x": `${(index % 3) * 35 + 8}%`,
                "--line-y": `${23 + index * 7}%`,
                "--line-width": `${20 + (index % 4) * 9}vw`,
                "--line-delay": `${index * -.07}s`,
              } as CSSProperties}
            />
          ))}
        </div>
        <div className="world-step-bursts" aria-hidden="true">
          {stepBursts.map((burst) => {
            const particleCount = burst.running ? 7 : 4;
            return (
              <span
                className={`world-step-burst${burst.running ? " is-running" : ""}`}
                key={burst.id}
                style={{ "--burst-x": `${burst.x}px` } as CSSProperties}
              >
                {Array.from({ length: particleCount }, (_, index) => {
                  const angle = (Math.PI * 2 * (index + 1)) / particleCount + burst.id * .61;
                  const spread = burst.running ? 20 : 12;
                  return (
                    <i
                      key={`${burst.id}-${index}`}
                      style={{
                        "--dust-x": `${Math.cos(angle) * spread}px`,
                        "--dust-y": `${-(8 + Math.abs(Math.sin(angle)) * spread)}px`,
                        "--dust-size": `${2 + ((index + burst.id) % 3)}px`,
                        "--dust-delay": `${index * 18}ms`,
                      } as CSSProperties}
                    />
                  );
                })}
              </span>
            );
          })}
        </div>
        <CharacterRenderer motion={motion} motionReduced={motionReduced} />
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
      <div
        className="world-progress"
        role="progressbar"
        aria-label="Kül Yolu bölüm sonu kapısına ilerleme"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(chapterProgress)}
      >
        <div className="world-progress__heading">
          <span>KÜL YOLU</span>
          <b>{Math.round(chapterProgress)}%</b>
        </div>
        <div className="world-progress__track"><i style={{ width: `${chapterProgress}%` }} /></div>
        <span className="world-progress__distance">KAPI · {Math.max(0, gateDistance - travel)} m</span>
      </div>
      <div className="world-weather">
        <span>{worldText.weather}: {airEnabled ? worldText.clear : worldText.airOff}</span>
        <button
          className="world-weather__switch"
          type="button"
          role="switch"
          aria-checked={airEnabled}
          aria-label={`${worldText.weather}: ${airEnabled ? worldText.clear : worldText.airOff}`}
          onClick={() => { wake(); setAirEnabled((current) => !current); }}
        ><span /></button>
      </div>
      <div
        className="world-joystick"
        role="application"
        aria-label={worldText.controls}
        onPointerDown={worldInput.onJoystickPointerDown}
        onPointerMove={worldInput.onJoystickPointerMove}
        onPointerUp={worldInput.onJoystickPointerUp}
        onPointerCancel={worldInput.onJoystickPointerCancel}
      ><span className="world-joystick__nub" /></div>
      <span className="world-mobile-hint" aria-hidden="true">{worldText.controls}</span>
      {encounterVisible && nextOpponent && (
        <div className={`world-encounter${canChallenge ? " is-near" : ""}`} aria-live="polite">
          <div className="world-encounter__rival" aria-hidden="true"><img src="/shafak-warrior.png" alt="" /></div>
          <div className="world-encounter__card">
            <span className="world-encounter__eyebrow">{canChallenge ? "SAVAŞ SİSTEMİ HAZIRLANIYOR" : `YOL KESEN · ${Math.ceil(encounterDistance)} M`}</span>
            <strong>{nextOpponent.name}</strong>
            <span>Seviye {nextOpponent.level} <i>·</i> Kazanma %{nextOpponent.winRate} <i>·</i> {nextOpponent.loot} altın</span>
            <em>“{nextOpponent.taunt}”</em>
            {canChallenge && (
              <button type="button" className="world-encounter__fight" disabled title="Gerçek zamanlı savaş sonraki aşamada eklenecek">
                <span aria-hidden="true">⚔</span> SAVAŞ YAKINDA
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
