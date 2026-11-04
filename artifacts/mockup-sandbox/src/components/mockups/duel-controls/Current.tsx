import "./_group.css";
import DuelControls from "./extracted/DuelControls";

const quickItems = [
  {
    id: "health_potion",
    name: "Can İksiri",
    shortName: "CAN",
    icon: "heart",
    count: 2,
    cooldownSeconds: 0,
    disabledReason: "",
  },
  {
    id: "stamina_potion",
    name: "Dayanıklılık İksiri",
    shortName: "GÜÇ",
    icon: "lightning",
    count: 1,
    cooldownSeconds: 0,
    disabledReason: "",
  },
];

export function Current() {
  return (
    <main className="duel-preview world-scene" data-battle="fight">
      <div className="duel-preview__arena" aria-hidden="true" />
      <div className="duel-preview__health" aria-label="Düello can durumu">
        <article>
          <span>YOLCU <b>154 / 154</b></span>
          <i />
        </article>
        <strong className="duel-preview__versus">VS</strong>
        <article>
          <span>BAKIR YEMİN <b>305 / 305</b></span>
          <i />
        </article>
      </div>
      <div className="duel-preview__fighters" aria-hidden="true">
        <i />
        <i />
      </div>
      <div className="duel-aim-status">RAKİBE YAKLAŞ · SALDIRIYLA VUR</div>
      <DuelControls
        stamina={100}
        attackCooldownSeconds={0}
        skillOneSeconds={0}
        skillTwoSeconds={0}
        quickItems={quickItems}
        weaponSwapCooldownSeconds={0}
        weaponNames={["Demir Savaş Baltası", null]}
        activeWeaponSlot={0}
        isBowActive={false}
        bowCloseRange={false}
        ammoCount={null}
        onPress={() => {}}
        onRelease={() => {}}
        onMove={() => {}}
        onSurrender={() => {}}
        onOpenHelp={() => {}}
      />
    </main>
  );
}
