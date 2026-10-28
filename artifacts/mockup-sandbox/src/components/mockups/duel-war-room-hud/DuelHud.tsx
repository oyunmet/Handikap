import { useState } from "react";
import DuelControls from "./DuelControls";
import "./_group.css";

function DuelHealthBar({
  label,
  hp,
  maxHp,
  side,
}: {
  label: string;
  hp: number;
  maxHp: number;
  side: "player" | "bot";
}) {
  const percent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  return (
    <div className={`duel-health duel-health--${side}`}>
      <div className="duel-health__label"><span>{label}</span><b>{Math.ceil(hp)} <i>/ {maxHp}</i></b></div>
      <div className={`duel-health__track${percent <= 25 ? " is-low" : ""}`} role="meter" aria-label={`${label} canı`} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={Math.ceil(hp)}>
        <i className="duel-health__trail" style={{ width: `${Math.min(100, percent + 8)}%` }} />
        <i className="duel-health__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function DuelStaminaBar({ stamina, maxStamina }: { stamina: number; maxStamina: number }) {
  const percent = Math.max(0, Math.min(100, (stamina / maxStamina) * 100));
  return (
    <div className="duel-player-stamina" aria-label={`Dayanıklılık ${Math.ceil(stamina)} / ${maxStamina}`}>
      <span>DAYANIKLILIK</span><b>{Math.ceil(stamina)}</b>
      <i className="duel-player-stamina__track" role="meter" aria-valuemin={0} aria-valuemax={maxStamina} aria-valuenow={Math.ceil(stamina)}>
        <i className="duel-player-stamina__trail" style={{ width: `${percent}%` }} />
        <i className="duel-player-stamina__fill" style={{ width: `${percent}%` }} />
      </i>
    </div>
  );
}

export function DuelHud() {
  const [aiming, setAiming] = useState(true);
  const [weaponSlot, setWeaponSlot] = useState<0 | 1>(0);
  const [action, setAction] = useState("HEDEF KİLİTLİ · SALDIRIYA HAZIR");
  const [hp, setHp] = useState(71);
  const press = (button: number) => {
    setAction(button === 10 ? "KESKİN SALDIRI" : button === 9 ? "SİPER ALINDI" : button === 7 ? "KOR YÜKLENDİ" : button === 8 ? "YILDIRIM HAZIR" : "HAREKET");
    if (button === 10) setHp((value) => Math.max(1, value - 1));
  };
  const release = () => {};
  const move = () => setAction("HAREKET");

  return (
    <main className="dwh-preview duel-preview">
      <section className="world-scene duel-scene" aria-label="Şafak Savaşçıları düello alanı">
        <div className="world-stage">
          <div className="world-stage__sky" />
          <div className="world-stage__horizon" />
          <div className="world-plane world-plane--ridge" />
          <div className="world-plane world-plane--haze" />
          <div className="world-plane world-plane--road" />
          <div className="arena-pillars"><i /><i /><i /></div>
          <div className="arena-sun" />
          <div className="arena-warrior arena-warrior--player"><i /><b /><span /></div>
          <div className="arena-warrior arena-warrior--rival"><i /><b /><span /></div>
          <div className="world-vignette" />
        </div>
        <section className="duel-hud" aria-label="Düello durumu">
          <DuelHealthBar label="ARAS" hp={hp} maxHp={100} side="player" />
          <div className="duel-hud__center"><span>VS</span><strong>DÜELLO</strong><small className="duel-combo-chain">3 VURUŞ · KOMBO</small></div>
          <DuelHealthBar label="KARA VEYRAN" hp={53} maxHp={90} side="bot" />
        </section>
        <DuelStaminaBar stamina={64} maxStamina={100} />
        <div className="duel-aim-status is-active" role="status" aria-live="polite">{action}</div>
        <DuelControls
          stamina={64}
          attackCooldownSeconds={0}
          skillOneSeconds={0}
          skillTwoSeconds={2.4}
          quickItems={[
            { id: "health_potion", name: "Şifa İksiri", shortName: "ŞİFA", icon: "", count: 2, cooldownSeconds: 0, disabledReason: "" },
            { id: "stamina_potion", name: "Direnç İksiri", shortName: "DİRENÇ", icon: "", count: 1, cooldownSeconds: 0, disabledReason: "" },
            { id: "venom_vial", name: "Zehir Şişesi", shortName: "ZEHİR", icon: "", count: 3, cooldownSeconds: 0, disabledReason: "" },
            { id: "throwing_knife", name: "Fırlatma Bıçağı", shortName: "BIÇAK", icon: "", count: 4, cooldownSeconds: 0, disabledReason: "" },
          ]}
          weaponSwapCooldownSeconds={0}
          weaponNames={["Şafak Kılıcı", "Kül Yayı"]}
          activeWeaponSlot={weaponSlot}
          aiming={aiming}
          isBowActive={weaponSlot === 1}
          bowCloseRange={false}
          ammoCount={7}
          onPress={press}
          onRelease={release}
          onToggleAim={() => setAiming((value) => !value)}
          onMove={move}
          onSurrender={() => setAction("DÜELLOYA DEVAM EDİLİYOR")}
          onOpenHelp={() => setAction("KONTROLLER: J SALDIRI · K SİPER · X ZIPLA")}
        />
      </section>
    </main>
  );
}

export default DuelHud;
