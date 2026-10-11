export const WORLD_ENCOUNTER_CARD_RANGE_METERS = 25;

export type EncounterRangeState = {
  visible: boolean;
  canChallenge: boolean;
};

export function getEncounterRangeState(distanceMeters: number): EncounterRangeState {
  const distance = Number.isFinite(distanceMeters)
    ? Math.max(0, Math.abs(distanceMeters))
    : Number.POSITIVE_INFINITY;
  const visible = distance <= WORLD_ENCOUNTER_CARD_RANGE_METERS;

  return {
    visible,
    // The fight action belongs to the visible encounter card, not to the 3D renderer
    // or a smaller second distance threshold. This also keeps it usable on a black canvas.
    canChallenge: visible,
  };
}
