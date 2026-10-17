import type { CharacterAnimationState } from "./character-animation";
import type { ModelMaterialNameAliases } from "./opponent-model-config";

export const PLAYER_CHARACTER_MODEL_PATH = "/models/gece-nobetcisi.glb";

export const PLAYER_CHARACTER_MODEL_SCALE = 1;
export const PLAYER_CHARACTER_MODEL_FACING = 0;
export const PLAYER_CHARACTER_ROOT_BONE = "Rig_Hips";

export const PLAYER_CHARACTER_ANIMATION_CLIPS = {
  idle: ["Idle"],
  walk: ["Walk"],
  run: ["Run"],
  attack: ["Attack1"],
  heavyAttack: ["Attack1"],
  block: ["Block"],
  dodge: ["Dodge"],
  jump: ["Dodge"],
  backflip: ["Dodge"],
  plunge: ["Attack1"],
  hit: ["HitReaction"],
  die: ["Death"],
} as const satisfies Partial<Record<CharacterAnimationState, readonly string[]>>;

export const PLAYER_CHARACTER_MATERIAL_ALIASES: ModelMaterialNameAliases = {
  cape: ["cape", "cloak"],
  accent: ["gold_accent", "trim", "accent"],
  armor: ["leather"],
  armorLight: ["steel_light"],
  armorDark: ["steel_dark", "leather_dark"],
};

export function shouldRenderPlayerModel(playerCharacter: boolean, animationCount: number) {
  return playerCharacter && animationCount === 0;
}
