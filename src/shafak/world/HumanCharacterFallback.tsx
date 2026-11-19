import { useMemo } from "react";
import type { EquipmentVisual } from "../game/store-types";
import { createWorldMotion } from "./movement";
import ProceduralHero from "./ProceduralHero";

type Props = {
  height: number;
  appearance?: EquipmentVisual;
};

/** Keeps a recognizable, jointed human on screen while an animated GLB is loading or unavailable. */
export default function HumanCharacterFallback({ height, appearance }: Props) {
  const motionRef = useMemo(() => ({ current: createWorldMotion() }), []);
  return (
    <ProceduralHero
      motionRef={motionRef}
      state="idle"
      motionReduced
      appearance={appearance}
      targetHeight={height}
      castShadow
    />
  );
}
