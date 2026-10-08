export type CharacterAnimationState =
  | "idle"
  | "walk"
  | "run"
  | "attack"
  | "block"
  | "dodge"
  | "hit"
  | "die";

export type CharacterLocomotion = "idle" | "walking" | "running" | "stopped";
export type CharacterAction = Extract<CharacterAnimationState, "attack" | "block" | "dodge" | "hit" | "die">;
export type CharacterAnimationBackend = "procedural" | "sprite-sheet" | "skeletal";

export type SpriteSheetClip = {
  startFrame: number;
  frames: number;
  framesPerSecond: number;
  loop: boolean;
};

export type SpriteSheetManifest = {
  src: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  animations: Record<CharacterAnimationState, SpriteSheetClip>;
};

export const CHARACTER_ANIMATION_BACKEND: CharacterAnimationBackend = "procedural";
export const CHARACTER_SPRITE_SHEET: SpriteSheetManifest | null = null;

export function resolveCharacterAnimationState(
  locomotion: CharacterLocomotion,
  action: CharacterAction | null = null,
): CharacterAnimationState {
  if (action) return action;
  if (locomotion === "running") return "run";
  if (locomotion === "walking") return "walk";
  return "idle";
}

export function getSpriteSheetFrame(
  manifest: SpriteSheetManifest,
  state: CharacterAnimationState,
  elapsedSeconds: number,
) {
  if (!manifest.src || manifest.frameWidth <= 0 || manifest.frameHeight <= 0 || manifest.columns <= 0) {
    throw new Error("Sprite-sheet animation needs a source image, frame dimensions, and columns.");
  }

  const clip = manifest.animations[state];
  if (
    !clip
    || !Number.isInteger(clip.startFrame)
    || clip.startFrame < 0
    || !Number.isInteger(clip.frames)
    || clip.frames < 1
    || !Number.isFinite(clip.framesPerSecond)
    || clip.framesPerSecond <= 0
  ) {
    throw new Error(`Sprite-sheet clip "${state}" is missing or invalid.`);
  }

  const elapsedFrames = Math.max(0, Math.floor((Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0) * clip.framesPerSecond));
  const clipFrame = clip.loop ? elapsedFrames % clip.frames : Math.min(elapsedFrames, clip.frames - 1);
  const frame = clip.startFrame + clipFrame;

  return { frame, column: frame % manifest.columns, row: Math.floor(frame / manifest.columns) };
}
