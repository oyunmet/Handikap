import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  ApiResponseError,
  requestAuthenticatedJson,
  requestAuthenticatedJsonWithRetry,
  type ApiJsonOptions,
  type ApiRetryOptions,
  type AuthenticatedApiRequest,
  type AuthenticatedApiRequestWithRetry,
  type ClerkTokenGetter,
} from "./api-json";
import { useLocation } from "wouter";
import { playUiChime, primeGameAudio, setSoundEnabled, setSoundVolume } from "./audio/howler";
import { DEFAULT_MUSIC_VOLUME, DEFAULT_SOUND_VOLUME, normalizeAudioVolume } from "./audio/audio-settings";
import IntroCinematic from "./intro/IntroCinematic";
import MetEmblem from "./intro/MetEmblem";
import { getInitialScreen } from "./intro/timeline";
import { tr } from "./i18n/tr";
import EmberLayer from "./scene/EmberLayer";
import ProfilePanel from "./game/ProfilePanel";
import { defaultProfile, normalizePlayerProfile, readProfile, renameProfile, saveProfile, type PlayerProfile } from "./game/profile";
import type { CombatDifficulty } from "./game/combat-engine.ts";
import type { StoreTab } from "./game/store-types.ts";
import type { WorldProgressPosition } from "./world/world-progress";
import { GAME_BUILD_DATE, GAME_BUILD_MARKER } from "./build-info";
import {
  AUTO_QUALITY_DOWN_FPS,
  getAutoQualityAction,
  normalizeGraphicsMode,
  resolveRenderQuality,
  stepAutoQuality,
  type GraphicsMode,
  type RenderQuality,
} from "./world/graphics-quality";
import {
  setCurrentTimeOfDayMode,
  type TimeOfDayMode,
} from "./world/time-of-day";
import { WAR_ROOM_QUALITY_ENABLED } from "./game/war-room-features";

const WorldScene = lazy(() => import("./world/WorldScene"));
const WarRoomGame = lazy(() => import("./game/WarRoomGame"));

type Screen = "intro" | "opening" | "loading" | "menu" | "world" | "war-room";

function resolveInitialScreen(): Screen {
  const search = typeof window === "undefined" ? "" : window.location.search;
  if (new URLSearchParams(search).get("mod") === "savas") return "war-room";
  return getInitialScreen(search);
}
type Preferences = {
  sound: boolean;
  soundVolume: number;
  musicVolume: number;
  vibration: boolean;
  quality: GraphicsMode;
  combatDifficulty: CombatDifficulty;
  visualEffects: boolean;
  reduceMotion: boolean;
  performanceMonitor: boolean;
  invertWarRoomLookY: boolean;
  warRoomFacing: "camera" | "movement";
  timeOfDay: TimeOfDayMode;
};

const PREFERENCES_KEY = "shafak-settings-v1";
const initialPreferences: Preferences = {
  sound: true,
  soundVolume: DEFAULT_SOUND_VOLUME,
  musicVolume: DEFAULT_MUSIC_VOLUME,
  vibration: true,
  quality: "medium",
  combatDifficulty: "easy",
  visualEffects: true,
  reduceMotion: false,
  performanceMonitor: false,
  invertWarRoomLookY: false,
  warRoomFacing: "camera",
  timeOfDay: "auto",
};

function profileSyncErrorMessage(error: unknown) {
  if (!(error instanceof ApiResponseError)) {
    return "Hesap profili yüklenemedi. Lütfen yeniden dene.";
  }
  if (error.status === 401 || error.code === "authentication_required") {
    return "Oturum doğrulanamadı. Yeniden giriş yapıp tekrar dene.";
  }
  if (error.code === "authentication_unavailable") {
    return "Kimlik doğrulama hizmeti şu anda kullanılamıyor.";
  }
  if (
    error.code === "database_unavailable" ||
    error.code === "profile_storage_unavailable" ||
    error.status === 0
  ) {
    return "Hesap profili veritabanına şu anda ulaşılamıyor.";
  }
  if (error.code === "profile_storage_invalid") {
    return "Sunucudaki hesap profili doğrulanamadı.";
  }
  if (error.status === 503) {
    return "Hesap profili hizmeti geçici olarak kullanılamıyor.";
  }
  return "Hesap profili yüklenemedi. Lütfen yeniden dene.";
}

function readPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "null") as
      | Partial<Preferences>
      | null;
    if (!saved) {
      const deviceMemory = typeof navigator === "undefined"
        ? undefined
        : (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      const limitedCores = typeof navigator !== "undefined" && (navigator.hardwareConcurrency || 4) <= 4;
      const limitedMemory = typeof deviceMemory === "number" && deviceMemory <= 4;
      return {
        ...initialPreferences,
        quality: limitedCores || limitedMemory ? "low" : "medium",
      };
    }

    return {
      sound: typeof saved.sound === "boolean" ? saved.sound : initialPreferences.sound,
      soundVolume: normalizeAudioVolume(saved.soundVolume, initialPreferences.soundVolume),
      musicVolume: normalizeAudioVolume(saved.musicVolume, initialPreferences.musicVolume),
      vibration:
        typeof saved.vibration === "boolean" ? saved.vibration : initialPreferences.vibration,
      quality: normalizeGraphicsMode(saved.quality),
      combatDifficulty:
        saved.combatDifficulty === "easy" || saved.combatDifficulty === "medium" || saved.combatDifficulty === "hard"
          ? saved.combatDifficulty
          : initialPreferences.combatDifficulty,
      visualEffects:
        typeof saved.visualEffects === "boolean"
          ? saved.visualEffects
          : initialPreferences.visualEffects,
      reduceMotion:
        typeof saved.reduceMotion === "boolean"
          ? saved.reduceMotion
          : initialPreferences.reduceMotion,
      performanceMonitor:
        typeof saved.performanceMonitor === "boolean"
          ? saved.performanceMonitor
          : initialPreferences.performanceMonitor,
      invertWarRoomLookY:
        typeof saved.invertWarRoomLookY === "boolean"
          ? saved.invertWarRoomLookY
          : initialPreferences.invertWarRoomLookY,
      warRoomFacing: saved.warRoomFacing === "movement" ? "movement" : "camera",
      timeOfDay: saved.timeOfDay === "day" || saved.timeOfDay === "sunset" || saved.timeOfDay === "night"
        ? saved.timeOfDay
        : "auto",
    };
  } catch {
    return initialPreferences;
  }
}

function VolumeSetting({
  id,
  label,
  description,
  value,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const percent = Math.round(value * 100);
  return (
    <div className="setting-row setting-row--volume">
      <span className="setting-row__copy">
        <strong id={`${id}-label`}>{label}</strong>
        <small>{description}</small>
      </span>
      <div className="setting-volume">
        <input
          id={id}
          type="range"
          min="0"
          max="100"
          step="5"
          value={percent}
          aria-label={label}
          aria-labelledby={`${id}-label`}
          aria-valuetext={`${percent}%`}
          onChange={(event) => onChange(Number(event.currentTarget.value) / 100)}
        />
        <output htmlFor={id}>{percent}%</output>
      </div>
    </div>
  );
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

function ProductionCredit() {
  return (
    <div className="production-credit">
      <MetEmblem size={24} />
      <span>© MET Production · Muhammed Emin Türkoğlu</span>
    </div>
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

type AppProps = {
  user: {
    id: string;
    firstName: string | null;
    primaryEmailAddress?: { emailAddress: string } | null;
  } | null;
  authLoaded: boolean;
  allowOfflineGuest?: boolean;
  signOut: (options: { redirectUrl: string }) => Promise<unknown>;
  getToken: ClerkTokenGetter;
};

function App({ user, authLoaded, allowOfflineGuest = false, signOut, getToken }: AppProps) {
  const [, setLocation] = useLocation();
  const authRedirectedRef = useRef(false);
  const handleApiUnauthorized = useCallback(() => {
    if (authRedirectedRef.current) return;
    authRedirectedRef.current = true;
    setLocation("/sign-in?auth_error=session");
  }, [setLocation]);
  const authApiRequest = useCallback<AuthenticatedApiRequest>(
    <T,>(input: RequestInfo | URL, init: RequestInit, options: ApiJsonOptions) =>
      requestAuthenticatedJson<T>(
        input,
        init,
        options,
        getToken,
        handleApiUnauthorized,
      ),
    [getToken, handleApiUnauthorized],
  );
  const authApiRequestWithRetry = useCallback<AuthenticatedApiRequestWithRetry>(
    <T,>(
      input: RequestInfo | URL,
      init: RequestInit,
      options: ApiJsonOptions,
      retryOptions?: ApiRetryOptions,
    ) =>
      requestAuthenticatedJsonWithRetry<T>(
        input,
        init,
        options,
        getToken,
        handleApiUnauthorized,
        retryOptions,
      ),
    [getToken, handleApiUnauthorized],
  );
  const [screen, setScreen] = useState<Screen>(() => resolveInitialScreen());
  const [warRoomReturnScreen, setWarRoomReturnScreen] = useState<"menu" | "world">("menu");
  const [initialWorldStoreTab, setInitialWorldStoreTab] = useState<StoreTab | null>(null);
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState(readPreferences);
  const [profile, setProfile] = useState<PlayerProfile>(() => readProfile());
  const [profileSyncOwner, setProfileSyncOwner] = useState("");
  const [profileSyncStatus, setProfileSyncStatus] = useState<"loading" | "ready" | "local">("loading");
  const [profileOpen, setProfileOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const sceneRef = useRef<HTMLDivElement>(null);
  const systemReducedMotion = useReducedMotion();
  const motionReduced = preferences.reduceMotion || Boolean(systemReducedMotion);
  const homeAtmosphere = screen === "opening" || screen === "loading" || screen === "menu";
  const [automaticQuality, setAutomaticQuality] = useState<RenderQuality>(() => {
    if (typeof navigator === "undefined") return "balanced";
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const limitedCores = (navigator.hardwareConcurrency || 4) <= 4;
    const limitedMemory = typeof deviceMemory === "number" && deviceMemory <= 4;
    return limitedCores || limitedMemory ? "low" : "balanced";
  });
  const activeQuality = resolveRenderQuality(preferences.quality, automaticQuality);

  useEffect(() => {
    setCurrentTimeOfDayMode(preferences.timeOfDay);
  }, [preferences.timeOfDay]);

  useEffect(() => {
    authRedirectedRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (
      preferences.quality !== "auto"
      || (screen !== "world" && screen !== "war-room")
      || (screen === "war-room" && !WAR_ROOM_QUALITY_ENABLED)
    ) return undefined;

    let frameId = 0;
    let sampleStartedAt = performance.now();
    let frameCount = 0;
    let slowDuration = 0;
    let fastDuration = 0;
    const sample = (now: number) => {
      if (document.visibilityState === "hidden") {
        frameCount = 0;
        sampleStartedAt = now;
        slowDuration = 0;
        fastDuration = 0;
        frameId = window.requestAnimationFrame(sample);
        return;
      }
      frameCount += 1;
      const elapsed = now - sampleStartedAt;
      if (elapsed >= 2_000) {
        const fps = frameCount * 1_000 / elapsed;
        frameCount = 0;
        sampleStartedAt = now;
        console.info("[shafak-fps] two-second average", {
          fps: Number(fps.toFixed(1)),
          selectedQuality: preferences.quality,
        });

        if (fps < AUTO_QUALITY_DOWN_FPS) {
          slowDuration += elapsed;
          fastDuration = 0;
        } else if (fps > 56) {
          fastDuration += elapsed;
          slowDuration = 0;
        } else {
          slowDuration = 0;
          fastDuration = 0;
        }

        const action = getAutoQualityAction(
          fps,
          fps < AUTO_QUALITY_DOWN_FPS ? slowDuration : fastDuration,
        );
        if (action) {
          setAutomaticQuality((current) => stepAutoQuality(current, action));
          if (action === "down") {
            console.info("[shafak-fps] automatic quality lowered", {
              averageFps: Number(fps.toFixed(1)),
            });
          }
          slowDuration = 0;
          fastDuration = 0;
        }
      }
      frameId = window.requestAnimationFrame(sample);
    };

    frameId = window.requestAnimationFrame(sample);
    return () => window.cancelAnimationFrame(frameId);
  }, [preferences.quality, screen]);

  useEffect(() => {
    if (!authLoaded) {
      if (!allowOfflineGuest) return;
      setProfile(readProfile());
      setProfileSyncOwner("guest");
      setProfileSyncStatus("ready");
      return;
    }
    let cancelled = false;
    if (!user?.id) {
      setProfile(readProfile());
      setProfileSyncOwner("guest");
      setProfileSyncStatus("ready");
      return () => {
        cancelled = true;
      };
    }

    setProfileSyncStatus("loading");
    void (async () => {
      try {
        const result = await authApiRequest<{ profile: unknown | null }>("/api/profile", { credentials: "include" }, {
          operation: "profile load",
          fallbackMessage: "Hesap bilgileri şu an yüklenemedi. Lütfen tekrar dene.",
        });
        if (!result.profile) throw new Error("The account profile was not initialized by the server.");
        const nextProfile = normalizePlayerProfile(result.profile);

        if (!cancelled) {
          setProfile(nextProfile);
          setProfileSyncOwner(user.id);
          setProfileSyncStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setProfile(normalizePlayerProfile(defaultProfile));
          setProfileSyncOwner(user.id);
          setProfileSyncStatus("local");
          setAnnouncement(profileSyncErrorMessage(error));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allowOfflineGuest, authApiRequest, authLoaded, user?.id, user?.firstName]);

  useEffect(() => {
    if ((!authLoaded && !allowOfflineGuest) || profileSyncOwner !== (user?.id ?? "guest")) return;
    if (user?.id) return;
    saveProfile(profile);
  }, [allowOfflineGuest, authLoaded, profile, profileSyncOwner, user?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      // The current session still honours the settings when storage is unavailable.
    }
    setSoundEnabled(preferences.sound);
    setSoundVolume(preferences.soundVolume);
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

  const finishIntro = () => {
    begin();
  };

  const replayIntro = () => {
    setSettingsOpen(false);
    setScreen("intro");
  };

  const enterWorld = (initialStoreTab: StoreTab | null = null) => {
    playFeedback();
    primeGameAudio();
    setInitialWorldStoreTab(initialStoreTab);
    setScreen("world");
  };

  const updateWarRoomQuery = (active: boolean) => {
    const url = new URL(window.location.href);
    if (active) url.searchParams.set("mod", "savas");
    else url.searchParams.delete("mod");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const enterWarRoom = (returnScreen: "menu" | "world" = "menu") => {
    playFeedback();
    primeGameAudio();
    setWarRoomReturnScreen(returnScreen);
    updateWarRoomQuery(true);
    setScreen("war-room");
  };

  const exitWarRoom = () => {
    updateWarRoomQuery(false);
    setInitialWorldStoreTab(null);
    setScreen(warRoomReturnScreen);
  };

  const loadClaimedPickups = useCallback(async (chapterId: number) => {
    if (!user?.id || profileSyncStatus !== "ready") return [];
    const query = new URLSearchParams({ chapterId: String(chapterId) });
    const result = await authApiRequest<{ claimedPickupIds?: unknown }>(`/api/profile/pickups?${query}`, { credentials: "include" }, {
      operation: "pickup history",
      fallbackMessage: "Yol ganimeti geçmişi şu an yüklenemedi. Lütfen tekrar dene.",
    });
    return Array.isArray(result.claimedPickupIds)
      ? result.claimedPickupIds.filter((id): id is string => typeof id === "string")
      : [];
  }, [authApiRequest, profileSyncStatus, user?.id]);

  const claimWorldPickups = useCallback(async (chapterId: number, pickupIds: string[]) => {
    if (!user?.id) {
      return { claimedPickupIds: pickupIds, awardedPickupIds: pickupIds, persistent: false };
    }
    if (profileSyncStatus !== "ready") {
      throw new ApiResponseError(
        "Hesap profili sunucuya bağlı değil.",
        profileSyncStatus === "local" ? 401 : 503,
        profileSyncStatus === "local" ? "authentication_required" : "profile_not_ready",
        false,
      );
    }
    try {
      const result = await authApiRequestWithRetry<{
        profile?: unknown;
        claimedPickupIds?: unknown;
        awardedPickupIds?: unknown;
      }>("/api/profile/pickups", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, pickupIds }),
      }, {
        operation: "pickup claim",
        fallbackMessage: "Yol ganimeti şu an kaydedilemedi. Lütfen tekrar dene.",
        messageForCode: (code) => {
          if (code === "authentication_required") return "Oturum doğrulanamadı.";
          if (code === "invalid_pickup_claim" || code === "invalid_pickup_ids") {
            return "Eşya bilgisi sunucudaki bölümle uyuşmuyor.";
          }
          if (code === "pickup_storage_unavailable") {
            return "Ödül sunucusu şu anda kullanılamıyor.";
          }
          if (code === "profile_storage_invalid") {
            return "Sunucudaki hesap profili doğrulanamadı.";
          }
          return "Yol ganimeti şu an kaydedilemedi. Lütfen tekrar dene.";
        },
      }, { maxRetries: 2, baseDelayMs: 350 });
      if (!result.profile || !Array.isArray(result.claimedPickupIds) || !Array.isArray(result.awardedPickupIds)) {
        throw new ApiResponseError(
          "Sunucudan geçersiz eşya doğrulama yanıtı alındı.",
          502,
          "invalid_pickup_response",
          false,
        );
      }
      setProfile(normalizePlayerProfile(result.profile));
      return {
        claimedPickupIds: result.claimedPickupIds.filter((id): id is string => typeof id === "string"),
        awardedPickupIds: result.awardedPickupIds.filter((id): id is string => typeof id === "string"),
        persistent: true,
      };
    } catch (error) {
      if (error instanceof ApiResponseError && error.status === 401) {
        setProfileSyncStatus("local");
        setAnnouncement("Oturum doğrulanamadı. Yeniden giriş yap.");
      }
      throw error;
    }
  }, [authApiRequestWithRetry, profileSyncStatus, user?.id]);

  const saveWorldPosition = useCallback(async (position: WorldProgressPosition) => {
    if (!user?.id || profileSyncStatus !== "ready") return;
    await authApiRequestWithRetry<{ worldProgress?: unknown }>("/api/profile/world-progress", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(position),
    }, {
      operation: "world progress save",
      fallbackMessage: "Yol konumu hesaba şu an eşitlenemedi.",
      messageForCode: (code) => code === "invalid_world_progress"
        ? "Yol konumu hesap ilerlemesiyle uyuşmuyor."
        : "Yol konumu hesaba şu an eşitlenemedi.",
    }, { maxRetries: 1, baseDelayMs: 350 });
  }, [authApiRequestWithRetry, profileSyncStatus, user?.id]);

  const handleRename = (name: string) => {
    if (!user?.id) {
      setProfile(renameProfile(profile, name));
      return;
    }
    const cleanName = name.trim().replace(/\s+/g, " ").slice(0, 20) || "Yolcu";
    setProfile((current) => ({ ...current, name: cleanName }));
    if (profileSyncStatus !== "ready") return;
    void authApiRequest<{ profile: unknown }>("/api/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cleanName }),
    }, {
      operation: "profile rename",
      fallbackMessage: "İsim şu an kaydedilemedi. Lütfen tekrar dene.",
    }).then((result) => {
      setProfile(normalizePlayerProfile(result.profile));
    }).catch((error) => {
      setProfileSyncStatus("local");
      setAnnouncement(error instanceof ApiResponseError && error.status === 401
        ? "Oturum doğrulanamadı. Yeniden giriş yap."
        : "Savaşçı adı sunucuya kaydedilemedi; diğer ilerleme alanları etkilenmedi.");
    });
  };

  const setPreference = <Key extends keyof Preferences>(
    key: Key,
    value: Preferences[Key],
  ) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setAnnouncement(tr.settingsSaved);
  };

  const togglePreference = (key: "sound" | "vibration" | "visualEffects" | "reduceMotion" | "performanceMonitor") => {
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
    <div
      role="application"
      className={`shafak-app${motionReduced ? " motion-reduced" : ""}`}
      data-visual-effects={preferences.visualEffects}
      ref={sceneRef}
      aria-label={tr.brand}
    >
      {homeAtmosphere && (
        <>
          <div className="scene-backdrop" aria-hidden="true">
            <div className="scene-backdrop__image" />
            <div className="scene-backdrop__haze" />
            <div className="scene-backdrop__light" />
            <div className="scene-backdrop__vignette" />
          </div>
          <div className="scene-character" aria-hidden="true">
            <img src="/shafak-warrior.png" alt="" />
          </div>
          <EmberLayer quality={activeQuality} motionReduced={motionReduced} />
          <div className="scene-grain" aria-hidden="true" />
        </>
      )}

      <AnimatePresence mode="wait">
        {screen === "intro" && (
          <motion.section
            key="intro"
            className="intro-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionReduced ? 0.12 : 0.65 }}
          >
            <IntroCinematic
              reducedMotion={motionReduced}
              quality={activeQuality}
              onComplete={finishIntro}
            />
          </motion.section>
        )}
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
            <ProductionCredit />
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
            <ProductionCredit />
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
                      enterWorld();
                    }}
                  >
                    <span className="menu-action__icon"><ArrowIcon /></span>
                    <span>YOLA ÇIK</span>
                    <ArrowIcon />
                  </button>
                  <button
                    className="menu-action menu-action--war-room"
                    type="button"
                    onClick={() => enterWarRoom("menu")}
                  >
                    <span className="menu-action__icon" aria-hidden="true">✹</span>
                    <span className="menu-action__war-room-copy">
                      <b>SAVAŞ ODASI</b>
                      <small>TEK KİŞİLİK NİŞAN GÖREVİ</small>
                    </span>
                    <span className="menu-action__war-room-arrow" aria-hidden="true">➜</span>
                  </button>
                  <button
                    className="menu-action menu-action--secondary"
                    type="button"
                    onClick={() => {
                      playFeedback();
                      setProfileOpen(true);
                    }}
                  >
                    YOLCU PROFİLİ
                  </button>
                  <div className="menu-gear-actions" aria-label="Savaş hazırlığı">
                    {([
                      ["inventory", "ENVANTER"],
                      ["weapons", "MAĞAZA"],
                      ["smithy", "DEMİRCİ"],
                    ] as const).map(([tab, label]) => (
                      <button
                        key={tab}
                        className="menu-gear-action"
                        type="button"
                        onClick={() => enterWorld(tab)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            <footer className="menu-footer">
              <span className="footer-sigil" aria-hidden="true">✦</span>
              <span>{tr.tagline}</span>
              <span className="footer-sigil" aria-hidden="true">✦</span>
              <small className="game-build-stamp">
                {GAME_BUILD_MARKER} · {GAME_BUILD_DATE}
              </small>
            </footer>
            <ProductionCredit />
          </motion.section>
        )}
        {screen === "world" && (
          <motion.div
            key="world"
            className="game-screen-shell"
            initial={{ opacity: 0, scale: motionReduced ? 1 : .985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: motionReduced ? 1 : 1.02 }}
            transition={{ duration: motionReduced ? .12 : .42, ease: "easeOut" }}
          >
            <Suspense fallback={<div className="entry-loading">Oyun sahnesi hazırlanıyor…</div>}>
              <WorldScene
                apiRequest={authApiRequest}
                userId={user?.id}
                quality={activeQuality}
                combatDifficulty={preferences.combatDifficulty}
                visualEffectsEnabled={preferences.visualEffects}
                motionReduced={motionReduced}
                performanceMonitorEnabled={preferences.performanceMonitor}
                soundEnabled={preferences.sound}
                soundVolume={preferences.soundVolume}
                musicVolume={preferences.musicVolume}
                onSoundEnabledChange={(enabled) => setPreference("sound", enabled)}
                onSoundVolumeChange={(value) => setPreference("soundVolume", value)}
                onMusicVolumeChange={(value) => setPreference("musicVolume", value)}
                vibrationEnabled={preferences.vibration}
                profile={profile}
                accountDuelEnabled={Boolean(user?.id)}
                accountProfileReady={profileSyncStatus === "ready"}
                onBattleProfile={setProfile}
                onLoadClaimedPickups={loadClaimedPickups}
                onClaimWorldPickups={claimWorldPickups}
                onSaveWorldPosition={saveWorldPosition}
                onOpenWarRoom={() => enterWarRoom("world")}
                onExit={() => {
                  setInitialWorldStoreTab(null);
                  setScreen("menu");
                }}
                initialStoreTab={initialWorldStoreTab}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenProfile={() => setProfileOpen(true)}
              />
            </Suspense>
          </motion.div>
        )}
        {screen === "war-room" && (
          <motion.div
            key="war-room"
            className="war-room-screen-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionReduced ? 0.1 : 0.24, ease: "easeOut" }}
          >
            <Suspense fallback={<div className="entry-loading">Savaş Odası hazırlanıyor…</div>}>
              <WarRoomGame
                onExit={exitWarRoom}
                profile={profile}
                invertLookY={preferences.invertWarRoomLookY}
                onInvertLookYChange={(value) => setPreference("invertWarRoomLookY", value)}
                facingSetting={preferences.warRoomFacing}
                onOpenSettings={() => setSettingsOpen(true)}
                settingsOpen={settingsOpen}
                quality={activeQuality}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profileOpen && (
          <motion.div
            key="profile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionReduced ? .1 : .2 }}
          >
            <ProfilePanel
              profile={profile}
              userEmail={user?.primaryEmailAddress?.emailAddress ?? null}
              accountSaveStatus={profileSyncStatus}
              onClose={() => setProfileOpen(false)}
              onRename={handleRename}
              onAccountAction={() => {
                if (user) {
                  void signOut({ redirectUrl: import.meta.env.BASE_URL || "/" });
                } else {
                  setLocation("/sign-in");
                }
              }}
            />
          </motion.div>
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
                <VolumeSetting
                  id="sound-effects-volume"
                  label="Ses efektleri"
                  description="Adımlar, darbeler ve arayüz sesleri"
                  value={preferences.soundVolume}
                  onChange={(value) => setPreference("soundVolume", value)}
                />
                <VolumeSetting
                  id="music-volume"
                  label="Bölüm müziği"
                  description="Biyoma göre değişen arka plan müziği"
                  value={preferences.musicVolume}
                  onChange={(value) => setPreference("musicVolume", value)}
                />
                <SettingToggle
                  label={tr.vibration}
                  description={tr.vibrationDescription}
                  checked={preferences.vibration}
                  onChange={() => togglePreference("vibration")}
                />
                <SettingToggle
                  label="Y eksenini ters çevir"
                  description="Kapalıyken parmağı yukarı kaydırmak kamerayı yukarı kaldırır."
                  checked={preferences.invertWarRoomLookY}
                  onChange={() => setPreference("invertWarRoomLookY", !preferences.invertWarRoomLookY)}
                />
                <div className="setting-row setting-row--quality">
                  <span className="setting-row__copy">
                    <strong>Savaş Odası yönelimi</strong>
                    <small>Kamera yönünü izle veya hareket yönüne dön.</small>
                  </span>
                  <div className="quality-switch" role="group" aria-label="Savaş Odası yönelimi">
                    {([
                      ["camera", "Kamera"],
                      ["movement", "Hareket"],
                    ] as const).map(([value, label]) => (
                      <button
                        className={preferences.warRoomFacing === value ? "is-selected" : ""}
                        key={value}
                        type="button"
                        aria-pressed={preferences.warRoomFacing === value}
                        onClick={() => setPreference("warRoomFacing", value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="setting-row setting-row--quality">
                  <span className="setting-row__copy">
                    <strong>Gökyüzü saati</strong>
                    <small>Kül Yolu ve Savaş Odası için ışık ve gökyüzü.</small>
                  </span>
                  <div className="quality-switch time-of-day-switch" role="group" aria-label="Gökyüzü saati">
                    {([
                      ["auto", "Otomatik"],
                      ["day", "Gündüz"],
                      ["sunset", "Gün batımı"],
                      ["night", "Gece"],
                    ] as const).map(([value, label]) => (
                      <button
                        className={preferences.timeOfDay === value ? "is-selected" : ""}
                        key={value}
                        type="button"
                        aria-pressed={preferences.timeOfDay === value}
                        onClick={() => setPreference("timeOfDay", value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="setting-row setting-row--quality">
                  <span className="setting-row__copy">
                    <strong>{tr.graphics}</strong>
                    <small>{tr.graphicsDescription}</small>
                  </span>
                  <div className="quality-switch" role="group" aria-label={tr.graphics}>
                    <button
                      className={preferences.quality === "low" ? "is-selected" : ""}
                      type="button"
                      aria-pressed={preferences.quality === "low"}
                      onClick={() => setPreference("quality", "low")}
                    >
                      {tr.low}
                    </button>
                    <button
                      className={preferences.quality === "medium" ? "is-selected" : ""}
                      type="button"
                      aria-pressed={preferences.quality === "medium"}
                      onClick={() => setPreference("quality", "medium")}
                    >
                      {tr.medium}
                    </button>
                    <button
                      className={preferences.quality === "high" ? "is-selected" : ""}
                      type="button"
                      aria-pressed={preferences.quality === "high"}
                      onClick={() => setPreference("quality", "high")}
                    >
                      {tr.high}
                    </button>
                    <button
                      className={preferences.quality === "auto" ? "is-selected" : ""}
                      type="button"
                      aria-pressed={preferences.quality === "auto"}
                      onClick={() => setPreference("quality", "auto")}
                    >
                      {tr.automatic}
                    </button>
                  </div>
                </div>
                <div className="setting-row setting-row--quality">
                  <span className="setting-row__copy">
                    <strong>Zorluk</strong>
                    <small>Rakiplerin savaş gücünü seç</small>
                  </span>
                  <div className="quality-switch" role="group" aria-label="Düello zorluğu">
                    {([
                      ["easy", "Kolay"],
                      ["medium", "Normal"],
                      ["hard", "Zor"],
                    ] as const).map(([value, label]) => (
                      <button
                        className={preferences.combatDifficulty === value ? "is-selected" : ""}
                        key={value}
                        type="button"
                        aria-pressed={preferences.combatDifficulty === value}
                        onClick={() => setPreference("combatDifficulty", value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <SettingToggle
                  label={tr.visualEffects}
                  description={tr.visualEffectsDescription}
                  checked={preferences.visualEffects}
                  onChange={() => togglePreference("visualEffects")}
                />
                <SettingToggle
                  label={tr.reduceMotion}
                  description={tr.reduceMotionDescription}
                  checked={preferences.reduceMotion || Boolean(systemReducedMotion)}
                  onChange={() => togglePreference("reduceMotion")}
                />
                <div className="setting-row">
                  <span className="setting-row__copy">
                    <strong>Açılış sinematiği</strong>
                    <small>Kül Yolu’na ilk adımını yeniden izle.</small>
                  </span>
                  <button
                    className="setting-action--intro"
                    type="button"
                    onClick={replayIntro}
                  >
                    İntro’yu tekrar izle
                  </button>
                </div>
                <SettingToggle
                  label="FPS ve kare süresi"
                  description="Ortalama/en düşük FPS ve 50 ms üzeri kare sayısını gösterir."
                  checked={preferences.performanceMonitor}
                  onChange={() => togglePreference("performanceMonitor")}
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
    </div>
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
