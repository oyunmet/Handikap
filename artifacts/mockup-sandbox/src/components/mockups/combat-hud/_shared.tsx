import { useState } from "react";
import "../shafak-duel-controls/_group.css";
import DuelControls from "../shafak-duel-controls/DuelControls";
import DuelControlsRefined from "../shafak-duel-controls/DuelControlsRefined";

const quickItems = [
  { id: "health-potion", name: "Can iksiri", shortName: "CAN", icon: "＋", count: 2, cooldownSeconds: 0, disabledReason: "" },
  { id: "throwing-knife", name: "Fırlatma bıçağı", shortName: "BIÇAK", icon: "↗", count: 4, cooldownSeconds: 0, disabledReason: "" },
  { id: "stamina-potion", name: "Dayanıklılık iksiri", shortName: "GÜÇ", icon: "◇", count: 1, cooldownSeconds: 0, disabledReason: "" },
  { id: "fire-bomb", name: "Kor bombası", shortName: "KOR", icon: "✦", count: 3, cooldownSeconds: 0, disabledReason: "" },
];

function Combatant({ enemy = false }: { enemy?: boolean }) {
  return (
    <div className={`duel-preview__combatant${enemy ? " is-enemy" : ""}`}>
      <span>{enemy ? "ATEŞ MUHAFIZI" : "YOLCU"}</span>
      <i><b style={{ width: enemy ? "13%" : "36%" }} /></i>
      <small>CAN <b>{enemy ? "56 / 434" : "55 / 154"}</b></small>
    </div>
  );
}

export function DuelScreen({ refined = false, landscape = false }: { refined?: boolean; landscape?: boolean }) {
  const Controls = refined ? DuelControlsRefined : DuelControls;
  return (
    <main className={`duel-preview combat-demo ${refined ? "combat-demo--refined" : "combat-demo--current"}${landscape ? " is-landscape" : " is-portrait"}`} data-battle="fight">
      <div className="combat-demo__world" aria-hidden="true">
        <div className="combat-demo__horizon" />
        <div className="combat-demo__ground" />
        <div className="combat-demo__ruin combat-demo__ruin--left" />
        <div className="combat-demo__ruin combat-demo__ruin--right" />
        <div className="combat-demo__fighter combat-demo__fighter--player" />
        <div className="combat-demo__fighter combat-demo__fighter--enemy" />
      </div>
      <header className="duel-preview__hud">
        <Combatant />
        <div className="duel-preview__center">
          <strong>VS</strong><span>BÖLÜM BOSSU</span><small>ÖFKE FAZI · II</small>
        </div>
        <Combatant enemy />
      </header>
      <div className="duel-preview__stamina">
        <span>DAYANIKLILIK <b>47</b></span>
        <i><b /></i>
      </div>
      <div className="combat-demo__aim" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="combat-demo__source">ARENA · TAŞ AVLUSU <span>06:42</span></div>
      <Controls
        stamina={47}
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

const controls = [
  { key: "aim", label: "NİŞAN", symbol: "◎", hint: "SAĞ TIK" },
  { key: "reload", label: "DOLDUR", symbol: "↻", hint: "R" },
  { key: "jump", label: "ZIPLA", symbol: "↑", hint: "SPACE" },
  { key: "crouch", label: "ÇÖMEL", symbol: "⌄", hint: "C" },
  { key: "sprint", label: "KOŞU", symbol: "»", hint: "X" },
  { key: "swap", label: "DEĞİŞTİR", symbol: "⇄", hint: "V" },
  { key: "fire", label: "ATEŞ", symbol: "✳", hint: "" },
];

function MapGlyph() {
  return (
    <svg viewBox="0 0 100 100" className="war-hud__map-art" aria-hidden="true">
      <path d="M9 21 30 13 43 26 60 18 84 31 78 52 90 70 70 84 50 78 33 91 20 72 8 56 17 40Z" />
      <path d="m18 30 19 13 10-12 18 12-7 16 15 9M24 66l18-12 17 10 12-13M35 20l2 23m24-25 3 25" />
      <circle cx="52" cy="51" r="4" className="is-player" />
      <circle cx="24" cy="34" r="3" /><circle cx="69" cy="28" r="3" />
      <circle cx="77" cy="68" r="3" /><circle cx="37" cy="76" r="3" />
      <circle cx="58" cy="42" r="4" className="is-commander" />
    </svg>
  );
}

function StatusBar({ label, value, percent, kind }: { label: string; value: string; percent: number; kind: "health" | "stamina" }) {
  return (
    <div className={`war-hud__stat war-hud__stat--${kind}`}>
      <div><span>{label}</span><b>{value}</b></div>
      <i><em style={{ width: `${percent}%` }} /></i>
    </div>
  );
}

export function WarRoomScreen({ refined = false, landscape = false }: { refined?: boolean; landscape?: boolean }) {
  const [muted, setMuted] = useState(true);
  const [blood, setBlood] = useState(true);
  const [aiming, setAiming] = useState(false);
  const [crouched, setCrouched] = useState(false);
  const [sprinting, setSprinting] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [weapon, setWeapon] = useState(0);
  const [activeControl, setActiveControl] = useState<string | null>(null);
  const portraitAt = (distance: number, zIndex = 12) => landscape
    ? undefined
    : { position: "absolute" as const, top: `calc(100% - ${distance}px)`, bottom: "auto", zIndex };

  const action = (key: string) => {
    if (key === "aim") setAiming((value) => !value);
    if (key === "crouch") setCrouched((value) => !value);
    if (key === "sprint") setSprinting((value) => !value);
    if (key === "reload") {
      setReloading(true);
      window.setTimeout(() => setReloading(false), 1500);
    }
    if (key === "swap") setWeapon((value) => (value + 1) % 2);
    if (key === "fire") setActiveControl("fire");
    if (key === "jump") setActiveControl("jump");
  };

  return (
    <main className={`war-hud combat-demo ${refined ? "war-hud--refined" : "war-hud--current"}${landscape ? " is-landscape" : " is-portrait"}`}>
      <div className="war-hud__world" aria-hidden="true">
        <div className="war-hud__ridge" />
        <div className="war-hud__ground" />
        <div className="war-hud__wall war-hud__wall--left" />
        <div className="war-hud__wall war-hud__wall--right" />
        <div className="war-hud__distant-keep" />
      </div>

      <header className="war-hud__top">
        <div className="war-hud__room"><span>ODA</span><b>1</b><small>/ ∞</small></div>
        <div className="war-hud__feed"><span>Yolcu → Arbaletçi</span><span>−9 CAN · Kale Nöbetçisi</span></div>
        <div className="war-hud__remaining"><span>KALAN DÜŞMAN</span><b>08</b></div>
        <div className="war-hud__map"><MapGlyph /><small>SEKTÖR 01</small></div>
      </header>

      <div className="war-hud__top-actions">
        <button type="button" onClick={() => setBlood((value) => !value)} aria-pressed={!blood}>KAN: {blood ? "HAFİF" : "KAPALI"}</button>
        <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted}>{muted ? "SESSİZ" : "SES AÇ"}</button>
        <button type="button" className="war-hud__settings" aria-label="Oyun ayarları" onClick={() => setActiveControl("settings")}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19.3 13.2 1.2.9-1.4 2.4-1.4-.5a7.6 7.6 0 0 1-1.5.9l-.2 1.5h-2.8l-.3-1.5a7.7 7.7 0 0 1-1.5-.9l-1.4.5-1.4-2.4 1.2-.9a6.8 6.8 0 0 1 0-1.8l-1.2-.9 1.4-2.4 1.4.5a7.7 7.7 0 0 1 1.5-.9l.3-1.5h2.8l.2 1.5a7.6 7.6 0 0 1 1.5.9l1.4-.5 1.4 2.4-1.2.9a6.8 6.8 0 0 1 0 1.8Z" /></svg>
        </button>
      </div>

      <section className="war-hud__commander" aria-label="Komutan canı">
        <div className="war-hud__commander-title"><small>KUŞATMA KOMUTANI</small><b>KIZIL KOMUTAN</b></div>
        <div className="war-hud__boss-phase"><small>FAZ I</small><b>360 / 360</b></div>
        <i><em /></i>
      </section>

      <div className={`war-hud__crosshair${aiming ? " is-aiming" : ""}`} aria-label="Nişangâh"><i /><i /><i /><i /></div>
      <div className="war-hud__notice">−9 CAN · Kale Nöbetçisi</div>

      <section className="war-hud__vitals" style={portraitAt(102)} aria-label="Oyuncu durumu">
        <StatusBar label="CAN" value="123 / 220" percent={56} kind="health" />
        <StatusBar label="DAYANIKLILIK" value="100%" percent={100} kind="stamina" />
      </section>

      <section className="war-hud__weapon" style={portraitAt(242)} aria-label="Silah ve mühimmat">
        <span>{weapon === 0 ? "KARA BARUT TÜFEĞİ" : "KILIÇ ARBALETİ"}<small>{weapon === 0 ? "OTOMATİK TÜFEK" : "TEK ATIŞ"}</small></span>
        <b>{reloading ? "DOLDURULUYOR" : "22"}{!reloading && <small> / 90</small>}</b>
        <i>00:12 · V: DEĞİŞTİR</i>
      </section>

      <div className="war-hud__weapon-slots" style={landscape ? undefined : { ...portraitAt(211, 13), left: 12, transform: "none" }} role="group" aria-label="Silah seçimi">
        <button type="button" className={weapon === 0 ? "is-active" : ""} onClick={() => setWeapon(0)}><small>1</small><b>⌁</b><span>Kara Barut T.</span></button>
        <button type="button" className={weapon === 1 ? "is-active" : ""} onClick={() => setWeapon(1)}><small>2</small><b>⌁</b><span>Kılıç Arbaleti</span></button>
      </div>

      <div className={`war-hud__stick${activeControl === "move" ? " is-active" : ""}`} style={portraitAt(136, 14)} role="button" aria-label="Hareket joystick'i" onPointerDown={() => setActiveControl("move")} onPointerUp={() => setActiveControl(null)}><span>+</span></div>

      <div className="war-hud__controls" style={portraitAt(188, 15)} aria-label="Savaş kontrolleri">
        {controls.map((control) => (
          <button
            key={control.key}
            type="button"
            className={`war-hud__control is-${control.key}${(control.key === "aim" && aiming) || (control.key === "crouch" && crouched) || (control.key === "sprint" && sprinting) || activeControl === control.key ? " is-active" : ""}`}
            aria-label={control.label}
            aria-pressed={(control.key === "aim" && aiming) || (control.key === "crouch" && crouched) || (control.key === "sprint" && sprinting)}
            onClick={() => action(control.key)}
          >
            <span className="war-hud__symbol">{control.symbol}</span><b>{control.key === "crouch" && crouched ? "YAT" : control.label}</b>{control.hint && <small>{control.hint}</small>}
          </button>
        ))}
      </div>

      <button className="war-hud__pause" type="button" onClick={() => setPaused((value) => !value)}>{paused ? "DEVAM ET" : "DURAKLAT · ÇIK"}</button>
      {paused && <div className="war-hud__paused"><span>KUŞATMA DURAKLATILDI</span><b>DEVAM ETMEK İÇİN DOKUN</b></div>}
      {activeControl === "settings" && (
        <div className="war-hud__settings-sheet" role="dialog" aria-label="Oyun ayarları">
          <span>SAHA AYARLARI</span>
          <b>Kontroller · Ses · Görüntü</b>
          <button type="button" onClick={() => setActiveControl(null)}>KAPAT</button>
        </div>
      )}
    </main>
  );
}
