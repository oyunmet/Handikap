export type CharacterAnimationState =
  | "idle"
  | "walk"
  | "run"
  | "attack"
  | "heavyAttack"
  | "block"
  | "dodge"
  | "backflip"
  | "jump"
  | "plunge"
  | "hit"
  | "die";

export type CharacterLocomotion = "idle" | "walking" | "running" | "stopped";
export type CharacterAction = Extract<CharacterAnimationState, "attack" | "heavyAttack" | "block" | "dodge" | "backflip" | "jump" | "plunge" | "hit" | "die">;
export type CharacterAnimationBackend = "procedural" | "sprite-sheet" | "skeletal";
export type CharacterWeaponStyle = "sword" | "daggers" | "axe" | "greatsword" | "spear" | "bow" | "mace" | "staff";

export type ProceduralAttackPose = {
  strike: number;
  rightShoulderX: number;
  rightShoulderZ: number;
  leftShoulderX: number;
  leftShoulderZ: number;
  rightElbowX: number;
  leftElbowX: number;
  wristX: number;
  wristZ: number;
  bodyLean: number;
  bodyTwist: number;
};

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

export function resolveWorldPlayerAnimationState(
  locomotion: CharacterLocomotion,
  jumpHeight: number,
  action: CharacterAction | null = null,
): CharacterAnimationState {
  if (action) return action;
  if (Number.isFinite(jumpHeight) && jumpHeight > 0.12) return "jump";
  return resolveCharacterAnimationState(locomotion);
}

function smoothStep(edge0: number, edge1: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function getProceduralAttackPose(
  progress: number,
  weaponStyle: CharacterWeaponStyle = "sword",
  heavy = false,
): ProceduralAttackPose {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const windup = 1 - smoothStep(0.03, 0.24, p);
  const strike = smoothStep(0.12, 0.4, p) * (1 - smoothStep(0.66, 0.9, p));
  const force = heavy ? 1.16 : 1;
  let pose: Omit<ProceduralAttackPose, "strike" | "bodyLean" | "bodyTwist">;

  switch (weaponStyle) {
    case "daggers":
      pose = {
        rightShoulderX: -0.22 * windup + 1.3 * strike,
        rightShoulderZ: -0.1 + 0.22 * strike,
        leftShoulderX: -0.12 * windup + 1.12 * strike,
        leftShoulderZ: 0.12 - 0.26 * strike,
        rightElbowX: 0.38 * windup - 0.08 * strike,
        leftElbowX: 0.34 * windup - 0.06 * strike,
        wristX: -0.04 - 0.22 * strike,
        wristZ: -0.2 + 0.35 * strike,
      };
      break;
    case "spear":
      pose = {
        rightShoulderX: -0.12 * windup + 1.18 * strike,
        rightShoulderZ: 0.02 + 0.04 * strike,
        leftShoulderX: 0.06 + 0.25 * strike,
        leftShoulderZ: -0.08,
        rightElbowX: 0.3 * windup - 0.16 * strike,
        leftElbowX: 0.12,
        wristX: -0.55 - 0.35 * strike,
        wristZ: -0.04,
      };
      break;
    case "axe":
    case "mace":
      pose = {
        rightShoulderX: -0.32 * windup + 1.52 * force * strike,
        rightShoulderZ: -0.22 + 0.56 * strike,
        leftShoulderX: 0.08 + 0.32 * strike,
        leftShoulderZ: 0.08,
        rightElbowX: 0.52 * windup + 0.12 * strike,
        leftElbowX: 0.1,
        wristX: -0.12 - 0.24 * strike,
        wristZ: -0.3 + 0.34 * strike,
      };
      break;
    case "greatsword":
      pose = {
        rightShoulderX: -0.18 * windup + 1.25 * force * strike,
        rightShoulderZ: -0.48 + 0.82 * strike,
        leftShoulderX: 0.24 + 0.66 * strike,
        leftShoulderZ: 0.42 - 0.26 * strike,
        rightElbowX: 0.36 * windup - 0.1 * strike,
        leftElbowX: 0.28 - 0.18 * strike,
        wristX: -0.08 - 0.18 * strike,
        wristZ: -0.2 + 0.48 * strike,
      };
      break;
    case "bow":
      pose = {
        rightShoulderX: 0.3 + 0.18 * strike,
        rightShoulderZ: -0.12,
        leftShoulderX: 0.72 + 0.14 * strike,
        leftShoulderZ: 0.22,
        rightElbowX: 0.24,
        leftElbowX: 0.42 - 0.12 * strike,
        wristX: -0.04,
        wristZ: -0.08,
      };
      break;
    case "staff":
      pose = {
        rightShoulderX: 0.2 + 0.55 * strike,
        rightShoulderZ: -0.22 + 0.22 * strike,
        leftShoulderX: 0.3 + 0.28 * strike,
        leftShoulderZ: 0.18,
        rightElbowX: 0.24 * windup,
        leftElbowX: 0.3,
        wristX: -0.18 - 0.28 * strike,
        wristZ: 0.04,
      };
      break;
    default:
      pose = {
        rightShoulderX: -0.24 * windup + 1.42 * force * strike,
        rightShoulderZ: -0.16 + 0.5 * strike,
        leftShoulderX: 0.08 + 0.34 * strike,
        leftShoulderZ: -0.04,
        rightElbowX: 0.45 * windup - 0.12 * strike,
        leftElbowX: 0.12,
        wristX: -0.1 - 0.28 * strike,
        wristZ: -0.18 + 0.34 * strike,
      };
  }

  return {
    ...pose,
    strike,
    bodyLean: -0.055 * windup + (heavy ? 0.2 : 0.12) * strike,
    bodyTwist: (weaponStyle === "greatsword" || weaponStyle === "axe" || weaponStyle === "mace" ? 0.28 : 0.1) * strike,
  };
}

export function getProceduralAttackDuration(
  state: Extract<CharacterAnimationState, "attack" | "heavyAttack" | "plunge">,
  weaponStyle: CharacterWeaponStyle = "sword",
) {
  const tempo = weaponStyle === "daggers" ? 1.14
    : weaponStyle === "axe" || weaponStyle === "mace" ? 0.88
      : weaponStyle === "greatsword" ? 0.8
        : weaponStyle === "spear" ? 1.04
          : 1;
  const duration = state === "plunge" ? 0.62 : state === "heavyAttack" ? 0.52 : 0.36;
  return duration / tempo;
}

export function getSpeakingGesturePose(time: number) {
  const beat = Math.sin((Number.isFinite(time) ? time : 0) * 5.2);
  return {
    leftShoulderX: 0.68 + Math.max(0, beat) * 0.14,
    leftShoulderZ: 0.25 + beat * 0.055,
    leftElbowX: 0.34 + Math.max(0, beat) * 0.14,
    rightShoulderX: 0.28 + Math.max(0, beat) * 0.2,
    rightShoulderZ: -0.1 - beat * 0.04,
    rightElbowX: 0.16 + Math.max(0, beat) * 0.12,
    bodyTwist: beat * 0.018,
  };
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
