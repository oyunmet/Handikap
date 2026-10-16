import type { StoreItem } from "../game/store-types";

type WeaponSlot = 0 | 1;

const RARITY_LABEL: Record<StoreItem["rarity"], string> = {
  common: "Sıradan",
  rare: "Nadir",
  epic: "Destansı",
  legendary: "Efsanevi",
};

const WEAPON_ICON: Record<string, string> = {
  sword: "⚔",
  daggers: "⌁",
  axe: "⛏",
  greatsword: "⚔",
  spear: "↗",
  bow: "➶",
  mace: "✥",
  staff: "ϟ",
};

function signedPercent(value = 0) {
  const rounded = Math.round(value * 100);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function signedMeters(value = 0) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)} m`;
}

export default function WorldWeaponPicker({
  items,
  ownedItemIds,
  activeSlot,
  primaryWeaponId,
  secondaryWeaponId,
  confirmLabel,
  confirmDisabled = false,
  onSlotChange,
  onSelect,
  onConfirm,
  onClose,
}: {
  items: readonly StoreItem[];
  ownedItemIds: readonly string[];
  activeSlot: WeaponSlot;
  primaryWeaponId: string;
  secondaryWeaponId: string | null;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  onSlotChange: (slot: WeaponSlot) => void;
  onSelect: (weapon: StoreItem, slot: WeaponSlot) => void;
  onConfirm?: () => void;
  onClose: () => void;
}) {
  const owned = new Set(ownedItemIds);
  const weapons = items.filter((item) =>
    item.category === "weapons"
    && item.slot === "weapon"
    && item.kind === "equipment"
    && owned.has(item.id)
  );
  const selectedId = activeSlot === 0 ? primaryWeaponId : secondaryWeaponId;

  return (
    <div
      className="world-weapon-picker-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="world-weapon-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="world-weapon-picker-title"
      >
        <header className="world-weapon-picker__header">
          <div>
            <span className="world-weapon-picker__eyebrow">KUŞANILABİLİR SİLAHLAR</span>
            <h2 id="world-weapon-picker-title">Silahını seç</h2>
          </div>
          <button type="button" className="world-weapon-picker__close" aria-label="Silah seçimini kapat" onClick={onClose}>×</button>
        </header>
        <div className="world-weapon-picker__slots" role="group" aria-label="Hızlı silah yuvası">
          {([0, 1] as const).map((slot) => {
            const id = slot === 0 ? primaryWeaponId : secondaryWeaponId;
            const name = items.find((item) => item.id === id)?.name ?? (slot === 0 ? "Varsayılan silah" : "Silah ata");
            return (
              <button
                key={slot}
                type="button"
                className={`world-weapon-picker__slot${activeSlot === slot ? " is-active" : ""}`}
                aria-pressed={activeSlot === slot}
                onClick={() => onSlotChange(slot)}
              >
                <small>YUVA {slot + 1}</small>
                <strong>{name}</strong>
              </button>
            );
          })}
        </div>
        {weapons.length ? (
          <div className="world-weapon-picker__list">
            {weapons.map((weapon) => {
              const stats = weapon.stats;
              const active = weapon.id === selectedId;
              return (
                <button
                  key={weapon.id}
                  type="button"
                  className={`world-weapon-card rarity-${weapon.rarity}${active ? " is-equipped" : ""}`}
                  aria-pressed={active}
                  onClick={() => onSelect(weapon, activeSlot)}
                >
                  <span className="world-weapon-card__icon" aria-hidden="true">
                    {WEAPON_ICON[weapon.visual.weaponStyle ?? "sword"] ?? "⚔"}
                  </span>
                  <span className="world-weapon-card__details">
                    <strong>{weapon.name}</strong>
                    <small>{RARITY_LABEL[weapon.rarity]}{active ? " · KUŞANILDI" : ""}</small>
                    <span className="world-weapon-card__stats">
                      <i title="Hasar">⚔ {signedPercent(stats.damage)}</i>
                      <i title="Saldırı hızı">» {signedPercent(stats.attackSpeed)}</i>
                      <i title="Menzil">↔ {signedMeters(stats.attackRange)}</i>
                    </span>
                  </span>
                  <span className="world-weapon-card__action">{active ? "ETKİN" : "KUŞAN"}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="world-weapon-picker__empty">Heybende kuşanılabilir silah yok.</p>
        )}
        {confirmLabel && (
          <button
            type="button"
            className="world-weapon-picker__confirm"
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        )}
      </section>
    </div>
  );
}
