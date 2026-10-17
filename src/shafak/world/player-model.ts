export const PLAYER_CHARACTER_MODEL_PATH = "/models/gece-nobetcisi.glb";

export const PLAYER_CHARACTER_MODEL_SCALE = 1;
export const PLAYER_CHARACTER_MODEL_FACING = 0;

export function shouldRenderPlayerModel(playerCharacter: boolean, animationCount: number) {
  return playerCharacter && animationCount === 0;
}
