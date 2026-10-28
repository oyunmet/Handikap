import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  CONTROLS_CONFIG,
  createDefaultWarRoomControlLayout,
  fitWarRoomControlLayoutToStage,
  moveWarRoomControl,
  resizeWarRoomControl,
  type WarRoomControlId,
  type WarRoomControlLayout,
} from "./war-room-controls";

type Props = {
  layout: WarRoomControlLayout;
  onChange: (layout: WarRoomControlLayout) => void;
  onSave: () => boolean;
  onCancel: () => void;
};

export default function WarRoomControlsEditor({ layout, onChange, onSave, onCancel }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: WarRoomControlId; pointerId: number } | null>(null);
  const [selectedId, setSelectedId] = useState<WarRoomControlId>("fire");
  const [saveError, setSaveError] = useState(false);
  const selected = layout[selectedId];

  useEffect(() => {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const fittedLayout = fitWarRoomControlLayoutToStage(layout, bounds.width, bounds.height);
    if (fittedLayout !== layout) onChange(fittedLayout);
  }, [layout, onChange]);

  const moveDraggedControl = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !stage) return;
    const bounds = stage.getBoundingClientRect();
    onChange(moveWarRoomControl(
      layout,
      drag.id,
      (event.clientX - bounds.left) / Math.max(1, bounds.width),
      (event.clientY - bounds.top) / Math.max(1, bounds.height),
      bounds.width,
      bounds.height,
    ));
  };

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: WarRoomControlId) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id, pointerId: event.pointerId };
    setSelectedId(id);
  };

  return (
    <section className="war-room-control-editor" role="dialog" aria-modal="true" aria-labelledby="war-room-control-editor-title">
      <div className="war-room-control-editor__scrim" />
      <div
        className="war-room-control-editor__stage"
        ref={stageRef}
        onPointerMove={moveDraggedControl}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
        }}
        onPointerCancel={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
        }}
      >
        {CONTROLS_CONFIG.map((control) => {
          const position = layout[control.id];
          const scale = position.size / 100;
          return (
            <button
              key={control.id}
              type="button"
              className={`war-room-control-editor__item${selectedId === control.id ? " is-selected" : ""}${control.id === "move-stick" ? " is-stick" : ""}${control.id === "fire" ? " is-fire" : ""}`}
              style={{
                left: `${position.x * 100}%`,
                top: `${position.y * 100}%`,
                width: `${control.width * scale}px`,
                height: `${control.height * scale}px`,
                opacity: position.opacity,
              }}
              aria-label={`${control.label} kontrolünü taşımak için sürükle`}
              aria-pressed={selectedId === control.id}
              onPointerDown={(event) => beginDrag(event, control.id)}
              onPointerUp={(event) => {
                if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
              }}
              onLostPointerCapture={(event) => {
                if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
              }}
              onClick={() => setSelectedId(control.id)}
            >
              <span aria-hidden="true">{control.symbol}</span>
              <b>{control.label}</b>
            </button>
          );
        })}
      </div>

      <aside className="war-room-control-editor__panel">
        <span className="war-room-control-editor__eyebrow">SAVAŞ ODASI · DOKUNMATİK HUD</span>
        <h2 id="war-room-control-editor-title">Kontrolleri düzenle</h2>
        <p>Sürükleyerek taşı. Seçili kontrol: <strong>{CONTROLS_CONFIG.find((control) => control.id === selectedId)?.label}</strong></p>
        <label>
          <span>Boyut <output>{selected.size}%</output></span>
          <input
            aria-label="Kontrol boyutu"
            type="range"
            min="70"
            max="140"
            step="1"
            value={selected.size}
            onChange={(event) => {
              const bounds = stageRef.current?.getBoundingClientRect();
              if (!bounds) return;
              onChange(resizeWarRoomControl(
                layout,
                selectedId,
                Number(event.currentTarget.value),
                bounds.width,
                bounds.height,
              ));
            }}
          />
        </label>
        <label>
          <span>Saydamlık <output>{Math.round(selected.opacity * 100)}%</output></span>
          <input
            aria-label="Kontrol saydamlığı"
            type="range"
            min="20"
            max="100"
            step="1"
            value={Math.round(selected.opacity * 100)}
            onChange={(event) => onChange({
              ...layout,
              [selectedId]: { ...selected, opacity: Number(event.currentTarget.value) / 100 },
            })}
          />
        </label>
        {saveError && <small className="war-room-control-editor__error" role="status">Tarayıcı kayda izin vermedi; düzenleme bu oturumda kullanılabilir.</small>}
        <div className="war-room-control-editor__actions">
          <button
            type="button"
            className="is-reset"
            onClick={() => {
              setSaveError(false);
              const defaults = createDefaultWarRoomControlLayout();
              const bounds = stageRef.current?.getBoundingClientRect();
              onChange(bounds
                ? fitWarRoomControlLayoutToStage(defaults, bounds.width, bounds.height)
                : defaults);
            }}
          >
            Varsayılana dön
          </button>
          <button type="button" className="is-cancel" onClick={onCancel}>Vazgeç</button>
          <button type="button" className="is-save" onClick={() => setSaveError(!onSave())}>Kaydet</button>
        </div>
      </aside>
    </section>
  );
}
