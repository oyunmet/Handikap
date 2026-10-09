import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PlayerProfile } from "../profile";
import { getUpgradeCost, MAX_UPGRADE_LEVEL, type EquipmentStatBonuses, type StoreItem, type StoreTab } from "../store-types";
import { getItemBonuses } from "../store-utils";
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
  onClose(): void;
  onPurchase(itemId: string): void;
  onEquip(itemId: string): void;
  onUpgrade(itemId: string): void;
  renderPreview(item: StoreItem): ReactNode;
};

const tabs: { id: StoreTab; label: string }[] = [
  { id: "weapons", label: "SİLAHLAR" },
  { id: "armor", label: "ZIRH/KOSTÜM" },
  { id: "capes", label: "PELERİN" },
  { id: "effects", label: "EFEKTLER" },
  { id: "inventory", label: "ENVANTER" },
];

const equippedIdBySlot = {
  weapon: "weaponId",
  armor: "armorId",
  cape: "capeId",
  effect: "effectId",
  dye: "dyeId",
} as const;

const statLabels: Record<keyof EquipmentStatBonuses, string> = {
  health: "Can",
  damage: "Hasar",
  defense: "Savunma",
  critChance: "Kritik şansı",
  moveSpeed: "Hareket hızı",
  lightRadius: "Işık alanı",
  attackSpeed: "Saldırı hızı",
  attackRange: "Saldırı menzili",
};

const rarityLabels = {
  common: "Sıradan",
  rare: "Nadir",
  epic: "Destansı",
  legendary: "Efsanevi",
} as const;

const numberFormat = new Intl.NumberFormat("tr-TR");

function formatStat(value: number, key: keyof EquipmentStatBonuses) {
  const percentStats: (keyof EquipmentStatBonuses)[] = ["damage", "defense", "critChance", "moveSpeed", "attackSpeed"];
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
  onClose,
  onPurchase,
  onEquip,
  onUpgrade,
  renderPreview,
}: StorePanelProps) {
  const [activeTab, setActiveTab] = useState<StoreTab>("weapons");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<StoreItem | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const ownedIds = profile.inventory.ownedItemIds;
  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds]);
  const visibleItems = useMemo(() => {
    if (activeTab === "inventory") return items.filter((item) => ownedSet.has(item.id));
    if (activeTab === "effects") return items.filter((item) => item.category === "effects" || item.category === "dyes");
    return items.filter((item) => item.category === activeTab);
  }, [activeTab, items, ownedSet]);
  const selected = visibleItems.find((item) => item.id === selectedId) ?? visibleItems[0] ?? null;

  const canManageProfile = isGuest || accountReady;
  const currentItem = selected
    ? items.find((item) => item.id === profile.equipment[equippedIdBySlot[selected.slot]])
    : undefined;
  const selectedBonuses = selected ? getItemBonuses(selected, profile) : undefined;
  const currentBonuses = currentItem ? getItemBonuses(currentItem, profile) : undefined;
  const affordable = selected
    ? profile.gold >= selected.price.gold && profile.diamonds >= selected.price.diamonds
    : false;
  const selectedOwned = selected ? ownedSet.has(selected.id) : false;
  const isEquipped = selected
    ? profile.equipment[equippedIdBySlot[selected.slot]] === selected.id
    : false;
  const upgradeLevel = selected ? profile.inventory.upgrades[selected.id] ?? 0 : 0;
  const isBusy = selected ? busyItemId === selected.id : false;
  const upgradeCost = selected?.upgradeable && upgradeLevel < MAX_UPGRADE_LEVEL
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (confirming) setConfirming(null);
      else onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirming, onClose]);

  const handlePurchase = () => {
    if (!selected || !canManageProfile || !affordable || busyItemId) return;
    setConfirming(selected);
  };

  const confirmPurchase = () => {
    if (!confirming || !canManageProfile || busyItemId) return;
    if (profile.gold < confirming.price.gold || profile.diamonds < confirming.price.diamonds) {
      setConfirming(null);
      return;
    }
    onPurchase(confirming.id);
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
        className="safak-store"
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
                <span className="safak-store__section-kicker">{activeTab === "inventory" ? "YOL ARKADAŞLARIN" : "USTANIN TEZGAHI"}</span>
                <h3>{tabs.find((tab) => tab.id === activeTab)?.label}</h3>
              </div>
              <span className="safak-store__count">{loading ? "…" : `${visibleItems.length} eşya`}</span>
            </div>

            {loading ? (
              <div className="safak-store__skeletons" aria-label="Eşyalar yükleniyor" aria-busy="true">
                {[0, 1, 2, 3].map((index) => <div className="safak-store__skeleton" key={index} />)}
              </div>
            ) : visibleItems.length ? (
              <div className="safak-store__items">
                {visibleItems.map((item) => {
                  const owned = ownedSet.has(item.id);
                  const equipped = profile.equipment[equippedIdBySlot[item.slot]] === item.id;
                  const isNew = profile.inventory.newItemIds.includes(item.id);
                  return (
                    <button
                      className={`safak-store__item${selected?.id === item.id ? " is-selected" : ""}${equipped ? " is-equipped" : ""}`}
                      key={item.id}
                      type="button"
                      aria-pressed={selected?.id === item.id}
                      aria-label={`${item.name}, ${rarityLabels[item.rarity]}${equipped ? ", kuşanıldı" : owned ? ", heybenizde" : ", kilitli"}${isNew ? ", yeni" : ""}`}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <span className="safak-store__item-topline">
                        <span className={`safak-store__rarity rarity-${item.rarity}`}>{rarityLabels[item.rarity]}</span>
                        {isNew && <span className="safak-store__new">YENİ</span>}
                      </span>
                      <span className="safak-store__item-name">{item.name}</span>
                      <span className="safak-store__item-summary">{item.summary}</span>
                      <span className={`safak-store__item-status${equipped ? " status-equipped" : owned ? " status-owned" : " status-locked"}`}>
                        {equipped ? "KUŞANILDI" : owned ? "HEYBEDE" : "KİLİTLİ"}
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
                  <div className="safak-store__preview-art">{renderPreview(selected)}</div>
                  <span className="safak-store__preview-caption">{selected.name}</span>
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
                </div>

                <section className="safak-store__stats" aria-labelledby="store-stats-title">
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
                          {currentItem ? `${formatStat(difference, statKey)} fark` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </section>

                <div className="safak-store__upgrade-line">
                  <span>{selected.upgradeable ? "Sonraki geliştirme" : "Geliştirilebilir"}</span>
                  <b>{selected.upgradeable && upgradeCost
                    ? `${upgradeLevel}/${MAX_UPGRADE_LEVEL} · ${upgradeCost.gold} altın · ${upgradeCost.ironShards} demir · ${upgradeCost.emberCrystals} kor${upgradeCost.sealFragments ? ` · ${upgradeCost.sealFragments} ✦` : ""}`
                    : selected.upgradeable ? `En yüksek seviye · ${MAX_UPGRADE_LEVEL}/${MAX_UPGRADE_LEVEL}` : "Hayır"}</b>
                </div>

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
                {!canManageProfile && (
                  <p className="safak-store__funds-warning" role="status">Hesap hazır olduğunda bu eşyayla işlem yapabilirsin.</p>
                )}

                <div className="safak-store__actions">
                  {!selectedOwned ? (
                    <button
                      className="safak-store__primary"
                      type="button"
                      onClick={handlePurchase}
                      disabled={!canManageProfile || !affordable || loading || !!busyItemId}
                    >
                      {isBusy ? "İŞLENİYOR…" : "SATIN AL"}
                    </button>
                  ) : (
                    <>
                      <button
                        className="safak-store__primary"
                        type="button"
                        onClick={() => onEquip(selected.id)}
                        disabled={!canManageProfile || isEquipped || loading || !!busyItemId}
                      >
                        {isBusy ? "İŞLENİYOR…" : isEquipped ? "KUŞANILDI" : "KUŞAN"}
                      </button>
                      {selected.upgradeable && (
                        <button
                          className="safak-store__secondary"
                          type="button"
                          onClick={() => onUpgrade(selected.id)}
                          disabled={!canManageProfile || upgradeLevel >= MAX_UPGRADE_LEVEL || !canAffordUpgrade || loading || !!busyItemId}
                        >
                          {upgradeLevel >= MAX_UPGRADE_LEVEL ? "EN YÜKSEK SEVİYE" : "GELİŞTİR"}
                        </button>
                      )}
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
          </div>
        )}

        <footer className="safak-store__footer">
          <span>Yolcu, iyi donanım uzak yolları kolaylaştırır.</span>
          <span>ŞAFAK SAVAŞÇILARI <i>·</i> HEYBE</span>
        </footer>
      </section>

      {confirming && (
        <div className="safak-store-confirm-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setConfirming(null);
        }}>
          <section className="safak-store-confirm" role="alertdialog" aria-modal="true" aria-labelledby="store-confirm-title" aria-describedby="store-confirm-copy">
            <span className="safak-store__eyebrow">ALIŞVERİŞİ ONAYLA</span>
            <h3 id="store-confirm-title">{confirming.name}</h3>
            <p id="store-confirm-copy">Bu eşya heybeni kalıcı olarak dolduracak. Ödemeyi onaylıyor musun?</p>
            <div className="safak-store-confirm__price">
              <span><i className="safak-store__coin" aria-hidden="true" />{numberFormat.format(confirming.price.gold)} altın</span>
              <span><i className="safak-store__diamond" aria-hidden="true" />{numberFormat.format(confirming.price.diamonds)} elmas</span>
            </div>
            <div className="safak-store-confirm__actions">
              <button type="button" className="safak-store__secondary" autoFocus onClick={() => setConfirming(null)}>VAZGEÇ</button>
              <button type="button" className="safak-store__primary" onClick={confirmPurchase} disabled={!canManageProfile || !!busyItemId}>ALIŞVERİŞİ ONAYLA</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
