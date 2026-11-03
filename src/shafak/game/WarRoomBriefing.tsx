import {
  WAR_ROOM_WEAPONS,
  type WarRoomWeaponId,
} from "./war-room-data";
import { isWarRoomWeaponOwned } from "./war-room-loadout";
import { WAR_ROOM_BUILD_VERSION, WAR_ROOM_WEAPON_ICONS_ENABLED } from "./war-room-features";
import { WarRoomWeaponIcon } from "./WarRoomWeaponIcon";
import type { WarRoomRoom } from "./war-room-rooms";

type Props = {
  room: WarRoomRoom;
  ownedItemIds: readonly string[];
  loadout: readonly [WarRoomWeaponId, WarRoomWeaponId];
  selectedSlot: 0 | 1;
  onSelectSlot: (slot: 0 | 1) => void;
  onSelectWeapon: (weaponId: WarRoomWeaponId) => void;
  loadoutNotice: string;
  modelsReady: boolean;
  modelProgress: number;
  hasModelErrors: boolean;
  onExit: () => void;
  onBegin: () => void;
};

export default function WarRoomBriefing({
  room,
  ownedItemIds,
  loadout,
  selectedSlot,
  onSelectSlot,
  onSelectWeapon,
  loadoutNotice,
  modelsReady,
  modelProgress,
  hasModelErrors,
  onExit,
  onBegin,
}: Props) {
  return (
    <section className="war-room-briefing" role="dialog" aria-modal="true" aria-labelledby="war-room-title">
      <div className="war-room-briefing__backdrop" aria-hidden="true" />
      <button className="war-room-exit" type="button" onClick={onExit} aria-label="Ana menüye dön">ÇIKIŞ</button>
      <header className="war-room-heading">
        <span className="war-room-eyebrow">YENİ OYUN MODU · TEK KİŞİLİK GÖREV · {WAR_ROOM_BUILD_VERSION}</span>
        <h1 id="war-room-title">SAVAŞ ODASI</h1>
        <p>{room.name} · {room.commanderName} ve {room.enemyCount - 1} muhafızla karşılaş.</p>
      </header>
      <div className="war-room-briefing__content">
        <div className="war-room-mission-card">
          <div className="war-room-mission-card__symbol" aria-hidden="true">✦</div>
          <div>
            <span>GÖREV HEDEFİ</span>
            <strong>Komutan dâhil {room.enemyCount} düşmanı temizle</strong>
            <small>{room.commanderTitle} · {room.layoutName} · Siper al ve komutanın işaretini takip et.</small>
          </div>
          <b className="war-room-enemy-count">{String(room.enemyCount).padStart(2, "0")}</b>
        </div>
        <div className="war-room-loadout-head">
          <div>
            <span className="war-room-eyebrow">SAVAŞ ÖNCESİ HAZIRLIK</span>
            <h2>İki silah kuşan</h2>
          </div>
          <div className="war-room-slot-tabs" role="group" aria-label="Silah yuvası seç">
            {([0, 1] as const).map((slot) => (
              <button
                key={slot}
                type="button"
                className={selectedSlot === slot ? "is-selected" : ""}
                aria-pressed={selectedSlot === slot}
                onClick={() => onSelectSlot(slot)}
              >
                {slot === 0 ? "I · ANA" : "II · YEDEK"}
              </button>
            ))}
          </div>
        </div>
        <div className="war-room-weapon-grid">
          {WAR_ROOM_WEAPONS.map((weapon) => {
            const selected = loadout[selectedSlot] === weapon.id;
            const otherSlot = selectedSlot === 0 ? 1 : 0;
            const otherSlotSelected = loadout[otherSlot] === weapon.id;
            const owned = isWarRoomWeaponOwned(weapon.id, ownedItemIds);
            return (
              <button
                key={weapon.id}
                type="button"
                className={`war-room-weapon-card${selected ? " is-selected" : ""}`}
                aria-pressed={selected}
                aria-disabled={!owned}
                title={!owned ? "Satın alınmadı; seçmek için mağazadan al." : undefined}
                onClick={() => onSelectWeapon(weapon.id)}
              >
                {WAR_ROOM_WEAPON_ICONS_ENABLED
                  ? <WarRoomWeaponIcon className="war-room-weapon-card__icon" weaponId={weapon.id} />
                  : <span className="war-room-weapon-card__icon" aria-hidden="true">{weapon.icon}</span>}
                <span className="war-room-weapon-card__copy">
                  <b>{weapon.name}</b>
                  <small>
                    {weapon.className} · {weapon.rarity ?? "Sıradan"} · {weapon.weaponClass === "melee"
                      ? `${weapon.range.toFixed(1)} m · sınırsız`
                      : `${weapon.magazine} mermi`}
                  </small>
                </span>
                <span className="war-room-weapon-card__status">
                  {selected ? "SEÇİLİ" : otherSlotSelected ? `YUVA ${otherSlot + 1}` : owned ? "SEÇ" : "SATIN AL"}
                </span>
              </button>
            );
          })}
        </div>
        {loadoutNotice && <p className="war-room-loadout-notice" role="status" aria-live="polite">{loadoutNotice}</p>}
        <div className="war-room-briefing__bottom">
          <p>WASD / joystick hareket · Fare sürükle / sağ tarafı kaydır bakış · Sol tık / ATEŞ</p>
          <button className="war-room-start" type="button" onClick={onBegin} disabled={!modelsReady}>
            <span>{modelsReady ? "BAŞLA" : `MODELLER YÜKLENİYOR %${Math.round(modelProgress)}`}</span>
            <i aria-hidden="true">{modelsReady ? "➜" : "…"}</i>
          </button>
          <div
            className="war-room-model-progress"
            role="progressbar"
            aria-label="Savaş Odası modelleri"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(modelProgress)}
          >
            <i style={{ width: `${Math.max(0, Math.min(100, modelProgress))}%` }} />
          </div>
          <small className="war-room-model-status" aria-live="polite">
            {modelsReady
              ? hasModelErrors
                ? "Bazı modeller yüklenemedi; yedek görünümler hazır."
                : "3D modeller hazır."
              : "Karakterler ve savaş alanı hazırlanıyor."}
          </small>
        </div>
      </div>
    </section>
  );
}
