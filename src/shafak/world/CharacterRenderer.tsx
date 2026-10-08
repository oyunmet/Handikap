import { useEffect, useRef, type ComponentType } from "react";
import {
  CHARACTER_ANIMATION_BACKEND,
  CHARACTER_SPRITE_SHEET,
  getSpriteSheetFrame,
  resolveCharacterAnimationState,
  type CharacterAction,
  type CharacterAnimationBackend,
  type CharacterAnimationState,
  type CharacterLocomotion,
} from "./character-animation";

export type CharacterAnimationAdapterProps = {
  state: CharacterAnimationState;
  motionReduced: boolean;
};

export type CharacterAnimationAdapter = ComponentType<CharacterAnimationAdapterProps>;

function ProceduralCharacter() {
  return (
    <>
      <div className="world-figure__cape"><img src="/shafak-warrior.png" alt="" draggable={false} /></div>
      <img src="/shafak-warrior.png" alt="" draggable={false} />
    </>
  );
}

function SpriteSheetCharacter({ state, motionReduced }: CharacterAnimationAdapterProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const manifest = CHARACTER_SPRITE_SHEET;

  if (!manifest) {
    throw new Error("Select the sprite-sheet renderer only after its manifest and image are configured.");
  }

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return undefined;
    const rows = Math.ceil(
      Object.values(manifest.animations).reduce(
        (maximum, clip) => Math.max(maximum, clip.startFrame + clip.frames),
        0,
      ) / manifest.columns,
    );
    element.style.backgroundImage = `url("${manifest.src}")`;
    element.style.backgroundSize = `${manifest.columns * 100}% ${rows * 100}%`;

    const setFrame = (elapsed: number) => {
      const frame = getSpriteSheetFrame(manifest, state, elapsed);
      const x = manifest.columns <= 1 ? 0 : (frame.column / (manifest.columns - 1)) * 100;
      const y = rows <= 1 ? 0 : (frame.row / (rows - 1)) * 100;
      element.style.backgroundPosition = `${x}% ${y}%`;
    };

    if (motionReduced) {
      setFrame(0);
      return undefined;
    }

    let frame = 0;
    const start = performance.now();
    const animate = (now: number) => {
      setFrame((now - start) / 1000);
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [manifest, motionReduced, state]);

  return <div className="world-figure__sprite-sheet" ref={frameRef} aria-hidden="true" />;
}

export const characterAnimationAdapters: Partial<
  Record<CharacterAnimationBackend, CharacterAnimationAdapter>
> = {
  procedural: ProceduralCharacter,
  "sprite-sheet": SpriteSheetCharacter,
};

type CharacterRendererProps = {
  motion: CharacterLocomotion;
  action?: CharacterAction | null;
  motionReduced: boolean;
};

export default function CharacterRenderer({
  motion,
  action = null,
  motionReduced,
}: CharacterRendererProps) {
  const state = resolveCharacterAnimationState(motion, action);
  const Adapter = characterAnimationAdapters[CHARACTER_ANIMATION_BACKEND];

  if (!Adapter) {
    throw new Error(`No character animation adapter is registered for "${CHARACTER_ANIMATION_BACKEND}".`);
  }

  return (
    <div
      className="world-figure"
      data-motion={motion}
      data-animation-state={state}
      data-backend={CHARACTER_ANIMATION_BACKEND}
      aria-hidden="true"
    >
      <Adapter state={state} motionReduced={motionReduced} />
    </div>
  );
}
