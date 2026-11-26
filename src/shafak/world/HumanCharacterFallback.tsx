import type { EquipmentVisual } from "../game/store-types";
import FantasyKnightModel from "./FantasyKnightModel";

type Props = {
  height: number;
  appearance?: EquipmentVisual;
};

/** Keeps the shared static character visible while its model is loading or unavailable. */
export default function HumanCharacterFallback({ height, appearance }: Props) {
  return (
    <FantasyKnightModel
      appearance={appearance}
      targetHeight={height}
      castShadow
    />
  );
}
