import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { StoryDialogue } from "./story-dialogue";

export default function StoryDialogueOverlay({
  dialogue,
  onClose,
  motionReduced,
}: {
  dialogue: StoryDialogue;
  onClose: () => void;
  motionReduced: boolean;
}) {
  const [lineIndex, setLineIndex] = useState(0);
  const [visibleCharacters, setVisibleCharacters] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const line = dialogue.lines[lineIndex] ?? "";

  useEffect(() => {
    setVisibleCharacters(0);
  }, [dialogue.id, lineIndex]);

  useEffect(() => {
    if (visibleCharacters >= line.length) return undefined;
    const timer = window.setTimeout(
      () => setVisibleCharacters((current) => current + 1),
      motionReduced ? 1 : 22,
    );
    return () => window.clearTimeout(timer);
  }, [line.length, motionReduced, visibleCharacters]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    skipRef.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [dialogue.id, onClose]);

  const onAdvance = () => {
    if (visibleCharacters < line.length) {
      setVisibleCharacters(line.length);
      return;
    }
    if (lineIndex < dialogue.lines.length - 1) {
      setVisibleCharacters(0);
      setLineIndex((current) => current + 1);
      return;
    }
    onClose();
  };

  const lineIsComplete = visibleCharacters >= line.length;
  return (
    <section
      ref={dialogRef}
      className="world-story-dialogue"
      role="dialog"
      aria-modal="true"
      aria-labelledby="world-story-title"
      aria-describedby="world-story-line world-story-hint"
    >
      <div className="world-story-dialogue__card">
        <button ref={skipRef} className="world-story-dialogue__skip" type="button" onClick={onClose}>ATLA</button>
        <span className="world-story-dialogue__eyebrow">ŞAFAK SAVAŞÇILARI · {dialogue.speaker}</span>
        <h2 id="world-story-title">{dialogue.title}</h2>
        <p id="world-story-line" aria-live="off">{line.slice(0, visibleCharacters)}{lineIsComplete ? "" : "▌"}</p>
        <p id="world-story-hint" className="world-story-dialogue__hint">{dialogue.hint}</p>
        <div className="world-story-dialogue__footer">
          <span aria-hidden="true">{lineIndex + 1} / {dialogue.lines.length}</span>
          <button className="game-gold-button" type="button" onClick={onAdvance}>
            {lineIsComplete ? lineIndex === dialogue.lines.length - 1 ? "YOLA DÖN" : "DEVAM" : "TAMAMINI GÖR"}
          </button>
        </div>
      </div>
    </section>
  );
}
