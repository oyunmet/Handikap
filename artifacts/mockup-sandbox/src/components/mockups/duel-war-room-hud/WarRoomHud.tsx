import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { HudButton, HudIcon, type HudButtonIconKey } from "./HudButton";
import { playGameButtonClick } from "./audio-stub";
import "./_group.css";

type EnemyMark = { id: string; x: number; z: number; alive: boolean; commander?: boolean };

function MiniMap({ enemies }: { enemies: EnemyMark[] }) {
  const pointX = (x: number) => 9 + ((Math.max(-34, Math.min(34, x)) + 34) / 68) * 102;
  const pointY = (z: number) => 9 + ((Math.max(-34, Math.min(34, z)) + 34) / 68) * 102;
  return (
    <svg className="war-room-minimap" viewBox="0 0 120 120" role="img" aria-label="Savaş alanı mini haritası">
      <rect x="2" y="2" width="116" height="116" rx="14" />
      <path d="M12 12h96v96H12zM60 12v96M12 60h96" />
      {enemies.map((enemy) => enemy.alive && <circle key={enemy.id} className={enemy.commander ? "is-commander" : ""} cx={pointX(enemy.x)} cy={pointY(enemy.z)} r={enemy.commander ? 4.8 : 2.8} />)}
      <circle className="is-heal-point" cx="89" cy="43" r="3.2" />
      <path className="war-room-minimap__player" d="M60 53 65 66 60 63 55 66Z" />
    </svg>
  );
}

function ActionButton({
  label, hint, className = "", icon, title, showHint = false, onDown, onUp, onClick,
}: {
  label: string;
  hint?: string;
  className?: string;
  icon?: HudButtonIconKey;
  title?: string;
  showHint?: boolean;
  onDown?: () => void;
  onUp?: () => void;
  onClick?: () => void;
}) {
  const pointerRef = useRef<number | null>(null);
  const [isHeld, setHeld] = useState(false);
  const actionIcon: HudButtonIconKey = icon ?? (
    className.includes("fire") ? "fire"
      : className.includes("aim") ? "aim"
        : className.includes("melee-heavy") ? "melee-heavy"
          : className.includes("melee-light") ? "knife"
            : className.includes("reload") ? "reload"
              : className.includes("jump") ? "jump"
                : className.includes("dodge") ? "crouch"
                  : className.includes("sprint") ? "sprint"
                    : className.includes("swap") ? "swap" : "weapon"
  );
  return (
    <HudButton
      type="button"
      icon={actionIcon}
      label={label}
      title={title}
      keyboardHint={showHint ? hint : undefined}
      held={isHeld}
      className={`war-room-control${showHint && hint ? " has-keyboard-hint" : ""} ${className}`}
      onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        pointerRef.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        setHeld(true);
        onDown?.();
        playGameButtonClick();
      }}
      onPointerUp={(event: ReactPointerEvent<HTMLButtonElement>) => {
        if (pointerRef.current !== event.pointerId) return;
        pointerRef.current = null;
        setHeld(false);
        onUp?.();
        onClick?.();
      }}
      onPointerCancel={(event: ReactPointerEvent<HTMLButtonElement>) => {
        if (pointerRef.current !== event.pointerId) return;
        pointerRef.current = null;
        setHeld(false);
        onUp?.();
      }}
      onLostPointerCapture={(event: ReactPointerEvent<HTMLButtonElement>) => {
        if (pointerRef.current !== event.pointerId) return;
        pointerRef.current = null;
        setHeld(false);
        onUp?.();
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (event.detail === 0) {
          onClick?.();
          playGameButtonClick();
        }
      }}
    />
  );
}

export function WarRoomHud() {
  const [muted, setMuted] = useState(false);
  const [bloodEffects, setBloodEffects] = useState(true);
  const [aiming, setAiming] = useState(false);
  const [activeWeapon, setActiveWeapon] = useState(0);
  const [notice, setNotice] = useState("İSABET · 38 HASAR");
  const [shots, setShots] = useState(18);
  const enemies: EnemyMark[] = [
    { id: "scout-a", x: -18, z: -12, alive: true },
    { id: "scout-b", x: 14, z: 8, alive: true },
    { id: "scout-c", x: -4, z: 22, alive: true },
    { id: "commander", x: 20, z: -20, alive: true, commander: true },
  ];
  const act = (label: string) => setNotice(label.toLocaleUpperCase("tr-TR"));
  const down = () => setShots((value) => Math.max(0, value - 1));

  return (
    <main className="dwh-preview war-room">
      <section className="war-room-battle">
        <div className="war-room-arena">
          <div className="arena-sun" />
          <div className="arena-fortress"><i /><i /><i /><b /></div>
          <div className="arena-ground" />
          <div className="arena-warrior arena-warrior--rival"><i /><b /><span /></div>
          <div className="arena-particles"><i /><i /><i /><i /><i /></div>
        </div>
        <div className="war-room-hud is-aiming" data-boss-phase="2">
          <div className="war-room-hud__top">
            <div className="war-room-room-indicator" aria-label="Oda 07 / sonsuz"><span>ODA</span><b>07</b><small>/ ∞</small></div>
            <div className="war-room-kill-feed" aria-live="polite" aria-label="Düşman düşürme bildirimi">
              <span>AKINCI · 00:42</span><span>GÖZCÜ · 00:31</span>
            </div>
            <div className="war-room-enemies-left"><span>KALAN DÜŞMAN</span><b>04</b></div>
            <MiniMap enemies={enemies} />
          </div>
          <button className="war-room-mute" type="button" aria-pressed={muted} onClick={() => { setMuted((value) => !value); act(muted ? "Ses açık" : "Sessiz"); }}>{muted ? "SES AÇ" : "SESSİZ"}</button>
          <button className="war-room-blood" type="button" aria-pressed={!bloodEffects} onClick={() => { setBloodEffects((value) => !value); act(bloodEffects ? "Kan efektleri kapalı" : "Hafif kan efektleri"); }}>KAN: {bloodEffects ? "HAFİF" : "KAPALI"}</button>
          <button className="war-room-settings" type="button" aria-label="Oyun ayarlarını aç" title="Oyun ayarları" onClick={() => act("Ayarlar")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Zm0-5v2m0 13.6v2m9-8.8h-2m-14 0H3m15.4-6.4L17 7m-10 10-1.4 1.4m12.8 0L17 17M7 7 5.6 5.6" /></svg></button>
          <div className="war-room-commander" data-boss-phase="2">
            <div className="war-room-commander__identity"><span>DEMİR MUHAFIZI</span><b>BAŞBUĞ KARAHAN</b></div>
            <div className="war-room-commander__health"><small>FAZ II</small><strong>214 / 360</strong></div>
            <i><em style={{ width: "59%" }} /></i>
          </div>
          <div className={`war-room-crosshair is-target${aiming ? " is-zoomed" : ""}`} aria-label="Hedef nişangâhta"><i /><i /><i /><i /></div>
          <div className="war-room-notice" aria-live="polite"><span>{notice}</span></div>
          <div className="war-room-hud__bottom">
            <div className="war-room-vitals">
              <div className="war-room-bar-row"><span>CAN</span><b>168 / 220</b></div>
              <i className="war-room-bar"><em className="is-health" style={{ width: "76%" }} /></i>
              <div className="war-room-bar-row"><span>DAYANIKLILIK</span><b>72%</b></div>
              <i className="war-room-bar"><em className="is-stamina" style={{ width: "72%" }} /></i>
            </div>
            <div className="war-room-ammo">
              <span>Kara Barut Tüfeği<small>UZUN NAMLULU</small></span>
              <HudIcon icon="ammo" className="war-room-ammo__icon" />
              <strong>{shots}<small> / 90</small></strong>
              <small>02:18 · V: DEĞİŞTİR</small>
            </div>
            <div className="war-room-touch-layout">
              <div className="war-room-weapon-select" role="group" aria-label="Silah seçimi">
                {["KARA TÜFEK", "ŞAFAK KILIÇ"].map((name, slot) => (
                  <button key={name} type="button" className={`war-room-weapon-slot${activeWeapon === slot ? " is-active" : ""}`} aria-label={`${slot + 1}. silah: ${name}`} aria-pressed={activeWeapon === slot} onClick={() => { setActiveWeapon(slot); act(`${name} kuşanıldı`); }}>
                    <span className="war-room-weapon-slot__key">{slot + 1}</span><span className="war-room-weapon-slot__icon" aria-hidden="true">{slot === 0 ? "⌁" : "╱"}</span><span className="war-room-weapon-slot__name">{name}</span>
                  </button>
                ))}
              </div>
              <div className="war-room-controls">
                <ActionButton label="Nişan" hint="SAĞ TIK" showHint className={`is-aim${aiming ? " is-active" : ""}`} onDown={() => setAiming(true)} onUp={() => setAiming(false)} />
                <ActionButton label="Doldur" hint="R" showHint className="is-reload" onClick={() => act("Şarjör dolduruluyor")} />
                <ActionButton label="Zıpla" hint="SPACE" showHint className="is-jump" onClick={() => act("Zıpla")} />
                <ActionButton label="Çömel" hint="C" showHint className="is-dodge" onClick={() => act("Çömel")} />
                <ActionButton label="Koşu" hint="X" showHint className="is-sprint-lock" onClick={() => act("Koşu kilidi")} />
                <ActionButton label="Silah değiştir" hint="V" showHint className="is-swap" onClick={() => setActiveWeapon((value) => value === 0 ? 1 : 0)} />
                <ActionButton label="Ateş" className="is-fire" onDown={down} onClick={() => act("Atış yapıldı")} />
              </div>
              <div className="war-room-stick" role="application" aria-label="Hareket joystick'i" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); act("Hareket"); }}>
                <HudIcon icon="move" className="war-room-stick__move-icon" /><i aria-hidden="true" />
              </div>
            </div>
          </div>
          <button className="war-room-pause" type="button" onClick={() => act("Savaş duraklatıldı")}>DURAKLAT · ÇIK</button>
        </div>
      </section>
    </main>
  );
}

export default WarRoomHud;
