import DuelControls from "./DuelControls";
import "./preview.css";

const quickItems = [
  { id: "health-potion", name: "Can iksiri", shortName: "CAN", icon: "♥", count: 2, cooldownSeconds: 0, disabledReason: "" },
  { id: "throwing-knife", name: "Fırlatma bıçağı", shortName: "BIÇAK", icon: "⚔", count: 4, cooldownSeconds: 0, disabledReason: "" },
  { id: "stamina-potion", name: "Dayanıklılık iksiri", shortName: "GÜÇ", icon: "ϟ", count: 1, cooldownSeconds: 0, disabledReason: "" },
  { id: "fire-bomb", name: "Kor şişesi", shortName: "KOR", icon: "✹", count: 3, cooldownSeconds: 0, disabledReason: "" },
];

function HealthBar({ name, value, enemy = false }: { name: string; value: number; enemy?: boolean }) {
  const percentage = `${Math.max(0, Math.min(100, value))}%`;
  return (
    <div className={`duel-health${enemy ? " duel-health--bot" : ""}`}>
      <div className="duel-health__label">
        <span>{name}</span>
        <b>{Math.round(value * 10)}<i> / 1.000</i></b>
      </div>
      <div className="duel-health__track">
        <i className="duel-health__trail" style={{ width: percentage }} />
        <i className="duel-health__fill" style={{ width: percentage }} />
      </div>
    </div>
  );
}

export function PreviewFrame() {
  return (
    <main className="world-scene duel-preview" data-battle="fight">
      <div className="duel-preview__backdrop" aria-hidden="true">
        <div className="duel-preview__ruins" />
        <div className="duel-preview__arena" />
        <div className="duel-preview__fighter duel-preview__fighter--hero"><i /><b /></div>
        <div className="duel-preview__fighter duel-preview__fighter--rival"><i /><b /></div>
      </div>
      <header className="duel-hud" aria-label="Düello sağlık durumu">
        <HealthBar name="YOLCU" value={76} />
        <div className="duel-hud__center"><span>VS</span><strong>ELİT RAKİP</strong></div>
        <HealthBar name="DEMİR YEMİN" value={64} enemy />
      </header>
      <div className="duel-player-stamina">
        <span>DAYANIKLILIK</span><b>72</b>
        <i className="duel-player-stamina__track">
          <i className="duel-player-stamina__trail" style={{ width: "72%" }} />
          <i className="duel-player-stamina__fill" style={{ width: "72%" }} />
        </i>
      </div>
      <div className="duel-aim-status" role="status">RAKİBE YAKLAŞ · SALDIRIYLA VUR</div>
      <DuelControls
        stamina={72}
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
        onPress={() => undefined}
        onRelease={() => undefined}
        onMove={() => undefined}
        onSurrender={() => undefined}
        onOpenHelp={() => undefined}
      />
    </main>
  );
}
