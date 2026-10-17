import { useState } from "react";
import DuelControlsRefined from "./DuelControlsRefined";
import "./Redesign.css";

const quickItems = [
  { id: "health-potion", name: "Can iksiri", shortName: "İKSİR", icon: "✚", count: 2, cooldownSeconds: 0, disabledReason: "" },
  { id: "throwing-knife", name: "Fırlatma bıçağı", shortName: "BIÇAK", icon: "➶", count: 4, cooldownSeconds: 0, disabledReason: "" },
  { id: "stamina-potion", name: "Dayanıklılık iksiri", shortName: "GÜÇ", icon: "◈", count: 1, cooldownSeconds: 0, disabledReason: "" },
  { id: "fire-bomb", name: "Kor bombası", shortName: "KOR", icon: "✹", count: 3, cooldownSeconds: 0, disabledReason: "" },
];

export function Redesign() {
  const [activeWeaponSlot, setActiveWeaponSlot] = useState<0 | 1>(0);

  return (
    <main className="world-scene duel-preview duel-refined-preview" data-battle="fight">
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
      <div className="duel-preview__stamina">
        <span>DAYANIKLILIK</span><i><b /></i>
      </div>
      <div className="duel-refined-preview__scene-note" aria-hidden="true">
        <span>ARENA · KÜL GEÇİDİ</span>
        <i />
      </div>
      <DuelControlsRefined
        stamina={72}
        attackCooldownSeconds={0}
        skillOneSeconds={0}
        skillTwoSeconds={0}
        quickItems={quickItems}
        weaponSwapCooldownSeconds={0}
        weaponNames={["Av Bıçağı", "Uzun Yay"]}
        activeWeaponSlot={activeWeaponSlot}
        aiming={false}
        isBowActive={activeWeaponSlot === 1}
        bowCloseRange={false}
        onPress={(button) => {
          if (button === 12) setActiveWeaponSlot((slot) => slot === 0 ? 1 : 0);
        }}
        onRelease={() => undefined}
        onMove={() => undefined}
        onSurrender={() => undefined}
        onOpenHelp={() => undefined}
      />
    </main>
  );
}
