import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { playFootstep, playGameSound, playWorldCue } from "../audio/howler";
import { ApiResponseError, type AuthenticatedApiRequest } from "../api-json";
import DuelControls from "../game/DuelControls";
import DuelResults from "../game/DuelResults";
import { awardBattle, normalizePlayerProfile, type PlayerProfile } from "../game/profile";
import StorePanel from "../game/store-ui/StorePanel";
import { isDailySpecialAvailable, STARTER_ITEM_IDS, STORE_CATALOG } from "../game/store-catalog";
import { getCombatItem, type CombatItemId, type CombatQuickSlots } from "../game/combat-items.ts";
import {
  getEquipmentLoadoutKey,
  getItemSellValue,
  getSalvageYield,
  getUpgradeCost,
  getUpgradeSuccessChance,
  isStoreItemUnlocked,
  MAX_UPGRADE_LEVEL,
  rollUpgradeSuccess,
  type EquipmentLoadoutKey,
  type EquipmentSlot,
  type EquipmentVisual,
  type StoreItem,
} from "../game/store-types";
import { getEquipmentBonuses, getEquipmentVisual, getPlayerCombatModifiers } from "../game/store-utils";
import type { BattleRewards, DuelSummary } from "../game/types";
import {
  COMBAT_HZ,
  INPUT_BUTTON,
  MAX_INPUT_BUTTONS,
  createCombatState,
  createCombatOpponentTuning,
  getBotAttackWindupTicks,
  isCombatBotArchetype,
  isCombatBotEnraged,
  normalizePlayerCombatModifiers,
  stepCombat,
  type CombatBotArchetype,
  type CombatDifficulty,
  type CombatEvent,
  type CombatInput,
  type CombatInputFrame,
  type CombatLoadout,
  type CombatOpponentTuning,
  type CombatState,
} from "../game/combat-engine";
import type { PlayerCombatModifiers } from "../game/store-types";
import { rollCombatLoot } from "../game/combat-loot.ts";
import { resolveCharacterAnimationState } from "./character-animation";
import { MAX_ACTIVE_DUEL_VFX } from "./duel-vfx";
import StoryDialogueOverlay from "./StoryDialogueOverlay";
import {
  getChapterStoryDialogue,
  getOpeningStoryDialogue,
  type StoryDialogue,
} from "./story-dialogue";
import {
  createWorldMotion,
  interpolateWorldMotion,
  readWorldInput,
  stepWorldMotion,
  WORLD_GATE_INTERVAL_METERS,
  WORLD_ORIGIN_REBASE_INTERVAL_METERS,
  type WorldMotionFrame,
  type WorldMotion,
} from "./movement";
import { nextGateDistance } from "./world-generation";
import {
  getWorldChapter,
  PICKUP_RADIUS_METERS,
  pickupRewardTotals,
  buildWorldCollisionGrid,
  resolveWorldPathCollision,
  WORLD_JUMP_CLEARANCE_METERS,
  type WorldChapterContent,
  type WorldCollisionGrid,
  type WorldObstacle,
  type WorldPickup,
  type WorldRival,
} from "./world-content";
import { getDuelSettlementErrorMessage } from "./duel-errors";
import {
  inferWorldProgressFromDefeatedOpponents,
  isWorldChapterCleared,
  limitWorldDistanceAtGate,
  readWorldProgress,
  saveWorldProgress,
  unlockWorldGate,
  WORLD_GATE_INTERACTION_RANGE_METERS,
  type WorldProgressPosition,
  type WorldProgress,
} from "./world-progress.ts";
import {
  createWorldRouteChoice,
  getWorldRoutePlayerId,
  getWorldRouteSideFromInput,
  type WorldRouteChoice,
  type WorldRouteSide,
} from "./route-difficulty.ts";
import {
  DAILY_DEFEAT_LIMIT,
  canStartDailyDuel,
  consumeDailyAdDuel,
  grantDailyAdDuel,
  normalizeDailyLifeState,
} from "../game/daily-lives.ts";
import { requestGoogleRewardedAd, getConfiguredRewardedAdUnit } from "../game/google-rewarded-ads.ts";
import worldText from "./strings";
import useTravelAudio from "./useTravelAudio";
import useWorldInput from "./useWorldInput";
import EquipmentPreview3D from "./EquipmentPreview3D";
import WorldAtmosphere from "./WorldAtmosphere";
import {
  getBiomeForDistance,
  getWeatherHandlingMultiplier,
  nextWeatherMode,
  WORLD_BIOME_PALETTES,
  type WeatherMode,
} from "./world-biomes";
import {
  getRivalDialoguePrompt,
  readBrokenObstacleIds,
  saveBrokenObstacleIds,
  WorldInteractableRegistry,
} from "./world-interactables";
import { createLatestAsyncSaveQueue } from "./latest-async-save-queue.ts";

const World3D = lazy(() => import("./World3D"));
import "./world-scene.css";

const WEATHER_LABELS: Record<WeatherMode, string> = {
  clear: "Açık",
  ash: "Kül",
  rain: "Yağmur",
  storm: "Fırtına",
  fog: "Sis",
};

type WorldSceneProps = {
  apiRequest: AuthenticatedApiRequest;
  userId?: string;
  quality: "high" | "balanced" | "low";
  combatDifficulty: CombatDifficulty;
  visualEffectsEnabled: boolean;
  motionReduced: boolean;
  performanceMonitorEnabled: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  onSoundEnabledChange: (enabled: boolean) => void;
  onSoundVolumeChange: (volume: number) => void;
  onMusicVolumeChange: (volume: number) => void;
  vibrationEnabled: boolean;
  onExit: () => void;
  onOpenSettings: () => void;
  profile: PlayerProfile;
  accountDuelEnabled: boolean;
  accountProfileReady: boolean;
  onBattleProfile: (profile: PlayerProfile) => void;
  onOpenProfile: () => void;
  onLoadClaimedPickups: (chapterId: number) => Promise<string[]>;
  onClaimWorldPickups: (chapterId: number, pickupIds: string[]) => Promise<{
    claimedPickupIds: string[];
    awardedPickupIds: string[];
    persistent: boolean;
  }>;
  onSaveWorldPosition: (position: WorldProgressPosition) => Promise<void>;
};
type Panel = "store" | "settings" | null;
type StepBurst = { id: number; x: number; running: boolean; expires: number };
type PickupFlight = { id: number; kind: WorldPickup["kind"]; amount: number };
type BattlePhase = "sweep" | "vs" | "countdown" | "fight" | "settling" | "settlement-error" | "result" | "error";
type BattleSession = {
  rival: WorldRival;
  phase: BattlePhase;
  beat: number;
  practice: boolean;
  message?: string;
  summary?: DuelSummary;
  rewards?: BattleRewards;
};
type CombatInputBuffer = {
  x: number;
  y: number;
  buttons: number;
  pressed: number;
  released: number;
};
type ActiveDuel = {
  rival: WorldRival;
  duelId: string | null;
  seed: number;
  practice: boolean;
  rematch: boolean;
  oneHit: boolean;
};
type CombatVisualEvent = CombatEvent & { expiresAt: number };
type DuelFlash = "hit" | "strike" | "skillOne" | "skillTwo" | null;

function DuelHealthBar({
  label,
  hp,
  maxHp,
  side,
  visualEffectsEnabled,
}: {
  label: string;
  hp: number;
  maxHp: number;
  side: "player" | "bot";
  visualEffectsEnabled: boolean;
}) {
  const [trail, setTrail] = useState(hp);
  useEffect(() => {
    if (hp >= trail) {
      setTrail(hp);
      return undefined;
    }
    const timeout = window.setTimeout(() => setTrail(hp), 440);
    return () => window.clearTimeout(timeout);
  }, [hp, trail]);
  const percent = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
  const displayTrail = visualEffectsEnabled ? trail : hp;
  const trailPercent = Math.max(percent, Math.min(100, (displayTrail / Math.max(1, maxHp)) * 100));
  return (
    <div className={`duel-health duel-health--${side}`}>
      <div className="duel-health__label"><span>{label}</span><b>{Math.ceil(hp)} <i>/ {maxHp}</i></b></div>
      <div className={`duel-health__track${percent <= 25 && visualEffectsEnabled ? " is-low" : ""}`} role="meter" aria-label={`${label} canı`} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={Math.ceil(hp)}>
        <i className="duel-health__trail" style={{ width: `${trailPercent}%` }} />
        <i className="duel-health__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function DuelStaminaBar({
  stamina,
  maxStamina,
  visualEffectsEnabled,
}: {
  stamina: number;
  maxStamina: number;
  visualEffectsEnabled: boolean;
}) {
  const [trail, setTrail] = useState(stamina);
  useEffect(() => {
    if (stamina >= trail) {
      setTrail(stamina);
      return undefined;
    }
    const timeout = window.setTimeout(() => setTrail(stamina), 380);
    return () => window.clearTimeout(timeout);
  }, [stamina, trail]);
  const percent = Math.max(0, Math.min(100, (stamina / Math.max(1, maxStamina)) * 100));
  const displayTrail = visualEffectsEnabled ? trail : stamina;
  const trailPercent = Math.max(percent, Math.min(100, (displayTrail / Math.max(1, maxStamina)) * 100));
  const exhausted = percent <= 16;

  return (
    <div className={`duel-player-stamina${exhausted && visualEffectsEnabled ? " is-depleted" : ""}`} aria-label={`Dayanıklılık ${Math.ceil(stamina)} / ${maxStamina}${exhausted ? ", ağır nefes" : ""}`}>
      <span>{exhausted ? "DAYANIKLILIK · AĞIR NEFES" : "DAYANIKLILIK"}</span>
      <b>{Math.ceil(stamina)}</b>
      <i className="duel-player-stamina__track" role="meter" aria-valuemin={0} aria-valuemax={maxStamina} aria-valuenow={Math.ceil(stamina)}>
        <i className="duel-player-stamina__trail" style={{ width: `${trailPercent}%` }} />
        <i className="duel-player-stamina__fill" style={{ width: `${percent}%` }} />
      </i>
    </div>
  );
}

type WorldContentSnapshot = {
  chapters: WorldChapterContent[];
  rivals: WorldRival[];
  pickups: WorldPickup[];
  obstacles: WorldObstacle[];
  collisionGrid: WorldCollisionGrid;
};

const worldContentSnapshots = new WeakMap<Map<number, WorldChapterContent>, Map<number, WorldContentSnapshot>>();

function getCachedWorldContent(
  distance: number,
  cache: Map<number, WorldChapterContent>,
  routeChoice?: WorldRouteChoice | null,
  playerLevel = 1,
  combatDifficulty: CombatDifficulty = "easy",
) {
  const current = Math.max(0, Math.floor(distance / WORLD_GATE_INTERVAL_METERS));
  const activeRoute = routeChoice?.chapterId === current ? routeChoice.difficulty : undefined;
  const routeVariant = activeRoute === "easy" ? 1 : activeRoute === "hard" ? 2 : 0;
  const safePlayerLevel = Math.max(1, Math.min(1_000, Math.floor(playerLevel)));
  const combatDifficultyIndex = combatDifficulty === "easy" ? 0 : combatDifficulty === "medium" ? 1 : 2;
  let snapshots = worldContentSnapshots.get(cache);
  if (!snapshots) {
    snapshots = new Map();
    worldContentSnapshots.set(cache, snapshots);
  }
  const snapshotKey = (current * 9 + routeVariant * 3 + combatDifficultyIndex) * 1_001 + safePlayerLevel;
  let snapshot = snapshots.get(snapshotKey);
  if (snapshot) return snapshot;

  const first = Math.max(0, current - 1);
  const last = Math.min(1_000_000, current + 2);
  const chapters: WorldChapterContent[] = [];
  for (let chapterId = first; chapterId <= last; chapterId += 1) {
    const chapterRoute = routeChoice?.chapterId === chapterId ? routeChoice.difficulty : undefined;
    const chapterVariant = chapterRoute === "easy" ? 1 : chapterRoute === "hard" ? 2 : 0;
      const cacheKey = chapterId * 9 * 1_001 + chapterVariant * 3 * 1_001 + safePlayerLevel * 3 + combatDifficultyIndex;
    let content = cache.get(cacheKey);
    if (!content) {
        content = getWorldChapter(chapterId, chapterRoute, safePlayerLevel, combatDifficulty);
      cache.set(cacheKey, content);
    }
    chapters.push(content);
  }
  snapshot = {
    chapters,
    rivals: chapters.flatMap((chapter) => chapter.rivals),
    pickups: chapters.flatMap((chapter) => chapter.pickups),
    obstacles: chapters.flatMap((chapter) => chapter.obstacles),
    collisionGrid: buildWorldCollisionGrid(chapters),
  };
  snapshots.set(snapshotKey, snapshot);
  for (const chapterId of cache.keys()) {
    if (chapterId < current - 2 || chapterId > current + 3) cache.delete(chapterId);
  }
  for (const chapterId of snapshots.keys()) {
    if (chapterId < current - 2 || chapterId > current + 3) snapshots.delete(chapterId);
  }
  return snapshot;
}

function slotEquipmentKey(slot: EquipmentSlot, ringKey?: EquipmentLoadoutKey) {
  return getEquipmentLoadoutKey(slot, ringKey === "ringTwoId" ? "ringTwoId" : "ringOneId");
}

function createIdempotencyKey() {
  if (typeof window === "undefined" || !window.crypto?.getRandomValues) {
    throw new Error("Güvenli alışveriş anahtarı oluşturulamadı.");
  }
  if (window.crypto.randomUUID) return window.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function storeErrorText(code: string) {
  const messages: Record<string, string> = {
    insufficient_funds: "Altın veya elmas bakiyen bu eşya için yeterli değil.",
    insufficient_upgrade_materials: "Geliştirme için altın, Kor Kristali, Demir Kırığı veya Mühür Parçası yetersiz.",
    item_drop_only: "Bu eşya yalnızca rakip ganimeti olarak bulunur.",
    item_level_locked: "Bu eşya için gereken seviyeye henüz ulaşmadın.",
    item_already_owned: "Bu eşya zaten heybenizde.",
    item_not_owned: "Bu eşyayı önce satın alıp heybenize eklemelisiniz.",
    item_not_found: "Bu eşya katalogda bulunamadı; kataloğu yenileyip tekrar deneyin.",
    item_not_equippable: "Bu eşya kuşanılamaz.",
    item_not_equipment: "Yalnızca ekipman satılabilir veya parçalanabilir.",
    item_equipped: "Önce kuşanılmış eşyayı çıkar.",
    item_has_no_sale_value: "Bu eşyanın satış değeri yok.",
    starter_item_cannot_be_removed: "Başlangıç eşyaları satılamaz veya parçalanamaz.",
    special_offer_expired: "Bu özel teklif yenilendi; güncel teklifleri açıp tekrar dene.",
    inventory_full: "Heybe dolu; önce eşya sat veya parçala.",
    stack_limit: "Bu eşyanın heybe sınırına ulaştın.",
    invalid_equipment_slot: "Eşya seçilen ekipman yuvasına takılamaz.",
    item_not_upgradeable: "Bu eşya geliştirilemiyor.",
    upgrade_max_level: "Bu eşya en yüksek seviyede.",
    profile_not_ready: "Hesap profili henüz hazır değil.",
    profile_storage_invalid: "Hesap profili doğrulanamadı.",
    store_schema_outdated: "Mağaza veritabanı güncel değil. Mağaza migration’larını çalıştırıp tekrar dene.",
    store_storage_unavailable: "Mağaza sunucusuna şu anda ulaşılamıyor. Bakiye ve eşyalar kaydedilmedi; tekrar dene.",
    authentication_required: "Alışveriş için hesabınızda oturum açın.",
    authentication_unavailable: "Hesap mağazası şu anda kullanılamıyor.",
    idempotency_key_reused: "İşlem anahtarı çakıştı. Güvenli olması için yeni bir deneme oluşturun.",
  };
  return messages[code] ?? "Mağaza işlemi tamamlanamadı. Bağlantıyı kontrol edip yeniden deneyin.";
}

function pickupErrorText(error: unknown) {
  if (!(error instanceof ApiResponseError)) {
    return "Ödül doğrulanamadı; eşya yerde kaldı.";
  }
  if (error.status === 401 || error.code === "authentication_required") {
    return "Oturum doğrulanamadı; yeniden giriş yap.";
  }
  if (error.code === "invalid_pickup_claim" || error.code === "invalid_pickup_ids") {
    return "Eşya sunucudaki bölümle uyuşmuyor; yeniden yükle.";
  }
  if (error.retryable || error.code === "pickup_storage_unavailable") {
    return "Ödül sunucusu geçici olarak erişilemiyor; eşya yerde kaldı.";
  }
  if (error.status === 503 || error.code === "profile_not_ready") {
    return "Hesap sunucuya bağlı değil; eşya yerde kaldı.";
  }
  return "Ödül doğrulanamadı; eşya yerde kaldı.";
}

class StoreActionError extends Error {}

function rewardLabel(amount: number, label: string) {
  return amount > 0 ? `${amount} ${label}` : "";
}

function isStoreCatalogItem(value: unknown): value is StoreItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Partial<StoreItem>;
  return typeof item.id === "string" &&
    /^[a-z0-9_-]{1,60}$/.test(item.id) &&
    typeof item.name === "string" &&
    ["weapons", "armor", "accessories", "consumables", "materials", "specials"].includes(String(item.category)) &&
    (item.slot === null || ["weapon", "offhand", "helmet", "armor", "gloves", "boots", "cape", "ring", "effect", "dye"].includes(String(item.slot))) &&
    ["equipment", "consumable", "material"].includes(String(item.kind)) &&
    Boolean(item.price && Number.isSafeInteger(item.price.gold) && item.price.gold >= 0 &&
      Number.isSafeInteger(item.price.diamonds) && item.price.diamonds >= 0) &&
    typeof item.description === "string" &&
    typeof item.summary === "string" &&
    typeof item.upgradeable === "boolean" &&
    Boolean(item.stats && typeof item.stats === "object") &&
    Boolean(item.visual && typeof item.visual === "object");
}

function Icon({ name }: { name: "bag" | "settings" | "exit" }) {
  if (name === "bag") {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 8h14l1 12H4L5 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 9V6a3 3 0 0 1 6 0v3M8 13h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
  }
  if (name === "settings") {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m10.2 3.8.5-1h2.6l.5 1a1.9 1.9 0 0 0 2.3.8l1-.4 1.8 1.8-.4 1a1.9 1.9 0 0 0 .8 2.3l1 .5v2.6l-1 .5a1.9 1.9 0 0 0-.8 2.3l.4 1-1.8 1.8-1-.4a1.9 1.9 0 0 0-2.3.8l-.5 1h-2.6l-.5-1a1.9 1.9 0 0 0-2.3-.8l-1 .4-1.8-1.8.4-1a1.9 1.9 0 0 0-.8-2.3l-1-.5V9.8l1-.5a1.9 1.9 0 0 0 .8-2.3l-.4-1 1.8-1.8 1 .4a1.9 1.9 0 0 0 2.3-.8Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round"/><circle cx="12" cy="11.1" r="3.1" stroke="currentColor" strokeWidth="1.35"/></svg>;
  }
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function WorldVolumeSlider({
  id,
  label,
  description,
  value,
  onChange,
  onUserGesture,
}: {
  id: string;
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  onUserGesture: () => void;
}) {
  const percent = Math.round(value * 100);
  return (
    <div className="world-setting world-setting--volume">
      <span><strong>{label}</strong><small>{description}</small></span>
      <div className="world-volume-slider">
        <input
          id={id}
          type="range"
          min="0"
          max="100"
          step="5"
          value={percent}
          aria-label={label}
          aria-valuetext={`${percent}%`}
          onPointerDown={onUserGesture}
          onChange={(event) => {
            onUserGesture();
            onChange(Number(event.currentTarget.value) / 100);
          }}
        />
        <output htmlFor={id}>{percent}%</output>
      </div>
    </div>
  );
}

export default function WorldScene({
  apiRequest,
  userId,
  quality,
  combatDifficulty,
  visualEffectsEnabled,
  motionReduced,
  performanceMonitorEnabled,
  soundEnabled,
  soundVolume,
  musicVolume,
  onSoundEnabledChange,
  onSoundVolumeChange,
  onMusicVolumeChange,
  vibrationEnabled,
  onExit,
  onOpenSettings,
  profile,
  accountDuelEnabled,
  accountProfileReady,
  onBattleProfile,
  onOpenProfile,
  onLoadClaimedPickups,
  onClaimWorldPickups,
  onSaveWorldPosition,
}: WorldSceneProps) {
  const sceneRef = useRef<HTMLElement>(null);
  const npcDialoguePortalRef = useRef<HTMLDivElement>(null!);
  const profileRef = useRef(profile);
  const [dailyClockTick, setDailyClockTick] = useState(() => Date.now());
  const [dailyAdBusy, setDailyAdBusy] = useState(false);
  const [dailyAdMessage, setDailyAdMessage] = useState("");
  useEffect(() => {
    const timer = window.setInterval(() => setDailyClockTick(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const dailyLives = normalizeDailyLifeState(profile, new Date(dailyClockTick));
  const dailyAccess = canStartDailyDuel(dailyLives, new Date(dailyClockTick));
  const dailyAdUnit = getConfiguredRewardedAdUnit();
  const [worldProgress, setWorldProgress] = useState<WorldProgress>(() => {
    const localProgress = readWorldProgress(userId);
    const savedPosition = userId && accountProfileReady ? profile.worldProgress : null;
    return inferWorldProgressFromDefeatedOpponents(
      savedPosition
        ? {
            ...localProgress,
            distance: savedPosition.distance,
            depth: savedPosition.depth,
            routeChoice: savedPosition.routeChoice ?? localProgress.routeChoice,
            unlockedThroughChapter: 0,
          }
        : localProgress,
      profile.defeatedOpponents,
    );
  });
  const [travel, setTravel] = useState(Math.floor(worldProgress.distance));
  const worldProgressRef = useRef(worldProgress);
  const progressUserIdRef = useRef(userId);
  const accountPositionLoadedUserRef = useRef(accountProfileReady && userId ? userId : null);
  const cloudSaveContextRef = useRef({
    userId,
    accountProfileReady,
    save: onSaveWorldPosition,
  });
  cloudSaveContextRef.current = {
    userId,
    accountProfileReady,
    save: onSaveWorldPosition,
  };
  const cloudSaveQueueRef = useRef<ReturnType<typeof createLatestAsyncSaveQueue<{
    userId: string;
    position: WorldProgressPosition;
  }>> | null>(null);
  cloudSaveQueueRef.current ??= createLatestAsyncSaveQueue(async ({ userId: owner, position }) => {
    const context = cloudSaveContextRef.current;
    if (!context.accountProfileReady || context.userId !== owner) return;
    await context.save(position);
  });
  const saveCloudProgress = useCallback((progress: WorldProgress, force = false) => {
    if (!userId || !accountProfileReady || progressUserIdRef.current !== userId) return;
    cloudSaveQueueRef.current?.enqueue({
      userId,
      position: { distance: progress.distance, depth: progress.depth, routeChoice: progress.routeChoice },
    }, { immediate: force });
  }, [accountProfileReady, userId]);
  const chooseGateRoute = useCallback((side: WorldRouteSide) => {
    const position = motionRef.current;
    const chapterId = Math.max(0, Math.floor(position.distance / WORLD_GATE_INTERVAL_METERS));
    if (
      nextGateDistance(position.distance) - position.distance > WORLD_GATE_INTERACTION_RANGE_METERS
      || !isWorldChapterCleared(chapterId, profileRef.current.defeatedOpponents)
    ) return;

    const playerId = getWorldRoutePlayerId(progressUserIdRef.current);
    const routeChoice = createWorldRouteChoice(playerId, chapterId + 1, side);
    const unlockedProgress = unlockWorldGate({
      ...worldProgressRef.current,
      distance: position.distance,
      depth: position.depth,
    }, chapterId, true, routeChoice);
    const nextProgress = { ...unlockedProgress, depth: side === "left" ? -0.42 : 0.42 };
    worldProgressRef.current = nextProgress;
    position.depth = nextProgress.depth;
    position.velocityX = 0;
    setWorldProgress(nextProgress);
    saveWorldProgress(nextProgress, progressUserIdRef.current);
    saveCloudProgress(nextProgress, true);
  }, [saveCloudProgress]);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  const commitBattleProfile = useCallback((nextProfile: PlayerProfile) => {
    profileRef.current = nextProfile;
    onBattleProfile(nextProfile);
  }, [onBattleProfile]);
  const claimDailyExtraDuel = useCallback(async () => {
    const currentDaily = normalizeDailyLifeState(profileRef.current);
    if (dailyAdBusy || currentDaily.dailyLosses < DAILY_DEFEAT_LIMIT || currentDaily.dailyAdRewardUsed) return;
    if (!dailyAdUnit) {
      setDailyAdMessage("Ödüllü reklam henüz bu oyun için ayarlanmadı. Haklar İstanbul saatiyle 00.00’da yenilenir.");
      return;
    }
    setDailyAdBusy(true);
    setDailyAdMessage("");
    try {
      const rewarded = await requestGoogleRewardedAd(dailyAdUnit);
      if (!rewarded) {
        setDailyAdMessage("Reklam tamamlanmadı veya şu an gösterilemiyor; düello hakkı verilmedi.");
        return;
      }
      if (userId) {
        const result = await apiRequest<{ profile?: unknown }>("/api/profile/daily-ad-reward", {
          method: "POST",
          credentials: "include",
        }, {
          operation: "daily rewarded duel",
          fallbackMessage: "Ek düello hakkı şu an kaydedilemedi. Biraz sonra tekrar dene.",
          messageForCode: (code) => code === "daily_ad_reward_used"
            ? "Bugünkü reklam ödülünü zaten kullandın."
            : "Ek düello hakkı şu an kaydedilemedi. Biraz sonra tekrar dene.",
        });
        if (!result.profile) throw new Error("Ad reward profile was not returned.");
        commitBattleProfile(normalizePlayerProfile(result.profile));
      } else {
        const reward = grantDailyAdDuel(profileRef.current);
        if (!reward) throw new Error("Daily rewarded duel is no longer available.");
        commitBattleProfile(normalizePlayerProfile({ ...profileRef.current, ...reward }));
      }
      setDailyAdMessage("Bir ek düello hakkı açıldı.");
    } catch {
      setDailyAdMessage("Ödül kaydedilemedi. Reklamı tekrar izletmeden önce profilini yenile.");
    } finally {
      setDailyAdBusy(false);
      setDailyClockTick(Date.now());
    }
  }, [apiRequest, commitBattleProfile, dailyAdBusy, dailyAdUnit, userId]);
  const motionRef = useRef(createWorldMotion(worldProgress.distance, worldProgress.depth));
  const renderMotionRef = useRef<WorldMotion | null>(null);
  const previousMotionRef = useRef<WorldMotion | null>(null);
  if (!renderMotionRef.current) renderMotionRef.current = { ...motionRef.current };
  if (!previousMotionRef.current) previousMotionRef.current = { ...motionRef.current };
  const interactableRegistryRef = useRef<WorldInteractableRegistry<WorldObstacle | WorldRival> | null>(null);
  interactableRegistryRef.current ??= new WorldInteractableRegistry<WorldObstacle | WorldRival>();
  const [nearbyInteractables, setNearbyInteractables] = useState<{
    chest: WorldObstacle | null;
    breakable: WorldObstacle | null;
    rivalId: string | null;
  }>({ chest: null, breakable: null, rivalId: null });
  useEffect(() => {
    const refreshNearbyInteractables = () => {
      const position = motionRef.current;
      const playerX = position.depth * 5.2;
      const registry = interactableRegistryRef.current;
      if (!registry) return;
      const chest = registry.findNearest("chest", playerX, position.distance)?.source as WorldObstacle | undefined;
      const breakable = registry.findNearest("breakable", playerX, position.distance)?.source as WorldObstacle | undefined;
      const rivalId = registry.findNearest("rival", playerX, position.distance)?.id ?? null;
      setNearbyInteractables((current) => (
        current.chest?.id === chest?.id
        && current.breakable?.id === breakable?.id
        && current.rivalId === rivalId
          ? current
          : { chest: chest ?? null, breakable: breakable ?? null, rivalId }
      ));
    };
    refreshNearbyInteractables();
    const interval = window.setInterval(refreshNearbyInteractables, 125);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    const userChanged = progressUserIdRef.current !== userId;
    const accountPositionJustLoaded = Boolean(
      userId && accountProfileReady && accountPositionLoadedUserRef.current !== userId,
    );
    if (!userChanged && !accountPositionJustLoaded && !profile.defeatedOpponents) return;

    const applyProgress = (nextProgress: WorldProgress) => {
      worldProgressRef.current = nextProgress;
      motionRef.current = createWorldMotion(nextProgress.distance, nextProgress.depth);
      if (previousMotionRef.current) Object.assign(previousMotionRef.current, motionRef.current);
      if (renderMotionRef.current) Object.assign(renderMotionRef.current, motionRef.current);
      setWorldProgress(nextProgress);
      setTravel(Math.floor(nextProgress.distance));
    };

    if (userChanged) {
      saveWorldProgress({
        ...worldProgressRef.current,
        distance: motionRef.current.distance,
        depth: motionRef.current.depth,
      }, progressUserIdRef.current);
      progressUserIdRef.current = userId;
      accountPositionLoadedUserRef.current = accountProfileReady && userId ? userId : null;
      const localProgress = readWorldProgress(userId);
      const savedPosition = userId && accountProfileReady ? profile.worldProgress : null;
      applyProgress(inferWorldProgressFromDefeatedOpponents(
        savedPosition
          ? { ...localProgress, distance: savedPosition.distance, depth: savedPosition.depth, unlockedThroughChapter: 0 }
          : localProgress,
        profile.defeatedOpponents,
      ));
      return;
    }

    if (accountPositionJustLoaded) {
      accountPositionLoadedUserRef.current = userId ?? null;
      if (profile.worldProgress) {
        const localProgress = readWorldProgress(userId);
        applyProgress(inferWorldProgressFromDefeatedOpponents({
          ...localProgress,
          distance: profile.worldProgress.distance,
          depth: profile.worldProgress.depth,
          unlockedThroughChapter: 0,
        }, profile.defeatedOpponents));
        return;
      }
    }

    const currentProgress = {
      ...worldProgressRef.current,
      distance: motionRef.current.distance,
      depth: motionRef.current.depth,
    };
    const inferred = inferWorldProgressFromDefeatedOpponents(currentProgress, profile.defeatedOpponents);
    if (
      inferred.distance !== currentProgress.distance
      || inferred.depth !== currentProgress.depth
      || inferred.unlockedThroughChapter !== currentProgress.unlockedThroughChapter
    ) {
      applyProgress(inferred);
    }
  }, [accountProfileReady, profile.defeatedOpponents, profile.worldProgress, userId]);
  useEffect(() => {
    const persistProgress = () => {
      const progress = {
        ...worldProgressRef.current,
        distance: motionRef.current.distance,
        depth: motionRef.current.depth,
      };
      saveWorldProgress(progress, progressUserIdRef.current);
      saveCloudProgress(progress, true);
    };
    const persistWhenHidden = () => {
      if (document.visibilityState === "hidden") persistProgress();
    };
    const syncAccountPosition = () => saveCloudProgress({
      ...worldProgressRef.current,
      distance: motionRef.current.distance,
      depth: motionRef.current.depth,
    });
    const syncInterval = window.setInterval(syncAccountPosition, 3_000);
    window.addEventListener("pagehide", persistProgress);
    document.addEventListener("visibilitychange", persistWhenHidden);
    return () => {
      persistProgress();
      window.clearInterval(syncInterval);
      window.removeEventListener("pagehide", persistProgress);
      document.removeEventListener("visibilitychange", persistWhenHidden);
    };
  }, [saveCloudProgress]);
  const lastMotionRef = useRef<"idle" | "walking" | "running" | "stopped">("idle");
  const panelTriggerRef = useRef<HTMLButtonElement>(null);
  const [motion, setMotion] = useState<"idle" | "walking" | "running" | "stopped">("idle");
  const [panel, setPanel] = useState<Panel>(null);
  const storeItems = STORE_CATALOG as StoreItem[];
  const storeCatalogLoading = false;
  const [storeBusyItemId, setStoreBusyItemId] = useState<string | null>(null);
  const [combatLoadoutBusy, setCombatLoadoutBusy] = useState(false);
  const [storeTrialItemId, setStoreTrialItemId] = useState<string | null>(null);
  const [storeCelebrationSignal, setStoreCelebrationSignal] = useState(0);
  const [storeMessage, setStoreMessage] = useState("");
  const [storeError, setStoreError] = useState("");
  const [storeRetryAction, setStoreRetryAction] = useState<{
    operation: "purchase" | "equip" | "upgrade" | "sell" | "salvage";
    itemId: string;
    equipmentKey?: EquipmentLoadoutKey;
  } | null>(null);
  const [weatherMode, setWeatherMode] = useState<WeatherMode>("ash");
  const weatherModeRef = useRef(weatherMode);
  weatherModeRef.current = weatherMode;
  const airEnabled = weatherMode !== "clear";
  const [audioOn, setAudioOn] = useState(soundEnabled);
  const [vibrationOn, setVibrationOn] = useState(vibrationEnabled);
  const currentChapterId = Math.max(0, Math.floor(travel / WORLD_GATE_INTERVAL_METERS));
  const [rivalRefresh, setRivalRefresh] = useState(0);
  const [stepBursts, setStepBursts] = useState<StepBurst[]>([]);
  const [collectedPickupIds, setCollectedPickupIds] = useState<Set<string>>(() => new Set());
  const [brokenObstacleIds, setBrokenObstacleIds] = useState<Set<string>>(() => readBrokenObstacleIds(userId));
  const [sessionRewards, setSessionRewards] = useState({ gold: 0, diamonds: 0, materials: { emberCrystals: 0, sealFragments: 0, ironShards: 0 } });
  const [pickupFlights, setPickupFlights] = useState<PickupFlight[]>([]);
  const [pickupNotice, setPickupNotice] = useState("");
  const [attackAnimation, setAttackAnimation] = useState(false);
  const [chestSlamActive, setChestSlamActive] = useState(false);
  const [battleSession, setBattleSession] = useState<BattleSession | null>(null);
  const [storyDialogue, setStoryDialogue] = useState<StoryDialogue | null>(() => getOpeningStoryDialogue());
  const [combatRender, setCombatRender] = useState<CombatState | null>(null);
  const [combatEvents, setCombatEvents] = useState<CombatVisualEvent[]>([]);
  const [combatFlash, setCombatFlash] = useState<DuelFlash>(null);
  const [combatTutorialOpen, setCombatTutorialOpen] = useState(false);
  const combatTutorialOpenRef = useRef(false);
  const combatTutorialSeenRef = useRef(false);
  const lastBotTelegraphTickRef = useRef(-1);
  const storyDialogueRef = useRef<StoryDialogue | null>(storyDialogue);
  const storyChapterRef = useRef(0);
  const [debugOneHitEnabled, setDebugOneHitEnabled] = useState(false);
  const contentCacheRef = useRef(new Map<number, WorldChapterContent>());
  const collectedRef = useRef(new Set<string>());
  const pendingPickupIdsRef = useRef(new Set<string>());
  const deferredPickupIdsRef = useRef(new Set<string>());
  const brokenRef = useRef(new Set(brokenObstacleIds));
  const obstacleDamageRef = useRef(new Map<string, number>());
  const chestSlamRef = useRef<{ obstacleId: string; elapsed: number } | null>(null);
  const loadedClaimChaptersRef = useRef(new Set<number>());
  const loadingClaimChaptersRef = useRef(new Set<number>());
  const claimLoaderRef = useRef(onLoadClaimedPickups);
  const claimQueueRef = useRef(new Map<number, Set<string>>());
  const claimTimersRef = useRef(new Map<number, number>());
  const trapCooldownRef = useRef(new Map<string, number>());
  const attackRequestedRef = useRef(false);
  const nextAttackAtRef = useRef(0);
  const simulationTimeRef = useRef(0);
  const battleActiveRef = useRef(false);
  const battleSessionRef = useRef<BattleSession | null>(null);
  const activeDuelRef = useRef<ActiveDuel | null>(null);
  const combatStateRef = useRef<CombatState | null>(null);
  const combatInputRef = useRef<CombatInputBuffer>({ x: 0, y: 0, buttons: 0, pressed: 0, released: 0 });
  const duelKeyboardKeysRef = useRef(new Set<string>());
  const inputLogRef = useRef<CombatInputFrame[]>([]);
  const lastInputFrameRef = useRef<CombatInputFrame | null>(null);
  const battleTimersRef = useRef<number[]>([]);
  const battleFrozenMotionRef = useRef<WorldMotion | null>(null);
  const pendingVerdictRef = useRef<DuelSummary | null>(null);
  const pendingSurrenderRef = useRef(false);
  const settlementStartedRef = useRef(false);
  const hitStopUntilRef = useRef(0);
  const flashSequenceRef = useRef(0);
  const nextCombatEffectIdRef = useRef(0);
  const nextFlightIdRef = useRef(0);
  const storeMutationRef = useRef(false);
  const attackAnimationTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const savedBrokenIds = readBrokenObstacleIds(userId);
    brokenRef.current = savedBrokenIds;
    setBrokenObstacleIds(savedBrokenIds);
  }, [userId]);

  useEffect(() => {
    if (visualEffectsEnabled) return;
    setCombatEvents([]);
    setCombatFlash(null);
    hitStopUntilRef.current = window.performance.now();
  }, [visualEffectsEnabled]);
  const startAudio = useTravelAudio(
    audioOn,
    motion === "walking" || motion === "running",
    airEnabled,
    soundVolume,
    musicVolume,
    currentChapterId,
  );
  const activeContent = getCachedWorldContent(
    travel,
    contentCacheRef.current,
    worldProgress.routeChoice,
    profile.level,
    combatDifficulty,
  );
  const allRivals = activeContent.rivals;
  const nearbyRivals = allRivals.filter((rival) => Math.abs(rival.distance - travel) <= 105);
  const rivals = allRivals.filter((rival) =>
    rival.distance >= travel - 8 && !profile.defeatedOpponents.includes(rival.id),
  )
    .sort((left, right) => left.distance - right.distance);
  const nextOpponent = allRivals
    .filter((rival) => Math.abs(rival.distance - travel) <= 25)
    .sort((left, right) => Math.abs(left.distance - travel) - Math.abs(right.distance - travel))[0];
  const nextOpponentDefeated = Boolean(
    nextOpponent && profile.defeatedOpponents.includes(nextOpponent.id),
  );
  const encounterDistance = nextOpponent ? Math.abs(nextOpponent.distance - travel) : Number.POSITIVE_INFINITY;
  const dialoguePrompt = getRivalDialoguePrompt(
    allRivals,
    nearbyInteractables.rivalId,
    travel,
  );
  const encounterVisible = Boolean(
    nextOpponent
    && encounterDistance <= 25
    && nearbyInteractables.rivalId === nextOpponent.id,
  );
  const talkingRivalId = dialoguePrompt.rivalId;
  const canChallenge = dialoguePrompt.canChallenge;
  const allPickups = activeContent.pickups;
  const visiblePickupCount = allPickups.filter((pickup) =>
    !collectedPickupIds.has(pickup.id) &&
    (!pickup.sourceObstacleId || brokenObstacleIds.has(pickup.sourceObstacleId)),
  ).length;
  const nearestBreakable = nearbyInteractables.breakable
    && !brokenObstacleIds.has(nearbyInteractables.breakable.id)
    ? nearbyInteractables.breakable
    : undefined;
  const nearestTreasureChest = !chestSlamActive
    && nearbyInteractables.chest
    && !brokenObstacleIds.has(nearbyInteractables.chest.id)
    ? nearbyInteractables.chest
    : undefined;
  const displayedGold = profile.gold + sessionRewards.gold;
  const displayedDiamonds = profile.diamonds + sessionRewards.diamonds;
  const displayedCrystals = profile.materials.emberCrystals + sessionRewards.materials.emberCrystals;
  const displayedSeals = profile.materials.sealFragments + sessionRewards.materials.sealFragments;
  const displayedIronShards = profile.materials.ironShards + sessionRewards.materials.ironShards;
  const playerCombatStats = useMemo(() => getPlayerCombatModifiers(profile, storeItems), [profile, storeItems]);
  const combatLoadout = useMemo<CombatLoadout>(() => {
    const secondaryWeaponId = profile.inventory.secondaryWeaponId;
    const secondaryProfile = secondaryWeaponId
      ? { ...profile, equipment: { ...profile.equipment, weaponId: secondaryWeaponId } }
      : profile;
    return {
      quickSlots: [...profile.inventory.quickSlots],
      itemCounts: { ...profile.inventory.combatItemCounts },
      weaponIds: [profile.equipment.weaponId, secondaryWeaponId],
      weaponStats: [
        playerCombatStats,
        secondaryWeaponId ? getPlayerCombatModifiers(secondaryProfile, storeItems) : playerCombatStats,
      ],
    };
  }, [playerCombatStats, profile, storeItems]);
  const equipmentBonuses = useMemo(() => getEquipmentBonuses(profile, storeItems), [profile, storeItems]);
  const equipmentVisual = useMemo(() => getEquipmentVisual(profile, storeItems), [profile, storeItems]);
  const selectedBattleWeaponId = combatRender?.weaponIds[combatRender.activeWeaponSlot] ?? profile.equipment.weaponId;
  const combatDistance = combatRender
    ? Math.hypot(combatRender.player.x - combatRender.bot.x, combatRender.player.z - combatRender.bot.z)
    : Number.POSITIVE_INFINITY;
  const bowCloseRange = selectedBattleWeaponId === "weapon_short_bow" && combatDistance <= 1.85;
  const battleWeaponId = bowCloseRange ? "weapon_hunting_knife" : selectedBattleWeaponId;
  const battleEquipmentVisual = useMemo(() => {
    if (battleWeaponId === profile.equipment.weaponId) return equipmentVisual;
    const battleProfile = { ...profile, equipment: { ...profile.equipment, weaponId: battleWeaponId } };
    return getEquipmentVisual(battleProfile, storeItems);
  }, [battleWeaponId, equipmentVisual, profile, storeItems]);
  const worldEquipmentVisual = useMemo(() => {
    if (panel !== "store" || !storeTrialItemId) return equipmentVisual;
    const trialItem = storeItems.find((item) => item.id === storeTrialItemId);
    if (!trialItem?.slot || trialItem.kind !== "equipment") return equipmentVisual;
    const key = slotEquipmentKey(trialItem.slot);
    const trialProfile = {
      ...profile,
      equipment: { ...profile.equipment, [key]: trialItem.id },
    };
    return getEquipmentVisual(trialProfile, storeItems);
  }, [equipmentVisual, panel, profile, storeItems, storeTrialItemId]);
  const remainingBreakableHits = nearestBreakable
    ? obstacleDamageRef.current.get(nearestBreakable.id) ?? nearestBreakable.health
    : 0;

  const wake = useCallback(() => {
    if (audioOn) startAudio();
  }, [audioOn, startAudio]);
  const worldInput = useWorldInput(wake);
  const showStoryDialogue = useCallback((dialogue: StoryDialogue) => {
    storyDialogueRef.current = dialogue;
    worldInput.clearActions();
    motionRef.current = {
      ...motionRef.current,
      velocityX: 0,
      velocityY: 0,
      hasMoved: false,
      cameraLead: 0,
    };
    setStoryDialogue(dialogue);
  }, [worldInput.heldKeys, worldInput.joystick]);
  const closeStoryDialogue = useCallback(() => {
    storyDialogueRef.current = null;
    worldInput.clearActions();
    setStoryDialogue(null);
    if (audioOn) startAudio(true);
  }, [audioOn, startAudio, worldInput.heldKeys, worldInput.joystick]);

  useEffect(() => {
    if (currentChapterId <= storyChapterRef.current) return;
    storyChapterRef.current = currentChapterId;
    showStoryDialogue(getChapterStoryDialogue(currentChapterId));
  }, [currentChapterId, showStoryDialogue]);

  useEffect(() => {
    setAudioOn(soundEnabled);
  }, [soundEnabled]);
  useEffect(() => {
    setVibrationOn(vibrationEnabled);
  }, [vibrationEnabled]);
  const storeMutationKeysRef = useRef(new Map<string, string>());
  const runStoreMutation = useCallback(async (
    operation: "purchase" | "equip" | "upgrade" | "sell" | "salvage",
    itemId: string,
    selectedEquipmentKey?: EquipmentLoadoutKey,
  ) => {
    if (storeMutationRef.current) return;
    const item = storeItems.find((entry) => entry.id === itemId);
    if (!item) {
      setStoreError("Bu eşya katalogda bulunamadı.");
      return;
    }
    if (accountDuelEnabled && !accountProfileReady) {
      setStoreError("Hesap profili hazır değil; güvenli yerel alışverişe devam edilemiyor.");
      return;
    }
    const mutationKey = `${operation}:${itemId}:${selectedEquipmentKey ?? ""}`;
    let idempotencyKey = storeMutationKeysRef.current.get(mutationKey);
    if (operation !== "equip" && !idempotencyKey) {
      idempotencyKey = createIdempotencyKey();
      storeMutationKeysRef.current.set(mutationKey, idempotencyKey);
    }
    storeMutationRef.current = true;
    setStoreBusyItemId(itemId);
    setStoreError("");
    setStoreRetryAction(null);
    setStoreMessage("");
    try {
      if (!accountDuelEnabled) {
        const currentProfile = profileRef.current;
        let nextProfile = currentProfile;
        if (operation === "purchase") {
          if (item.dropOnly) throw new StoreActionError("Bu eşya yalnızca rakip ganimeti olarak bulunur.");
          if (item.category === "specials" && !isDailySpecialAvailable(item.id)) {
            throw new StoreActionError("Bu özel teklif yenilendi; güncel teklifleri açıp tekrar dene.");
          }
          if (!isStoreItemUnlocked(item, currentProfile.level)) throw new StoreActionError(`Bu eşya için seviye ${item.requiredLevel} gerekiyor.`);
          if (item.kind === "equipment" && currentProfile.inventory.ownedItemIds.includes(item.id)) throw new StoreActionError("Bu eşya zaten heybenizde.");
          if (currentProfile.gold < item.price.gold || currentProfile.diamonds < item.price.diamonds) {
            throw new StoreActionError("Altın veya elmas bakiyen bu eşya için yeterli değil.");
          }
          nextProfile = {
            ...currentProfile,
            gold: currentProfile.gold - item.price.gold,
            diamonds: currentProfile.diamonds - item.price.diamonds,
          };
          if (item.kind === "equipment") {
            if (currentProfile.inventory.ownedItemIds.length >= 120) throw new StoreActionError("Heybe dolu; yeni eşya alamazsın.");
            nextProfile = {
              ...nextProfile,
              inventory: {
                ...currentProfile.inventory,
                ownedItemIds: [...currentProfile.inventory.ownedItemIds, item.id],
                newItemIds: [...new Set([...currentProfile.inventory.newItemIds, item.id])],
              },
            };
          } else if (item.reward?.type === "combat-item") {
            const count = currentProfile.inventory.combatItemCounts[item.reward.itemId];
            if (count + item.reward.amount > 999) throw new StoreActionError("Bu eşyanın heybe sınırına ulaştın.");
            nextProfile = {
              ...nextProfile,
              inventory: {
                ...currentProfile.inventory,
                combatItemCounts: {
                  ...currentProfile.inventory.combatItemCounts,
                  [item.reward.itemId]: count + item.reward.amount,
                },
              },
            };
          } else if (item.reward?.type === "material") {
            const count = currentProfile.materials[item.reward.material];
            if (count + item.reward.amount > 1_000_000_000) throw new StoreActionError("Bu malzemenin heybe sınırına ulaştın.");
            nextProfile = {
              ...nextProfile,
              materials: {
                ...currentProfile.materials,
                [item.reward.material]: count + item.reward.amount,
              },
            };
          } else {
            throw new StoreActionError("Bu mağaza eşyasının ödül bilgisi eksik.");
          }
        } else if (operation === "equip") {
          if (!isStoreItemUnlocked(item, currentProfile.level)) throw new StoreActionError(`Bu eşyayı kuşanmak için seviye ${item.requiredLevel} gerekiyor.`);
          if (!currentProfile.inventory.ownedItemIds.includes(item.id)) throw new StoreActionError("Bu eşyayı önce satın alıp heybenize eklemelisiniz.");
          if (item.kind !== "equipment" || !item.slot) throw new StoreActionError("Bu eşya kuşanılamaz.");
          const key = selectedEquipmentKey ?? slotEquipmentKey(item.slot);
          if (key !== slotEquipmentKey(item.slot, key)) throw new StoreActionError("Bu eşya seçilen yuvaya takılamaz.");
          nextProfile = {
            ...currentProfile,
            equipment: {
              ...currentProfile.equipment,
              ...(item.slot === "ring" && key === "ringOneId" && currentProfile.equipment.ringTwoId === item.id ? { ringTwoId: null } : {}),
              ...(item.slot === "ring" && key === "ringTwoId" && currentProfile.equipment.ringOneId === item.id ? { ringOneId: null } : {}),
              [key]: item.id,
            },
            inventory: {
              ...currentProfile.inventory,
              newItemIds: currentProfile.inventory.newItemIds.filter((id) => id !== item.id),
            },
          };
        } else if (operation === "sell" || operation === "salvage") {
          if (item.kind !== "equipment" || !item.slot) throw new StoreActionError("Yalnızca ekipman satılabilir veya parçalanabilir.");
          if (STARTER_ITEM_IDS.includes(item.id as (typeof STARTER_ITEM_IDS)[number])) throw new StoreActionError("Başlangıç eşyaları satılamaz veya parçalanamaz.");
          if (!currentProfile.inventory.ownedItemIds.includes(item.id)) throw new StoreActionError("Bu eşya heybenizde değil.");
          if (Object.values(currentProfile.equipment).includes(item.id) || currentProfile.inventory.secondaryWeaponId === item.id) {
            throw new StoreActionError("Önce kuşanılmış eşyayı çıkar.");
          }
          const upgradeLevel = currentProfile.inventory.upgrades[item.id] ?? 0;
          const withoutItem: PlayerProfile = {
            ...currentProfile,
            inventory: {
              ...currentProfile.inventory,
              ownedItemIds: currentProfile.inventory.ownedItemIds.filter((id) => id !== item.id),
              newItemIds: currentProfile.inventory.newItemIds.filter((id) => id !== item.id),
              upgrades: Object.fromEntries(Object.entries(currentProfile.inventory.upgrades).filter(([id]) => id !== item.id)),
            },
          };
          if (operation === "sell") {
            const payout = getItemSellValue(item);
            if (payout.gold <= 0 && payout.diamonds <= 0) throw new StoreActionError("Bu eşyanın satış değeri yok.");
            nextProfile = {
              ...withoutItem,
              gold: Math.min(1_000_000_000, withoutItem.gold + payout.gold),
              diamonds: Math.min(1_000_000_000, withoutItem.diamonds + payout.diamonds),
            };
          } else {
            const recovered = getSalvageYield(item, upgradeLevel);
            nextProfile = {
              ...withoutItem,
              materials: {
                ironShards: Math.min(1_000_000_000, withoutItem.materials.ironShards + recovered.ironShards),
                emberCrystals: Math.min(1_000_000_000, withoutItem.materials.emberCrystals + recovered.emberCrystals),
                sealFragments: Math.min(1_000_000_000, withoutItem.materials.sealFragments + recovered.sealFragments),
              },
            };
          }
        } else {
          if (!isStoreItemUnlocked(item, currentProfile.level)) throw new StoreActionError(`Bu eşyayı geliştirmek için seviye ${item.requiredLevel} gerekiyor.`);
          if (!item.upgradeable || item.kind !== "equipment" || !item.slot) throw new StoreActionError("Bu eşya geliştirilemiyor.");
          if (!currentProfile.inventory.ownedItemIds.includes(item.id)) throw new StoreActionError("Bu eşyayı önce satın alıp heybenize eklemelisiniz.");
          const currentLevel = currentProfile.inventory.upgrades[item.id] ?? 0;
          if (currentLevel >= MAX_UPGRADE_LEVEL) throw new StoreActionError("Bu eşya en yüksek seviyede.");
          const cost = getUpgradeCost(item.slot, currentLevel);
          if (
            currentProfile.gold < cost.gold ||
            currentProfile.materials.ironShards < cost.ironShards ||
            currentProfile.materials.emberCrystals < cost.emberCrystals ||
            currentProfile.materials.sealFragments < cost.sealFragments
          ) throw new StoreActionError("Geliştirme için altın, Kor Kristali, Demir Kırığı veya Mühür Parçası yetersiz.");
          const upgradeSucceeded = rollUpgradeSuccess(idempotencyKey!, currentLevel);
          nextProfile = {
            ...currentProfile,
            gold: currentProfile.gold - cost.gold,
            materials: {
              ...currentProfile.materials,
              ironShards: currentProfile.materials.ironShards - cost.ironShards,
              emberCrystals: currentProfile.materials.emberCrystals - cost.emberCrystals,
              sealFragments: currentProfile.materials.sealFragments - cost.sealFragments,
            },
            inventory: {
              ...currentProfile.inventory,
              upgrades: upgradeSucceeded
                ? { ...currentProfile.inventory.upgrades, [item.id]: currentLevel + 1 }
                : currentProfile.inventory.upgrades,
            },
          };
        }
        commitBattleProfile(normalizePlayerProfile(nextProfile));
        storeMutationKeysRef.current.delete(mutationKey);
        if (operation === "purchase" || operation === "upgrade") {
          setStoreCelebrationSignal((signal) => signal + 1);
          playWorldCue("seal");
        }
        if (operation === "upgrade") {
          const previousLevel = currentProfile.inventory.upgrades[item.id] ?? 0;
          const upgraded = (nextProfile.inventory.upgrades[item.id] ?? 0) > previousLevel;
          setStoreMessage(upgraded ? `${item.name} +${previousLevel + 1} oldu.` : `${item.name} geliştirmesi başarısız oldu; kaynaklar kullanıldı.`);
        } else if (operation === "sell") {
          const payout = getItemSellValue(item);
          setStoreMessage(`${item.name} satıldı${payout.gold ? ` · ${payout.gold} altın` : ""}${payout.diamonds ? ` · ${payout.diamonds} elmas` : ""}.`);
        } else if (operation === "salvage") {
          setStoreMessage(`${item.name} parçalandı; malzemeler heybenize eklendi.`);
        } else {
          setStoreMessage(operation === "purchase"
            ? `${item.name} ${item.kind === "equipment" ? "heybenize eklendi." : "satın alındı ve stoğunuza eklendi."}`
            : `${item.name} kuşanıldı.`);
        }
        return;
      }

      if (!accountProfileReady) throw new StoreActionError("Hesap profili henüz hazır değil.");
      const body = operation === "equip"
        ? { itemId, ...(selectedEquipmentKey ? { equipmentKey: selectedEquipmentKey } : {}) }
        : { itemId, idempotencyKey };
      const result = await apiRequest<{ profile?: unknown; upgradeSucceeded?: boolean }>(`/api/store/${operation}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }, {
        operation: `store ${operation}`,
        fallbackMessage: "Mağaza şu an yüklenemedi, tekrar dene.",
        messageForCode: (code) => storeErrorText(code),
      });
      if (!result.profile) throw new StoreActionError("Sunucudan profil güncellemesi alınamadı.");
      commitBattleProfile(normalizePlayerProfile(result.profile));
      storeMutationKeysRef.current.delete(mutationKey);
      if (operation === "purchase" || operation === "upgrade") {
        setStoreCelebrationSignal((signal) => signal + 1);
        playWorldCue("seal");
      }
      if (operation === "upgrade") {
        setStoreMessage(result.upgradeSucceeded === false
          ? `${item.name} geliştirmesi başarısız oldu; kaynaklar kullanıldı.`
          : `${item.name} +${(profileRef.current.inventory.upgrades[item.id] ?? 0)} oldu.`);
      } else if (operation === "sell") {
        const payout = getItemSellValue(item);
        setStoreMessage(`${item.name} satıldı${payout.gold ? ` · ${payout.gold} altın` : ""}${payout.diamonds ? ` · ${payout.diamonds} elmas` : ""}.`);
      } else if (operation === "salvage") {
        setStoreMessage(`${item.name} parçalandı; malzemeler heybenize eklendi.`);
      } else {
        setStoreMessage(operation === "purchase"
          ? `${item.name} satın alındı.`
          : `${item.name} kuşanıldı.`);
      }
    } catch (error) {
      if (error instanceof ApiResponseError) {
        setStoreError(error.retryable ? "Mağaza şu an yüklenemedi, tekrar dene." : error.message);
        if (error.retryable) setStoreRetryAction({ operation, itemId, equipmentKey: selectedEquipmentKey });
        else storeMutationKeysRef.current.delete(mutationKey);
      } else if (error instanceof StoreActionError) {
        setStoreError(error.message);
        storeMutationKeysRef.current.delete(mutationKey);
      } else {
        console.warn("[store] operation failed", {
          operation,
          errorName: error instanceof Error ? error.name : "unknown",
        });
        setStoreError("Mağaza şu an yüklenemedi, tekrar dene.");
        if (accountDuelEnabled) setStoreRetryAction({ operation, itemId, equipmentKey: selectedEquipmentKey });
        else storeMutationKeysRef.current.delete(mutationKey);
      }
    } finally {
      storeMutationRef.current = false;
      setStoreBusyItemId(null);
    }
  }, [accountDuelEnabled, accountProfileReady, commitBattleProfile, storeItems]);

  const saveCombatLoadout = useCallback(async (
    quickSlots: CombatQuickSlots,
    secondaryWeaponId: string | null,
  ) => {
    if (storeMutationRef.current) return;
    const currentProfile = profileRef.current;
    if (quickSlots.some((itemId) => itemId !== null && currentProfile.inventory.combatItemCounts[itemId] <= 0)) {
      setStoreError("Bu savaş eşyasından heybenizde kalmadı.");
      return;
    }
    const assignedItems = quickSlots.filter((itemId): itemId is CombatItemId => itemId !== null);
    if (new Set(assignedItems).size !== assignedItems.length) {
      setStoreError("Aynı savaş eşyasını birden fazla hızlı yuvaya atayamazsın.");
      return;
    }
    if (secondaryWeaponId) {
      const weapon = storeItems.find((item) => item.id === secondaryWeaponId);
      if (!weapon || weapon.slot !== "weapon" || !currentProfile.inventory.ownedItemIds.includes(secondaryWeaponId)) {
        setStoreError("İkinci yuvaya yalnızca heybenizdeki bir silahı atayabilirsin.");
        return;
      }
    }
    storeMutationRef.current = true;
    setCombatLoadoutBusy(true);
    setStoreError("");
    setStoreMessage("");
    try {
      if (!accountDuelEnabled) {
        commitBattleProfile(normalizePlayerProfile({
          ...currentProfile,
          inventory: { ...currentProfile.inventory, quickSlots, secondaryWeaponId },
        }));
      } else {
        if (!accountProfileReady) throw new StoreActionError("Hesap profili hazır değil.");
        const result = await apiRequest<{ profile?: unknown }>("/api/store/combat-loadout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quickSlots, secondaryWeaponId }),
        }, {
          operation: "combat loadout update",
          fallbackMessage: "Savaş çantası şu an kaydedilemedi; tekrar dene.",
          messageForCode: (code) => code === "combat_item_unavailable"
            ? "Bu savaş eşyasından heybenizde kalmadı."
            : code === "secondary_weapon_not_owned"
              ? "İkinci yuvaya yalnızca heybenizdeki bir silahı atayabilirsin."
              : "Savaş çantası şu an kaydedilemedi; tekrar dene.",
        });
        if (!result.profile) throw new StoreActionError("Sunucudan güncel profil alınamadı.");
        commitBattleProfile(normalizePlayerProfile(result.profile));
      }
      setStoreMessage("Düello çantan kaydedildi.");
    } catch (error) {
      setStoreError(error instanceof Error ? error.message : "Savaş çantası kaydedilemedi.");
    } finally {
      storeMutationRef.current = false;
      setCombatLoadoutBusy(false);
    }
  }, [accountDuelEnabled, accountProfileReady, apiRequest, commitBattleProfile, storeItems]);

  const assignCombatQuickSlot = useCallback((itemId: CombatItemId, slotIndex: number) => {
    const quickSlots = [...profileRef.current.inventory.quickSlots] as CombatQuickSlots;
    for (let index = 0; index < quickSlots.length; index += 1) {
      if (quickSlots[index] === itemId) quickSlots[index] = null;
    }
    quickSlots[slotIndex] = itemId;
    void saveCombatLoadout(quickSlots, profileRef.current.inventory.secondaryWeaponId);
  }, [saveCombatLoadout]);

  const setSecondaryWeapon = useCallback((itemId: string | null) => {
    void saveCombatLoadout(profileRef.current.inventory.quickSlots, itemId);
  }, [saveCombatLoadout]);
  useEffect(() => {
    if (!pickupNotice) return undefined;
    const timer = window.setTimeout(() => setPickupNotice(""), 2400);
    return () => window.clearTimeout(timer);
  }, [pickupNotice]);

  const loadCurrentChapterClaims = useCallback(async (chapterId: number) => {
    if (loadedClaimChaptersRef.current.has(chapterId) || loadingClaimChaptersRef.current.has(chapterId)) return;
    loadingClaimChaptersRef.current.add(chapterId);
    try {
      const claimed = await onLoadClaimedPickups(chapterId);
      for (const id of claimed) collectedRef.current.add(id);
      setCollectedPickupIds(new Set(collectedRef.current));
    } catch {
      setPickupNotice("Eşya kayıtları yüklenemedi; çevrimiçi ödül tekrar doğrulanacak.");
    } finally {
      loadedClaimChaptersRef.current.add(chapterId);
      loadingClaimChaptersRef.current.delete(chapterId);
    }
  }, [onLoadClaimedPickups]);

  useEffect(() => {
    if (claimLoaderRef.current !== onLoadClaimedPickups) {
      claimLoaderRef.current = onLoadClaimedPickups;
      loadedClaimChaptersRef.current.clear();
    }
    const chapterId = Math.max(0, Math.floor(travel / WORLD_GATE_INTERVAL_METERS));
    void loadCurrentChapterClaims(chapterId);
  }, [loadCurrentChapterClaims, onLoadClaimedPickups, travel]);

  const flushPickupClaims = useCallback(async (chapterId: number, pickupIds: string[]) => {
    const chapterPickups = getWorldChapter(chapterId).pickups;
    const requestedPickups = chapterPickups.filter((pickup) => pickupIds.includes(pickup.id));
    try {
      const result = await onClaimWorldPickups(chapterId, pickupIds);
      const claimedIds = new Set(result.claimedPickupIds);
      const awardedIds = new Set(result.awardedPickupIds);
      for (const id of pickupIds) pendingPickupIdsRef.current.delete(id);
      for (const id of claimedIds) collectedRef.current.add(id);
      for (const id of pickupIds) {
        if (!claimedIds.has(id)) collectedRef.current.delete(id);
      }
      setCollectedPickupIds(new Set(collectedRef.current));

      const awardedPickups = requestedPickups.filter((pickup) => awardedIds.has(pickup.id));
      const reward = pickupRewardTotals(awardedPickups);
      if (!result.persistent && awardedPickups.length) {
        if (!accountDuelEnabled) {
          const currentProfile = profileRef.current;
          commitBattleProfile(normalizePlayerProfile({
            ...currentProfile,
            gold: currentProfile.gold + reward.gold,
            diamonds: currentProfile.diamonds + reward.diamonds,
            materials: {
              emberCrystals: currentProfile.materials.emberCrystals + reward.materials.emberCrystals,
              sealFragments: currentProfile.materials.sealFragments + reward.materials.sealFragments,
              ironShards: currentProfile.materials.ironShards + reward.materials.ironShards,
            },
          }));
        } else {
          setSessionRewards((current) => ({
            gold: current.gold + reward.gold,
            diamonds: current.diamonds + reward.diamonds,
            materials: {
              emberCrystals: current.materials.emberCrystals + reward.materials.emberCrystals,
              sealFragments: current.materials.sealFragments + reward.materials.sealFragments,
              ironShards: current.materials.ironShards + reward.materials.ironShards,
            },
          }));
        }
      }
      if (awardedPickups.length) {
        const effects = awardedPickups.map((pickup) => ({
          id: ++nextFlightIdRef.current,
          kind: pickup.kind,
          amount: pickup.amount,
        }));
        setPickupFlights((current) => [...current, ...effects].slice(-8));
        const rewardParts = [
          rewardLabel(reward.gold, "altın"),
          rewardLabel(reward.diamonds, "elmas"),
          rewardLabel(reward.materials.emberCrystals, "Kor Kristali"),
          rewardLabel(reward.materials.ironShards, "Demir Kırığı"),
          rewardLabel(reward.materials.sealFragments, "Mühür Parçası"),
        ].filter(Boolean);
        setPickupNotice(`${result.persistent ? "" : "Yerel ödül · "}${rewardParts.join(" · ")} alındı.`);
        for (const pickup of awardedPickups) {
          playWorldCue(pickup.kind === "gold-small" || pickup.kind === "gold-large"
            ? "gold"
            : pickup.kind === "seal-fragment" ? "seal" : "crystal");
          if (vibrationOn && "vibrate" in navigator) {
            try { navigator.vibrate(pickup.kind === "seal-fragment" ? [18, 22, 18] : 16); } catch { /* Haptics are optional. */ }
          }
        }
        window.setTimeout(() => {
          const expiredIds = new Set(effects.map((effect) => effect.id));
          setPickupFlights((current) => current.filter((effect) => !expiredIds.has(effect.id)));
        }, 1050);
      } else if (pickupIds.some((id) => !claimedIds.has(id))) {
        setPickupNotice("Eşya ödülü doğrulanamadı; tekrar dene.");
      }
    } catch (error) {
      for (const id of pickupIds) {
        pendingPickupIdsRef.current.delete(id);
        collectedRef.current.delete(id);
        deferredPickupIdsRef.current.add(id);
      }
      setCollectedPickupIds(new Set(collectedRef.current));
      setPickupNotice(pickupErrorText(error));
    }
  }, [accountDuelEnabled, commitBattleProfile, onClaimWorldPickups, vibrationOn]);

  const queuePickupClaims = useCallback((chapterId: number, pickupIds: string[]) => {
    let queued = claimQueueRef.current.get(chapterId);
    if (!queued) {
      queued = new Set();
      claimQueueRef.current.set(chapterId, queued);
    }
    for (const id of pickupIds) queued.add(id);
    if (claimTimersRef.current.has(chapterId)) return;
    const timer = window.setTimeout(() => {
      claimTimersRef.current.delete(chapterId);
      const batch = [...(claimQueueRef.current.get(chapterId) ?? [])];
      claimQueueRef.current.delete(chapterId);
      if (batch.length) void flushPickupClaims(chapterId, batch);
    }, 180);
    claimTimersRef.current.set(chapterId, timer);
  }, [flushPickupClaims]);

  const queueBattleTimer = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      battleTimersRef.current = battleTimersRef.current.filter((entry) => entry !== timer);
      callback();
    }, delay);
    battleTimersRef.current.push(timer);
  };

  const updateBattleSession = (patch: Partial<BattleSession>) => {
    const current = battleSessionRef.current;
    if (!current) return;
    const next = { ...current, ...patch };
    battleSessionRef.current = next;
    setBattleSession(next);
  };

  const resetDuelInput = () => {
    combatInputRef.current = { x: 0, y: 0, buttons: 0, pressed: 0, released: 0 };
  };

  const closeEncounter = useCallback(() => {
    for (const timer of battleTimersRef.current) window.clearTimeout(timer);
    battleTimersRef.current = [];
    battleActiveRef.current = false;
    const frozen = battleFrozenMotionRef.current;
    if (frozen) {
      motionRef.current = { ...frozen, velocityX: 0, velocityY: 0, hasMoved: false, cameraLead: 0 };
    }
    battleFrozenMotionRef.current = null;
    battleSessionRef.current = null;
    activeDuelRef.current = null;
    combatStateRef.current = null;
    setBattleSession(null);
    setCombatRender(null);
    setCombatEvents([]);
    setCombatFlash(null);
    flashSequenceRef.current += 1;
    inputLogRef.current = [];
    lastInputFrameRef.current = null;
    pendingVerdictRef.current = null;
    settlementStartedRef.current = false;
    hitStopUntilRef.current = 0;
    resetDuelInput();
  }, []);

  const settleDuel = useCallback(async (verdict: "victory" | "defeat" | "draw", surrendered = false) => {
    const context = activeDuelRef.current;
    if (!context || settlementStartedRef.current) return;
    settlementStartedRef.current = true;
    pendingSurrenderRef.current = surrendered;
    const localSummary: DuelSummary = {
      verdict,
      opponentId: context.rival.id,
      loot: context.rival.loot,
      maxCombo: combatStateRef.current?.maxCombo ?? 0,
      highestDamage: combatStateRef.current?.highestDamage ?? 0,
    };
    pendingVerdictRef.current = localSummary;
    updateBattleSession({ phase: "settling", summary: localSummary, message: "" });
    const emptyRewards: BattleRewards = { gold: 0, diamonds: 0, xp: 0, item: null, lostStake: 0 };
    playGameSound(verdict === "victory" ? "victory" : "defeat");

    if (context.practice) {
      updateBattleSession({
        phase: "result",
        summary: { ...localSummary, loot: 0 },
        rewards: emptyRewards,
        message: context.rematch
          ? "Yeniden düello · ödül ve profil ilerlemesi verilmez."
          : "Eğitim düellosu · ödül ve profil ilerlemesi verilmez.",
      });
      return;
    }

    if (context.duelId) {
      try {
        const result = await apiRequest<{
          summary?: DuelSummary;
          rewards?: BattleRewards;
          profile?: unknown;
          error?: string;
        }>("/api/duels/complete", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(surrendered
            ? { duelId: context.duelId, surrendered: true }
            : { duelId: context.duelId, inputLog: inputLogRef.current }),
        }, {
          operation: "duel settlement",
          fallbackMessage: "Düello sonucu şu an doğrulanamadı. Ödül kaydedilmedi; tekrar dene.",
          messageForCode: getDuelSettlementErrorMessage,
        });
        if (!result.summary || !result.rewards || !result.profile) {
          throw new Error("Sunucu düello sonucu için eksik yanıt verdi.");
        }
        commitBattleProfile(normalizePlayerProfile(result.profile));
        updateBattleSession({
          phase: "result",
          summary: result.summary,
          rewards: result.rewards,
          message: surrendered ? "Düellodan çekildin; bu maç için ödül verilmedi." : "",
        });
        return;
      } catch (error) {
        settlementStartedRef.current = false;
        updateBattleSession({
          phase: "settlement-error",
          message: error instanceof Error
            ? `${error.message} Ödül profile yazılmadı; tekrar doğrulayabilirsin.`
            : "Ödül sunucuda doğrulanamadı; tekrar deneyebilirsin.",
        });
        return;
      }
    }

    if (surrendered) {
      updateBattleSession({
        phase: "result",
        summary: localSummary,
        rewards: emptyRewards,
        message: "Düellodan çekildin; bu maç için ödül verilmedi.",
      });
      return;
    }

    const finalCombat = combatStateRef.current;
    const profileAfterCombat = finalCombat
      ? normalizePlayerProfile({
          ...profile,
          inventory: {
            ...profile.inventory,
            combatItemCounts: Object.fromEntries(
              Object.keys(profile.inventory.combatItemCounts).map((itemId) => [
                itemId,
                Math.min(
                  profile.inventory.combatItemCounts[itemId as CombatItemId],
                  finalCombat.combatItemCounts[itemId as CombatItemId] ?? profile.inventory.combatItemCounts[itemId as CombatItemId],
                ),
              ]),
            ),
            quickSlots: finalCombat.quickSlotItemIds,
          },
        })
      : profile;
    const droppedItem = verdict === "victory"
      ? rollCombatLoot(
          context.rival.archetype,
          context.rival.level,
          context.seed,
          context.rival.difficulty,
          context.rival.isElite,
        )
      : null;
    const awarded = awardBattle(profileAfterCombat, { ...localSummary, item: droppedItem });
    commitBattleProfile(awarded.profile);
    updateBattleSession({ phase: "result", summary: localSummary, rewards: awarded.rewards, message: "Misafir ilerlemesi bu cihazda tutulur." });
  }, [commitBattleProfile, profile]);

  function openCombatTutorial() {
    const input = combatInputRef.current;
    input.x = 0;
    input.y = 0;
    input.buttons = 0;
    input.pressed = 0;
    input.released = 0;
    combatTutorialOpenRef.current = true;
    setCombatTutorialOpen(true);
  }

  function closeCombatTutorial() {
    combatTutorialOpenRef.current = false;
    combatTutorialSeenRef.current = true;
    setCombatTutorialOpen(false);
    try { window.localStorage.setItem("safak-combat-tutorial-seen-v1", "1"); } catch { /* Tutorial still works when storage is unavailable. */ }
  }

  const beginEncounter = useCallback(async (rival: WorldRival) => {
    if (battleActiveRef.current || storyDialogueRef.current) return;
    const dailyAccess = canStartDailyDuel(profileRef.current);
    if (!dailyAccess.allowed) {
      setDailyAdMessage("Bugünkü üç yenilgi hakkın doldu. Yeni haklar İstanbul saatiyle 00.00’da yenilenir.");
      setDailyClockTick(Date.now());
      return;
    }
    if (!userId && dailyAccess.usesAdDuel) {
      const consumed = consumeDailyAdDuel(profileRef.current);
      if (!consumed) return;
      commitBattleProfile({ ...profileRef.current, ...consumed });
    }
    battleActiveRef.current = true;
    settlementStartedRef.current = false;
    pendingVerdictRef.current = null;
    resetDuelInput();
    combatTutorialOpenRef.current = false;
    setCombatTutorialOpen(false);
    lastBotTelegraphTickRef.current = -1;
    inputLogRef.current = [[0, 0, 0, 0, 0, 0]];
    lastInputFrameRef.current = inputLogRef.current[0];
    battleFrozenMotionRef.current = {
      ...motionRef.current,
      velocityX: 0,
      velocityY: 0,
      hasMoved: false,
      cameraLead: 0,
    };
    motionRef.current = battleFrozenMotionRef.current;
    const rematch = profile.defeatedOpponents.includes(rival.id);
    const practice = debugOneHitEnabled || rematch;
    const initialSession: BattleSession = { rival, phase: "sweep", beat: 0, practice };
    battleSessionRef.current = initialSession;
    setBattleSession(initialSession);
    setCombatEvents([]);
    playWorldCue("battle");

    try {
      let seed: number;
      let difficulty: CombatDifficulty = combatDifficulty;
      let botArchetype: CombatBotArchetype = rival.archetype;
      let opponentTuning: CombatOpponentTuning = createCombatOpponentTuning(
        rival.level,
        rival.progressPercent,
        rival.isElite,
      );
      let duelId: string | null = null;
      let playerStats: PlayerCombatModifiers = playerCombatStats;
      let duelLoadout = combatLoadout;
      if (accountDuelEnabled && !practice) {
        if (!accountProfileReady) throw new Error("Hesap profili sunucuya bağlı değil; düello ödülü güvenle doğrulanamaz.");
        const challenge = await apiRequest<{
          duelId?: unknown;
          seed?: unknown;
          playerStats?: unknown;
          combatLoadout?: unknown;
          opponent?: {
            id?: unknown;
            level?: unknown;
            loot?: unknown;
            difficulty?: unknown;
            archetype?: unknown;
            isBoss?: unknown;
            isElite?: unknown;
            tuning?: unknown;
          };
          error?: string;
        }>("/api/duels/start", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opponentId: rival.id, combatDifficulty }),
        }, {
          operation: "duel start",
          fallbackMessage: "Hesap düellosu şu an başlatılamıyor. Lütfen daha sonra tekrar dene.",
          messageForCode: (code, status) => {
            if (status === 429) return "Çok sık deneme yaptın. Biraz bekleyip tekrar dene.";
            if (code === "duel_already_active") return "Hesabında başka bir düello açık. Önce o karşılaşmayı tamamla.";
            if (code === "opponent_already_defeated") return "Bu rakibi zaten yendin. Haritaya dönüp ilerlemeye devam et.";
            if (code === "unknown_opponent") return "Rakip bilgisi güncel değil. Haritayı yenileyip tekrar dene.";
            if (code === "profile_not_ready") return "Hesap profilin henüz hazır değil. Biraz bekleyip yeniden dene.";
            if (code === "authentication_required") return "Oturum doğrulanamadı. Yeniden giriş yap.";
            return "Hesap düellosu şu an başlatılamıyor. Lütfen daha sonra tekrar dene.";
          },
        });
        if (
          typeof challenge.duelId !== "string" ||
          typeof challenge.seed !== "number" ||
          !Number.isSafeInteger(challenge.seed) ||
          !challenge.playerStats ||
          typeof challenge.playerStats !== "object" ||
          Array.isArray(challenge.playerStats) ||
          !challenge.combatLoadout ||
          typeof challenge.combatLoadout !== "object" ||
          Array.isArray(challenge.combatLoadout) ||
          challenge.opponent?.id !== rival.id ||
          !["easy", "medium", "hard"].includes(String(challenge.opponent.difficulty)) ||
          !isCombatBotArchetype(challenge.opponent.archetype) ||
          challenge.opponent.isBoss !== rival.isBoss ||
          challenge.opponent.isElite !== rival.isElite ||
          !Number.isSafeInteger(challenge.opponent.level) ||
          typeof challenge.opponent.loot !== "number" ||
          !Number.isFinite(challenge.opponent.loot) ||
          !challenge.opponent.tuning ||
          typeof challenge.opponent.tuning !== "object" ||
          Array.isArray(challenge.opponent.tuning)
        ) throw new Error("Sunucudan gelen düello kimliği geçersiz.");
        const serverTuning = challenge.opponent.tuning as Partial<CombatOpponentTuning>;
        if (
          !Number.isSafeInteger(serverTuning.rivalLevel) ||
          !Number.isFinite(serverTuning.progressPercent) ||
          typeof serverTuning.isElite !== "boolean" ||
          !Number.isFinite(serverTuning.statMultiplier) ||
          serverTuning.rivalLevel !== challenge.opponent.level ||
          serverTuning.isElite !== challenge.opponent.isElite
        ) throw new Error("Sunucudan gelen rakip ölçeği geçersiz.");
        opponentTuning = createCombatOpponentTuning(
          serverTuning.rivalLevel!,
          serverTuning.progressPercent!,
          serverTuning.isElite,
        );
        const serverLoadout = challenge.combatLoadout as Partial<CombatLoadout>;
        if (
          !Array.isArray(serverLoadout.quickSlots) ||
          serverLoadout.quickSlots.length !== 4 ||
          !serverLoadout.itemCounts ||
          typeof serverLoadout.itemCounts !== "object" ||
          !Array.isArray(serverLoadout.weaponIds) ||
          serverLoadout.weaponIds.length !== 2 ||
          !Array.isArray(serverLoadout.weaponStats) ||
          serverLoadout.weaponStats.length !== 2
        ) throw new Error("Sunucudan gelen savaş çantası geçersiz.");
        duelLoadout = {
          quickSlots: serverLoadout.quickSlots as CombatLoadout["quickSlots"],
          itemCounts: serverLoadout.itemCounts as CombatLoadout["itemCounts"],
          weaponIds: serverLoadout.weaponIds as CombatLoadout["weaponIds"],
          weaponStats: [
            normalizePlayerCombatModifiers(serverLoadout.weaponStats[0]),
            normalizePlayerCombatModifiers(serverLoadout.weaponStats[1]),
          ],
        };
        const stats = challenge.playerStats as Partial<PlayerCombatModifiers>;
        if (
          !Number.isFinite(stats.maxHealth) ||
          !Number.isFinite(stats.damageMultiplier) ||
          !Number.isFinite(stats.defenseReduction) ||
          !Number.isFinite(stats.criticalChance) ||
          !Number.isFinite(stats.moveSpeedMultiplier) ||
          !Number.isFinite(stats.attackSpeedMultiplier) ||
          !Number.isFinite(stats.attackRangeBonus)
        ) throw new Error("Sunucudan gelen savaş nitelikleri geçersiz.");
        playerStats = normalizePlayerCombatModifiers(stats);
        duelId = challenge.duelId;
        seed = challenge.seed;
        difficulty = challenge.opponent.difficulty as typeof difficulty;
        botArchetype = challenge.opponent.archetype as CombatBotArchetype;
        updateBattleSession({
          rival: {
            ...rival,
            level: challenge.opponent.level as number,
            loot: challenge.opponent.loot as number,
            difficulty,
            isElite: challenge.opponent.isElite as boolean,
          },
        });
      } else {
        const seedBuffer = new Uint32Array(1);
        window.crypto.getRandomValues(seedBuffer);
        seed = seedBuffer[0] || 1;
      }

      const battleRival = battleSessionRef.current?.rival ?? rival;
      activeDuelRef.current = { rival: battleRival, duelId, seed, practice, rematch, oneHit: debugOneHitEnabled };
      const initialCombat = createCombatState(seed, difficulty, playerStats, duelLoadout, botArchetype, opponentTuning);
      combatStateRef.current = initialCombat;
      setCombatRender(initialCombat);

      const sweepDuration = motionReduced ? 100 : 900;
      const versusDuration = motionReduced ? 280 : 1_100;
      queueBattleTimer(() => {
        updateBattleSession({ phase: "vs" });
        queueBattleTimer(() => {
          updateBattleSession({ phase: "countdown", beat: 0 });
          const advance = (beat: number) => {
            if (beat >= 3) {
              updateBattleSession({ phase: "fight", beat: 3 });
              let seen = false;
              try { seen = window.localStorage.getItem("safak-combat-tutorial-seen-v1") === "1"; } catch { /* Keep the session value when storage is unavailable. */ }
              seen = seen || combatTutorialSeenRef.current;
              combatTutorialSeenRef.current = seen;
              if (!seen) openCombatTutorial();
              return;
            }
            queueBattleTimer(() => {
              updateBattleSession({ beat: beat + 1 });
              advance(beat + 1);
            }, motionReduced ? 300 : 760);
          };
          advance(0);
        }, versusDuration);
      }, sweepDuration);
    } catch (error) {
      updateBattleSession({
        phase: "error",
        message: error instanceof Error ? error.message : "Düello başlatılamadı.",
      });
    }
  }, [accountDuelEnabled, accountProfileReady, combatDifficulty, debugOneHitEnabled, motionReduced, playerCombatStats, profile.defeatedOpponents]);

  const pressDuelButton = (button: number) => {
    const input = combatInputRef.current;
    if (input.buttons & button) return;
    input.buttons |= button;
    input.pressed |= button;
    if (vibrationOn && "vibrate" in navigator) {
      try { navigator.vibrate(button === INPUT_BUTTON.attack ? 12 : 8); } catch { /* Haptics are optional. */ }
    }
  };
  const releaseDuelButton = (button: number) => {
    const input = combatInputRef.current;
    if (!(input.buttons & button)) return;
    input.buttons &= ~button;
    input.released |= button;
  };
  const moveDuelPlayer = (x: number, y: number) => {
    combatInputRef.current.x = Math.max(-1, Math.min(1, x)) * 100;
    combatInputRef.current.y = Math.max(-1, Math.min(1, y)) * 100;
  };

  const debugStartBattle = () => {
    const target = rivals[0] ?? allRivals
      .filter((rival) => !profile.defeatedOpponents.includes(rival.id))
      .sort((left, right) => Math.abs(left.distance - travel) - Math.abs(right.distance - travel))[0];
    if (target) void beginEncounter(target);
  };

  const requestObstacleAttack = useCallback(() => {
    if (battleActiveRef.current || storyDialogueRef.current) return;
    attackRequestedRef.current = true;
    if (audioOn) startAudio();
  }, [audioOn, startAudio]);
  const requestTreasureSlam = useCallback(() => {
    if (battleActiveRef.current || storyDialogueRef.current || chestSlamRef.current) return;
    const position = motionRef.current;
    const liveChest = interactableRegistryRef.current?.findNearest(
      "chest",
      position.depth * 5.2,
      position.distance,
    );
    if (!liveChest || brokenRef.current.has(liveChest.id)) return;
    chestSlamRef.current = { obstacleId: liveChest.id, elapsed: 0 };
    setChestSlamActive(true);
    setPickupNotice("Zıpla ve yere sert inerek hazine sandığını kır!");
    if (audioOn) startAudio();
  }, [audioOn, startAudio]);
  const requestWorldInteraction = useCallback(() => {
    const position = motionRef.current;
    if (interactableRegistryRef.current?.findNearest("chest", position.depth * 5.2, position.distance)) {
      requestTreasureSlam();
    }
    else requestObstacleAttack();
  }, [requestObstacleAttack, requestTreasureSlam]);

  useEffect(() => () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(0);
    for (const timer of battleTimersRef.current) window.clearTimeout(timer);
    if (attackAnimationTimerRef.current) window.clearTimeout(attackAnimationTimerRef.current);
    for (const timer of claimTimersRef.current.values()) window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onActionKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "e") return;
      if (event.target instanceof HTMLElement && event.target.closest("button,input,textarea,select")) return;
      event.preventDefault();
      requestWorldInteraction();
    };
    window.addEventListener("keydown", onActionKeyDown);
    return () => window.removeEventListener("keydown", onActionKeyDown);
  }, [requestWorldInteraction]);

  useEffect(() => {
    if (battleSession?.phase !== "fight") return undefined;
    const buttonForKey: Record<string, number> = {
      j: INPUT_BUTTON.attack,
      k: INPUT_BUTTON.block,
      l: INPUT_BUTTON.dodge,
      " ": INPUT_BUTTON.skillOne,
      q: INPUT_BUTTON.skillTwo,
      f: INPUT_BUTTON.aim,
      c: INPUT_BUTTON.crouch,
      x: INPUT_BUTTON.jump,
      "1": INPUT_BUTTON.quickSlotOne,
      "2": INPUT_BUTTON.quickSlotTwo,
      "3": INPUT_BUTTON.quickSlotThree,
      "4": INPUT_BUTTON.quickSlotFour,
      v: INPUT_BUTTON.weaponSwitch,
    };
    const syncKeyboardMovement = () => {
      const keys = duelKeyboardKeysRef.current;
      const x = Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft"));
      const y = Number(keys.has("w") || keys.has("arrowup")) - Number(keys.has("s") || keys.has("arrowdown"));
      moveDuelPlayer(x, y);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("button,input,textarea,select")) return;
      const key = event.key.toLowerCase();
      const normalized = event.code === "Space" ? " " : key;
      if (["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"].includes(normalized)) {
        event.preventDefault();
        duelKeyboardKeysRef.current.add(normalized);
        syncKeyboardMovement();
        return;
      }
      const button = buttonForKey[normalized];
      if (button) {
        event.preventDefault();
        if (!event.repeat) {
          pressDuelButton(button);
          if (["1", "2", "3", "4", "v", "x"].includes(normalized)) releaseDuelButton(button);
        }
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const normalized = event.code === "Space" ? " " : event.key.toLowerCase();
      if (duelKeyboardKeysRef.current.delete(normalized)) {
        syncKeyboardMovement();
        return;
      }
      const button = buttonForKey[normalized];
      if (button) releaseDuelButton(button);
    };
    const onBlur = () => {
      for (const button of [
        INPUT_BUTTON.attack,
        INPUT_BUTTON.block,
        INPUT_BUTTON.dodge,
        INPUT_BUTTON.skillOne,
        INPUT_BUTTON.skillTwo,
        INPUT_BUTTON.aim,
        INPUT_BUTTON.crouch,
        INPUT_BUTTON.jump,
      ]) {
        releaseDuelButton(button);
      }
      duelKeyboardKeysRef.current.clear();
      moveDuelPlayer(0, 0);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      onBlur();
    };
  }, [battleSession?.phase]);

  useEffect(() => {
    const previousMotion = previousMotionRef.current;
    const interpolatedMotion = renderMotionRef.current;
    if (!previousMotion || !interpolatedMotion) return undefined;

    let frame = 0;
    let previous = 0;
    let accumulator = 0;
    let lastReactUpdate = 0;
    let lastVisualUpdate = 0;
    let lastProgressSave = 0;
    const lastFiniteMotion = { ...motionRef.current };
    const fixedStep = 1 / 60;
    const stoppedInput = { x: 0, y: 0, sprint: false, jump: false, crouch: false, analogMagnitude: 0 };
    const frameScratch = stepWorldMotion(
      motionRef.current,
      stoppedInput,
      0,
      playerCombatStats.moveSpeedMultiplier,
    );
    const collisionPosition = { x: 0, distance: 0 };
    const newlyCollected = new Map<number, string[]>();
    const animate = (now: number) => {
      if (document.visibilityState === "hidden") {
        frame = 0;
        previous = 0;
        accumulator = 0;
        return;
      }
      const currentMotion = motionRef.current;
      if (
        !Number.isFinite(currentMotion.velocityX)
        || !Number.isFinite(currentMotion.velocityY)
        || !Number.isFinite(currentMotion.depth)
        || !Number.isFinite(currentMotion.distance)
        || !Number.isFinite(currentMotion.cameraX)
        || !Number.isFinite(currentMotion.stepPhase)
        || !Number.isFinite(currentMotion.zoom)
        || !Number.isFinite(currentMotion.cameraLead)
      ) Object.assign(currentMotion, lastFiniteMotion);
      else Object.assign(lastFiniteMotion, currentMotion);
      const dt = Math.min((now - (previous || now)) / 1000, fixedStep * 6);
      previous = now;
      accumulator = Math.min(accumulator + dt, fixedStep * 6);
      const liveInput = readWorldInput(worldInput.heldKeys.current, worldInput.joystick.current);
      const worldPausedForStory = Boolean(storyDialogueRef.current);
      let frameState: WorldMotionFrame = stepWorldMotion(
        motionRef.current,
        battleActiveRef.current || worldPausedForStory ? stoppedInput : liveInput,
        0,
        playerCombatStats.moveSpeedMultiplier,
        frameScratch,
        getWeatherHandlingMultiplier(weatherModeRef.current),
      );
      let footsteps = 0;
      newlyCollected.clear();
      let hasCollectedThisFrame = false;
      while (accumulator >= fixedStep) {
        if (storyDialogueRef.current && !battleActiveRef.current) {
          const pausedFrame = stepWorldMotion(
            motionRef.current,
            stoppedInput,
            fixedStep,
            playerCombatStats.moveSpeedMultiplier,
            frameScratch,
            getWeatherHandlingMultiplier(weatherModeRef.current),
          );
          frameState = pausedFrame;
          motionRef.current = pausedFrame;
          accumulator -= fixedStep;
          continue;
        }
        if (battleActiveRef.current) {
          const session = battleSessionRef.current;
          const currentCombat = combatStateRef.current;
          if (session?.phase === "fight" && currentCombat && !currentCombat.ended && !combatTutorialOpenRef.current && now >= hitStopUntilRef.current) {
            const buffered = combatInputRef.current;
            const inputFrame: CombatInputFrame = [
              currentCombat.tick + 1,
              buffered.x,
              buffered.y,
              buffered.buttons & MAX_INPUT_BUTTONS,
              buffered.pressed & MAX_INPUT_BUTTONS,
              buffered.released & MAX_INPUT_BUTTONS,
            ];
            const previousFrame = lastInputFrameRef.current;
            if (
              !previousFrame ||
              inputFrame[1] !== previousFrame[1] ||
              inputFrame[2] !== previousFrame[2] ||
              inputFrame[3] !== previousFrame[3] ||
              inputFrame[4] !== 0 ||
              inputFrame[5] !== 0
            ) {
              inputLogRef.current.push(inputFrame);
              lastInputFrameRef.current = inputFrame;
            }
            buffered.pressed = 0;
            buffered.released = 0;
            const input: CombatInput = {
              x: buffered.x,
              y: buffered.y,
              buttons: buffered.buttons & MAX_INPUT_BUTTONS,
              pressed: inputFrame[4],
              released: inputFrame[5],
            };
            let stepped = stepCombat(currentCombat, input);
            if (
              stepped.state.bot.attackType
              && stepped.state.bot.attackStartedTick !== lastBotTelegraphTickRef.current
            ) {
              lastBotTelegraphTickRef.current = stepped.state.bot.attackStartedTick;
              playWorldCue("attack");
            }
            const active = activeDuelRef.current;
            if (
              active?.oneHit &&
              stepped.events.some((event) => event.type === "hit" && event.target === "bot") &&
              !stepped.state.ended
            ) {
              stepped = {
                state: {
                  ...stepped.state,
                  bot: { ...stepped.state.bot, hp: 0, action: "die", actionUntilTick: stepped.state.tick + 999 },
                  ended: true,
                  verdict: "victory",
                  lastImpactStrength: 1,
                },
                events: [...stepped.events, {
                  id: stepped.state.tick * 100 + 99,
                  type: "knockout",
                  target: "bot",
                  damage: 0,
                  critical: false,
                }],
              };
            }
            const botWasWindingUp = combatStateRef.current?.bot.action === "windup";
            combatStateRef.current = stepped.state;
            if (!botWasWindingUp && stepped.state.bot.action === "windup") playWorldCue("telegraph");
            if (stepped.events.length) {
              const impactEvents = stepped.events.filter((event) =>
                event.type === "hit" || event.type === "parry" || event.type === "plungeLand");
              if (visualEffectsEnabled && impactEvents.length) {
                const damage = impactEvents.reduce((sum, event) => sum + (event.type === "hit" ? event.damage ?? 0 : 0), 0);
                hitStopUntilRef.current = window.performance.now() + Math.min(80, Math.max(50, 50 + damage * 0.65));
              } else if (!visualEffectsEnabled) {
                hitStopUntilRef.current = window.performance.now();
              }
              if (visualEffectsEnabled) {
                const visualEvents = stepped.events.map((event) => ({
                  ...event,
                  id: ++nextCombatEffectIdRef.current,
                  expiresAt: window.performance.now() + 900,
                }));
                setCombatEvents((current) => [...current.filter((event) => event.expiresAt > window.performance.now()), ...visualEvents].slice(-MAX_ACTIVE_DUEL_VFX));
                const ids = new Set(visualEvents.map((event) => event.id));
                queueBattleTimer(() => setCombatEvents((current) => current.filter((event) => !ids.has(event.id))), 960);
              } else {
                setCombatEvents([]);
              }
              const hitEvent = stepped.events.find((event) => event.type === "hit" && event.target === "player")
                ?? stepped.events.find((event) => event.type === "hit");
              const skillEvent = stepped.events.find((event) => event.type === "skill");
              const flash: DuelFlash = hitEvent
                ? hitEvent.target === "player" ? "hit" : "strike"
                : skillEvent ? skillEvent.attack === "skillOne" ? "skillOne" : "skillTwo" : null;
              if (visualEffectsEnabled && flash) {
                setCombatFlash(flash);
                const sequence = ++flashSequenceRef.current;
                queueBattleTimer(() => {
                  if (flashSequenceRef.current === sequence) setCombatFlash(null);
                }, 145);
              }
              const hasEvent = (type: CombatEvent["type"]) => stepped.events.some((event) => event.type === type);
              const lightningHit = stepped.events.some((event) => event.type === "skill" && event.attack === "skillTwo");
              const fireHit = stepped.events.some((event) => event.type === "skill" && event.attack === "skillOne");
              if (hasEvent("knockout")) playWorldCue("death");
              else if (hasEvent("parry") || hasEvent("block") || hasEvent("coverBlock")) playWorldCue("block");
              else if (lightningHit) playWorldCue("lightning");
              else if (fireHit || hasEvent("burn")) playWorldCue("fire");
              else if (hasEvent("projectile")) playWorldCue("arrow");
              else if (hasEvent("item")) playWorldCue("potion");
              else if (hasEvent("hit") || hasEvent("plungeLand")) playWorldCue("impact");
              else if (hasEvent("weaponTrail")) playWorldCue("attack");
              if (stepped.events.some((event) => event.type === "hit" || event.type === "parry" || event.type === "block")) {
                if (vibrationOn && "vibrate" in navigator) {
                  try { navigator.vibrate(stepped.events.some((event) => event.critical) ? [24, 25, 28] : 18); } catch { /* Haptics are optional. */ }
                }
              }
            }
            if (stepped.state.tick % 3 === 0 || stepped.events.length || stepped.state.ended) {
              setCombatRender(stepped.state);
            }
            if (stepped.state.ended && stepped.state.verdict) void settleDuel(stepped.state.verdict);
          }
          accumulator -= fixedStep;
          continue;
        }
        simulationTimeRef.current += fixedStep;
        let stepInput = liveInput;
        let trapSlowdownActive = false;
        for (const until of trapCooldownRef.current.values()) {
          if (until >= 0 && until > simulationTimeRef.current) {
            trapSlowdownActive = true;
            break;
          }
        }
        if (trapSlowdownActive) {
          stepInput = {
            ...stepInput,
            x: stepInput.x * 0.38,
            y: stepInput.y * 0.38,
            analogMagnitude: stepInput.analogMagnitude * 0.38,
          };
        }
        const simulationStep = fixedStep;
        if (chestSlamRef.current) {
          stepInput = { x: 0, y: 0, sprint: false, jump: false, crouch: false, analogMagnitude: 0 };
        }
        Object.assign(previousMotion, motionRef.current);
        let nextFrame = stepWorldMotion(
          motionRef.current,
          stepInput,
          simulationStep,
          playerCombatStats.moveSpeedMultiplier,
          frameScratch,
          getWeatherHandlingMultiplier(weatherModeRef.current),
        );
        let chestImpactId: string | null = null;
        const activeSlam = chestSlamRef.current;
        if (activeSlam) {
          activeSlam.elapsed += simulationStep;
          const riseDuration = 0.3;
          const fallDuration = 0.24;
          if (activeSlam.elapsed < riseDuration) {
            nextFrame.jumpHeight = 1.65 * Math.sin((activeSlam.elapsed / riseDuration) * Math.PI / 2);
          } else {
            const fallProgress = Math.min(1, (activeSlam.elapsed - riseDuration) / fallDuration);
            nextFrame.jumpHeight = 1.65 * (1 - fallProgress) ** 2;
          }
          nextFrame.jumpVelocity = (nextFrame.jumpHeight - motionRef.current.jumpHeight) / simulationStep;
          nextFrame.jumpHeld = false;
          nextFrame.crouching = false;
          if (activeSlam.elapsed >= riseDuration + fallDuration) {
            nextFrame.jumpHeight = 0;
            nextFrame.jumpVelocity = 0;
            chestImpactId = activeSlam.obstacleId;
          }
        }
        const worldContent = getCachedWorldContent(
          nextFrame.distance,
          contentCacheRef.current,
          worldProgressRef.current.routeChoice,
          profileRef.current.level,
          combatDifficulty,
        );
        const obstacles = worldContent.obstacles;
        const playerX = nextFrame.depth * 5.2;
        const resolvedPosition = resolveWorldPathCollision(
          motionRef.current.depth * 5.2,
          motionRef.current.distance,
          nextFrame.depth * 5.2,
          nextFrame.distance,
          worldContent.collisionGrid,
          brokenRef.current,
          collisionPosition,
          { crouching: nextFrame.crouching, jumpHeight: nextFrame.jumpHeight },
        );
        if (
          Math.abs(resolvedPosition.distance - nextFrame.distance) > 0.0001
          || Math.abs(resolvedPosition.x - playerX) > 0.0001
        ) {
          nextFrame.depth = resolvedPosition.x / 5.2;
          nextFrame.distance = resolvedPosition.distance;
          nextFrame.cameraX = Math.min(nextFrame.cameraX, resolvedPosition.distance);
          nextFrame.velocityY = 0;
          nextFrame.speed = Math.abs(nextFrame.velocityX);
        }

        const routeChapterId = Math.max(
          0,
          Math.floor(motionRef.current.distance / WORLD_GATE_INTERVAL_METERS),
        );
        const routeGateDistance = nextGateDistance(motionRef.current.distance);
        const routeGateReady = worldProgressRef.current.unlockedThroughChapter <= routeChapterId
          && routeGateDistance - motionRef.current.distance <= WORLD_GATE_INTERACTION_RANGE_METERS
          && isWorldChapterCleared(routeChapterId, profileRef.current.defeatedOpponents);
        if (routeGateReady && Math.abs(nextFrame.depth) >= 0.3) {
          const routeSide = getWorldRouteSideFromInput(
            getWorldRoutePlayerId(progressUserIdRef.current),
            routeChapterId + 1,
            nextFrame.depth,
          );
          const routeChoice = createWorldRouteChoice(
            getWorldRoutePlayerId(progressUserIdRef.current),
            routeChapterId + 1,
            routeSide,
          );
          const unlockedProgress = unlockWorldGate({
            ...worldProgressRef.current,
            distance: motionRef.current.distance,
            depth: motionRef.current.depth,
          }, routeChapterId, true, routeChoice);
          const routeDepth = routeSide === "left" ? -0.42 : 0.42;
          const nextProgress = { ...unlockedProgress, depth: routeDepth };
          worldProgressRef.current = nextProgress;
          nextFrame.depth = routeDepth;
          nextFrame.velocityX = 0;
          motionRef.current.depth = routeDepth;
          setWorldProgress(nextProgress);
          saveWorldProgress(nextProgress, progressUserIdRef.current);
          saveCloudProgress(nextProgress, true);
        }

        const gateLimitedDistance = limitWorldDistanceAtGate(
          motionRef.current.distance,
          nextFrame.distance,
          worldProgressRef.current.unlockedThroughChapter,
        );
        if (gateLimitedDistance < nextFrame.distance) {
          nextFrame.distance = gateLimitedDistance;
          nextFrame.cameraX = Math.min(nextFrame.cameraX, gateLimitedDistance);
          nextFrame.velocityY = 0;
          nextFrame.speed = Math.abs(nextFrame.velocityX);
          nextFrame.hasMoved = nextFrame.speed > 0.12;
          if (!nextFrame.hasMoved) {
            nextFrame.motion = "idle";
            nextFrame.footsteps = 0;
          }
        }

        if (chestImpactId) {
          chestSlamRef.current = null;
          const chest = obstacles.find((obstacle) => obstacle.id === chestImpactId && obstacle.kind === "treasure-chest");
          if (chest && !brokenRef.current.has(chest.id)) {
            brokenRef.current.add(chest.id);
            setBrokenObstacleIds(new Set(brokenRef.current));
            saveBrokenObstacleIds(brokenRef.current, userId);
            const reward = worldContent.pickups.find((pickup) => pickup.id === chest.dropPickupId);
            setPickupNotice(`Sandık kırıldı! ${reward?.amount ?? 75} altın çıktı.`);
            playWorldCue("attack");
            if (vibrationOn && "vibrate" in navigator) {
              try { navigator.vibrate([32, 24, 42]); } catch { /* Haptics are optional. */ }
            }
          }
          setChestSlamActive(false);
        }

        if (attackRequestedRef.current && simulationTimeRef.current >= nextAttackAtRef.current) {
          attackRequestedRef.current = false;
          nextAttackAtRef.current = simulationTimeRef.current + 0.34;
          const target = obstacles
            .filter((obstacle) =>
              (obstacle.kind === "barrel" || obstacle.kind === "vase" || obstacle.kind === "barricade") &&
              !brokenRef.current.has(obstacle.id) &&
              Math.abs(obstacle.distance - nextFrame.distance) <= 4.2 &&
              Math.abs(obstacle.x - playerX) <= obstacle.width / 2 + 1.4,
            )
            .sort((left, right) => Math.abs(left.distance - nextFrame.distance) - Math.abs(right.distance - nextFrame.distance))[0];
          if (target) {
            const remaining = Math.max(0, (obstacleDamageRef.current.get(target.id) ?? target.health) - 1);
            obstacleDamageRef.current.set(target.id, remaining);
            setAttackAnimation(true);
            if (attackAnimationTimerRef.current) window.clearTimeout(attackAnimationTimerRef.current);
            attackAnimationTimerRef.current = window.setTimeout(() => setAttackAnimation(false), 360);
            playWorldCue("attack");
            if (vibrationOn && "vibrate" in navigator) {
              try { navigator.vibrate(22); } catch { /* Haptics are optional. */ }
            }
            if (remaining === 0) {
              brokenRef.current.add(target.id);
              setBrokenObstacleIds(new Set(brokenRef.current));
              saveBrokenObstacleIds(brokenRef.current, userId);
              const drop = target.dropPickupId
                ? worldContent.pickups.find((pickup) => pickup.id === target.dropPickupId)
                : undefined;
              const targetName = target.kind === "barrel" ? "Varil" : target.kind === "vase" ? "Vazo" : "Barikat";
              setPickupNotice(drop?.kind === "gold-small"
                ? `${targetName} kırıldı. ${drop.amount} altın yere düştü.`
                : `${targetName} kırıldı; ganimetini topla.`);
            } else {
              setPickupNotice(`Barikata vurdun · ${remaining} darbe kaldı.`);
            }
          } else {
            setPickupNotice("SALDIR için yakındaki varil, vazo veya barikata yaklaş.");
          }
        }

        for (const obstacle of obstacles) {
          const fallingRock = obstacle.kind === "falling-rock-trap";
          if (!fallingRock && obstacle.kind !== "spike-trap") continue;
          const longitudinal = Math.abs(obstacle.distance - nextFrame.distance);
          const lateral = Math.abs(obstacle.x - playerX);
          if (longitudinal > 5 || lateral > obstacle.width / 2 + 1.8) {
            trapCooldownRef.current.delete(obstacle.id);
            continue;
          }
          const cooldown = trapCooldownRef.current.get(obstacle.id);
          if (
            longitudinal <= (fallingRock ? 1.5 : 1.25) &&
            lateral <= obstacle.width / 2 &&
            cooldown === undefined &&
            nextFrame.jumpHeight < WORLD_JUMP_CLEARANCE_METERS
          ) {
            trapCooldownRef.current.set(obstacle.id, simulationTimeRef.current + (fallingRock ? 1.25 : 1.1));
            setPickupNotice(fallingRock ? "Düşen kaya çarptı! Yere çarpmadan önce zıpla." : "Dikenli tuzak! 1 saniye yavaşladın.");
            if (vibrationOn && "vibrate" in navigator) {
              try { navigator.vibrate([35, 35, 25]); } catch { /* Haptics are optional. */ }
            }
          } else if (cooldown !== undefined && cooldown >= 0 && simulationTimeRef.current >= cooldown) {
            trapCooldownRef.current.set(obstacle.id, -1);
          }
        }

        for (const pickup of worldContent.pickups) {
          if (
            (pickup.sourceObstacleId && !brokenRef.current.has(pickup.sourceObstacleId)) ||
            collectedRef.current.has(pickup.id) ||
            pendingPickupIdsRef.current.has(pickup.id)
          ) continue;
          const distance = Math.hypot(pickup.x - playerX, pickup.distance - nextFrame.distance);
          if (deferredPickupIdsRef.current.has(pickup.id)) {
            if (distance <= PICKUP_RADIUS_METERS + 1) continue;
            deferredPickupIdsRef.current.delete(pickup.id);
          }
          if (distance > PICKUP_RADIUS_METERS) continue;
          const chapterQueue = newlyCollected.get(pickup.chapterId) ?? [];
          chapterQueue.push(pickup.id);
          newlyCollected.set(pickup.chapterId, chapterQueue);
          pendingPickupIdsRef.current.add(pickup.id);
          collectedRef.current.add(pickup.id);
          hasCollectedThisFrame = true;
        }

        frameState = nextFrame;
        motionRef.current = frameState;
        footsteps += frameState.footsteps;
        accumulator -= fixedStep;
      }
      if (battleActiveRef.current) Object.assign(previousMotion, motionRef.current);
      interpolateWorldMotion(
        previousMotion,
        motionRef.current,
        accumulator / fixedStep,
        interpolatedMotion,
      );
      worldProgressRef.current = {
        ...worldProgressRef.current,
        distance: frameState.distance,
        depth: frameState.depth,
      };
      if (now - lastProgressSave >= 1_000) {
        saveWorldProgress(worldProgressRef.current, progressUserIdRef.current);
        lastProgressSave = now;
      }
      if (hasCollectedThisFrame) setCollectedPickupIds(new Set(collectedRef.current));
      for (const [chapterId, ids] of newlyCollected) queuePickupClaims(chapterId, ids);

      const root = sceneRef.current;
      if (root && now - lastVisualUpdate >= 1000 / 20) {
        lastVisualUpdate = now;
        const distance = frameState.distance;
        root.style.setProperty("--ws-travel", `${distance}m`);
        root.style.setProperty("--ws-depth-bottom", `${frameState.depth * 32}px`);
      }
      if (frameState.motion !== lastMotionRef.current) {
        lastMotionRef.current = frameState.motion;
        setMotion(frameState.motion);
      }
      if (footsteps > 0) {
        const count = Math.min(footsteps, 2);
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
        setRivalRefresh((current) => current + 1);
      }
      frame = window.requestAnimationFrame(animate);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        window.cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
        accumulator = 0;
        worldInput.clearActions();
        worldInput.joystick.current = { x: 0, y: 0 };
        combatInputRef.current.x = 0;
        combatInputRef.current.y = 0;
        combatInputRef.current.buttons = 0;
        combatInputRef.current.pressed = 0;
        combatInputRef.current.released = 0;
        return;
      }
      previous = 0;
      accumulator = 0;
      if (!frame) frame = window.requestAnimationFrame(animate);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    frame = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [audioOn, combatDifficulty, motionReduced, playerCombatStats.moveSpeedMultiplier, queuePickupClaims, vibrationOn, visualEffectsEnabled, worldInput.heldKeys, worldInput.joystick]);

  useEffect(() => {
    if (!panel) return undefined;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => sceneRef.current?.querySelector<HTMLElement>(".world-panel__close")?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && panel !== "store") setPanel(null);
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
    if (next === "store") setStoreTrialItemId(null);
    setPanel(next);
  };
  const closeStorePanel = () => {
    setStoreTrialItemId(null);
    setPanel(null);
  };
  const teleportToDistance = (distance: number, x = motionRef.current.depth * 5.2) => {
    const nextDistance = Math.max(0, distance);
    const nextDepth = Math.max(-1, Math.min(1, x / 5.2));
    motionRef.current = {
      ...motionRef.current,
      distance: nextDistance,
      originDistance: Math.floor(nextDistance / WORLD_ORIGIN_REBASE_INTERVAL_METERS) * WORLD_ORIGIN_REBASE_INTERVAL_METERS,
      cameraX: nextDistance,
      depth: nextDepth,
      velocityX: 0,
      velocityY: 0,
      cameraLead: 0,
    };
    if (previousMotionRef.current) Object.assign(previousMotionRef.current, motionRef.current);
    if (renderMotionRef.current) Object.assign(renderMotionRef.current, motionRef.current);
    setTravel(Math.floor(nextDistance));
  };
  const debugNearestRival = () => {
    const target = activeContent.rivals
      .sort((left, right) => Math.abs(left.distance - travel) - Math.abs(right.distance - travel))[0];
    if (target) teleportToDistance(Math.max(0, target.distance - 4));
  };
  const debugNearestPickup = () => {
    const target = allPickups
      .filter((pickup) =>
        !collectedRef.current.has(pickup.id) &&
        (!pickup.sourceObstacleId || brokenRef.current.has(pickup.sourceObstacleId)),
      )
      .sort((left, right) => Math.abs(left.distance - travel) - Math.abs(right.distance - travel))[0];
    if (target) teleportToDistance(target.distance, target.x);
  };
  const debugSkipDistance = () => teleportToDistance(travel + 25);
  const gateDistance = nextGateDistance(travel);
  const activeRoute = worldProgress.routeChoice?.chapterId === currentChapterId
    ? worldProgress.routeChoice.difficulty
    : undefined;
  const chapterRivals = getWorldChapter(currentChapterId, activeRoute, profile.level, combatDifficulty).rivals;
  const defeatedChapterRivals = chapterRivals.filter((rival) =>
    profile.defeatedOpponents.includes(rival.id),
  ).length;
  const roomCleared = isWorldChapterCleared(currentChapterId, profile.defeatedOpponents);
  const gateLocked = worldProgress.unlockedThroughChapter <= currentChapterId;
  const gatePromptVisible = gateLocked
    && gateDistance - travel <= WORLD_GATE_INTERACTION_RANGE_METERS;
  const chapterProgress = Math.max(0, Math.min(100, ((travel % WORLD_GATE_INTERVAL_METERS) / WORLD_GATE_INTERVAL_METERS) * 100));
  const mapRouteSide = worldProgress.routeChoice?.chapterId === currentChapterId
    ? worldProgress.routeChoice.side
    : null;
  const mapProgress = chapterProgress / 100;
  const mapBranchProgress = Math.max(0, Math.min(1, (mapProgress - 0.62) / 0.38));
  const mapPlayer = mapProgress <= 0.62
    ? { x: 24, y: 42 - (mapProgress / 0.62) * 18 }
    : {
        x: 24 + (mapRouteSide === "left" ? -1 : mapRouteSide === "right" ? 1 : 0)
          * mapBranchProgress * 11,
        y: 24 - mapBranchProgress * 14,
      };
  const mapRoutePath = mapRouteSide === "left"
    ? "M24 43V24L13 9"
    : mapRouteSide === "right"
      ? "M24 43V24L35 9"
      : "M24 43V9";
  const sceneBiome = getBiomeForDistance(travel);
  const scenePalette = WORLD_BIOME_PALETTES[sceneBiome];
  const showGatePrompt = gatePromptVisible
    && !storyDialogue
    && !battleSession
    && !encounterVisible
    && !talkingRivalId;
  return (
    <main
      ref={sceneRef}
      className="world-scene"
      data-battle={battleSession?.phase ?? "none"}
      data-story-open={storyDialogue ? "true" : "false"}
      data-npc-dialogue-open={talkingRivalId ? "true" : "false"}
      data-weapon-swap={combatRender && combatRender.weaponSwapCooldownUntilTick > combatRender.tick ? "true" : "false"}
      data-danger={combatRender && combatRender.player.hp / combatRender.player.maxHp <= 0.3 ? "true" : "false"}
      data-quality={quality}
      data-reduced={motionReduced}
      data-air={airEnabled}
      data-weather={weatherMode}
      data-biome={sceneBiome}
      data-postfx={visualEffectsEnabled}
      data-finisher={visualEffectsEnabled && battleSession?.phase === "settling"}
      data-motion={motion}
      style={{
        "--biome-sky": scenePalette.skyTint,
        "--biome-horizon": scenePalette.horizon,
        "--biome-particles": scenePalette.particles,
      } as CSSProperties}
      aria-label={worldText.brand}
    >
      <WorldAtmosphere
        quality={quality}
        motionReduced={motionReduced}
        weather={weatherMode}
        travel={travel}
      />
      <div className="world-stage" onPointerDown={worldInput.onStagePointerDown}>
        <Suspense
          fallback={
            <div className="world-three-layer" aria-hidden="true">
              <div className="world-three-fallback">3D dünya hazırlanıyor…</div>
            </div>
          }
        >
          <World3D
            motionRef={motionRef}
            dialoguePortal={npcDialoguePortalRef}
            unlockedThroughChapter={worldProgress.unlockedThroughChapter}
            collisionGrid={getCachedWorldContent(
              motionRef.current.distance,
              contentCacheRef.current,
              worldProgress.routeChoice,
              profile.level,
              combatDifficulty,
            ).collisionGrid}
            quality={quality}
            visualEffectsEnabled={visualEffectsEnabled}
            motionReduced={motionReduced}
            performanceMonitorEnabled={performanceMonitorEnabled}
            weatherMode={weatherMode}
            level={profile.level}
            relicCount={profile.items.length}
            equipmentVisual={panel === "store" ? worldEquipmentVisual : battleEquipmentVisual}
            lightRadius={equipmentBonuses.lightRadius}
            animationState={chestSlamActive ? "heavyAttack" : attackAnimation ? "attack" : resolveCharacterAnimationState(motion)}
            rivals={battleSession ? [] : nearbyRivals}
            pickups={allPickups}
            obstacles={activeContent.obstacles}
            interactableRegistry={interactableRegistryRef.current!}
            collectedPickupIds={collectedPickupIds}
            brokenObstacleIds={brokenObstacleIds}
            defeatedOpponentIds={profile.defeatedOpponents}
            playerName={profile.name}
            focusedRival={battleSession?.rival ?? null}
            talkingRivalId={talkingRivalId}
            canChallenge={canChallenge}
            dailyAccessAllowed={dailyAccess.allowed}
            challengeLabel={talkingRivalId && profile.defeatedOpponents.includes(talkingRivalId)
              ? "YENİDEN DÜELLO"
              : "SAVAŞ"}
            onChallenge={beginEncounter}
            slowMotion={Boolean(battleSession && ["sweep", "vs", "countdown"].includes(battleSession.phase))}
            combatActive={Boolean(battleSession && battleSession.phase !== "error")}
            combatStateRef={combatStateRef}
            combatRender={combatRender}
            combatVisualEvents={visualEffectsEnabled ? combatEvents : []}
            cinematicIntro={Boolean(visualEffectsEnabled && battleSession && ["sweep", "vs"].includes(battleSession.phase))}
            finisherSlowMotion={Boolean(visualEffectsEnabled && battleSession?.phase === "settling")}
            botTelegraphActive={Boolean(
              combatRender?.bot.attackType
              && combatRender.tick - combatRender.bot.attackStartedTick < getBotAttackWindupTicks(
                combatRender.difficulty,
                combatRender.botArchetype,
                isCombatBotEnraged(combatRender.bot),
              ),
            )}
            opponentName={battleSession?.rival.name ?? ""}
            debugCounters={{
              rivalCount: allRivals.length,
              pickupCount: visiblePickupCount,
              collectedCount: collectedRef.current.size,
            }}
            onDebugNearestRival={debugNearestRival}
            onDebugNearestPickup={debugNearestPickup}
            onDebugSkipDistance={debugSkipDistance}
            onDebugStartBattle={debugStartBattle}
            debugOneHitEnabled={debugOneHitEnabled}
            onToggleDebugOneHit={() => setDebugOneHitEnabled((value) => !value)}
          />
        </Suspense>
        <div className="world-npc-dialogue-layer" ref={npcDialoguePortalRef} />
        <div className="world-step-bursts" aria-hidden="true">
          {stepBursts.map((burst) => {
            const particleCount = burst.running ? 7 : 4;
            return (
              <span
                className={`world-step-burst${burst.running ? " is-running" : ""}`}
                key={burst.id}
                style={{
                  "--burst-x": `${burst.x}px`,
                  "--dust-color": worldEquipmentVisual.dustColor ?? "#d5ad7a",
                } as CSSProperties}
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
        <div className="world-vignette" />
      </div>
      {battleSession?.phase === "fight" && combatRender && (
        <>
          <section
            className="duel-hud"
            aria-label="Düello durumu"
            data-boss={battleSession.rival.isBoss}
            data-elite={battleSession.rival.isElite && !battleSession.rival.isBoss}
          >
            <DuelHealthBar label={profile.name} hp={combatRender.player.hp} maxHp={combatRender.player.maxHp} side="player" visualEffectsEnabled={visualEffectsEnabled} />
            <div className="duel-hud__center">
              <span>VS</span>
              <strong>{battleSession.rival.isBoss ? "BÖLÜM BOSSU" : battleSession.rival.isElite ? "ELİT RAKİP" : combatRender.player.combo > 1 ? `${combatRender.player.combo} VURUŞ` : "DÜELLO"}</strong>
              {isCombatBotEnraged(combatRender.bot) && (
                <small className="duel-rage-label" role="status">
                  {battleSession.rival.isBoss ? "ÖFKE FAZI · FAZ II" : "ÖFKE FAZI"}
                </small>
              )}
              {combatRender.player.comboChainStep > 0 && combatRender.tick <= combatRender.player.comboChainUntilTick && (
                <small className="duel-combo-chain" role="status">
                  KOMBO {combatRender.player.comboChainStep}/3 · SONRA {combatRender.player.comboChainStep === 1 ? "HAFİF" : "AĞIR"}
                </small>
              )}
              {combatRender.player.chargeStartedTick >= 0 && (
                <small className="duel-charge">AĞIR SALDIRI {Math.min(100, Math.round((combatRender.tick - combatRender.player.chargeStartedTick) / 30 * 100))}%</small>
              )}
            </div>
            <DuelHealthBar label={battleSession.rival.name} hp={combatRender.bot.hp} maxHp={combatRender.bot.maxHp} side="bot" visualEffectsEnabled={visualEffectsEnabled} />
          </section>
          {combatRender.bot.attackType
            && combatRender.tick - combatRender.bot.attackStartedTick < getBotAttackWindupTicks(
              combatRender.difficulty,
              combatRender.botArchetype,
              isCombatBotEnraged(combatRender.bot),
            )
            && (
              <>
                <div className="duel-attack-warning" role="status" aria-live="assertive">RAKİP SALDIRIYOR · BLOKLA YA DA KAÇ</div>
              </>
            )}
          <DuelStaminaBar stamina={combatRender.player.stamina} maxStamina={combatRender.player.maxStamina} visualEffectsEnabled={visualEffectsEnabled} />
          {visualEffectsEnabled && <div className="duel-combat-effects" aria-hidden="true">
            {combatEvents.map((event) => (
              <div
                key={event.id}
                className={`duel-combat-fx is-${event.type === "skill" ? event.attack : event.type}${event.target === "player" ? " targets-player" : " targets-bot"}${event.critical ? " is-critical" : ""}`}
                style={{
                  "--fx-side": event.target === "player" ? "64%" : "36%",
                  "--fx-color": event.target === "bot" ? equipmentVisual.trailColor ?? "#ffca88" : "#ff7158",
                  "--fx-glow": event.target === "bot" ? equipmentVisual.trailColor ?? "#ff7847" : "#ff553e",
                } as CSSProperties}
              >
                <i />
                <span className="duel-fx-particles" />
                {event.type === "hit" && (
                  <small>{event.target === "player"
                    ? `${battleSession.rival.name} → ${profile.name}`
                    : `${profile.name} → ${battleSession.rival.name}`}</small>
                )}
                {(event.type === "block" || event.type === "parry" || (event.type === "dodge" && event.attack)) && (
                  <small>{event.target === "player"
                    ? `${battleSession.rival.name} → ${profile.name}`
                    : `${profile.name} → ${battleSession.rival.name}`}</small>
                )}
                {event.type === "block" && <strong>0 HASAR · BLOK</strong>}
                {event.type === "parry" && <strong>SAVUŞTURMA · 0</strong>}
                {event.type === "coverBlock" && <strong>SİPER OKU DURDURDU</strong>}
                {event.type === "dodge" && <strong>KAÇIŞ · 0 HASAR</strong>}
                {event.type === "backflip" && <strong>{event.edgeRebound ? "KENARDAN SEKME · GERİ TAKLA" : "GERİ TAKLA · KAÇIŞ"}</strong>}
                {event.type === "plungeLand" && <strong>YERE VURUŞ · ŞOK DALGASI</strong>}
                {event.type === "burn" && <strong>KOR · −{event.damage ?? 0}</strong>}
                {event.type === "skill" && <strong>{event.attack === "skillOne" ? "KOR" : "YILDIRIM"}</strong>}
                {event.type === "item" && <strong>{getCombatItem(event.itemId)?.name ?? "SAVAŞ EŞYASI"}</strong>}
                {event.type === "poison" && <strong>ZEHİR · −{event.damage ?? 0}</strong>}
                {event.type === "weaponSwitch" && <strong>{STORE_CATALOG.find((item) => item.id === event.weaponId)?.name ?? "SİLAH DEĞİŞTİ"}</strong>}
              </div>
            ))}
          </div>}
          {visualEffectsEnabled && combatFlash && <div className={`duel-hit-flash is-${combatFlash}`} aria-hidden="true" />}
          {visualEffectsEnabled && <div className="duel-low-health-vignette" aria-hidden="true" />}
          {combatRender.weaponIds[combatRender.activeWeaponSlot] === "weapon_short_bow" && (
            <div className="duel-aim-status" role="status" aria-live="polite">
              {bowCloseRange
                ? "YAKIN DÖVÜŞ · AV BIÇAĞI"
                : combatRender.player.isAiming
                  ? "HEDEF OKU HAZIR · ATEŞ ET"
                  : "NİŞAN AL · EĞİLEREK SİPER KULLAN"}
            </div>
          )}
          <DuelControls
            stamina={combatRender.player.stamina}
            attackCooldownSeconds={Math.max(0, combatRender.player.attackCooldownUntilTick - combatRender.tick) / COMBAT_HZ}
            skillOneSeconds={Math.max(0, combatRender.player.skillOneCooldownUntilTick - combatRender.tick) / COMBAT_HZ}
            skillTwoSeconds={Math.max(0, combatRender.player.skillTwoCooldownUntilTick - combatRender.tick) / COMBAT_HZ}
            quickItems={combatRender.quickSlotItemIds.map((itemId, index) => {
              const item = getCombatItem(itemId);
              const duelDistance = Math.hypot(
                combatRender.player.x - combatRender.bot.x,
                combatRender.player.z - combatRender.bot.z,
              );
              const itemOutOfRange = item
                && (item.effect === "damage" || item.effect === "poison")
                && duelDistance > (item.id === "throwing_knife" ? 6.8 : 5.6);
              return {
                id: itemId,
                name: item?.name ?? "Boş",
                shortName: item?.shortName ?? "BOŞ",
                icon: item?.icon ?? "＋",
                count: itemId ? combatRender.combatItemCounts[itemId] : 0,
                cooldownSeconds: Math.max(0, combatRender.player.quickSlotCooldownUntilTick[index] - combatRender.tick) / COMBAT_HZ,
                disabledReason: item?.effect === "health" && combatRender.player.hp >= combatRender.player.maxHp
                  ? "Canın dolu."
                  : item?.effect === "stamina" && combatRender.player.stamina >= combatRender.player.maxStamina
                    ? "Dayanıklılığın dolu."
                    : itemOutOfRange ? "Rakip bu eşyanın menzilinde değil." : "",
              };
            })}
            weaponSwapCooldownSeconds={Math.max(0, combatRender.weaponSwapCooldownUntilTick - combatRender.tick) / COMBAT_HZ}
            canSwitchWeapon={Boolean(combatRender.weaponIds[1])}
            activeWeaponName={STORE_CATALOG.find((item) => item.id === combatRender.weaponIds[combatRender.activeWeaponSlot])?.name ?? "Silah"}
            aiming={combatRender.player.isAiming}
            crouching={combatRender.player.isCrouching}
            bowCloseRange={bowCloseRange}
            onPress={pressDuelButton}
            onRelease={releaseDuelButton}
            onMove={moveDuelPlayer}
            onSurrender={() => {
              if (window.confirm("Bu düellodan çekilmek istiyor musun?")) void settleDuel("defeat", true);
            }}
            onOpenHelp={openCombatTutorial}
          />
          {combatTutorialOpen && (
            <div className="duel-tutorial-backdrop">
              <section className="duel-tutorial" role="dialog" aria-modal="true" aria-labelledby="duel-tutorial-title">
                <span className="game-eyebrow">İLK DÜELLO REHBERİ</span>
                <h2 id="duel-tutorial-title">Kontroller</h2>
                <p>Oyun bu kısa rehber boyunca duraklar.</p>
                <div className="duel-tutorial__rows">
                  <div><span aria-hidden="true">⚔</span><b>SALDIRI</b><i>3 vuruş: hafif-hafif-ağır kombo · basılı tut: ağır</i><strong>↘</strong></div>
                  <div><span aria-hidden="true">⬟</span><b>KALKAN</b><i>Saldırıyı durdurur; zamanında basmak savuşturur</i><strong>↙</strong></div>
                  <div><span aria-hidden="true">↝</span><b>ATILMA</b><i>Kısa süre hasar almazsın · geri çift basış takla, kenarda sekme</i><strong>↙</strong></div>
                  <div><span aria-hidden="true">↑</span><b>ZIPLA</b><i>Zıpla, havada saldır: yere vuruş ve şok dalgası</i><strong>↑</strong></div>
                  <div><span aria-hidden="true">♨</span><b>KOR</b><i>İlk yetenek · bekleme süresi ve dayanıklılık</i><strong>↗</strong></div>
                  <div><span aria-hidden="true">ϟ</span><b>YILDIRIM</b><i>Uzak hedefe vurur · bekleme süresi ve dayanıklılık</i><strong>↗</strong></div>
                </div>
                <button type="button" className="game-gold-button" onClick={closeCombatTutorial}>ANLADIM</button>
              </section>
            </div>
          )}
        </>
      )}
      <header className="world-topbar">
        <button className="world-profile" type="button" onClick={onOpenProfile} aria-label={`${profile.name}, seviye ${profile.level}, profili aç`}>
          <span className="world-profile__crest" aria-hidden="true">Ş</span>
          <span className="world-profile__identity">
            <strong className="world-profile__name">{profile.name}</strong>
            <span className="world-profile__demo">YOLCU PROFİLİ</span>
          </span>
          <span className="world-profile__level"><span>{worldText.level}</span><b>{String(profile.level).padStart(2, "0")}</b></span>
        </button>
        <div className="world-resource-hud">
          <div
            className={`world-currency${pickupFlights.length ? " is-collecting" : ""}`}
            aria-label={`${worldText.gold}: ${displayedGold}`}
            title={sessionRewards.gold ? "Bu altınlar yalnızca bu oturumda geçerli." : worldText.gold}
          >
            <span className="world-currency__coin" aria-hidden="true" />
            <span>{displayedGold.toLocaleString("tr-TR")}</span>
          </div>
          <div
            className={`world-currency world-currency--diamond${pickupFlights.some((effect) => effect.kind === "diamond-small") ? " is-collecting" : ""}`}
            aria-label={`Elmas ${displayedDiamonds}`}
            title="Elmas · mağaza alışverişi"
          >
            <span className="world-currency__diamond" aria-hidden="true" />{displayedDiamonds}
          </div>
          <div className="world-material-hud" aria-label={`Kor Kristali ${displayedCrystals}, Demir Kırığı ${displayedIronShards}, Mühür Parçası ${displayedSeals}`}>
            <span><i className="world-material-hud__crystal" />{displayedCrystals}</span>
            <span><i className="world-material-hud__iron" />{displayedIronShards}</span>
            <span><i className="world-material-hud__seal">✦</i>{displayedSeals}</span>
            {(sessionRewards.gold > 0 || sessionRewards.diamonds > 0 || sessionRewards.materials.emberCrystals > 0 || sessionRewards.materials.ironShards > 0 || sessionRewards.materials.sealFragments > 0) && (
              <small>OTURUM</small>
            )}
          </div>
          <div className="world-weather">
            <span>{worldText.weather}: {WEATHER_LABELS[weatherMode]}</span>
            <button
              className={`world-weather__switch is-${weatherMode}`}
              type="button"
              aria-label={`Hava: ${WEATHER_LABELS[weatherMode]}. Sonraki hava durumuna geç`}
              onClick={() => { wake(); setWeatherMode(nextWeatherMode); }}
            ><span /></button>
          </div>
        </div>
      </header>
      {pickupFlights.length > 0 && (
        <div className="world-pickup-flights" aria-hidden="true">
          {pickupFlights.map((effect) => (
            <span className={`world-pickup-flight is-${effect.kind}`} key={effect.id}>
              <i>{effect.kind === "gold-small" || effect.kind === "gold-large" ? "◈" : effect.kind === "seal-fragment" ? "✦" : effect.kind === "iron-shard" ? "⬟" : "◆"}</i>
              <b>+{effect.amount}</b>
            </span>
          ))}
        </div>
      )}
      {pickupNotice && <div className="world-pickup-notice" role="status" aria-live="polite">{pickupNotice}</div>}
      <div
        className="world-progress"
        role="group"
        aria-label="Kül Yolu ilerleme haritası"
      >
        <div className="world-progress__body">
          <div
            className="world-progress__map"
            role="progressbar"
            aria-label={`Kül Yolu, kapıya yüzde ${Math.round(chapterProgress)} ilerleme`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(chapterProgress)}
          >
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <circle className="world-progress__map-track" cx="24" cy="24" r="19" />
              <circle
                className="world-progress__map-fill"
                cx="24"
                cy="24"
                r="19"
                style={{
                  strokeDasharray: "119.38",
                  strokeDashoffset: `${119.38 * (1 - chapterProgress / 100)}`,
                }}
              />
              <path className="world-progress__map-route" d="M24 43V24L13 9M24 24L35 9" />
              <path className="world-progress__map-active" d={mapRoutePath} />
              <circle className="world-progress__map-node" cx="13" cy="9" r="1.7" />
              <circle className="world-progress__map-node" cx="35" cy="9" r="1.7" />
              <circle
                className="world-progress__map-player"
                cx={mapPlayer.x}
                cy={mapPlayer.y}
                r="2.4"
              />
            </svg>
            <b>{Math.round(chapterProgress)}%</b>
          </div>
          <div className="world-progress__details">
            <div className="world-progress__heading">
              <span>KÜL YOLU · BÖLÜM {currentChapterId + 1}</span>
            </div>
            <div className="world-progress__track"><i style={{ width: `${chapterProgress}%` }} /></div>
            <span className="world-progress__distance">KAPI · {Math.max(0, gateDistance - travel)} m</span>
          </div>
        </div>
        <div className="world-daily-lives" id="world-daily-status">
          <span className="world-daily-lives__label">GÜNLÜK DÜELLO HAKKI</span>
          <span className="world-daily-lives__hearts" aria-label={`${Math.max(0, DAILY_DEFEAT_LIMIT - dailyLives.dailyLosses)} / ${DAILY_DEFEAT_LIMIT} hak kaldı`}>
            {Array.from({ length: DAILY_DEFEAT_LIMIT }, (_, index) => (
              <i className={index < dailyLives.dailyLosses ? "is-lost" : ""} key={index} aria-hidden="true">♥</i>
            ))}
          </span>
          <span className="world-daily-lives__count">{Math.max(0, DAILY_DEFEAT_LIMIT - dailyLives.dailyLosses)} / {DAILY_DEFEAT_LIMIT} hak</span>
          {dailyLives.dailyLosses >= DAILY_DEFEAT_LIMIT && dailyLives.dailyAdDuelsRemaining > 0 && (
            <span className="world-daily-lives__message">Ödüllü reklamdan ek düello hakkın hazır.</span>
          )}
          {dailyLives.dailyLosses >= DAILY_DEFEAT_LIMIT && dailyLives.dailyAdDuelsRemaining === 0 && !dailyLives.dailyAdRewardUsed && (
            <>
              {dailyAdUnit ? (
                <button
                  className="world-daily-ad"
                  type="button"
                  onClick={() => void claimDailyExtraDuel()}
                  disabled={dailyAdBusy}
                >
                  {dailyAdBusy ? "REKLAM HAZIRLANIYOR…" : "ÖDÜLLÜ REKLAM · +1 DÜELLO"}
                </button>
              ) : (
                <span className="world-daily-lives__message">Ek düello hakkı şu an kullanılamıyor.</span>
              )}
            </>
          )}
          {dailyLives.dailyLosses >= DAILY_DEFEAT_LIMIT && dailyLives.dailyAdRewardUsed && dailyLives.dailyAdDuelsRemaining === 0 && (
            <span className="world-daily-lives__message">Bugünkü ek hak kullanıldı. Yenileme: İstanbul saatiyle 00.00.</span>
          )}
          {dailyAdMessage && <span className="world-daily-lives__message" role="status" aria-live="polite">{dailyAdMessage}</span>}
        </div>
      </div>
      {showGatePrompt && (
        <section className="world-gate-prompt" aria-label="Bölüm geçidi">
          <span className="world-gate-prompt__eyebrow">BÖLÜM {currentChapterId + 1} · GEÇİT</span>
          <strong>{roomCleared ? "Yol temizlendi" : "Kapı kilitli"}</strong>
          <span className="world-gate-prompt__progress">
            {roomCleared
              ? "İki geçitten birini seç. Seçimin bir sonraki sınavın zorluğunu belirler."
              : `Rakipleri yen: ${defeatedChapterRivals}/${chapterRivals.length}`}
          </span>
          {roomCleared && (
            <div className="world-gate-prompt__routes" role="group" aria-label="Bir sonraki yol">
              <button type="button" onClick={() => chooseGateRoute("left")} aria-label="Sol geçidi seç">
                SOL GEÇİT <span>←</span>
              </button>
              <button type="button" onClick={() => chooseGateRoute("right")} aria-label="Sağ geçidi seç">
                SAĞ GEÇİT <span>→</span>
              </button>
            </div>
          )}
        </section>
      )}
      <div
        className="world-joystick"
        role="application"
        aria-label={worldText.controls}
        onPointerDown={worldInput.onJoystickPointerDown}
        onPointerMove={worldInput.onJoystickPointerMove}
        onPointerUp={worldInput.onJoystickPointerUp}
        onPointerCancel={worldInput.onJoystickPointerCancel}
      ><span className="world-joystick__nub" /></div>
      {!battleSession && (
        <div className="world-movement-actions" role="group" aria-label="Yol hareket tuşları">
          <button
            type="button"
            className={`world-movement-action${worldInput.isActionToggled("c") ? " is-toggled" : ""}`}
            aria-label={worldInput.isActionToggled("c") ? "Eğilmeyi kapat" : "Eğil"}
            aria-pressed={worldInput.isActionToggled("c")}
            title="Eğil"
            onClick={() => worldInput.toggleAction("c")}
          ><span aria-hidden="true">↓</span><small>EĞİL</small></button>
          <button
            type="button"
            className="world-movement-action"
            aria-label="Zıpla"
            title="Zıpla"
            onPointerDown={(event) => worldInput.onActionPointerDown(event, "space")}
            onPointerUp={(event) => worldInput.onActionPointerUp(event, "space")}
            onPointerCancel={(event) => worldInput.onActionPointerUp(event, "space")}
            onLostPointerCapture={(event) => worldInput.onActionPointerUp(event, "space")}
          ><span aria-hidden="true">↑</span><small>ZIPLA</small></button>
          <button
            type="button"
            className={`world-movement-action${worldInput.isActionToggled("shift") ? " is-toggled" : ""}`}
            aria-label={worldInput.isActionToggled("shift") ? "Koşmayı kapat" : "Koş"}
            aria-pressed={worldInput.isActionToggled("shift")}
            title="Koş"
            onClick={() => worldInput.toggleAction("shift")}
          ><span aria-hidden="true">»</span><small>KOŞ</small></button>
        </div>
      )}
      <span className="world-mobile-hint" aria-hidden="true">{worldText.controls}</span>
      {encounterVisible && nextOpponent && !storyDialogue && !talkingRivalId && (
        <div className={`world-encounter${canChallenge ? " is-near" : ""}`} data-bot-tick={rivalRefresh} aria-live="polite">
          <div className="world-encounter__rival" aria-hidden="true"><img src="/shafak-warrior.png" alt="" /></div>
          <div className="world-encounter__card">
            <span className="world-encounter__eyebrow"><b>{nextOpponent.title}</b> · {nextOpponentDefeated ? "YENİDEN DÜELLOYA HAZIR" : canChallenge ? "YOLUNU KESİYOR" : `${Math.ceil(encounterDistance)} M`}</span>
            <strong>{nextOpponent.name}</strong>
            <span>Seviye {nextOpponent.level} <i>·</i> Tahmini ganimet {nextOpponent.loot} altın</span>
            {canChallenge && talkingRivalId !== nextOpponent.id && (
              <button
                type="button"
                className="world-encounter__fight"
                onClick={() => beginEncounter(nextOpponent)}
                disabled={!dailyAccess.allowed}
                aria-describedby={!dailyAccess.allowed ? "world-daily-status" : undefined}
              >
                <span aria-hidden="true">⚔</span> {dailyAccess.allowed ? nextOpponentDefeated ? "YENİDEN DÜELLO" : "SAVAŞ" : "GÜNLÜK HAK DOLDU"}
              </button>
            )}
          </div>
        </div>
      )}
      {nearestBreakable && !battleSession && (
        <div className="world-breakable-action">
          <span>
            {nearestBreakable.kind === "barrel" ? "VARİL" : nearestBreakable.kind === "vase" ? "VAZO" : "BARİKAT"}
            {" · "}{remainingBreakableHits} DARBE
          </span>
          <button
            type="button"
            onClick={requestObstacleAttack}
            aria-label={`${nearestBreakable.kind === "barrel" ? "Varile" : nearestBreakable.kind === "vase" ? "Vazoya" : "Barikata"} saldır, ${remainingBreakableHits} darbe kaldı`}
          >
            <span aria-hidden="true">⚔</span> SALDIR
          </button>
        </div>
      )}
      {nearestTreasureChest && !battleSession && (
        <div className="world-breakable-action is-chest">
          <span>HAZİNE SANDIĞI</span>
          <button type="button" onClick={requestTreasureSlam} aria-label="Zıplayıp yere sert inerek hazine sandığını kır">
            <span aria-hidden="true">↓</span> SANDIĞI KIR
          </button>
        </div>
      )}
      {battleSession && ["sweep", "vs", "countdown"].includes(battleSession.phase) && (
        <div className={`world-battle-entry${battleSession.phase !== "sweep" ? " is-vs" : ""}`} role="dialog" aria-modal="true" aria-label="Savaşçı karşılaşması">
          <div className="world-battle-entry__vignette" />
          <span className="world-battle-entry__eyebrow">GERÇEK ZAMANLI SAVAŞ · AYNI 3D DÜNYA</span>
          <div className="world-battle-entry__versus">
              <div className="world-battle-entry__side world-battle-entry__side--player">
                <small>YOLCU · SEV. {profile.level}</small>
                <strong>{profile.name}</strong>
              </div>
            <b>VS</b>
              <div className="world-battle-entry__side world-battle-entry__side--rival">
                <div className="world-battle-entry__portrait" aria-hidden="true">
                  <img src="/images/gece-nobetcisi.png" alt="" />
                </div>
                <div className="world-battle-entry__rival-copy">
                  <small><i>{battleSession.rival.title}</i> · SEV. {battleSession.rival.level}</small>
                  <strong>{battleSession.rival.name}</strong>
                </div>
              </div>
          </div>
          <p className={battleSession.phase === "countdown" ? "world-battle-entry__countdown" : undefined}>
            {battleSession.phase === "sweep" ? "KAMERA İKİ SAVAŞÇIYA ODAKLANIYOR" :
              battleSession.phase === "vs" ? "KARŞILAŞMA BAŞLIYOR" :
                battleSession.beat < 3 ? String(3 - battleSession.beat) : "SAVAŞ!"}
          </p>
        </div>
      )}
      {battleSession?.phase === "error" && (
        <div className="duel-error-layer" role="alertdialog" aria-modal="true" aria-labelledby="duel-error-title">
          <section className="duel-error-card">
            <span className="game-eyebrow">DÜELLO BAŞLATILAMADI</span>
            <h2 id="duel-error-title">Bağlantı doğrulanamadı</h2>
            <p>{battleSession.message}</p>
            <button type="button" className="game-gold-button" onClick={() => {
              const rival = battleSession.rival;
              closeEncounter();
              window.setTimeout(() => void beginEncounter(rival), 0);
            }}>TEKRAR DENE</button>
            <button type="button" className="game-quiet-button" onClick={closeEncounter}>KEŞFE DÖN</button>
          </section>
        </div>
      )}
      {battleSession?.phase === "settling" && (
        <div className="duel-settling" role="status" aria-live="polite">
          <span className="game-eyebrow">SUNUCUDA DOĞRULANIYOR</span>
          <strong>DÜELLO SONUCU KAYDEDİLİYOR</strong>
        </div>
      )}
      {battleSession?.phase === "settlement-error" && (
        <div className="duel-error-layer" role="alertdialog" aria-modal="true" aria-labelledby="duel-settlement-title">
          <section className="duel-error-card">
            <span className="game-eyebrow">ÖDÜL HENÜZ KAYDEDİLMEDİ</span>
            <h2 id="duel-settlement-title">Doğrulama bekliyor</h2>
            <p>{battleSession.message}</p>
            <button type="button" className="game-gold-button" onClick={() => {
              const verdict = pendingVerdictRef.current?.verdict ?? "defeat";
              void settleDuel(verdict, pendingSurrenderRef.current);
            }}>TEKRAR DOĞRULA</button>
            <button type="button" className="game-quiet-button" onClick={closeEncounter}>DÜNYAYA DÖN</button>
          </section>
        </div>
      )}
      {battleSession?.phase === "result" && battleSession.summary && battleSession.rewards && (
        <div className="duel-result-layer">
          <DuelResults
            summary={battleSession.summary}
            rewards={battleSession.rewards}
            opponentName={battleSession.rival.name}
            playerName={profile.name}
            practice={battleSession.practice}
            note={battleSession.message}
            visualEffectsEnabled={visualEffectsEnabled}
            canReplay={battleSession.practice || !profile.defeatedOpponents.includes(battleSession.rival.id)}
            onContinue={closeEncounter}
            onReplay={() => {
              const rival = battleSession.rival;
              closeEncounter();
              window.setTimeout(() => void beginEncounter(rival), 0);
            }}
          />
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
          <button type="button" className="world-action" aria-label={worldText.inventory} onClick={() => openPanel("store")}>
            <Icon name="bag" /><span>{worldText.inventory}</span>
          </button>
          <button type="button" className="world-action" aria-label={worldText.settingsOpen} onClick={() => openPanel("settings")}>
            <Icon name="settings" /><span>{worldText.settings}</span>
          </button>
        </div>
      </footer>
      {panel === "store" && (
        <StorePanel
          profile={profile}
          items={storeItems}
          isGuest={!accountDuelEnabled}
          accountReady={accountProfileReady}
          loading={storeCatalogLoading}
          busyItemId={storeBusyItemId}
          message={storeMessage}
          error={storeError}
          trialItemId={storeTrialItemId}
          celebrationSignal={storeCelebrationSignal}
          onClose={closeStorePanel}
          onTry={setStoreTrialItemId}
          onPurchase={(itemId) => void runStoreMutation("purchase", itemId)}
          onEquip={(itemId, equipmentKey) => void runStoreMutation("equip", itemId, equipmentKey)}
          onUpgrade={(itemId) => void runStoreMutation("upgrade", itemId)}
          onSell={(itemId) => void runStoreMutation("sell", itemId)}
          onSalvage={(itemId) => void runStoreMutation("salvage", itemId)}
          onAssignQuickSlot={assignCombatQuickSlot}
          onSetSecondaryWeapon={setSecondaryWeapon}
          loadoutBusy={combatLoadoutBusy}
          onRetry={storeRetryAction ? () => void runStoreMutation(storeRetryAction.operation, storeRetryAction.itemId, storeRetryAction.equipmentKey) : undefined}
          renderPreview={(item) => {
            if (item.kind !== "equipment" || !item.slot) return <span>{item.icon ?? "◇"}</span>;
            const key = slotEquipmentKey(item.slot);
            const previewProfile = {
              ...profile,
              equipment: { ...profile.equipment, [key]: item.id },
            };
            const previewAppearance: EquipmentVisual = getEquipmentVisual(previewProfile, storeItems);
            return <EquipmentPreview3D appearance={previewAppearance} />;
          }}
        />
      )}
      {panel === "settings" && (
        <div className="world-panel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPanel(null); }}>
          <section className="world-panel" role="dialog" aria-modal="true" aria-labelledby="world-panel-title">
            <div className="world-panel__heading">
              <div>
                <span className="world-panel__eyebrow">{worldText.brand}</span>
                <h2 id="world-panel-title">{worldText.settingsTitle}</h2>
              </div>
              <button className="world-panel__close" type="button" aria-label={worldText.close} onClick={() => setPanel(null)}>×</button>
            </div>
            <div className="world-setting">
              <span><strong>{worldText.sound}</strong><small>{worldText.soundDescription}</small></span>
              <button type="button" role="switch" aria-checked={audioOn} aria-label={audioOn ? worldText.soundOn : worldText.soundOff} onClick={() => {
                const next = !audioOn;
                setAudioOn(next);
                if (next) startAudio(true);
                onSoundEnabledChange(next);
              }}>{audioOn ? worldText.soundOn : worldText.soundOff}</button>
            </div>
            <WorldVolumeSlider
              id="world-sound-volume"
              label="Ses efektleri"
              description="Adımlar, darbeler ve arayüz"
              value={soundVolume}
              onChange={onSoundVolumeChange}
              onUserGesture={() => { if (audioOn) startAudio(true); }}
            />
            <WorldVolumeSlider
              id="world-music-volume"
              label="Bölüm müziği"
              description="Her biyoma özel, döngülü müzik"
              value={musicVolume}
              onChange={onMusicVolumeChange}
              onUserGesture={() => { if (audioOn) startAudio(true); }}
            />
            <div className="world-setting">
              <span><strong>{worldText.vibration}</strong><small>{worldText.vibrationDescription}</small></span>
              <button type="button" role="switch" aria-checked={vibrationOn} aria-label={vibrationOn ? worldText.vibrationOn : worldText.vibrationOff} onClick={() => setVibrationOn((current) => !current)}>{vibrationOn ? worldText.vibrationOn : worldText.vibrationOff}</button>
            </div>
            <p className="world-inventory__note">{worldText.settingsNote}</p>
          </section>
        </div>
      )}
      {storyDialogue && (
        <StoryDialogueOverlay
          key={storyDialogue.id}
          dialogue={storyDialogue}
          motionReduced={motionReduced}
          onClose={closeStoryDialogue}
        />
      )}
    </main>
  );
}
