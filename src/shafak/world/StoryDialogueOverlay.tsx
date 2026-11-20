import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { StoryDialogue } from "./story-dialogue";
import { STORY_UI_STRINGS } from "../../data/strings.ts";

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
  const lineRef = useRef<HTMLParagraphElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const line = dialogue.lines[lineIndex] ?? "";

  useEffect(() => {
    setVisibleCharacters(0);
    if (lineRef.current) lineRef.current.scrollTop = 0;
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
    const currentLine = lineRef.current;
    if (currentLine) currentLine.scrollTop = currentLine.scrollHeight;
  }, [line, visibleCharacters]);

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
        <button ref={skipRef} className="world-story-dialogue__skip" type="button" onClick={onClose}>
          {STORY_UI_STRINGS.dialogue.skip}
        </button>
        <header className="world-story-dialogue__header">
          <div className={`world-story-dialogue__portrait is-${dialogue.portrait}`} aria-hidden="true">
            <svg viewBox="0 0 64 64" focusable="false">
              <circle cx="32" cy="32" r="30" />
              <path d="M12 55c2-12 9-18 20-18s18 6 20 18" />
              <path d="M20 26c0-10 5-16 12-16s12 6 12 16v5c0 7-5 12-12 12s-12-5-12-12z" />
              <path d="M19 28c1-11 6-17 13-17s12 6 13 17c-4-2-7-5-8-10-4 5-10 8-18 10z" />
            </svg>
          </div>
          <div className="world-story-dialogue__heading">
            <span className="world-story-dialogue__eyebrow">
              {STORY_UI_STRINGS.dialogue.eyebrow} · {dialogue.speaker}
            </span>
            <h2 id="world-story-title">{dialogue.title}</h2>
          </div>
          {dialogue.kind === "opening" && (
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt="Sunvoria"
              className="world-story-dialogue__logo"
              width="64"
              height="64"
            />
          )}
        </header>
        <p ref={lineRef} id="world-story-line" aria-live="off">{line.slice(0, visibleCharacters)}{lineIsComplete ? "" : "▌"}</p>
        <p id="world-story-hint" className="world-story-dialogue__hint">{dialogue.hint}</p>
        <div className="world-story-dialogue__footer">
          <span aria-hidden="true">{lineIndex + 1} / {dialogue.lines.length}</span>
          <button className="game-gold-button" type="button" onClick={onAdvance}>
            {lineIsComplete
              ? lineIndex === dialogue.lines.length - 1
                ? STORY_UI_STRINGS.dialogue.returnToField
                : STORY_UI_STRINGS.dialogue.continue
              : STORY_UI_STRINGS.dialogue.showCompleteLine}
          </button>
        </div>
      </div>
    </section>
  );
}
