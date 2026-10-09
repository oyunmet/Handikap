import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { playFootstep, playGameSound, playWorldCue } from "../audio/howler";
import { ApiResponseError, requestJson } from "../api-json";
import DuelControls from "../game/DuelControls";
import DuelResults from "../game/DuelResults";
import { awardBattle, normalizePlayerProfile, type PlayerProfile } from "../game/profile";
import StorePanel from "../game/store-ui/StorePanel";
import { STORE_CATALOG } from "../game/store-catalog";
import {
  getUpgradeCost,
  MAX_UPGRADE_LEVEL,
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
  getBotAttackWindupTicks,
  normalizePlayerCombatModifiers,
  stepCombat,
  type CombatEvent,
  type CombatInput,
  type CombatInputFrame,
  type CombatState,
} from "../game/combat-engine";
import type { PlayerCombatModifiers } from "../game/store-types";
import { resolveCharacterAnimationState } from "./character-animation";
import {
  createWorldMotion,
  readWorldInput,
  stepWorldMotion,
  WORLD_GATE_INTERVAL_METERS,
  type WorldMotionFrame,
  type WorldMotion,
} from "./movement";
import { nextGateDistance } from "./world-generation";
import {
  getWorldChapter,
  PICKUP_RADIUS_METERS,
  pickupRewardTotals,
  resolveWorldObstacleCollision,
  type WorldChapterContent,
  type WorldObstacle,
  type WorldPickup,
  type WorldRival,
} from "./world-content";
import worldText from "./strings";
import useTravelAudio from "./useTravelAudio";
import useWorldInput from "./useWorldInput";
import EquipmentPreview3D from "./EquipmentPreview3D";
import WorldAtmosphere from "./WorldAtmosphere";

const World3D = lazy(() => import("./World3D"));
import "./world-scene.css";

type WorldSceneProps = {
  quality: "high" | "balanced" | "low";
  visualEffectsEnabled: boolean;
  motionReduced: boolean;
  soundEnabled: boolean;
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
      <div className="duel-health__track" role="meter" aria-label={`${label} canı`} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={Math.ceil(hp)}>
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

  return (
    <div className="duel-player-stamina" aria-label={`Dayanıklılık ${Math.ceil(stamina)} / ${maxStamina}`}>
      <span>DAYANIKLILIK</span>
      <b>{Math.ceil(stamina)}</b>
      <i className="duel-player-stamina__track" role="meter" aria-valuemin={0} aria-valuemax={maxStamina} aria-valuenow={Math.ceil(stamina)}>
        <i className="duel-player-stamina__trail" style={{ width: `${trailPercent}%` }} />
        <i className="duel-player-stamina__fill" style={{ width: `${percent}%` }} />
      </i>
    </div>
  );
}

function getCachedWorldChapters(distance: number, cache: Map<number, WorldChapterContent>) {
  const current = Math.max(0, Math.floor(distance / WORLD_GATE_INTERVAL_METERS));
  const first = Math.max(0, current - 1);
  const last = Math.min(1_000_000, current + 2);
  const chapters: WorldChapterContent[] = [];
  for (let chapterId = first; chapterId <= last; chapterId += 1) {
    let content = cache.get(chapterId);
    if (!content) {
      content = getWorldChapter(chapterId);
      cache.set(chapterId, content);
    }
    chapters.push(content);
  }
  for (const chapterId of cache.keys()) {
    if (chapterId < current - 2 || chapterId > current + 3) cache.delete(chapterId);
  }
  return chapters;
}

function slotEquipmentKey(slot: EquipmentSlot) {
  if (slot === "weapon") return "weaponId" as const;
  if (slot === "armor") return "armorId" as const;
  if (slot === "cape") return "capeId" as const;
  if (slot === "effect") return "effectId" as const;
  return "dyeId" as const;
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
    item_already_owned: "Bu eşya zaten heybenizde.",
    item_not_owned: "Bu eşyayı önce satın alıp heybenize eklemelisiniz.",
    item_not_found: "Bu eşya katalogda bulunamadı; kataloğu yenileyip tekrar deneyin.",
    item_not_upgradeable: "Bu eşya geliştirilemiyor.",
    upgrade_max_level: "Bu eşya en yüksek seviyede.",
    profile_not_ready: "Hesap profili henüz hazır değil.",
    profile_storage_invalid: "Hesap profili doğrulanamadı.",
    authentication_required: "Alışveriş için hesabınızda oturum açın.",
    authentication_unavailable: "Hesap mağazası şu anda kullanılamıyor.",
    idempotency_key_reused: "İşlem anahtarı çakıştı. Güvenli olması için yeni bir deneme oluşturun.",
  };
  return messages[code] ?? "Mağaza işlemi tamamlanamadı. Bağlantıyı kontrol edip yeniden deneyin.";
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
    ["weapons", "armor", "capes", "effects", "dyes"].includes(String(item.category)) &&
    ["weapon", "armor", "cape", "effect", "dye"].includes(String(item.slot)) &&
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

export default function WorldScene({
  quality,
  visualEffectsEnabled,
  motionReduced,
  soundEnabled,
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
}: WorldSceneProps) {
  const sceneRef = useRef<HTMLElement>(null);
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  const commitBattleProfile = useCallback((nextProfile: PlayerProfile) => {
    profileRef.current = nextProfile;
    onBattleProfile(nextProfile);
  }, [onBattleProfile]);
  const motionRef = useRef(createWorldMotion());
  const lastMotionRef = useRef<"idle" | "walking" | "running" | "stopped">("idle");
  const panelTriggerRef = useRef<HTMLButtonElement>(null);
  const [motion, setMotion] = useState<"idle" | "walking" | "running" | "stopped">("idle");
  const [panel, setPanel] = useState<Panel>(null);
  const storeItems = STORE_CATALOG as StoreItem[];
  const storeCatalogLoading = false;
  const [storeBusyItemId, setStoreBusyItemId] = useState<string | null>(null);
  const [storeTrialItemId, setStoreTrialItemId] = useState<string | null>(null);
  const [storeCelebrationSignal, setStoreCelebrationSignal] = useState(0);
  const [storeMessage, setStoreMessage] = useState("");
  const [storeError, setStoreError] = useState("");
  const [storeRetryAction, setStoreRetryAction] = useState<{ operation: "purchase" | "equip" | "upgrade"; itemId: string } | null>(null);
  const [airEnabled, setAirEnabled] = useState(true);
  const [audioOn, setAudioOn] = useState(soundEnabled);
  const [vibrationOn, setVibrationOn] = useState(vibrationEnabled);
  const [travel, setTravel] = useState(0);
  const [rivalRefresh, setRivalRefresh] = useState(0);
  const [stepBursts, setStepBursts] = useState<StepBurst[]>([]);
  const [collectedPickupIds, setCollectedPickupIds] = useState<Set<string>>(() => new Set());
  const [brokenObstacleIds, setBrokenObstacleIds] = useState<Set<string>>(() => new Set());
  const [sessionRewards, setSessionRewards] = useState({ gold: 0, diamonds: 0, materials: { emberCrystals: 0, sealFragments: 0, ironShards: 0 } });
  const [pickupFlights, setPickupFlights] = useState<PickupFlight[]>([]);
  const [pickupNotice, setPickupNotice] = useState("");
  const [attackAnimation, setAttackAnimation] = useState(false);
  const [battleSession, setBattleSession] = useState<BattleSession | null>(null);
  const [combatRender, setCombatRender] = useState<CombatState | null>(null);
  const [combatEvents, setCombatEvents] = useState<CombatVisualEvent[]>([]);
  const [combatFlash, setCombatFlash] = useState<DuelFlash>(null);
  const [combatTutorialOpen, setCombatTutorialOpen] = useState(false);
  const combatTutorialOpenRef = useRef(false);
  const combatTutorialSeenRef = useRef(false);
  const lastBotTelegraphTickRef = useRef(-1);
  const [debugOneHitEnabled, setDebugOneHitEnabled] = useState(false);
  const contentCacheRef = useRef(new Map<number, WorldChapterContent>());
  const rivalDistancesRef = useRef(new Map<string, number>());
  const collectedRef = useRef(new Set<string>());
  const pendingPickupIdsRef = useRef(new Set<string>());
  const brokenRef = useRef(new Set<string>());
  const obstacleDamageRef = useRef(new Map<string, number>());
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
    if (visualEffectsEnabled) return;
    setCombatEvents([]);
    setCombatFlash(null);
    hitStopUntilRef.current = window.performance.now();
  }, [visualEffectsEnabled]);
  const startAudio = useTravelAudio(audioOn, motion === "walking" || motion === "running", airEnabled);
  const activeChapters = getCachedWorldChapters(travel, contentCacheRef.current);
  for (const rival of activeChapters.flatMap((chapter) => chapter.rivals)) {
    if (!rivalDistancesRef.current.has(rival.id)) rivalDistancesRef.current.set(rival.id, rival.distance);
  }
  const allRivals = activeChapters.flatMap((chapter) => chapter.rivals)
    .map((rival) => ({ ...rival, distance: rivalDistancesRef.current.get(rival.id) ?? rival.distance }));
  const nearbyRivals = allRivals.filter((rival) => Math.abs(rival.distance - travel) <= 105);
  const rivals = allRivals.filter((rival) =>
    rival.distance >= travel - 8 && !profile.defeatedOpponents.includes(rival.id),
  )
    .sort((left, right) => left.distance - right.distance);
  const nextOpponent = rivals[0];
  const encounterDistance = nextOpponent ? Math.abs(nextOpponent.distance - travel) : Number.POSITIVE_INFINITY;
  const encounterVisible = Boolean(nextOpponent && encounterDistance <= 25);
  const canChallenge = Boolean(nextOpponent && encounterDistance <= 8);
  const allPickups = activeChapters.flatMap((chapter) => chapter.pickups);
  const visiblePickupCount = allPickups.filter((pickup) =>
    !collectedPickupIds.has(pickup.id) &&
    (!pickup.sourceObstacleId || brokenObstacleIds.has(pickup.sourceObstacleId)),
  ).length;
  const nearestBreakable = activeChapters.flatMap((chapter) => chapter.obstacles)
    .filter((obstacle) =>
      obstacle.kind === "barricade" &&
      !brokenObstacleIds.has(obstacle.id) &&
      Math.abs(obstacle.distance - travel) <= 4.2 &&
      Math.abs(obstacle.x - motionRef.current.depth * 5.2) <= obstacle.width / 2 + 1.4,
    )
    .sort((left, right) => Math.abs(left.distance - travel) - Math.abs(right.distance - travel))[0];
  const displayedGold = profile.gold + sessionRewards.gold;
  const displayedDiamonds = profile.diamonds + sessionRewards.diamonds;
  const displayedCrystals = profile.materials.emberCrystals + sessionRewards.materials.emberCrystals;
  const displayedSeals = profile.materials.sealFragments + sessionRewards.materials.sealFragments;
  const displayedIronShards = profile.materials.ironShards + sessionRewards.materials.ironShards;
  const playerCombatStats = useMemo(() => getPlayerCombatModifiers(profile, storeItems), [profile, storeItems]);
  const equipmentBonuses = useMemo(() => getEquipmentBonuses(profile, storeItems), [profile, storeItems]);
  const equipmentVisual = useMemo(() => getEquipmentVisual(profile, storeItems), [profile, storeItems]);
  const worldEquipmentVisual = useMemo(() => {
    if (panel !== "store" || !storeTrialItemId) return equipmentVisual;
    const trialItem = storeItems.find((item) => item.id === storeTrialItemId);
    if (!trialItem) return equipmentVisual;
    const key = slotEquipmentKey(trialItem.slot);
    const trialProfile = {
      ...profile,
      equipment: { ...profile.equipment, [key]: trialItem.id },
    };
    return getEquipmentVisual(trialProfile, storeItems);
  }, [equipmentVisual, panel, profile, storeItems, storeTrialItemId]);
  const remainingBarricadeHits = nearestBreakable
    ? obstacleDamageRef.current.get(nearestBreakable.id) ?? nearestBreakable.health
    : 0;

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
  const storeMutationKeysRef = useRef(new Map<string, string>());
  const runStoreMutation = useCallback(async (operation: "purchase" | "equip" | "upgrade", itemId: string) => {
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
          if (currentProfile.inventory.ownedItemIds.includes(item.id)) throw new StoreActionError("Bu eşya zaten heybenizde.");
          if (currentProfile.gold < item.price.gold || currentProfile.diamonds < item.price.diamonds) {
            throw new StoreActionError("Altın veya elmas bakiyen bu eşya için yeterli değil.");
          }
          nextProfile = {
            ...currentProfile,
            gold: currentProfile.gold - item.price.gold,
            diamonds: currentProfile.diamonds - item.price.diamonds,
            inventory: {
              ...currentProfile.inventory,
              ownedItemIds: [...currentProfile.inventory.ownedItemIds, item.id],
              newItemIds: [...new Set([...currentProfile.inventory.newItemIds, item.id])],
            },
          };
        } else if (operation === "equip") {
          if (!currentProfile.inventory.ownedItemIds.includes(item.id)) throw new StoreActionError("Bu eşyayı önce satın alıp heybenize eklemelisiniz.");
          const key = slotEquipmentKey(item.slot);
          nextProfile = {
            ...currentProfile,
            equipment: { ...currentProfile.equipment, [key]: item.id },
            inventory: {
              ...currentProfile.inventory,
              newItemIds: currentProfile.inventory.newItemIds.filter((id) => id !== item.id),
            },
          };
        } else {
          if (!item.upgradeable || (item.slot !== "weapon" && item.slot !== "armor")) throw new StoreActionError("Bu eşya geliştirilemiyor.");
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
              upgrades: { ...currentProfile.inventory.upgrades, [item.id]: currentLevel + 1 },
            },
          };
        }
        commitBattleProfile(normalizePlayerProfile(nextProfile));
        if (operation === "purchase" || operation === "upgrade") {
          setStoreCelebrationSignal((signal) => signal + 1);
          playWorldCue("seal");
        }
        setStoreMessage(operation === "purchase"
          ? `${item.name} heybenize eklendi.`
          : operation === "equip" ? `${item.name} kuşanıldı.` : `${item.name} geliştirildi.`);
        return;
      }

      if (!accountProfileReady) throw new StoreActionError("Hesap profili henüz hazır değil.");
      const mutationKey = `${operation}:${itemId}`;
      let idempotencyKey = storeMutationKeysRef.current.get(mutationKey);
      if (operation !== "equip" && !idempotencyKey) {
        idempotencyKey = createIdempotencyKey();
        storeMutationKeysRef.current.set(mutationKey, idempotencyKey);
      }
      const body = operation === "equip"
        ? { itemId }
        : { itemId, idempotencyKey };
      const result = await requestJson<{ profile?: unknown }>(`/api/store/${operation}`, {
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
      setStoreMessage(operation === "purchase"
        ? `${item.name} satın alındı.`
        : operation === "equip" ? `${item.name} kuşanıldı.` : `${item.name} geliştirildi.`);
    } catch (error) {
      if (error instanceof ApiResponseError) {
        setStoreError(error.retryable ? "Mağaza şu an yüklenemedi, tekrar dene." : error.message);
        if (error.retryable) setStoreRetryAction({ operation, itemId });
        else storeMutationKeysRef.current.delete(`${operation}:${itemId}`);
      } else if (error instanceof StoreActionError) {
        setStoreError(error.message);
        storeMutationKeysRef.current.delete(`${operation}:${itemId}`);
      } else {
        console.warn("[store] operation failed", {
          operation,
          errorName: error instanceof Error ? error.name : "unknown",
        });
        setStoreError("Mağaza şu an yüklenemedi, tekrar dene.");
        if (accountDuelEnabled) setStoreRetryAction({ operation, itemId });
        else storeMutationKeysRef.current.delete(`${operation}:${itemId}`);
      }
    } finally {
      storeMutationRef.current = false;
      setStoreBusyItemId(null);
    }
  }, [accountDuelEnabled, accountProfileReady, commitBattleProfile, storeItems]);
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
    } catch {
      for (const id of pickupIds) {
        pendingPickupIdsRef.current.delete(id);
        collectedRef.current.delete(id);
      }
      setCollectedPickupIds(new Set(collectedRef.current));
      setPickupNotice("Eşya sunucuda doğrulanamadı; bu öğe tekrar toplamak için yerde kaldı.");
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
        message: "Eğitim düellosu · ödül ve profil ilerlemesi verilmez.",
      });
      return;
    }

    if (context.duelId) {
      try {
        const result = await requestJson<{
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

    const awarded = awardBattle(profile, localSummary);
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
    if (battleActiveRef.current) return;
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
    const practice = debugOneHitEnabled;
    const initialSession: BattleSession = { rival, phase: "sweep", beat: 0, practice };
    battleSessionRef.current = initialSession;
    setBattleSession(initialSession);
    setCombatEvents([]);
    playWorldCue("battle");

    try {
      let seed: number;
      let difficulty = rival.difficulty;
      let duelId: string | null = null;
      let playerStats: PlayerCombatModifiers = playerCombatStats;
      if (accountDuelEnabled && !practice) {
        if (!accountProfileReady) throw new Error("Hesap profili sunucuya bağlı değil; düello ödülü güvenle doğrulanamaz.");
        const challenge = await requestJson<{
          duelId?: unknown;
          seed?: unknown;
          playerStats?: unknown;
          opponent?: { id?: unknown; difficulty?: unknown };
          error?: string;
        }>("/api/duels/start", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opponentId: rival.id }),
        }, {
          operation: "duel start",
          fallbackMessage: "Hesap düellosu şu an başlatılamıyor. Lütfen daha sonra tekrar dene.",
        });
        if (
          typeof challenge.duelId !== "string" ||
          typeof challenge.seed !== "number" ||
          !Number.isSafeInteger(challenge.seed) ||
          !challenge.playerStats ||
          typeof challenge.playerStats !== "object" ||
          Array.isArray(challenge.playerStats) ||
          challenge.opponent?.id !== rival.id ||
          !["easy", "medium", "hard"].includes(String(challenge.opponent.difficulty))
        ) throw new Error("Sunucudan gelen düello kimliği geçersiz.");
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
      } else {
        const seedBuffer = new Uint32Array(1);
        window.crypto.getRandomValues(seedBuffer);
        seed = seedBuffer[0] || 1;
      }

      activeDuelRef.current = { rival, duelId, seed, practice };
      const initialCombat = createCombatState(seed, difficulty, playerStats);
      combatStateRef.current = initialCombat;
      setCombatRender(initialCombat);

      const sweepDuration = motionReduced ? 100 : 260;
      const versusDuration = motionReduced ? 280 : 860;
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
  }, [accountDuelEnabled, accountProfileReady, debugOneHitEnabled, motionReduced, playerCombatStats]);

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
    combatInputRef.current.x = Math.round(Math.max(-1, Math.min(1, x)) * 100);
    combatInputRef.current.y = Math.round(Math.max(-1, Math.min(1, y)) * 100);
  };

  const debugStartBattle = () => {
    const target = rivals[0] ?? allRivals
      .filter((rival) => !profile.defeatedOpponents.includes(rival.id))
      .sort((left, right) => Math.abs(left.distance - travel) - Math.abs(right.distance - travel))[0];
    if (target) void beginEncounter(target);
  };

  const requestObstacleAttack = useCallback(() => {
    if (battleActiveRef.current) return;
    attackRequestedRef.current = true;
    if (audioOn) startAudio();
  }, [audioOn, startAudio]);

  useEffect(() => () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(0);
    for (const timer of battleTimersRef.current) window.clearTimeout(timer);
    if (attackAnimationTimerRef.current) window.clearTimeout(attackAnimationTimerRef.current);
    for (const timer of claimTimersRef.current.values()) window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onActionKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key.toLowerCase() !== "e") return;
      if (event.target instanceof HTMLElement && event.target.closest("button,input,textarea,select")) return;
      event.preventDefault();
      requestObstacleAttack();
    };
    window.addEventListener("keydown", onActionKeyDown);
    return () => window.removeEventListener("keydown", onActionKeyDown);
  }, [requestObstacleAttack]);

  useEffect(() => {
    if (battleSession?.phase !== "fight") return undefined;
    const buttonForKey: Record<string, number> = {
      j: INPUT_BUTTON.attack,
      k: INPUT_BUTTON.block,
      l: INPUT_BUTTON.dodge,
      " ": INPUT_BUTTON.skillOne,
      q: INPUT_BUTTON.skillTwo,
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
        if (!event.repeat) pressDuelButton(button);
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
      for (const button of [INPUT_BUTTON.attack, INPUT_BUTTON.block, INPUT_BUTTON.dodge, INPUT_BUTTON.skillOne, INPUT_BUTTON.skillTwo]) {
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
    let frame = 0;
    let previous = 0;
    let accumulator = 0;
    let lastReactUpdate = 0;
    let lastVisualUpdate = 0;
    const fixedStep = 1 / 60;
    const animate = (now: number) => {
      const dt = Math.min((now - (previous || now)) / 1000, fixedStep * 6);
      previous = now;
      accumulator = Math.min(accumulator + dt, fixedStep * 6);
      const liveInput = readWorldInput(worldInput.heldKeys.current, worldInput.joystick.current);
      const stoppedInput = { x: 0, y: 0, sprint: false, analogMagnitude: 0 };
      let frameState: WorldMotionFrame = stepWorldMotion(motionRef.current, battleActiveRef.current ? stoppedInput : liveInput, 0, playerCombatStats.moveSpeedMultiplier);
      let footsteps = 0;
      const newlyCollected = new Map<number, string[]>();
      let hasCollectedThisFrame = false;
      while (accumulator >= fixedStep) {
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
              active?.practice &&
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
            combatStateRef.current = stepped.state;
            if (stepped.events.length) {
              const impactEvents = stepped.events.filter((event) => event.type === "hit" || event.type === "parry");
              if (visualEffectsEnabled && impactEvents.length) {
                const damage = impactEvents.reduce((sum, event) => sum + (event.type === "hit" ? event.damage ?? 0 : 0), 0);
                hitStopUntilRef.current = window.performance.now() + Math.min(90, Math.max(50, 50 + damage * 0.65));
              } else if (!visualEffectsEnabled) {
                hitStopUntilRef.current = window.performance.now();
              }
              if (visualEffectsEnabled) {
                const visualEvents = stepped.events.map((event) => ({
                  ...event,
                  id: ++nextCombatEffectIdRef.current,
                  expiresAt: window.performance.now() + 900,
                }));
                setCombatEvents((current) => [...current.filter((event) => event.expiresAt > window.performance.now()), ...visualEvents].slice(-12));
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
              if (stepped.events.some((event) => event.type === "hit" || event.type === "parry" || event.type === "block")) {
                playWorldCue("attack");
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
        if (Array.from(trapCooldownRef.current.values()).some((until) => until >= 0 && until > simulationTimeRef.current)) {
          stepInput = {
            ...stepInput,
            x: stepInput.x * 0.38,
            y: stepInput.y * 0.38,
            analogMagnitude: stepInput.analogMagnitude * 0.38,
          };
        }
        const simulationStep = fixedStep;
        let nextFrame = stepWorldMotion(motionRef.current, stepInput, simulationStep, playerCombatStats.moveSpeedMultiplier);
        const chapters = getCachedWorldChapters(nextFrame.distance, contentCacheRef.current);
        const obstacles = chapters.flatMap((chapter) => chapter.obstacles);
        const playerX = nextFrame.depth * 5.2;
        const safeDistance = resolveWorldObstacleCollision(
          motionRef.current.distance,
          motionRef.current.depth * 5.2,
          nextFrame.distance,
          playerX,
          obstacles,
          brokenRef.current,
        );
        if (Math.abs(safeDistance - nextFrame.distance) > 0.0001) {
          nextFrame = {
            ...nextFrame,
            distance: safeDistance,
            cameraX: Math.min(nextFrame.cameraX, safeDistance),
            velocityY: 0,
            speed: Math.abs(nextFrame.velocityX),
          };
        }

        for (const rival of chapters.flatMap((chapter) => chapter.rivals)) {
          const rivalDistance = rivalDistancesRef.current.get(rival.id) ?? rival.distance;
          const gap = rivalDistance - nextFrame.distance;
          if (gap > 2.7 && gap <= 8) {
            rivalDistancesRef.current.set(rival.id, Math.max(nextFrame.distance + 2.7, rivalDistance - fixedStep * 1.4));
          }
        }

        if (attackRequestedRef.current && simulationTimeRef.current >= nextAttackAtRef.current) {
          attackRequestedRef.current = false;
          nextAttackAtRef.current = simulationTimeRef.current + 0.34;
          const target = obstacles
            .filter((obstacle) =>
              obstacle.kind === "barricade" &&
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
              setPickupNotice("Barikat kırıldı. İçindeki altınları topla.");
            } else {
              setPickupNotice(`Barikata vurdun · ${remaining} darbe kaldı.`);
            }
          } else {
            setPickupNotice("SALDIR için kırılabilir bir barikata yaklaş.");
          }
        }

        for (const obstacle of obstacles) {
          if (obstacle.kind !== "spike-trap") continue;
          const longitudinal = Math.abs(obstacle.distance - nextFrame.distance);
          const lateral = Math.abs(obstacle.x - playerX);
          if (longitudinal > 5 || lateral > obstacle.width / 2 + 1.8) {
            trapCooldownRef.current.delete(obstacle.id);
            continue;
          }
          const cooldown = trapCooldownRef.current.get(obstacle.id);
          if (longitudinal <= 1.25 && lateral <= obstacle.width / 2 && cooldown === undefined) {
            trapCooldownRef.current.set(obstacle.id, simulationTimeRef.current + 1.1);
            setPickupNotice("Dikenli tuzak! 1 saniye yavaşladın.");
            if (vibrationOn && "vibrate" in navigator) {
              try { navigator.vibrate([35, 35, 25]); } catch { /* Haptics are optional. */ }
            }
          } else if (cooldown !== undefined && cooldown >= 0 && simulationTimeRef.current >= cooldown) {
            trapCooldownRef.current.set(obstacle.id, -1);
          }
        }

        if (loadedClaimChaptersRef.current.has(Math.floor(nextFrame.distance / WORLD_GATE_INTERVAL_METERS))) {
          for (const pickup of chapters.flatMap((chapter) => chapter.pickups)) {
            if (
              (pickup.sourceObstacleId && !brokenRef.current.has(pickup.sourceObstacleId)) ||
              collectedRef.current.has(pickup.id) ||
              pendingPickupIdsRef.current.has(pickup.id)
            ) continue;
            const distance = Math.hypot(pickup.x - playerX, pickup.distance - nextFrame.distance);
            if (distance > PICKUP_RADIUS_METERS) continue;
            const chapterQueue = newlyCollected.get(pickup.chapterId) ?? [];
            chapterQueue.push(pickup.id);
            newlyCollected.set(pickup.chapterId, chapterQueue);
            pendingPickupIdsRef.current.add(pickup.id);
            collectedRef.current.add(pickup.id);
            hasCollectedThisFrame = true;
          }
        }

        frameState = nextFrame;
        motionRef.current = frameState;
        footsteps += frameState.footsteps;
        accumulator -= fixedStep;
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
    frame = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [audioOn, motionReduced, playerCombatStats.moveSpeedMultiplier, queuePickupClaims, vibrationOn, visualEffectsEnabled, worldInput.heldKeys, worldInput.joystick]);

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
      cameraX: nextDistance,
      depth: nextDepth,
      velocityX: 0,
      velocityY: 0,
      cameraLead: 0,
    };
    setTravel(Math.floor(nextDistance));
  };
  const debugNearestRival = () => {
    const target = activeChapters.flatMap((chapter) => chapter.rivals)
      .map((rival) => ({ ...rival, distance: rivalDistancesRef.current.get(rival.id) ?? rival.distance }))
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
  const chapterProgress = Math.max(0, Math.min(100, ((travel % WORLD_GATE_INTERVAL_METERS) / WORLD_GATE_INTERVAL_METERS) * 100));
  return (
    <main
      ref={sceneRef}
      className="world-scene"
      data-battle={battleSession?.phase ?? "none"}
      data-danger={combatRender && combatRender.player.hp / combatRender.player.maxHp <= 0.3 ? "true" : "false"}
      data-quality={quality}
      data-reduced={motionReduced}
      data-air={airEnabled}
      data-postfx={visualEffectsEnabled}
      data-finisher={visualEffectsEnabled && battleSession?.phase === "settling"}
      data-motion={motion}
      aria-label={worldText.brand}
    >
      <WorldAtmosphere
        quality={quality}
        motionReduced={motionReduced}
        enabled={airEnabled}
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
            quality={quality}
            visualEffectsEnabled={visualEffectsEnabled}
            motionReduced={motionReduced}
            airEnabled={airEnabled}
            level={profile.level}
            relicCount={profile.items.length}
            equipmentVisual={worldEquipmentVisual}
            lightRadius={equipmentBonuses.lightRadius}
            animationState={attackAnimation ? "attack" : resolveCharacterAnimationState(motion)}
            rivals={battleSession ? [] : nearbyRivals}
            collectedPickupIds={collectedPickupIds}
            brokenObstacleIds={brokenObstacleIds}
            focusedRival={battleSession?.rival ?? null}
            slowMotion={Boolean(battleSession && ["sweep", "vs", "countdown"].includes(battleSession.phase))}
            combatActive={Boolean(battleSession && battleSession.phase !== "error")}
            combatStateRef={combatStateRef}
            combatRender={combatRender}
            combatVisualEvents={visualEffectsEnabled ? combatEvents : []}
            cinematicIntro={Boolean(visualEffectsEnabled && battleSession && ["sweep", "vs", "countdown"].includes(battleSession.phase))}
            finisherSlowMotion={Boolean(visualEffectsEnabled && battleSession?.phase === "settling")}
            botTelegraphActive={Boolean(
              combatRender?.bot.attackType
              && combatRender.tick - combatRender.bot.attackStartedTick < getBotAttackWindupTicks(combatRender.difficulty),
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
          <section className="duel-hud" aria-label="Düello durumu">
            <DuelHealthBar label={profile.name} hp={combatRender.player.hp} maxHp={combatRender.player.maxHp} side="player" visualEffectsEnabled={visualEffectsEnabled} />
            <div className="duel-hud__center">
              <span>VS</span>
              <strong>{combatRender.player.combo > 1 ? `${combatRender.player.combo} VURUŞ` : "DÜELLO"}</strong>
              {combatRender.player.chargeStartedTick >= 0 && (
                <small className="duel-charge">AĞIR SALDIRI {Math.min(100, Math.round((combatRender.tick - combatRender.player.chargeStartedTick) / 30 * 100))}%</small>
              )}
            </div>
            <DuelHealthBar label={battleSession.rival.name} hp={combatRender.bot.hp} maxHp={combatRender.bot.maxHp} side="bot" visualEffectsEnabled={visualEffectsEnabled} />
          </section>
          {combatRender.bot.attackType
            && combatRender.tick - combatRender.bot.attackStartedTick < getBotAttackWindupTicks(combatRender.difficulty)
            && (
              <>
                <div className="duel-attack-warning" role="status" aria-live="assertive">BOT SALDIRIYOR · BLOKLA YA DA KAÇ</div>
              </>
            )}
          <DuelStaminaBar stamina={combatRender.player.stamina} maxStamina={combatRender.player.maxStamina} visualEffectsEnabled={visualEffectsEnabled} />
          {visualEffectsEnabled && <div className="duel-combat-effects" aria-hidden="true">
            {combatEvents.map((event) => (
              <div
                key={event.id}
                className={`duel-combat-fx is-${event.type === "skill" ? event.attack : event.type}${event.target === "player" ? " targets-player" : " targets-bot"}${event.critical ? " is-critical" : ""}`}
                style={{
                  "--fx-side": event.target === "player" ? "36%" : "64%",
                  "--fx-color": event.target === "bot" ? equipmentVisual.trailColor ?? "#ffca88" : "#ff7158",
                  "--fx-glow": event.target === "bot" ? equipmentVisual.trailColor ?? "#ff7847" : "#ff553e",
                } as CSSProperties}
              >
                <i />
                <span className="duel-fx-particles" />
                {Boolean(event.damage) && <b>{event.critical ? "!" : ""}{Math.ceil(event.damage ?? 0)}</b>}
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
                {event.type === "dodge" && <strong>KAÇIŞ · 0 HASAR</strong>}
                {event.type === "skill" && <strong>{event.attack === "skillOne" ? "KOR" : "YILDIRIM"}</strong>}
              </div>
            ))}
          </div>}
          {visualEffectsEnabled && combatFlash && <div className={`duel-hit-flash is-${combatFlash}`} aria-hidden="true" />}
          {visualEffectsEnabled && <div className="duel-low-health-vignette" aria-hidden="true" />}
          <DuelControls
            stamina={combatRender.player.stamina}
            attackCooldownSeconds={Math.max(0, combatRender.player.attackCooldownUntilTick - combatRender.tick) / COMBAT_HZ}
            skillOneSeconds={Math.max(0, combatRender.player.skillOneCooldownUntilTick - combatRender.tick) / COMBAT_HZ}
            skillTwoSeconds={Math.max(0, combatRender.player.skillTwoCooldownUntilTick - combatRender.tick) / COMBAT_HZ}
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
                  <div><span aria-hidden="true">⚔</span><b>SALDIRI</b><i>Sağdaki büyük düğme · basılı tut: ağır vuruş</i><strong>↘</strong></div>
                  <div><span aria-hidden="true">⬟</span><b>KALKAN</b><i>Saldırıyı durdurur; zamanında basmak savuşturur</i><strong>↙</strong></div>
                  <div><span aria-hidden="true">↝</span><b>KAÇ</b><i>Kısa süre hasar almazsın · dayanıklılık harcar</i><strong>↙</strong></div>
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
        <div className={`world-encounter${canChallenge ? " is-near" : ""}`} data-bot-tick={rivalRefresh} aria-live="polite">
          <div className="world-encounter__rival" aria-hidden="true"><img src="/shafak-warrior.png" alt="" /></div>
          <div className="world-encounter__card">
            <span className="world-encounter__eyebrow"><b>BOT</b> · {canChallenge ? "YOLUNU KESİYOR" : `${Math.ceil(encounterDistance)} M`}</span>
            <strong>{nextOpponent.name}</strong>
            <span>Seviye {nextOpponent.level} <i>·</i> Tahmini ganimet {nextOpponent.loot} altın</span>
            <em>“{nextOpponent.taunt}”</em>
            {canChallenge && (
              <button type="button" className="world-encounter__fight" onClick={() => beginEncounter(nextOpponent)}>
                <span aria-hidden="true">⚔</span> SAVAŞ
              </button>
            )}
          </div>
        </div>
      )}
      {nearestBreakable && !battleSession && (
        <div className="world-breakable-action">
          <span>BARİKAT · {remainingBarricadeHits} DARBE</span>
          <button type="button" onClick={requestObstacleAttack} aria-label={`Barikata saldır, ${remainingBarricadeHits} darbe kaldı`}>
            <span aria-hidden="true">⚔</span> SALDIR
          </button>
        </div>
      )}
      {battleSession && ["sweep", "vs", "countdown"].includes(battleSession.phase) && (
        <div className={`world-battle-entry${battleSession.phase !== "sweep" ? " is-vs" : ""}`} role="dialog" aria-modal="true" aria-label="BOT karşılaşması">
          <div className="world-battle-entry__vignette" />
          <span className="world-battle-entry__eyebrow">GERÇEK ZAMANLI SAVAŞ · AYNI 3D DÜNYA</span>
          <div className="world-battle-entry__versus">
            <div><small>YOLCU · SEV. {profile.level}</small><strong>{profile.name}</strong></div>
            <b>VS</b>
            <div><small><i>BOT</i> · SEV. {battleSession.rival.level}</small><strong>{battleSession.rival.name}</strong></div>
          </div>
          <p>
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
          onEquip={(itemId) => void runStoreMutation("equip", itemId)}
          onUpgrade={(itemId) => void runStoreMutation("upgrade", itemId)}
          onRetry={storeRetryAction ? () => void runStoreMutation(storeRetryAction.operation, storeRetryAction.itemId) : undefined}
          renderPreview={(item) => {
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
                if (next) startAudio();
              }}>{audioOn ? worldText.soundOn : worldText.soundOff}</button>
            </div>
            <div className="world-setting">
              <span><strong>{worldText.vibration}</strong><small>{worldText.vibrationDescription}</small></span>
              <button type="button" role="switch" aria-checked={vibrationOn} aria-label={vibrationOn ? worldText.vibrationOn : worldText.vibrationOff} onClick={() => setVibrationOn((current) => !current)}>{vibrationOn ? worldText.vibrationOn : worldText.vibrationOff}</button>
            </div>
            <p className="world-inventory__note">{worldText.settingsNote}</p>
          </section>
        </div>
      )}
    </main>
  );
}
