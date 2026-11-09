type WarRoomStoreActionsProps = {
  itemId: string;
  primaryEquipped: boolean;
  secondaryEquipped: boolean;
  disabled: boolean;
  busy: boolean;
  onEquip(itemId: string, slotIndex: 0 | 1): void;
};

export default function WarRoomStoreActions({
  itemId,
  primaryEquipped,
  secondaryEquipped,
  disabled,
  busy,
  onEquip,
}: WarRoomStoreActionsProps) {
  return (
    <>
      <p className="safak-store__funds-warning" role="status">
        Savaş Odası ana ve yedek yuvalarından birini seç. Bu silah kampanya veya düello donanımını değiştirmez.
      </p>
      <button
        className="safak-store__primary"
        type="button"
        aria-pressed={primaryEquipped}
        onClick={() => onEquip(itemId, 0)}
        disabled={disabled || primaryEquipped}
      >
        {busy ? "İŞLENİYOR…" : primaryEquipped ? "ANA YUVA · KUŞANILDI" : "ANA YUVA · KUŞAN"}
      </button>
      <button
        className="safak-store__secondary"
        type="button"
        aria-pressed={secondaryEquipped}
        onClick={() => onEquip(itemId, 1)}
        disabled={disabled || secondaryEquipped}
      >
        {busy ? "İŞLENİYOR…" : secondaryEquipped ? "YEDEK YUVA · KUŞANILDI" : "YEDEK YUVA · KUŞAN"}
      </button>
    </>
  );
}
