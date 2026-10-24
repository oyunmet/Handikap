import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { PlayerProfile } from "../profile";
import { COMBAT_ITEMS, isCombatQuickSlotId, type CombatItemId } from "../combat-items.ts";
import {
  EQUIPMENT_LOADOUT_KEYS,
  EQUIPMENT_SLOT_LABELS,
  getEquipmentLoadoutKey,
  getItemSellValue,
  getSalvageYield,
  getUpgradeCost,
  getUpgradeSuccessChance,
  isStoreItemUnlocked,
  MAX_UPGRADE_LEVEL,
  type EquipmentLoadoutKey,
  type EquipmentStatBonuses,
  type StoreItem,
  type StoreTab,
} from "../store-types.ts";
import { EQUIPMENT_SETS, getDailySpecials } from "../store-catalog.ts";
import { getItemBonuses } from "../store-utils";
import { isCoreWeapon } from "../weapons.ts";
import "./store-panel.css";

type StorePanelProps = {
  profile: PlayerProfile;
  items: StoreItem[];
  isGuest: boolean;
  accountReady: boolean;
  loading: boolean;
  busyItemId: string | null;
  message: string;
  error: string;
  onRetry?: () => void;
  trialItemId: string | null;
  celebrationSignal: number;
  onClose(): void;
  onTry(itemId: string | null): void;
  onPurchase(itemId: string): void;
  onEquip(itemId: string, equipmentKey?: EquipmentLoadoutKey): void;
  onUpgrade(itemId: string): void;
  onSell(itemId: string): void;
  onSalvage(itemId: string): void;
  onAssignQuickSlot(itemId: CombatItemId, slotIndex: number): void;
  onSetSecondaryWeapon(itemId: string | null): void;
  loadoutBusy: boolean;
  renderPreview(item: StoreItem): ReactNode;
};

const tabs: { id: StoreTab; label: string }[] = [
  { id: "weapons", label: "SİLAHLAR" },
  { id: "armor", label: "ZIRHLAR" },
  { id: "accessories", label: "AKSESUARLAR" },
  { id: "consumables", label: "İKSİRLER" },
  { id: "materials", label: "MALZEMELER" },
  { id: "specials", label: "ÖZEL" },
  { id: "inventory", label: "ENVANTER" },
];

const statLabels: Record<keyof EquipmentStatBonuses, string> = {
  health: "Can",
  damage: "Hasar",
  defense: "Savunma",
  critChance: "Kritik şansı",
  critDamage: "Kritik hasarı",
  dodge: "Kaçınma",
  stamina: "Dayanıklılık",
  moveSpeed: "Hareket hızı",
  lightRadius: "Işık alanı",
  attackSpeed: "Saldırı hızı",
  attackRange: "Saldırı menzili",
};

const rarityLabels = {
  common: "Sıradan",
  rare: "Nadir",
  epic: "Epik",
  legendary: "Efsanevi",
} as const;

const numberFormat = new Intl.NumberFormat("tr-TR");

function formatStat(value: number, key: keyof EquipmentStatBonuses) {
  const percentStats: (keyof EquipmentStatBonuses)[] = ["damage", "defense", "critChance", "critDamage", "dodge", "moveSpeed", "attackSpeed"];
  const formatted = numberFormat.format(Math.abs(percentStats.includes(key) ? value * 100 : value));
  const suffix = percentStats.includes(key) ? "%" : key === "attackRange" || key === "lightRadius" ? " m" : "";
  return value > 0 ? `+${formatted}${suffix}` : value < 0 ? `−${formatted}${suffix}` : "0";
}

export default function StorePanel({
  profile,
  items,
  isGuest,
  accountReady,
  loading,
  busyItemId,
  message,
  error,
  onRetry,
  trialItemId,
  celebrationSignal,
  onClose,
  onTry,
  onPurchase,
  onEquip,
  onUpgrade,
  onSell,
  onSalvage,
  onAssignQuickSlot,
  onSetSecondaryWeapon,
  loadoutBusy,
  renderPreview,
}: StorePanelProps) {
  const [activeTab, setActiveTab] = useState<StoreTab>("weapons");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ item: StoreItem; operation: "purchase" | "sell" | "salvage" } | null>(null);
  const [ringTarget, setRingTarget] = useState<"ringOneId" | "ringTwoId">("ringOneId");
  const [dailyOfferRevision, setDailyOfferRevision] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [quickSlotChoice, setQuickSlotChoice] = useState<Record<string, number>>({});
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let previous = getDailySpecials().map((item) => item.id).join("|");
    const timer = window.setInterval(() => {
      const current = getDailySpecials().map((item) => item.id).join("|");
      if (current !== previous) {
        previous = current;
        setDailyOfferRevision((revision) => revision + 1);
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const ownedIds = profile.inventory.ownedItemIds;
  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds]);
  const ownedCombatItems = COMBAT_ITEMS.filter((item) => isCombatQuickSlotId(item.id) && profile.inventory.combatItemCounts[item.id] > 0);
  const visibleItems = useMemo(() => {
    if (activeTab === "inventory") {
      return items.filter((item) => item.kind === "equipment"
        ? ownedSet.has(item.id) && (item.slot !== "weapon" || isCoreWeapon(item.id))
        : item.reward?.type === "combat-item"
          ? profile.inventory.combatItemCounts[item.reward.itemId] > 0
          : item.reward?.type === "material" && profile.materials[item.reward.material] > 0);
    }
    if (activeTab === "specials") {
      const dailyIds = new Set(getDailySpecials().map((item) => item.id));
      return items.filter((item) => dailyIds.has(item.id));
    }
    return items
      .filter((item) => item.category === activeTab && (activeTab !== "weapons" || isCoreWeapon(item.id)))
      .sort((left, right) => ({ common: 0, rare: 1, epic: 2, legendary: 3 }[left.rarity] - { common: 0, rare: 1, epic: 2, legendary: 3 }[right.rarity]));
  }, [activeTab, dailyOfferRevision, items, ownedSet, profile.inventory.combatItemCounts, profile.materials]);
  const selected = visibleItems.find((item) => item.id === selectedId) ?? visibleItems[0] ?? null;

  const canManageProfile = isGuest || accountReady;
  const selectedEquipmentKey = selected?.slot
    ? getEquipmentLoadoutKey(selected.slot, ringTarget)
    : null;
  const currentItem = selectedEquipmentKey
    ? items.find((item) => item.id === profile.equipment[selectedEquipmentKey])
    : undefined;
  const selectedBonuses = selected ? getItemBonuses(selected, profile) : undefined;
  const currentBonuses = currentItem ? getItemBonuses(currentItem, profile) : undefined;
  const affordable = selected
    ? profile.gold >= selected.price.gold && profile.diamonds >= selected.price.diamonds
    : false;
  const selectedAmount = selected?.reward?.type === "combat-item"
    ? profile.inventory.combatItemCounts[selected.reward.itemId]
    : selected?.reward?.type === "material"
      ? profile.materials[selected.reward.material]
      : 0;
  const selectedOwned = selected
    ? selected.kind === "equipment" ? ownedSet.has(selected.id) : selectedAmount > 0
    : false;
  const selectedLevelLocked = selected ? !isStoreItemUnlocked(selected, profile.level) : false;
  const selectedSet = selected?.setId ? EQUIPMENT_SETS[selected.setId as keyof typeof EQUIPMENT_SETS] : null;
  const equippedSetCount = selectedSet && selected?.setId
    ? Object.values(profile.equipment).filter((id): id is string => id !== null && ownedSet.has(id) && items.find((entry) => entry.id === id)?.setId === selected.setId).length
    : 0;
  const isEquipped = selectedEquipmentKey
    ? profile.equipment[selectedEquipmentKey] === selected?.id
    : false;
  const isSecondaryWeapon = selected?.slot === "weapon" && profile.inventory.secondaryWeaponId === selected.id;
  const upgradeLevel = selected ? profile.inventory.upgrades[selected.id] ?? 0 : 0;
  const isBusy = selected ? busyItemId === selected.id : false;
  const upgradeCost = selected?.upgradeable && selected.slot && upgradeLevel < MAX_UPGRADE_LEVEL
    ? getUpgradeCost(selected.slot, upgradeLevel)
    : null;
  const canAffordUpgrade = upgradeCost !== null &&
    profile.gold >= upgradeCost.gold &&
    profile.materials.ironShards >= upgradeCost.ironShards &&
    profile.materials.emberCrystals >= upgradeCost.emberCrystals &&
    profile.materials.sealFragments >= upgradeCost.sealFragments;

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!celebrationSignal) return undefined;
    setCelebrating(true);
    const timer = window.setTimeout(() => setCelebrating(false), 950);
    return () => window.clearTimeout(timer);
  }, [celebrationSignal]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (confirming) setConfirming(null);
      else onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirming, onClose]);

  const handlePurchase = () => {
    if (!selected || selected.dropOnly || selectedLevelLocked || !canManageProfile || !affordable || busyItemId) return;
    setConfirming({ item: selected, operation: "purchase" });
  };

  const confirmAction = () => {
    if (!confirming || !canManageProfile || busyItemId) return;
    const { item, operation } = confirming;
    if (operation === "purchase" && (profile.gold < item.price.gold || profile.diamonds < item.price.diamonds)) {
      setConfirming(null);
      return;
    }
    if (operation === "purchase") onPurchase(item.id);
    if (operation === "sell") onSell(item.id);
    if (operation === "salvage") onSalvage(item.id);
    setConfirming(null);
  };

  const chooseTab = (tab: StoreTab) => {
    setActiveTab(tab);
    setSelectedId(null);
    setConfirming(null);
  };

  return (
    <div className="safak-store-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className={`safak-store${celebrating ? " is-celebrating" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="safak-store-title"
        aria-describedby="safak-store-intro"
      >
        <header className="safak-store__header">
          <div className="safak-store__titleblock">
            <span className="safak-store__eyebrow">YOL ÜSTÜ DEMİRCİSİ · HEYBE</span>
            <h2 id="safak-store-title">Yolun yükünü hafiflet.</h2>
            <p id="safak-store-intro">Zırhını tazele, silahını bile; karanlık çökerken hazır ol.</p>
          </div>
          <div className="safak-store__header-side">
            <div className="safak-store__purse" aria-label={`Bakiyeniz: ${numberFormat.format(profile.gold)} altın, ${numberFormat.format(profile.diamonds)} elmas`}>
              <span><i className="safak-store__coin" aria-hidden="true" />{numberFormat.format(profile.gold)} <small>ALTIN</small></span>
              <span><i className="safak-store__diamond" aria-hidden="true" />{numberFormat.format(profile.diamonds)} <small>ELMAS</small></span>
            </div>
          <button ref={closeButtonRef} className="safak-store__close" type="button" onClick={onClose} aria-label="Dükkânı kapat">×</button>
          </div>
        </header>

        <div className="safak-store__currency-note">
          <span className="safak-store__note-mark" aria-hidden="true">i</span>
          <p><b>Oyun içi kaynaklar:</b> Altın ve elmas eşya alır; ✦ mühür parçaları üst seviye geliştirmelerde kullanılır. Gerçek para ile ödeme yoktur.</p>
        </div>

        {isGuest && (
          <div className="safak-store__guest-note" role="status">
            <b>Misafir heybesi</b>
            <span>Alışverişlerin bu cihazda kalır; bir hesaba aktarılamaz.</span>
          </div>
        )}
        {!isGuest && !accountReady && (
          <div className="safak-store__account-note" role="status">
            Hesap kaydı hazır olana kadar alışveriş ve kuşanma işlemleri kapalı.
          </div>
        )}

        <nav className="safak-store__tabs" aria-label="Dükkân bölümleri" role="tablist" aria-orientation="horizontal">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              id={`store-tab-${tab.id}`}
              className={`safak-store__tab${activeTab === tab.id ? " is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls="store-items-panel"
              onClick={() => chooseTab(tab.id)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();
                const direction = event.key === "ArrowRight" ? 1 : -1;
                const next = tabs[(index + direction + tabs.length) % tabs.length];
                chooseTab(next.id);
                document.getElementById(`store-tab-${next.id}`)?.focus();
              }}
            >
              {tab.label}
              {tab.id === "inventory" && <small>{ownedIds.length}</small>}
            </button>
          ))}
        </nav>

        <div className="safak-store__content">
          <section
            className="safak-store__catalog"
            id="store-items-panel"
            role="tabpanel"
            aria-labelledby={`store-tab-${activeTab}`}
          >
            <div className="safak-store__catalog-heading">
              <div>
                <span className="safak-store__section-kicker">
                  {activeTab === "inventory" ? "YOL ARKADAŞLARIN" : activeTab === "specials" ? "İSTANBUL SAATİYLE HER GÜN YENİLENİR" : "USTANIN TEZGAHI"}
                </span>
                <h3>{tabs.find((tab) => tab.id === activeTab)?.label}</h3>
              </div>
              <span className="safak-store__count">{loading ? "…" : `${visibleItems.length} eşya`}</span>
            </div>

            {activeTab === "inventory" && (
              <>
              <section className="safak-store__equipment-loadout" aria-labelledby="store-equipment-title">
                <div className="safak-store__combat-heading">
                  <div>
                    <span className="safak-store__section-kicker">KARAKTER DONANIMI</span>
                    <h4 id="store-equipment-title">Kuşanılan yuvalar</h4>
                  </div>
                  <span>{EQUIPMENT_LOADOUT_KEYS.filter((key) => profile.equipment[key]).length} dolu</span>
                </div>
                <div className="safak-store__equipment-slots">
                  {EQUIPMENT_LOADOUT_KEYS.map((key) => {
                    const equippedId = profile.equipment[key];
                    const equippedItem = equippedId ? items.find((entry) => entry.id === equippedId) : null;
                    return (
                      <div className="safak-store__equipment-slot" key={key}>
                        <small>{EQUIPMENT_SLOT_LABELS[key]}</small>
                        <b>{equippedItem?.name ?? "Boş"}</b>
                      </div>
                    );
                  })}
                </div>
              </section>
              <section className="safak-store__combat-inventory" aria-labelledby="store-combat-items-title">
                <div className="safak-store__combat-heading">
                  <div>
                    <span className="safak-store__section-kicker">DÜELLO HAZIRLIĞI</span>
                    <h4 id="store-combat-items-title">Savaş çantası</h4>
                  </div>
                  <span>{ownedCombatItems.length} tür</span>
                </div>
                <div className="safak-store__quick-slot-list" aria-label="Atanmış hızlı yuvalar">
                  {profile.inventory.quickSlots.map((itemId, index) => (
                    <div key={index}>
                      <small>{index + 1}</small>
                      <span>{itemId ? COMBAT_ITEMS.find((item) => item.id === itemId)?.name : "Boş"}</span>
                    </div>
                  ))}
                </div>
                {ownedCombatItems.length ? (
                  <div className="safak-store__combat-items">
                    {ownedCombatItems.map((item) => {
                      const assignedSlot = profile.inventory.quickSlots.findIndex((slotId) => slotId === item.id);
                      const selectedSlot = quickSlotChoice[item.id] ?? (assignedSlot >= 0 ? assignedSlot + 1 : 1);
                      return (
                        <article className="safak-store__combat-item" key={item.id}>
                          <span className="safak-store__combat-icon" aria-hidden="true">{item.icon}</span>
                          <div>
                            <b>{item.name}</b>
                            <p>{item.description}</p>
                            <small>{profile.inventory.combatItemCounts[item.id]} ADET{assignedSlot >= 0 ? ` · ${assignedSlot + 1}. YUVADA` : ""}</small>
                          </div>
                          <label>
                            <span className="sr-only">{item.name} için hızlı yuva seç</span>
                            <select
                              aria-label={`${item.name} için hızlı yuva seç`}
                              value={selectedSlot}
                              onChange={(event) => setQuickSlotChoice((current) => ({ ...current, [item.id]: Number(event.currentTarget.value) }))}
                            >
                              {[1, 2, 3, 4].map((slot) => <option value={slot} key={slot}>{slot}. yuva</option>)}
                            </select>
                          </label>
                          <button
                            type="button"
                            disabled={!canManageProfile || loadoutBusy}
                            onClick={() => onAssignQuickSlot(item.id, selectedSlot - 1)}
                          >
                            HIZLI SLOTA ATA
                          </button>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="safak-store__combat-empty">Savaş eşyası kalmadı. Kullanılan eşyalar adetleri sıfırlanınca buradan kalkar.</p>
                )}
              </section>
              </>
            )}

            {loading ? (
              <div className="safak-store__skeletons" aria-label="Eşyalar yükleniyor" aria-busy="true">
                {[0, 1, 2, 3].map((index) => <div className="safak-store__skeleton" key={index} />)}
              </div>
            ) : visibleItems.length ? (
              <div className="safak-store__items">
                {visibleItems.map((item) => {
                  const owned = item.kind === "equipment"
                    ? ownedSet.has(item.id)
                    : item.reward?.type === "combat-item"
                      ? profile.inventory.combatItemCounts[item.reward.itemId] > 0
                      : item.reward?.type === "material" && profile.materials[item.reward.material] > 0;
                  const resourceCount = item.reward?.type === "combat-item"
                    ? profile.inventory.combatItemCounts[item.reward.itemId]
                    : item.reward?.type === "material" ? profile.materials[item.reward.material] : 0;
                  const equipmentKey = item.slot ? getEquipmentLoadoutKey(item.slot, ringTarget) : null;
                  const equipped = equipmentKey ? profile.equipment[equipmentKey] === item.id : false;
                  const isNew = profile.inventory.newItemIds.includes(item.id);
                  const levelLocked = !isStoreItemUnlocked(item, profile.level);
                  return (
                    <button
                      className={`safak-store__item${selected?.id === item.id ? " is-selected" : ""}${equipped ? " is-equipped" : ""}`}
                      key={item.id}
                      type="button"
                      aria-pressed={selected?.id === item.id}
                      aria-label={`${item.name}, ${rarityLabels[item.rarity]}${levelLocked ? `, seviye ${item.requiredLevel} gerekli` : equipped ? ", kuşanıldı" : owned ? ", heybenizde" : item.dropOnly ? ", rakip ganimeti" : ", kilitli"}${isNew ? ", yeni" : ""}`}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <span className="safak-store__item-topline">
                        <span className={`safak-store__rarity rarity-${item.rarity}`}>{rarityLabels[item.rarity]}</span>
                        {isNew && <span className="safak-store__new">YENİ</span>}
                      </span>
                      <span className="safak-store__item-name">{item.name}</span>
                      <span className="safak-store__item-summary">{item.summary}</span>
                      <span className="safak-store__item-price">
                        {item.dropOnly && <span>RAKİPTEN DÜŞER</span>}
                        {!item.dropOnly && levelLocked && <span>SEVİYE {item.requiredLevel}</span>}
                        {!item.dropOnly && !levelLocked && item.price.gold > 0 && <span><i className="safak-store__coin" aria-hidden="true" />{numberFormat.format(item.price.gold)}</span>}
                        {!item.dropOnly && !levelLocked && item.price.diamonds > 0 && <span><i className="safak-store__diamond" aria-hidden="true" />{numberFormat.format(item.price.diamonds)}</span>}
                        {!item.dropOnly && !levelLocked && item.price.gold === 0 && item.price.diamonds === 0 && <span>BAŞLANGIÇ EŞYASI</span>}
                      </span>
                      <span className={`safak-store__item-status${equipped ? " status-equipped" : owned ? " status-owned" : " status-locked"}`}>
                        {levelLocked ? `SEVİYE ${item.requiredLevel}` : equipped ? "KUŞANILDI" : item.kind !== "equipment" && owned ? `${resourceCount} ADET` : owned ? "HEYBEDE" : item.dropOnly ? "GANİMET" : "KİLİTLİ"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="safak-store__empty">
                <span className="safak-store__empty-stamp" aria-hidden="true">—</span>
                <h4>{activeTab === "inventory" ? "Heybe henüz hafif." : "Tezgahta şimdilik eşya yok."}</h4>
                <p>{activeTab === "inventory" ? "Satın aldığın veya yolculukta bulduğun eşyalar burada görünür." : "Bu bölümde gösterilecek eşya bulunmuyor."}</p>
              </div>
            )}
          </section>

          <aside className="safak-store__detail" aria-label="Eşya ayrıntıları">
            {selected ? (
              <>
                <div className="safak-store__preview">
                  <span className="safak-store__preview-label">DONANIM GÖRÜNÜMÜ</span>
                  <div className="safak-store__preview-art">
                    {selected.kind === "equipment"
                      ? renderPreview(selected)
                      : <span className="safak-store__resource-preview" aria-hidden="true">{selected.icon ?? "◇"}</span>}
                  </div>
                  <span className="safak-store__preview-caption">{selected.name}</span>
                  <button
                    type="button"
                    className={`safak-store__try${trialItemId === selected.id ? " is-active" : ""}`}
                    aria-pressed={trialItemId === selected.id}
                    onClick={() => onTry(trialItemId === selected.id ? null : selected.id)}
                    hidden={selected.kind !== "equipment"}
                  >
                    {trialItemId === selected.id ? "DENEMEYİ BIRAK" : "DENE · DÜNYADA GÖR"}
                  </button>
                </div>

                <div className="safak-store__detail-copy">
                  <div className="safak-store__detail-title">
                    <div>
                      <span className={`safak-store__rarity rarity-${selected.rarity}`}>{rarityLabels[selected.rarity]}</span>
                      <h3>{selected.name}</h3>
                    </div>
                    {profile.inventory.newItemIds.includes(selected.id) && <span className="safak-store__new">YENİ</span>}
                  </div>
                  <p className="safak-store__description">{selected.description}</p>
                  <p className="safak-store__summary">{selected.summary}</p>
                  {selected.requiredLevel && <p className="safak-store__summary">Gerekli seviye: {selected.requiredLevel}</p>}
                  {selectedSet && (
                    <p className="safak-store__summary">
                      {selectedSet.name} seti · {equippedSetCount}/4 parça
                      {equippedSetCount >= 4 ? " · 2 ve 4 parça bonusları etkin" : equippedSetCount >= 2 ? " · 2 parça bonusu etkin" : " · 2 parçada savunma/hasar, 4 parçada can/ışık bonusu"}
                    </p>
                  )}
                  {selected.slot === "ring" && (
                    <div className="safak-store__ring-target" aria-label="Yüzüğün takılacağı yuvayı seç">
                      <span>Takılacak yuva</span>
                      {(["ringOneId", "ringTwoId"] as const).map((key, index) => (
                        <button
                          key={key}
                          type="button"
                          className={ringTarget === key ? "is-selected" : ""}
                          aria-pressed={ringTarget === key}
                          onClick={() => setRingTarget(key)}
                        >
                          {index + 1}. Yüzük · {profile.equipment[key] ? items.find((entry) => entry.id === profile.equipment[key])?.name ?? "Dolu" : "Boş"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selected.kind === "equipment" && <section className="safak-store__stats" aria-labelledby="store-stats-title">
                  <div className="safak-store__subheading">
                    <h4 id="store-stats-title">Savaş nitelikleri</h4>
                    <span>{currentItem ? `Karşılaştırma: ${currentItem.name}` : "Mevcut kuşanılan eşya yok"}</span>
                  </div>
                  {Object.entries(statLabels).map(([key, label]) => {
                    const statKey = key as keyof EquipmentStatBonuses;
                    const value = selectedBonuses?.[statKey] ?? 0;
                    const comparison = currentBonuses?.[statKey] ?? 0;
                    const difference = value - comparison;
                    return (
                      <div className="safak-store__stat" key={key}>
                        <span>{label}</span>
                        <b>{formatStat(value, statKey)}</b>
                        <span className={`safak-store__difference${difference > 0 ? " is-positive" : difference < 0 ? " is-negative" : ""}`}>
                          {currentItem
                            ? difference > 0 ? `↑ ${formatStat(difference, statKey)}` : difference < 0 ? `↓ ${formatStat(difference, statKey)}` : "↔ 0"
                            : "—"}
                        </span>
                      </div>
                    );
                  })}
                </section>}

                <div className="safak-store__upgrade-line">
                  <span>{selected.upgradeable ? "Sonraki geliştirme" : "Geliştirilebilir"}</span>
                  <b>{selected.upgradeable && upgradeCost
                    ? `${upgradeLevel}/${MAX_UPGRADE_LEVEL} · başarı %${numberFormat.format(getUpgradeSuccessChance(upgradeLevel))} · ${upgradeCost.gold} altın · ${upgradeCost.ironShards} demir · ${upgradeCost.emberCrystals} kor${upgradeCost.sealFragments ? ` · ${upgradeCost.sealFragments} ✦` : ""}`
                    : selected.upgradeable ? `En yüksek seviye · ${MAX_UPGRADE_LEVEL}/${MAX_UPGRADE_LEVEL}` : "Hayır"}</b>
                </div>

                {selected.kind !== "equipment" && (
                  <div className="safak-store__resource-count">Heybende: <b>{numberFormat.format(selectedAmount)} adet</b></div>
                )}
                <div className="safak-store__price" aria-label={`Fiyat: ${numberFormat.format(selected.price.gold)} altın ve ${numberFormat.format(selected.price.diamonds)} elmas`}>
                  <span>Bedel</span>
                  <b><i className="safak-store__coin" aria-hidden="true" />{numberFormat.format(selected.price.gold)} altın</b>
                  <b><i className="safak-store__diamond" aria-hidden="true" />{numberFormat.format(selected.price.diamonds)} elmas</b>
                </div>

                {!affordable && !selectedOwned && (
                  <p className="safak-store__funds-warning" role="status">
                    Bakiye yetmiyor. Altın ve elmas yol ganimetleri ile savaş zaferlerinden; günlük üçüncü zafer ek ödül getirir.
                  </p>
                )}
                {selectedLevelLocked && (
                  <p className="safak-store__funds-warning" role="status">
                    Bu eşyayı kullanmak için seviye {selected.requiredLevel} gerekiyor.
                  </p>
                )}
                {!canManageProfile && (
                  <p className="safak-store__funds-warning" role="status">Hesap hazır olduğunda bu eşyayla işlem yapabilirsin.</p>
                )}

                <div className="safak-store__actions">
                  {selected.kind !== "equipment" || !selectedOwned ? (
                    <button
                      className="safak-store__primary"
                      type="button"
                      onClick={handlePurchase}
                        disabled={!canManageProfile || !affordable || selected.dropOnly || selectedLevelLocked || loading || !!busyItemId}
                    >
                      {isBusy ? "İŞLENİYOR…" : selected.dropOnly ? "RAKİPTEN DÜŞER" : selectedLevelLocked ? `SEVİYE ${selected.requiredLevel}` : "SATIN AL"}
                    </button>
                  ) : (
                    <>
                      {selected.slot === "weapon" && (
                        <button
                          className="safak-store__secondary"
                          type="button"
                          onClick={() => onSetSecondaryWeapon(isSecondaryWeapon ? null : selected.id)}
                          disabled={!canManageProfile || loadoutBusy}
                        >
                          {isSecondaryWeapon ? "İKİNCİ SİLAH YUVASINDAN ÇIKAR" : "İKİNCİ SİLAH OLARAK ATA"}
                        </button>
                      )}
                      <button
                        className="safak-store__primary"
                        type="button"
                        onClick={() => onEquip(selected.id, selectedEquipmentKey ?? undefined)}
                        disabled={!canManageProfile || isEquipped || selectedLevelLocked || loading || !!busyItemId}
                      >
                        {isBusy ? "İŞLENİYOR…" : isEquipped ? "KUŞANILDI" : "KUŞAN"}
                      </button>
                      {selected.upgradeable && (
                        <button
                          className="safak-store__secondary"
                          type="button"
                          onClick={() => onUpgrade(selected.id)}
                          disabled={!canManageProfile || selectedLevelLocked || upgradeLevel >= MAX_UPGRADE_LEVEL || !canAffordUpgrade || loading || !!busyItemId}
                        >
                          {upgradeLevel >= MAX_UPGRADE_LEVEL ? "EN YÜKSEK SEVİYE" : "GELİŞTİR"}
                        </button>
                      )}
                      <button
                        className="safak-store__secondary"
                        type="button"
                        onClick={() => setConfirming({ item: selected, operation: "sell" })}
                        disabled={!canManageProfile || !getItemSellValue(selected).gold && !getItemSellValue(selected).diamonds || isEquipped || isSecondaryWeapon || loading || !!busyItemId}
                      >
                        SAT · {getItemSellValue(selected).gold} ALTIN{getItemSellValue(selected).diamonds ? ` · ${getItemSellValue(selected).diamonds} ELMAS` : ""}
                      </button>
                      <button
                        className="safak-store__secondary"
                        type="button"
                        onClick={() => setConfirming({ item: selected, operation: "salvage" })}
                        disabled={!canManageProfile || isEquipped || isSecondaryWeapon || loading || !!busyItemId}
                      >
                        PARÇALA · +{getSalvageYield(selected, upgradeLevel).ironShards} DEMİR
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="safak-store__detail-empty">
                <span aria-hidden="true">◇</span>
                <p>Tezgahtan bir eşya seç; ustanın ne önerdiğini gör.</p>
              </div>
            )}
          </aside>
        </div>

        {(message || error) && (
          <div className={`safak-store__feedback${error ? " is-error" : ""}`} role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"}>
            <span aria-hidden="true">{error ? "!" : "·"}</span>
            <p>{error || message}</p>
            {error && onRetry && <button type="button" onClick={onRetry}>TEKRAR DENE</button>}
          </div>
        )}

        <footer className="safak-store__footer">
          <span>Yolcu, iyi donanım uzak yolları kolaylaştırır.</span>
          <span>ŞAFAK SAVAŞÇILARI <i>·</i> HEYBE</span>
        </footer>
        {celebrating && (
          <div className="safak-store__sparkles" aria-hidden="true">
            {Array.from({ length: 9 }, (_, index) => (
              <i key={index} style={{ "--spark-index": index } as CSSProperties}>✦</i>
            ))}
          </div>
        )}
      </section>

      {confirming && (
        <div className="safak-store-confirm-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setConfirming(null);
        }}>
          <section className="safak-store-confirm" role="alertdialog" aria-modal="true" aria-labelledby="store-confirm-title" aria-describedby="store-confirm-copy">
            <span className="safak-store__eyebrow">
              {confirming.operation === "purchase" ? "ALIŞVERİŞİ ONAYLA" : confirming.operation === "sell" ? "SATIŞI ONAYLA" : "PARÇALAMAYI ONAYLA"}
            </span>
            <h3 id="store-confirm-title">{confirming.item.name}</h3>
            <p id="store-confirm-copy">
              {confirming.operation === "purchase"
                ? confirming.item.kind === "equipment" ? "Bu ekipman heybenize eklenecek. Ödemeyi onaylıyor musunuz?" : "Bu malzeme savaş çantanıza eklenecek. Ödemeyi onaylıyor musunuz?"
                : confirming.operation === "sell"
                  ? "Bu eşya heybeden kalıcı olarak silinecek ve satış bedeli verilecek. Devam edilsin mi?"
                  : "Bu eşya kalıcı olarak parçalanacak; geliştirme malzemeleri geri alınacak. Devam edilsin mi?"}
            </p>
            <div className="safak-store-confirm__price">
              {confirming.operation === "purchase" ? (
                <>
                  <span><i className="safak-store__coin" aria-hidden="true" />{numberFormat.format(confirming.item.price.gold)} altın</span>
                  <span><i className="safak-store__diamond" aria-hidden="true" />{numberFormat.format(confirming.item.price.diamonds)} elmas</span>
                </>
              ) : confirming.operation === "sell" ? (
                <>
                  <span><i className="safak-store__coin" aria-hidden="true" />+{numberFormat.format(getItemSellValue(confirming.item).gold)} altın</span>
                  <span><i className="safak-store__diamond" aria-hidden="true" />+{numberFormat.format(getItemSellValue(confirming.item).diamonds)} elmas</span>
                </>
              ) : (
                <span>Geri alınır: {getSalvageYield(confirming.item, profile.inventory.upgrades[confirming.item.id] ?? 0).ironShards} demir · {getSalvageYield(confirming.item, profile.inventory.upgrades[confirming.item.id] ?? 0).emberCrystals} kor · {getSalvageYield(confirming.item, profile.inventory.upgrades[confirming.item.id] ?? 0).sealFragments} mühür</span>
              )}
            </div>
            <div className="safak-store-confirm__actions">
              <button type="button" className="safak-store__secondary" autoFocus onClick={() => setConfirming(null)}>VAZGEÇ</button>
              <button type="button" className="safak-store__primary" onClick={confirmAction} disabled={!canManageProfile || !!busyItemId}>
                {confirming.operation === "purchase" ? "ALIŞVERİŞİ ONAYLA" : confirming.operation === "sell" ? "SAT" : "PARÇALA"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
