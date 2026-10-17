import type { CharacterAnimationState } from "./character-animation";
import type { ModelMaterialNameAliases } from "./opponent-model-config";

export const PLAYER_CHARACTER_MODEL_PATH = "/models/player-hero.glb";

export const PLAYER_CHARACTER_MODEL_SCALE = 1;
export const PLAYER_CHARACTER_TARGET_HEIGHT = 1.8;
export const PLAYER_CHARACTER_MODEL_FACING = Math.PI;
export const PLAYER_CHARACTER_ROOT_BONE = "Root";

export const PLAYER_CHARACTER_ANIMATION_CLIPS = {
  idle: ["Idle", "CharacterArmature|Idle"],
  walk: ["Walk", "CharacterArmature|Walk"],
  run: ["Run", "CharacterArmature|Run"],
  attack: ["Dagger_Attack", "CharacterArmature|Dagger_Attack", "Punch", "CharacterArmature|Punch"],
  heavyAttack: ["Dagger_Attack2", "CharacterArmature|Dagger_Attack2", "Dagger_Attack"],
  block: ["Attacking_Idle", "CharacterArmature|Attacking_Idle"],
  dodge: ["Roll", "CharacterArmature|Roll"],
  jump: [],
  backflip: ["Roll", "CharacterArmature|Roll"],
  plunge: ["Dagger_Attack2", "CharacterArmature|Dagger_Attack2"],
  hit: ["RecieveHit", "CharacterArmature|RecieveHit", "RecieveHit_Attacking"],
  die: ["Death", "CharacterArmature|Death"],
} as const satisfies Partial<Record<CharacterAnimationState, readonly string[]>>;

export const PLAYER_CHARACTER_MATERIAL_ALIASES: ModelMaterialNameAliases = {
  cape: ["cape", "cloak"],
  accent: ["gold_accent", "trim", "accent"],
  armor: ["leather"],
  armorLight: ["steel_light"],
  armorDark: ["steel_dark", "leather_dark"],
  skin: ["skin", "body", "face"],
  hair: ["hair"],
  clothing: ["shirt", "cloth"],
  pants: ["pants"],
  boots: ["boot", "shoe"],
};

export function shouldRenderPlayerModel(playerCharacter: boolean, animationCount: number) {
  return playerCharacter && animationCount === 0;
}
