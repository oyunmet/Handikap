export const PLAYER_CHARACTER_MODEL_PATH = new URL(
  "../../../attached_assets/steampunk_toad_warrior_1792140030602.glb",
  import.meta.url,
).href;

export const PLAYER_CHARACTER_MODEL_SCALE = 2.72;
export const PLAYER_CHARACTER_MODEL_FACING = Math.PI;

export function shouldRenderStaticPlayerModel(playerCharacter: boolean, animationCount: number) {
  return playerCharacter && animationCount === 0;
}
