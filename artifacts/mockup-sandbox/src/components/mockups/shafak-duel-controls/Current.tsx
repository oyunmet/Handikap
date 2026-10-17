import "./_group.css";
import DuelControls from "./DuelControls";

const quickItems = [
  { id: "health-potion", name: "Can iksiri", shortName: "İKSİR", icon: "✚", count: 2, cooldownSeconds: 0, disabledReason: "" },
  { id: "throwing-knife", name: "Fırlatma bıçağı", shortName: "BIÇAK", icon: "➶", count: 4, cooldownSeconds: 0, disabledReason: "" },
  { id: "stamina-potion", name: "Dayanıklılık iksiri", shortName: "GÜÇ", icon: "◈", count: 1, cooldownSeconds: 0, disabledReason: "" },
  { id: "fire-bomb", name: "Kor bombası", shortName: "KOR", icon: "✹", count: 3, cooldownSeconds: 0, disabledReason: "" },
];

export function Current() {
  return (
    <main className="world-scene duel-preview" data-battle="fight">
      <div className="duel-preview__backdrop" aria-hidden="true" />
      <header className="duel-preview__hud">
        <div className="duel-preview__combatant">
          <span>ŞAFAK ŞÖVALYESİ</span>
          <i><b style={{ width: "76%" }} /></i>
          <small>CAN <b>760 / 1.000</b></small>
        </div>
        <strong className="duel-preview__versus">VS</strong>
        <div className="duel-preview__combatant is-enemy">
          <span>GECE NÖBETÇİSİ</span>
          <i><b style={{ width: "64%" }} /></i>
          <small>CAN <b>640 / 1.000</b></small>
        </div>
      </header>
      <div className="duel-preview__stamina"><span>DAYANIKLILIK</span><i><b /></i></div>
      <DuelControls
        stamina={72}
        attackCooldownSeconds={0}
        skillOneSeconds={0}
        skillTwoSeconds={0}
        quickItems={quickItems}
        weaponSwapCooldownSeconds={0}
        weaponNames={["Av Bıçağı", "Gölge Kılıcı"] as const}
        activeWeaponSlot={0}
        aiming={false}
        isBowActive={false}
        bowCloseRange={false}
        onPress={() => undefined}
        onRelease={() => undefined}
        onMove={() => undefined}
        onSurrender={() => undefined}
        onOpenHelp={() => undefined}
      />
    </main>
  );
}
