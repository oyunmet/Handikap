import {
  WAR_ROOM_WEAPONS,
  type WarRoomWeaponId,
} from "./war-room-data";
import { isWarRoomWeaponOwned } from "./war-room-loadout";
import { WAR_ROOM_BUILD_VERSION, WAR_ROOM_WEAPON_ICONS_ENABLED } from "./war-room-features";
import {
  WAR_ROOM_DIFFICULTIES,
  WAR_ROOM_MODES,
  WAR_ROOM_MODIFIERS,
  type WarRoomDifficultyId,
  type WarRoomModeId,
  type WarRoomModifierId,
} from "./war-room-missions";
import { WarRoomWeaponIcon } from "./WarRoomWeaponIcon";
import { WAR_ROOM_MAPS, type WarRoomRoom, type WarRoomSavedProgress } from "./war-room-rooms";

type Props = {
  room: WarRoomRoom;
  dailyChallengeRoom: WarRoomRoom;
  dailyChallengeComplete: boolean;
  selectedMode: Exclude<WarRoomModeId, "daily">;
  selectedDifficulty: WarRoomDifficultyId;
  selectedModifiers: readonly WarRoomModifierId[];
  selectedMapId: string;
  onSelectMode: (mode: Exclude<WarRoomModeId, "daily">) => void;
  onSelectDifficulty: (difficulty: WarRoomDifficultyId) => void;
  onToggleModifier: (modifier: WarRoomModifierId) => void;
  onSelectMap: (mapId: string) => void;
  roomProgress: WarRoomSavedProgress;
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
  onBeginDaily: () => void;
};

export default function WarRoomBriefing({
  room,
  dailyChallengeRoom,
  dailyChallengeComplete,
  selectedMode,
  selectedDifficulty,
  selectedModifiers,
  selectedMapId,
  onSelectMode,
  onSelectDifficulty,
  onToggleModifier,
  onSelectMap,
  roomProgress,
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
  onBeginDaily,
}: Props) {
  return (
    <section className="war-room-briefing" role="dialog" aria-modal="true" aria-labelledby="war-room-title">
      <div className="war-room-briefing__backdrop" aria-hidden="true" />
      <header className="war-room-briefing__header">
        <div className="war-room-heading">
          <span className="war-room-eyebrow">YENİ OYUN MODU · TEK KİŞİLİK GÖREV · {WAR_ROOM_BUILD_VERSION}</span>
          <h1 id="war-room-title">SAVAŞ ODASI</h1>
          <p>{room.name} · {room.commanderName} ve {room.enemyCount - 1} muhafızla karşılaş.</p>
        </div>
        <button className="war-room-exit" type="button" onClick={onExit} aria-label="Ana menüye dön">GERİ</button>
      </header>
      <div className="war-room-briefing__content">
        <section className="war-room-briefing__overview" aria-label="Görev bilgileri">
          <div className="war-room-mission-options" aria-label="Görev ayarları">
            <div className="war-room-mode-grid" role="group" aria-label="Oyun modu seç">
              {WAR_ROOM_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={selectedMode === mode.id ? "is-selected" : ""}
                  aria-pressed={selectedMode === mode.id}
                  onClick={() => onSelectMode(mode.id)}
                >
                  <b>{mode.name}</b><small>{mode.description}</small>
                </button>
              ))}
            </div>
            <div className="war-room-mission-selects">
              <label>
                <span>HARİTA</span>
                <select value={selectedMapId} onChange={(event) => onSelectMap(event.currentTarget.value)}>
                  {WAR_ROOM_MAPS.map((map) => (
                    <option key={map.id} value={map.id}>{map.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>ZORLUK</span>
                <select
                  value={selectedDifficulty}
                  onChange={(event) => onSelectDifficulty(event.currentTarget.value as WarRoomDifficultyId)}
                >
                  {WAR_ROOM_DIFFICULTIES.map((difficulty) => (
                    <option key={difficulty.id} value={difficulty.id}>{difficulty.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="war-room-modifier-list" role="group" aria-label="Görev değiştiricileri">
              {WAR_ROOM_MODIFIERS.map((modifier) => (
                <label key={modifier.id}>
                  <input
                    type="checkbox"
                    checked={selectedModifiers.includes(modifier.id)}
                    onChange={() => onToggleModifier(modifier.id)}
                  />
                  <span>{modifier.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="war-room-mission-card">
            <div className="war-room-mission-card__symbol" aria-hidden="true">✦</div>
            <div>
              <span>GÖREV HEDEFİ</span>
              <strong>
                {selectedMode === "treasure"
                  ? "Süre dolmadan 5 sandık aç"
                  : selectedMode === "defense"
                    ? "Savunma noktasını koru ve komutanı yen"
                    : selectedMode === "survival"
                      ? "Sonsuz düşman dalgalarında hayatta kal"
                      : `Komutan dâhil ${room.enemyCount} düşmanı temizle`}
              </strong>
              <small>{room.name} · {room.layoutName} · {room.commanderTitle}</small>
            </div>
            <b className="war-room-enemy-count">{String(room.enemyCount).padStart(2, "0")}</b>
          </div>
          <section
            className={`war-room-daily-challenge${dailyChallengeComplete ? " is-complete" : ""}`}
            aria-label="Günlük Savaş Odası sınavı"
          >
            <span className="war-room-daily-challenge__mark" aria-hidden="true">✦</span>
            <div className="war-room-daily-challenge__copy">
              <div className="war-room-daily-challenge__eyebrow">
                <span>GÜNLÜK SINAV</span><small>HER GÜN YENİLENİR</small>
              </div>
              <strong>{dailyChallengeRoom.contract.title}</strong>
              <p>{dailyChallengeRoom.contract.description} · {dailyChallengeRoom.contract.target} hedef</p>
              <small>{dailyChallengeRoom.name} · +{dailyChallengeRoom.contract.bonusGold} altın</small>
            </div>
            <div className="war-room-daily-challenge__record" aria-label={`En iyi oda ${roomProgress.highestRoom}`}>
              <small>EN İYİ</small>
              <b>{roomProgress.highestRoom}</b>
              <small>ODA</small>
            </div>
            <button
              className="war-room-daily-challenge__start"
              type="button"
              onClick={onBeginDaily}
              disabled={!modelsReady}
            >
              {dailyChallengeComplete ? "TEKRAR OYNA" : "SINAVI BAŞLAT"}
            </button>
          </section>
        </section>
        <section className="war-room-briefing__loadout" aria-label="Silah seçimi">
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
          <div className="war-room-weapon-scroll">
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
          </div>
          {loadoutNotice && <p className="war-room-loadout-notice" role="status" aria-live="polite">{loadoutNotice}</p>}
        </section>
      </div>
      <footer className="war-room-briefing__bottom">
        <div className="war-room-briefing__bottom-copy">
          <p>WASD / joystick hareket · Fare sürükle / sağ tarafı kaydır bakış · Sol tık / ATEŞ</p>
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
        </div>
        <div className="war-room-briefing__bottom-actions">
          <small className="war-room-model-status" aria-live="polite">
            {modelsReady
              ? hasModelErrors
                ? "Bazı modeller yüklenemedi; yedek görünümler hazır."
                : "3D modeller hazır."
              : "Karakterler ve savaş alanı hazırlanıyor."}
          </small>
          <button className="war-room-start" type="button" onClick={onBegin} disabled={!modelsReady}>
            <span>{modelsReady ? "BAŞLA" : `MODELLER YÜKLENİYOR %${Math.round(modelProgress)}`}</span>
            <i aria-hidden="true">{modelsReady ? "➜" : "…"}</i>
          </button>
        </div>
      </footer>
    </section>
  );
}
