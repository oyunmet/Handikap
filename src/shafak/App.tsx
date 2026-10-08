import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { playUiChime, setSoundEnabled } from "./audio/howler";
import { tr } from "./i18n/tr";
import EmberLayer from "./scene/EmberLayer";

type Screen = "opening" | "loading" | "menu";
type Preferences = {
  sound: boolean;
  vibration: boolean;
  quality: "high" | "balanced";
  reduceMotion: boolean;
};

const PREFERENCES_KEY = "shafak-settings-v1";
const initialPreferences: Preferences = {
  sound: true,
  vibration: true,
  quality: "high",
  reduceMotion: false,
};

function readPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "null") as
      | Partial<Preferences>
      | null;
    if (!saved) return initialPreferences;

    return {
      sound: typeof saved.sound === "boolean" ? saved.sound : initialPreferences.sound,
      vibration:
        typeof saved.vibration === "boolean" ? saved.vibration : initialPreferences.vibration,
      quality: saved.quality === "balanced" ? "balanced" : "high",
      reduceMotion:
        typeof saved.reduceMotion === "boolean"
          ? saved.reduceMotion
          : initialPreferences.reduceMotion,
    };
  } catch {
    return initialPreferences;
  }
}

function Crest({ small = false }: { small?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={small ? "crest crest--small" : "crest"}
      viewBox="0 0 72 84"
      fill="none"
    >
      <path
        d="M36 4 63 14v22c0 18-11 31-27 43C20 67 9 54 9 36V14L36 4Z"
        fill="url(#crest-metal)"
        stroke="#f4d59a"
        strokeWidth="2"
      />
      <path
        d="M36 12 56 19v17c0 14-8 24-20 34-12-10-20-20-20-34V19l20-7Z"
        fill="#14151b"
        stroke="#766040"
        strokeWidth="1.5"
      />
      <path d="M36 18v39M22 27l28 18M50 27 22 45" stroke="#d9b26a" strokeWidth="2.2" />
      <path
        d="m36 15 3.5 7.1 7.9 1.1-5.7 5.5 1.4 7.8-7.1-3.8-7.1 3.8 1.4-7.8-5.7-5.5 7.9-1.1L36 15Z"
        fill="#a92e35"
        stroke="#f7dba5"
        strokeWidth="1.1"
      />
      <defs>
        <linearGradient id="crest-metal" x1="12" y1="8" x2="58" y2="74" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f3d18d" />
          <stop offset=".48" stopColor="#ae7940" />
          <stop offset="1" stopColor="#614125" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function SoundIcon({ muted = false }: { muted?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10v4h4l5 4V6l-5 4H4Z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
      />
      {muted ? (
        <path d="m17 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <>
          <path d="M16 9a4.5 4.5 0 0 1 0 6" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
          <path d="M18.5 6.5a8 8 0 0 1 0 11" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function VibrationIcon({ muted = false }: { muted?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="7" y="4" width="10" height="16" rx="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 7h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {muted ? (
        <path d="m9 12 6 5m0-5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <>
          <path d="M4 9v6m16-6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M2 11v2m20-2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m10.2 3.8.5-1h2.6l.5 1a1.9 1.9 0 0 0 2.3.8l1-.4 1.8 1.8-.4 1a1.9 1.9 0 0 0 .8 2.3l1 .5v2.6l-1 .5a1.9 1.9 0 0 0-.8 2.3l.4 1-1.8 1.8-1-.4a1.9 1.9 0 0 0-2.3.8l-.5 1h-2.6l-.5-1a1.9 1.9 0 0 0-2.3-.8l-1 .4-1.8-1.8.4-1a1.9 1.9 0 0 0-.8-2.3l-1-.5V9.8l1-.5a1.9 1.9 0 0 0 .8-2.3l-.4-1 1.8-1.8 1 .4a1.9 1.9 0 0 0 2.3-.8Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11.1" r="3.1" stroke="currentColor" strokeWidth="1.45" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>("opening");
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState(readPreferences);
  const [announcement, setAnnouncement] = useState("");
  const sceneRef = useRef<HTMLDivElement>(null);
  const systemReducedMotion = useReducedMotion();
  const motionReduced = preferences.reduceMotion || Boolean(systemReducedMotion);

  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      // The current session still honours the settings when storage is unavailable.
    }
    setSoundEnabled(preferences.sound);
  }, [preferences]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || motionReduced) return undefined;
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = scene.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      scene.style.setProperty("--pointer-x", String(Math.max(-1, Math.min(1, x))));
      scene.style.setProperty("--pointer-y", String(Math.max(-1, Math.min(1, y))));
    };
    const reset = () => {
      scene.style.setProperty("--pointer-x", "0");
      scene.style.setProperty("--pointer-y", "0");
    };
    scene.addEventListener("pointermove", handlePointerMove, { passive: true });
    scene.addEventListener("pointerleave", reset);
    return () => {
      scene.removeEventListener("pointermove", handlePointerMove);
      scene.removeEventListener("pointerleave", reset);
    };
  }, [motionReduced]);

  useEffect(() => {
    if (screen !== "loading") return undefined;
    let frame = 0;
    let timeout = 0;
    let startedAt = 0;
    const duration = motionReduced ? 500 : 1850;
    const advance = (now: number) => {
      if (!startedAt) startedAt = now;
      const next = Math.min(100, Math.pow((now - startedAt) / duration, 0.82) * 100);
      setProgress(next);
      if (next >= 100) {
        timeout = window.setTimeout(() => setScreen("menu"), motionReduced ? 40 : 260);
      } else {
        frame = window.requestAnimationFrame(advance);
      }
    };
    frame = window.requestAnimationFrame(advance);
    const tipTimer = window.setInterval(
      () => setTipIndex((current) => (current + 1) % tr.loadingTips.length),
      820,
    );
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      window.clearInterval(tipTimer);
    };
  }, [motionReduced, screen]);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(".settings-close")?.focus();
    });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", closeOnEscape);
      previouslyFocused?.focus();
    };
  }, [settingsOpen]);

  useEffect(() => {
    if (!announcement) return undefined;
    const timeout = window.setTimeout(() => setAnnouncement(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [announcement]);

  const playFeedback = () => {
    playUiChime();
    if (preferences.vibration && "vibrate" in navigator) {
      try {
        navigator.vibrate(16);
      } catch {
        // Haptics are optional and unsupported in some browsers.
      }
    }
  };

  const begin = () => {
    playFeedback();
    setProgress(0);
    setTipIndex(0);
    setScreen("loading");
  };

  const setPreference = <Key extends keyof Preferences>(
    key: Key,
    value: Preferences[Key],
  ) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setAnnouncement(tr.settingsSaved);
  };

  const togglePreference = (key: "sound" | "vibration" | "reduceMotion") => {
    const next = !preferences[key];
    setPreference(key, next);
    if (key === "sound") {
      if (next) {
        setSoundEnabled(true);
        playUiChime();
      }
      return;
    }
    if (key === "vibration" && next && preferences.vibration === false && "vibrate" in navigator) {
      navigator.vibrate(16);
    }
    if (preferences.sound) playUiChime();
  };

  const transitionDuration = motionReduced ? 0.16 : 0.68;

  return (
    <main
      className={`shafak-app${motionReduced ? " motion-reduced" : ""}`}
      ref={sceneRef}
      aria-label={tr.brand}
    >
      <div className="scene-backdrop" aria-hidden="true">
        <div className="scene-backdrop__image" />
        <div className="scene-backdrop__haze" />
        <div className="scene-backdrop__light" />
        <div className="scene-backdrop__vignette" />
      </div>
      <div className="scene-character" aria-hidden="true">
        <img src="/shafak-warrior.png" alt="" />
      </div>
      <EmberLayer quality={preferences.quality} motionReduced={motionReduced} />
      <div className="scene-grain" aria-hidden="true" />

      <AnimatePresence mode="wait">
        {screen === "opening" && (
          <motion.section
            key="opening"
            className="screen screen--opening"
            aria-label={tr.openingKicker}
            initial={{ opacity: 0, scale: motionReduced ? 1 : 1.025 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: 0,
              scale: motionReduced ? 1 : 1.07,
              filter: motionReduced ? "blur(0px)" : "blur(10px)",
            }}
            transition={{ duration: transitionDuration, ease: "easeInOut" }}
          >
            <div className="opening-vignette" aria-hidden="true" />
            <motion.div
              className="opening-copy"
              initial={{ opacity: 0, y: motionReduced ? 0 : 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: motionReduced ? 0.3 : 0.85, delay: motionReduced ? 0 : 0.18 }}
            >
              <div className="crest-lockup crest-lockup--opening">
                <span className="crest-halo" aria-hidden="true" />
                <Crest />
              </div>
              <p className="eyebrow">{tr.openingKicker}</p>
              <h1 className="brand-title">
                <span>Şafak</span>
                <span>Savaşçıları</span>
              </h1>
              <p className="opening-description">{tr.openingDescription}</p>
              <button className="gold-button gold-button--opening" onClick={begin} type="button">
                <span>{tr.start}</span>
                <ArrowIcon />
              </button>
              <span className="opening-subnote">Yolculuk başlamak üzere</span>
            </motion.div>
            <div className="opening-bottom-mark">
              <span />
              <span>ŞAFAK SAVAŞÇILARI</span>
              <span />
            </div>
          </motion.section>
        )}

        {screen === "loading" && (
          <motion.section
            key="loading"
            className="screen screen--loading"
            aria-label={tr.loadingTitle}
            aria-live="polite"
            initial={{ opacity: 0, scale: motionReduced ? 1 : 1.035 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: motionReduced ? 1 : 0.98 }}
            transition={{ duration: transitionDuration, ease: "easeInOut" }}
          >
            <div className="loading-card">
              <div className="crest-lockup crest-lockup--loading"><Crest small /></div>
              <p className="eyebrow">{tr.statusLabel}</p>
              <h2>{tr.loadingTitle}</h2>
              <div
                className="loading-track"
                role="progressbar"
                aria-label={tr.loadingTitle}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
              >
                <motion.span
                  className="loading-track__fill"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: motionReduced ? 0.08 : 0.2, ease: "easeOut" }}
                />
                <span className="loading-track__shine" aria-hidden="true" />
              </div>
              <div className="loading-meta">
                <span>{tr.loadingTips[tipIndex]}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          </motion.section>
        )}

        {screen === "menu" && (
          <motion.section
            key="menu"
            className="screen screen--menu"
            aria-label={tr.brand}
            initial={{ opacity: 0, scale: motionReduced ? 1 : 0.97, filter: motionReduced ? "blur(0)" : "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: motionReduced ? 1 : 1.025 }}
            transition={{ duration: transitionDuration, ease: "easeOut" }}
          >
            <header className="menu-header">
              <button
                className="mini-brand"
                type="button"
                aria-label={`${tr.brand} ana menü`}
                onClick={() => {
                  playFeedback();
                  setScreen("opening");
                }}
              >
                <Crest small />
                <span>
                  <strong>ŞAFAK</strong>
                  <small>SAVAŞÇILARI</small>
                </span>
              </button>
              <div className="menu-tools">
                <button
                  className={`icon-control${preferences.sound ? "" : " is-off"}`}
                  type="button"
                  aria-label={preferences.sound ? tr.soundOn : tr.soundOff}
                  title={preferences.sound ? tr.soundOn : tr.soundOff}
                  aria-pressed={preferences.sound}
                  onClick={() => {
                    const next = !preferences.sound;
                    setPreference("sound", next);
                    setSoundEnabled(next);
                    if (next) playUiChime();
                  }}
                >
                  <SoundIcon muted={!preferences.sound} />
                </button>
                <button
                  className={`icon-control${preferences.vibration ? "" : " is-off"}`}
                  type="button"
                  aria-label={preferences.vibration ? tr.vibrationOn : tr.vibrationOff}
                  title={preferences.vibration ? tr.vibrationOn : tr.vibrationOff}
                  aria-pressed={preferences.vibration}
                  onClick={() => {
                    const next = !preferences.vibration;
                    setPreference("vibration", next);
                    if (next && "vibrate" in navigator) navigator.vibrate(16);
                  }}
                >
                  <VibrationIcon muted={!preferences.vibration} />
                </button>
                <button
                  className="icon-control icon-control--settings"
                  type="button"
                  aria-label={tr.openSettings}
                  title={tr.openSettings}
                  onClick={() => {
                    playFeedback();
                    setSettingsOpen(true);
                  }}
                >
                  <SettingsIcon />
                </button>
              </div>
            </header>

            <div className="menu-content">
              <motion.div
                className="menu-copy"
                initial={{ opacity: 0, x: motionReduced ? 0 : -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: motionReduced ? 0.2 : 0.65, delay: motionReduced ? 0 : 0.16 }}
              >
                <div className="menu-divider">
                  <span />
                  <span>{tr.menuKicker}</span>
                  <span />
                </div>
                <h1>{tr.menuTitle}</h1>
                <p>{tr.menuDescription}</p>
                <div className="menu-actions">
                  <button
                    className="menu-action menu-action--primary"
                    type="button"
                    onClick={() => {
                      playFeedback();
                      setSettingsOpen(true);
                    }}
                  >
                    <span className="menu-action__icon"><SettingsIcon /></span>
                    <span>{tr.openSettings}</span>
                    <ArrowIcon />
                  </button>
                  <button
                    className="menu-action menu-action--secondary"
                    type="button"
                    onClick={() => {
                      playFeedback();
                      setScreen("opening");
                    }}
                  >
                    {tr.replayOpening}
                  </button>
                </div>
              </motion.div>
            </div>

            <footer className="menu-footer">
              <span className="footer-sigil" aria-hidden="true">✦</span>
              <span>{tr.tagline}</span>
              <span className="footer-sigil" aria-hidden="true">✦</span>
            </footer>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            className="settings-overlay"
            key="settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionReduced ? 0.12 : 0.24 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSettingsOpen(false);
            }}
          >
            <motion.section
              className="settings-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-title"
              initial={{ opacity: 0, y: motionReduced ? 0 : 18, scale: motionReduced ? 1 : 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: motionReduced ? 0 : 10, scale: motionReduced ? 1 : 0.985 }}
              transition={{ duration: motionReduced ? 0.14 : 0.32, ease: "easeOut" }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="settings-panel__heading">
                <div>
                  <span className="eyebrow">YOLCULUK REHBERİ</span>
                  <h2 id="settings-title">{tr.settingsTitle}</h2>
                  <p>{tr.settingsDescription}</p>
                </div>
                <button
                  className="settings-close"
                  type="button"
                  aria-label={tr.close}
                  onClick={() => setSettingsOpen(false)}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>

              <div className="settings-list">
                <SettingToggle
                  label={tr.sound}
                  description={tr.soundDescription}
                  checked={preferences.sound}
                  onChange={() => togglePreference("sound")}
                />
                <SettingToggle
                  label={tr.vibration}
                  description={tr.vibrationDescription}
                  checked={preferences.vibration}
                  onChange={() => togglePreference("vibration")}
                />
                <div className="setting-row setting-row--quality">
                  <span className="setting-row__copy">
                    <strong>{tr.effects}</strong>
                    <small>{tr.effectsDescription}</small>
                  </span>
                  <div className="quality-switch" role="group" aria-label={tr.effects}>
                    <button
                      className={preferences.quality === "high" ? "is-selected" : ""}
                      type="button"
                      aria-pressed={preferences.quality === "high"}
                      onClick={() => setPreference("quality", "high")}
                    >
                      {tr.high}
                    </button>
                    <button
                      className={preferences.quality === "balanced" ? "is-selected" : ""}
                      type="button"
                      aria-pressed={preferences.quality === "balanced"}
                      onClick={() => setPreference("quality", "balanced")}
                    >
                      {tr.balanced}
                    </button>
                  </div>
                </div>
                <SettingToggle
                  label={tr.reduceMotion}
                  description={tr.reduceMotionDescription}
                  checked={preferences.reduceMotion || Boolean(systemReducedMotion)}
                  onChange={() => togglePreference("reduceMotion")}
                />
              </div>

              <div className="settings-panel__footer">
                <span className="settings-seal" aria-hidden="true"><Crest small /></span>
                <span>Ayarların bu cihazda saklanır.</span>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {announcement && (
          <motion.div
            className="status-toast"
            role="status"
            initial={{ opacity: 0, y: motionReduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: motionReduced ? 0 : -4 }}
            transition={{ duration: 0.18 }}
          >
            <span aria-hidden="true">✦</span>
            {announcement}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="setting-row">
      <span className="setting-row__copy">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <button
        className={`toggle${checked ? " is-on" : ""}`}
        role="switch"
        type="button"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
      >
        <span />
      </button>
    </div>
  );
}

export default App;
