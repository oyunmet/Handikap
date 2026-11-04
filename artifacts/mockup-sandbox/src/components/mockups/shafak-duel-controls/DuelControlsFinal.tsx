import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { INPUT_BUTTON } from "./combat-engine";
import "./_group.css";
import "./DuelControlsFinal.css";

type Item = {
  id: "health" | "knife" | "stamina" | "ember";
  name: string;
  shortName: string;
  count: number;
};

function SymbolIcon({ name, className = "" }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    sword: "M5 19 18 6m-4 0h4v4M4 5l5 5",
    shield: "M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z",
    jump: "M12 20V5m-6 6 6-6 6 6M5 20h14",
    flame: "M12 3c1 4-3 5-1 8 1-2 3-3 4-5 4 5 4 9 1 12-3 3-9 1-9-4 0-4 3-6 5-11Z",
    bolt: "M13 2 5 13h6l-1 9 9-12h-6l1-8Z",
    heart: "M20.8 8.7c0 4.7-8.8 10-8.8 10s-8.8-5.3-8.8-10A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6Z",
    dagger: "m5 19 13-14 1 7-7 1-7 6Zm8-7 5 5",
    vial: "M9 3h6m-5 0v5l-4 4v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7l-4-4V3m-5 11h6",
    mark: "M12 3v18M3 12h18M5.6 5.6l12.8 12.8m0-12.8L5.6 18.4",
  };
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name] ?? paths.sword} />
    </svg>
  );
}

function Duelist({ rival = false }: { rival?: boolean }) {
  return (
    <svg className={`sdf-duelist${rival ? " is-rival" : ""}`} viewBox="0 0 120 220" aria-hidden="true">
      <ellipse cx="60" cy="207" rx="34" ry="7" fill="rgba(9,10,12,.55)" />
      <path d="M45 74 26 91l7 65 27 17 26-18 7-66-19-16Z" fill={rival ? "#31353b" : "#967144"} stroke="#d5b785" strokeOpacity=".45" strokeWidth="2" />
      <path d="m43 79-17 17 8 34 17-12Zm34 0 18 17-8 34-17-12Z" fill={rival ? "#55565a" : "#c19653"} />
      <path d="m46 153-12 16-4 28 13 3 13-31 2-16Zm29 0 11 16 5 28-13 3-13-31-2-16Z" fill={rival ? "#292e33" : "#4a3930"} stroke="rgba(232,207,162,.34)" strokeWidth="2" />
      <path d="M45 37c1-16 28-20 34-2l-2 31c-7 12-22 11-30 0Z" fill={rival ? "#43342d" : "#c2a366"} stroke="#e8cf9d" strokeOpacity=".52" strokeWidth="2" />
      <path d="M43 44c3-17 28-21 37-5l-4-17-19-6-15 12Z" fill={rival ? "#282b30" : "#d6b66d"} />
      <path d="M49 52h5m11 0h5" stroke="#1b2023" strokeWidth="3" strokeLinecap="round" />
      <path d="m47 94-17 27-15 10 5 8 23-10 16-23Zm31 0 17 22 15 6-3 9-23-5-19-20Z" fill={rival ? "#343a40" : "#a77a42"} stroke="#d9c08f" strokeOpacity=".45" strokeWidth="2" />
      {!rival && <path d="M17 130 4 111l7-3 12 17m88-2 3-56 4 1 3 60-8 5Z" fill="#c2c2b7" stroke="#695944" strokeWidth="2" />}
      {rival && <path d="m102 118 7-46 4 1-2 53Z" fill="#b5b0a1" />}
    </svg>
  );
}

function QuickItemIcon({ id }: { id: Item["id"] }) {
  const icon = id === "health" ? "heart" : id === "knife" ? "dagger" : id === "stamina" ? "bolt" : "vial";
  return <SymbolIcon name={icon} className="sdf-item-icon" />;
}

export function DuelControlsFinal() {
  const stickRef = useRef<HTMLDivElement>(null);
  const stickPointer = useRef<number | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const [activeWeapon, setActiveWeapon] = useState<0 | 1>(0);
  const [health, setHealth] = useState(760);
  const [enemyHealth, setEnemyHealth] = useState(640);
  const [stamina, setStamina] = useState(72);
  const [lastAction, setLastAction] = useState("HEDEF KİLİTLİ · SAVAŞA HAZIR");
  const [counts, setCounts] = useState([2, 4, 1, 3]);
  const [stickDirection, setStickDirection] = useState("HAREKET");
  const items: Item[] = [
    { id: "health", name: "Can iksiri", shortName: "CAN", count: counts[0] },
    { id: "knife", name: "Fırlatma bıçağı", shortName: "BIÇAK", count: counts[1] },
    { id: "stamina", name: "Dayanıklılık iksiri", shortName: "GÜÇ", count: counts[2] },
    { id: "ember", name: "Kor şişesi", shortName: "KOR", count: counts[3] },
  ];
  const attackName = activeWeapon === 1 ? "ATEŞ" : "BIÇAK";

  const notify = (message: string) => {
    setLastAction(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setLastAction("HEDEF KİLİTLİ · SAVAŞA HAZIR"), 2200);
  };

  const readStick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const element = stickRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const radius = Math.max(1, (Math.min(rect.width, rect.height) - 42) / 2);
    const dx = (event.clientX - (rect.left + rect.width / 2)) / radius;
    const dy = ((rect.top + rect.height / 2) - event.clientY) / radius;
    const length = Math.hypot(dx, dy);
    const scale = length > 1 ? 1 / length : 1;
    const x = Math.max(-1, Math.min(1, dx * scale));
    const y = Math.max(-1, Math.min(1, dy * scale));
    element.style.setProperty("--stick-x", `${x * radius}px`);
    element.style.setProperty("--stick-y", `${-y * radius}px`);
    setStickDirection(Math.abs(x) > Math.abs(y) ? (x > 0 ? "SAĞA" : "SOLA") : (y > 0 ? "İLERİ" : "GERİ"));
  };

  const releaseStick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (stickPointer.current !== event.pointerId) return;
    stickPointer.current = null;
    stickRef.current?.style.setProperty("--stick-x", "0px");
    stickRef.current?.style.setProperty("--stick-y", "0px");
    setStickDirection("HAREKET");
  };

  const useAction = (button: number, label: string) => {
    if (button === INPUT_BUTTON.attack) {
      if (stamina < 9) return notify("SALDIRI İÇİN 9 DAYANIKLILIK GEREKLİ");
      setEnemyHealth((value) => Math.max(0, value - (activeWeapon === 1 ? 31 : 38)));
      setStamina((value) => Math.max(0, value - 9));
    } else if (button === INPUT_BUTTON.jump) {
      if (stamina < 12) return notify("ZIPLAMAK İÇİN 12 DAYANIKLILIK GEREKLİ");
      setStamina((value) => Math.max(0, value - 12));
    } else if (button === INPUT_BUTTON.block) {
      if (stamina < 1) return notify("SİPER İÇİN DAYANIKLILIK GEREKLİ");
      setStamina((value) => Math.max(0, value - 1));
    } else if (button === INPUT_BUTTON.skillOne || button === INPUT_BUTTON.skillTwo) {
      const cost = button === INPUT_BUTTON.skillOne ? 24 : 30;
      if (stamina < cost) return notify(`${label} İÇİN ${cost} DAYANIKLILIK GEREKLİ`);
      setStamina((value) => Math.max(0, value - cost));
      setEnemyHealth((value) => Math.max(0, value - (button === INPUT_BUTTON.skillOne ? 48 : 55)));
    }
    notify(`${label} · HEDEF ÜZERİNDE`);
  };

  const useItem = (item: Item, index: number) => {
    if (item.count <= 0) return notify(`${item.shortName} TÜKENDİ`);
    setCounts((current) => current.map((value, slot) => slot === index ? value - 1 : value));
    if (item.id === "health") setHealth((value) => Math.min(1000, value + 145));
    if (item.id === "stamina") setStamina((value) => Math.min(100, value + 28));
    if (item.id === "knife") setEnemyHealth((value) => Math.max(0, value - 42));
    if (item.id === "ember") setEnemyHealth((value) => Math.max(0, value - 56));
    notify(`${item.name.toLocaleUpperCase("tr-TR")} KULLANILDI`);
  };

  return (
    <main className="shafak-duel-final" aria-label="Şafak düello kontrol önizlemesi">
      <div className="sdf-sky" aria-hidden="true">
        <div className="sdf-moon" />
        <div className="sdf-ridge sdf-ridge--far" />
        <div className="sdf-ridge sdf-ridge--near" />
        <div className="sdf-ruins">
          {[0, 1, 2, 3, 4, 5, 6].map((piece) => (
            <i key={piece} className={`sdf-ruin ruin-${piece}`} />
          ))}
        </div>
        <div className="sdf-ground" />
        <div className="sdf-torch sdf-torch--left"><i /></div>
        <div className="sdf-torch sdf-torch--right"><i /></div>
      </div>
      <div className="sdf-vignette" aria-hidden="true" />

      <header className="sdf-top">
        <div className="sdf-brandline">
          <span className="sdf-crest">S</span>
          <div><strong>ŞAFAK</strong><small>KÜL GEÇİDİ · DÜELLO</small></div>
          <button className="sdf-forfeit" type="button" onClick={() => notify("DÜELLODAN AYRILMAK İÇİN ONAY GEREKİR")}>ÇEKİL</button>
        </div>
        <div className="sdf-health-panel">
          <div className="sdf-fighter">
            <div className="sdf-fighter__caption"><span>ŞAFAK ŞÖVALYESİ</span><b>{health}<i> / 1.000</i></b></div>
            <div className="sdf-healthbar"><i style={{ width: `${health / 10}%` }} /></div>
          </div>
          <b className="sdf-versus">VS</b>
          <div className="sdf-fighter is-enemy">
            <div className="sdf-fighter__caption"><span>GECE NÖBETÇİSİ</span><b>{enemyHealth}<i> / 1.000</i></b></div>
            <div className="sdf-healthbar"><i style={{ width: `${enemyHealth / 10}%` }} /></div>
          </div>
        </div>
        <div className="sdf-stamina">
          <div><span>DAYANIKLILIK</span><b>{stamina}<i> / 100</i></b></div>
          <i className="sdf-stamina__track"><b style={{ width: `${stamina}%` }} /></i>
        </div>
      </header>

      <div className="sdf-target-banner" role="status">{lastAction}</div>

      <section className="sdf-arena" aria-label="Kül Geçidi savaş alanı">
        <div className="sdf-arena__coordinates" aria-hidden="true"><span>03 : 17</span><i /><span>ELİT RAKİP</span></div>
        <div className="sdf-characters" aria-hidden="true">
          <div className="sdf-character sdf-character--hero"><Duelist /></div>
          <div className="sdf-character sdf-character--enemy"><Duelist rival /></div>
        </div>
        <div className="sdf-target-marker" aria-hidden="true"><SymbolIcon name="mark" /></div>
        <div className="sdf-arena__groundlabel" aria-hidden="true">KÜL GEÇİDİ <span>·</span> ARENA II</div>
      </section>

      <div
        ref={stickRef}
        className="sdf-joystick"
        role="application"
        aria-label="Hareket joystick'i"
        onPointerDown={(event) => {
          if (stickPointer.current !== null) return;
          event.preventDefault();
          stickPointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          readStick(event);
        }}
        onPointerMove={(event) => { if (stickPointer.current === event.pointerId) readStick(event); }}
        onPointerUp={releaseStick}
        onPointerCancel={releaseStick}
        onLostPointerCapture={releaseStick}
      >
        <span className="sdf-joystick__ring" aria-hidden="true" />
        <span className="sdf-joystick__nub" aria-hidden="true" />
        <small>{stickDirection}</small>
      </div>

      <section className="sdf-combat" aria-label="Savaş eylemleri">
        <div className="sdf-combat__skills">
          <button type="button" className="sdf-action sdf-action--skill sdf-action--ember" aria-label="Kor becerisi" onClick={() => useAction(INPUT_BUTTON.skillOne, "KOR")}>
            <SymbolIcon name="flame" /><span>KOR</span><small>Q</small>
          </button>
          <button type="button" className="sdf-action sdf-action--skill sdf-action--storm" aria-label="Yıldırım becerisi" onClick={() => useAction(INPUT_BUTTON.skillTwo, "YILDIRIM")}>
            <SymbolIcon name="bolt" /><span>YILDIRIM</span><small>E</small>
          </button>
        </div>
        <div className="sdf-combat__main">
          <button type="button" className="sdf-action sdf-action--jump" aria-label="Zıpla" onClick={() => useAction(INPUT_BUTTON.jump, "ZIPLA")}>
            <SymbolIcon name="jump" /><span>ZIPLA</span><small>X</small>
          </button>
          <button type="button" className="sdf-action sdf-action--guard" aria-label="Siper al" onClick={() => useAction(INPUT_BUTTON.block, "SİPER")}>
            <SymbolIcon name="shield" /><span>SİPER</span><small>K</small>
          </button>
          <button type="button" className="sdf-action sdf-action--attack" aria-label={`${attackName} saldırısı`} onClick={() => useAction(INPUT_BUTTON.attack, attackName)}>
            <SymbolIcon name="sword" /><span>{attackName}</span><small>J</small>
          </button>
        </div>
        <span className="sdf-combat__caption">SAVAŞ EYLEMLERİ</span>
      </section>

      <section className="sdf-loadout" aria-label="Silahlar ve hızlı kullanım eşyaları">
        <div className="sdf-loadout__heading"><span>DONANIM</span><i /><small>V · SİLAH DEĞİŞTİR</small></div>
        <div className="sdf-weapons" role="group" aria-label="Silah yuvaları">
          <button type="button" className={`sdf-weapon${activeWeapon === 0 ? " is-active" : ""}`} aria-pressed={activeWeapon === 0} onClick={() => { setActiveWeapon(0); notify("AV BIÇAĞI KUŞANILDI"); }}>
            <span className="sdf-weapon__slot">I</span><SymbolIcon name="sword" /><span className="sdf-weapon__text"><small>{activeWeapon === 0 ? "ETKİN" : "SİLAH 01"}</small><b>AV BIÇAĞI</b></span><i>{activeWeapon === 0 ? "KUŞANILDI" : "SEÇ"}</i>
          </button>
          <button type="button" className={`sdf-weapon${activeWeapon === 1 ? " is-active" : ""}`} aria-pressed={activeWeapon === 1} onClick={() => { setActiveWeapon(1); notify("UZUN YAY KUŞANILDI"); }}>
            <span className="sdf-weapon__slot">II</span><SymbolIcon name="dagger" /><span className="sdf-weapon__text"><small>{activeWeapon === 1 ? "ETKİN" : "SİLAH 02"}</small><b>UZUN YAY</b></span><i>{activeWeapon === 1 ? "KUŞANILDI" : "SEÇ"}</i>
          </button>
        </div>
        <div className="sdf-items" role="group" aria-label="Hızlı kullanım eşyaları">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`sdf-item${item.count === 0 ? " is-empty" : ""}`}
              aria-label={`${index + 1}. yuva: ${item.name}, ${item.count} adet`}
              disabled={item.count === 0}
              onClick={() => useItem(item, index)}
            >
              <span className="sdf-item__number">{index + 1}</span>
              <QuickItemIcon id={item.id} />
              <span className="sdf-item__name">{item.shortName}</span>
              <b>{item.count}</b>
            </button>
          ))}
        </div>
      </section>

      <div className="sdf-bottom-hint" aria-hidden="true"><span>THUMB CONTROLS</span><i /> ARENA LIVE</div>
    </main>
  );
}
