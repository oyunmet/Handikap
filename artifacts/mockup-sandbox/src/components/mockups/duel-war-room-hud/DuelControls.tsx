import { useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { INPUT_BUTTON } from "./combat-engine-stub";
import GameButton, { type GameButtonIcon } from "./GameButton";

type QuickItem = {
  id: string | null;
  name: string;
  shortName: string;
  icon: string;
  count: number;
  cooldownSeconds: number;
  disabledReason: string;
};

type DuelControlsProps = {
  disabled?: boolean;
  stamina: number;
  attackCooldownSeconds: number;
  skillOneSeconds: number;
  skillTwoSeconds: number;
  quickItems: QuickItem[];
  weaponSwapCooldownSeconds: number;
  weaponNames: readonly [string, string | null];
  activeWeaponSlot: 0 | 1;
  aiming: boolean;
  isBowActive: boolean;
  bowCloseRange: boolean;
  ammoCount: number | null;
  onPress: (button: number) => void;
  onRelease: (button: number) => void;
  onToggleAim: () => void;
  onMove: (x: number, y: number) => void;
  onSurrender: () => void;
  onOpenHelp: () => void;
};

function HeldButton({
  button,
  label,
  className,
  onPress,
  onRelease,
  cooldown = 0,
  ringSeconds = cooldown,
  disabledReason = "",
  onBlocked,
  accessibleLabel,
}: {
  button: number;
  label: string;
  className: string;
  onPress: (button: number) => void;
  onRelease: (button: number) => void;
  cooldown?: number;
  ringSeconds?: number;
  disabledReason?: string;
  onBlocked?: (reason: string) => void;
  accessibleLabel?: string;
}) {
  const pointerRef = useRef<number | null>(null);
  const pressedRef = useRef(false);
  const press = () => {
    if (pressedRef.current) return;
    if (cooldown > 0 || disabledReason) {
      onBlocked?.(disabledReason || `Hazır olması için ${cooldown.toFixed(1)} saniye bekle.`);
      return;
    }
    pressedRef.current = true;
    onPress(button);
  };
  const release = () => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    onRelease(button);
  };
  const keyHint = className.includes("attack") ? "J"
    : className.includes("block") ? "K"
      : className.includes("aim") ? "F"
        : className.includes("fire") ? "SPACE"
          : className.includes("lightning") ? "Q"
            : "";
  const icon: GameButtonIcon = className.includes("attack") ? "attack"
    : className.includes("block") ? "shield"
      : className.includes("aim") ? "aim"
        : className.includes("jump") ? "jump"
          : className.includes("fire") ? "fire"
            : className.includes("dodge") ? "dodge"
              : "lightning";
  const tone = className.includes("block") ? "teal"
    : className.includes("lightning") ? "sky"
      : className.includes("fire") ? "copper"
        : className.includes("attack") ? "copper"
          : "gold";
  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    press();
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    pointerRef.current = null;
    release();
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) press();
  };
  const onKeyUp = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") release();
  };

  return (
    <GameButton
      className={`duel-control ${className}${cooldown > 0 || disabledReason ? " is-unavailable" : ""}`}
      type="button"
      aria-label={accessibleLabel ?? label}
      aria-disabled={cooldown > 0 || !!disabledReason}
      style={{ "--duel-cooldown": `${Math.min(100, Math.max(0, ringSeconds / 6 * 100))}%` } as CSSProperties}
      label={label}
      icon={icon}
      tone={tone}
      faceSize={className.includes("attack") ? 82 : className.includes("skill") ? 56 : 64}
      hitAreaSize={className.includes("attack") ? 96 : className.includes("skill") ? 68 : 76}
      hint={keyHint}
      pressed={pressedRef.current}
      cooldownPercent={ringSeconds / 6 * 100}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={release}
    >
      {cooldown > 0 && <small className="duel-control__cooldown-label">{cooldown.toFixed(1)}</small>}
    </GameButton>
  );
}

function QuickItemIcon({ id }: { id: string }) {
  const path = id === "health_potion"
    ? "M12 21s-7-4.7-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.3-7 11-7 11Z"
    : id === "stamina_potion"
      ? "M13 2 5 13h6l-1 9 9-12h-6l1-8Z"
      : id === "venom_vial"
        ? "M9 3h6m-5 0v5l-4 4v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7l-4-4V3m-5 11h6"
        : id === "throwing_knife"
          ? "m5 19 13-14 1 7-7 1-7 6Zm8-7 5 5"
          : id === "explosive_flask"
            ? "M10 3h4m-3 0v5l-4 3v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8l-4-3V3m-5 9h10"
            : "M5 15a7 7 0 0 1 14 0c0 3-3.1 5-7 5s-7-2-7-5Zm2-6c.7-1.5 1.7-2.4 3-2.8m5 .2c1 .6 1.6 1.4 2 2.6";
  return (
    <svg className="duel-quickslot__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export default function DuelControls({
  disabled = false,
  stamina,
  attackCooldownSeconds,
  skillOneSeconds,
  skillTwoSeconds,
  onPress,
  onRelease,
  onToggleAim,
  onMove,
  onSurrender,
  onOpenHelp,
  quickItems,
  weaponSwapCooldownSeconds,
  weaponNames,
  activeWeaponSlot,
  aiming,
  isBowActive,
  bowCloseRange,
  ammoCount,
}: DuelControlsProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickPointer = useRef<number | null>(null);
  const [blockedHint, setBlockedHint] = useState("");
  const showBlockedHint = (reason: string) => {
    setBlockedHint(reason);
    window.setTimeout(() => setBlockedHint(""), 1900);
  };
  const tapAction = (button: number, reason = "") => {
    if (disabled) return;
    if (reason) {
      showBlockedHint(reason);
      return;
    }
    onPress(button);
    onRelease(button);
  };

  const readJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const element = joystickRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const nub = element.querySelector<HTMLElement>("span");
    const radius = Math.max(1, Math.min(
      (rect.width - (nub?.getBoundingClientRect().width ?? 0)) / 2,
      (rect.height - (nub?.getBoundingClientRect().height ?? 0)) / 2,
    ));
    const dx = (event.clientX - (rect.left + rect.width / 2)) / radius;
    const dy = ((rect.top + rect.height / 2) - event.clientY) / radius;
    const length = Math.hypot(dx, dy);
    const scale = length > 1 ? 1 / length : 1;
    const x = Math.max(-1, Math.min(1, dx * scale));
    const y = Math.max(-1, Math.min(1, dy * scale));
    element.style.setProperty("--stick-x", `${x * radius}px`);
    element.style.setProperty("--stick-y", `${-y * radius}px`);
    onMove(x, y);
  };
  const onJoystickDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    joystickPointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    readJoystick(event);
  };
  const onJoystickMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointer.current === event.pointerId) readJoystick(event);
  };
  const onJoystickRelease = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointer.current !== event.pointerId) return;
    joystickPointer.current = null;
    joystickRef.current?.style.setProperty("--stick-x", "0px");
    joystickRef.current?.style.setProperty("--stick-y", "0px");
    onMove(0, 0);
  };
  const activeWeapon = weaponNames[activeWeaponSlot] ?? weaponNames[0] ?? "silah";
  const isDagger = /av bıçağı|bıçak|dagger/i.test(activeWeapon);
  const ammoEmpty = isBowActive && !bowCloseRange && ammoCount !== null && ammoCount <= 0;
  const attackLabel = isBowActive
    ? bowCloseRange ? "BIÇAK" : ammoEmpty ? "OK YOK" : "ATEŞ"
    : isDagger ? "BIÇAK" : "SALDIRI";
  const attackDescription = isBowActive
    ? bowCloseRange
      ? "Av bıçağıyla yakın menzil saldırısı"
      : ammoEmpty
        ? "Ok yok. Savaş çantana ok ekle veya diğer silaha geç."
        : "Nişan kilitliyken ok kullanarak ateş et"
    : `${isDagger ? "Bıçakla saldır" : "Seçili silahla saldır"}: ${activeWeapon}`;

  return (
    <div className={`duel-controls duel-controls--field${disabled ? " is-disabled" : ""}`} aria-label="Düello kontrolleri">
      <button className="duel-forfeit" type="button" onClick={onSurrender} disabled={disabled}>PES ET</button>
      <div
        ref={joystickRef}
        className="duel-stick"
        role="application"
        aria-label="Hareket joystick'i"
        onPointerDown={onJoystickDown}
        onPointerMove={onJoystickMove}
        onPointerUp={onJoystickRelease}
        onPointerCancel={onJoystickRelease}
      >
        <span aria-hidden="true" />
      </div>
      <span className="duel-stick-caption" aria-hidden="true">HAREKET</span>
      <div className="duel-control-hint">WASD HAREKET · J SALDIRI · K SİPER · F NİŞAN · X ZIPLA · SPACE KOR · 1–4 EŞYA · V SİLAH</div>
      <button className="duel-help-button" type="button" onClick={onOpenHelp} aria-label="Düello yardımını aç">?</button>
      {blockedHint && <div className="duel-control-toast" role="status" aria-live="polite">{blockedHint}</div>}
      <div className="duel-stance-controls" aria-label="Düello hareketleri">
        <GameButton
          className={`duel-control is-stance is-aim${aiming ? " is-active" : ""}`}
          type="button"
          aria-label={`${aiming ? "Hedef kilidini bırak" : "Rakibe kilitlen"}: ${activeWeapon}`}
          aria-pressed={aiming}
          label={aiming ? "KİLİT" : "NİŞAN"}
          icon="aim"
          tone="teal"
          faceSize={56}
          hitAreaSize={68}
          hint="F"
          onClick={() => {
            if (!disabled) onToggleAim();
          }}
        />
        <GameButton
          className="duel-control is-stance is-jump"
          type="button"
          aria-label="Zıpla ve havada saldırıyla yere vur"
          label="ZIPLA"
          icon="jump"
          tone="copper"
          faceSize={56}
          hitAreaSize={68}
          hint="X"
          onClick={() => tapAction(INPUT_BUTTON.jump, stamina < 12 ? "Zıplamak için 12 dayanıklılık gerekli." : "")}
        />
      </div>
      <div className="duel-weapon-select" role="group" aria-label="Savaş silahları">
        <div className="duel-weapon-select__heading">
          <b aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 19 12-12m-3-3 6 6M4 20l4-1-3-3-1 4Zm11-15 4 4" /></svg></b>
          <span>SAVAŞ SİLAHLARI</span>
          <small className="duel-weapon-select__prompt">V: DEĞİŞTİR</small>
        </div>
        <div className="duel-weapon-select__slots">
          {([0, 1] as const).map((slot) => {
            const weaponName = weaponNames[slot];
            if (!weaponName) {
              return (
                <div
                  key={slot}
                  className="duel-weapon-select__empty"
                  role="note"
                  aria-label="II. silah yuvası boş; envanterden ikinci bir silah kuşan."
                >
                  <span>{slot === 0 ? "I" : "II"}</span>
                  <small>BOŞ YUVA</small>
                  <strong>Heybe'den farklı silah ata</strong>
                </div>
              );
            }
            const selected = activeWeaponSlot === slot;
            const waitingForSwap = !selected && weaponSwapCooldownSeconds > 0;
            const blockedReason = waitingForSwap
              ? `Silah değişimi için ${weaponSwapCooldownSeconds.toFixed(1)} saniye bekle.`
              : "";
            return (
              <button
                key={slot}
                className={`duel-weapon-select__slot${selected ? " is-active" : ""}${waitingForSwap ? " is-cooling" : ""}`}
                type="button"
                aria-label={`${slot === 0 ? "I" : "II"}. silah yuvası: ${weaponName}${selected ? ", etkin" : ", seçmek için dokun"}`}
                aria-pressed={selected}
                aria-disabled={disabled || waitingForSwap}
                disabled={disabled}
                onClick={() => {
                  if (!selected) tapAction(INPUT_BUTTON.weaponSwitch, blockedReason);
                }}
              >
                <span>{slot === 0 ? "I" : "II"}</span>
                <small>{selected ? "ETKİN" : "DOKUN · SEÇ"}</small>
                <strong>{weaponName}</strong>
                <i>{selected ? "KUŞANILDI" : waitingForSwap ? `${weaponSwapCooldownSeconds.toFixed(1)} sn` : "SEÇ"}</i>
              </button>
            );
          })}
        </div>
      </div>
      {quickItems.some((item) => item.id) && <div className="duel-quickbar" aria-label="Savaş hızlı yuvaları">
        {quickItems.map((item, index) => {
          if (!item.id) return null;
          const cooldown = item.cooldownSeconds;
          const slotButton = [
            INPUT_BUTTON.quickSlotOne,
            INPUT_BUTTON.quickSlotTwo,
            INPUT_BUTTON.quickSlotThree,
            INPUT_BUTTON.quickSlotFour,
          ][index];
          const unavailable = !item.id || item.count <= 0 || cooldown > 0 || Boolean(item.disabledReason);
          const blockedReason = !item.id
            ? "Bu hızlı yuva boş. Eşyayı Heybe'den ata."
            : item.count <= 0
              ? "Bu eşyadan heybenizde kalmadı."
              : cooldown > 0
                ? `Hazır olması için ${cooldown.toFixed(1)} saniye bekle.`
                : item.disabledReason;
          return (
            <button
              key={index}
              className={`duel-quickslot${unavailable ? " is-unavailable" : ""}${cooldown > 0 ? " is-cooling" : ""}`}
              type="button"
              aria-label={item.id
                ? `${index + 1}. yuva: ${item.name}, ${item.count} adet${cooldown > 0 ? `, ${cooldown.toFixed(1)} saniye bekleme` : ""}`
                : `${index + 1}. hızlı yuva boş`}
              aria-disabled={unavailable || disabled}
              style={{ "--duel-cooldown": `${Math.min(100, Math.max(0, cooldown / 18 * 100))}%` } as CSSProperties}
              onPointerDown={(event) => {
                event.preventDefault();
                if (unavailable) {
                  showBlockedHint(blockedReason);
                  return;
                }
                tapAction(slotButton);
              }}
              onClick={(event) => {
                if (event.detail !== 0) return;
                if (unavailable) showBlockedHint(blockedReason);
                else tapAction(slotButton);
              }}
              onKeyDown={(event) => {
                if (event.key !== " " && event.key !== "Enter") return;
                event.preventDefault();
                if (event.repeat) return;
                if (unavailable) {
                  showBlockedHint(blockedReason);
                  return;
                }
                tapAction(slotButton);
              }}
            >
              <span className="duel-quickslot__number">{index + 1}</span>
              <strong aria-hidden="true">{item.id ? <QuickItemIcon id={item.id} /> : null}</strong>
              <span className="duel-quickslot__name">{item.shortName}</span>
              <b>{item.count}</b>
              {cooldown > 0 && <small>{cooldown.toFixed(1)}</small>}
            </button>
          );
        })}
      </div>}
      <div className="duel-control-cluster">
        <div className="duel-control-cluster__skills">
          <HeldButton
            button={INPUT_BUTTON.skillOne}
            label="KOR"
            className="is-skill is-fire"
            onPress={onPress}
            onRelease={onRelease}
            cooldown={skillOneSeconds}
            disabledReason={stamina < 24 ? "KOR için 24 dayanıklılık gerekli." : ""}
            onBlocked={showBlockedHint}
          />
          <HeldButton
            button={INPUT_BUTTON.skillTwo}
            label="YILDIRIM"
            className="is-skill is-lightning"
            onPress={onPress}
            onRelease={onRelease}
            cooldown={skillTwoSeconds}
            disabledReason={stamina < 30 ? "YILDIRIM için 30 dayanıklılık gerekli." : ""}
            onBlocked={showBlockedHint}
          />
        </div>
        <div className="duel-control-cluster__actions">
          <HeldButton button={INPUT_BUTTON.block} label="SİPER" className="is-block" accessibleLabel="Siper al" onPress={onPress} onRelease={onRelease} disabledReason={stamina < 1 ? "Siper almak için dayanıklılık gerekli." : ""} onBlocked={showBlockedHint} />
          <HeldButton button={INPUT_BUTTON.attack} label={attackLabel} accessibleLabel={attackDescription} className={`is-attack${isBowActive ? " is-bow" : ""}${isBowActive && bowCloseRange ? " is-close-range" : ""}${isDagger ? " is-dagger" : ""}`} onPress={onPress} onRelease={onRelease} cooldown={attackCooldownSeconds} disabledReason={stamina < 9 ? "SALDIRI için 9 dayanıklılık gerekli." : ammoEmpty ? "Ok yok. Diğer silaha geç veya savaş çantasına ok ekle." : ""} onBlocked={showBlockedHint} />
        </div>
      </div>
    </div>
  );
}
