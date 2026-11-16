import { useCallback, useRef } from "react";
import type { RenderQuality } from "../world/graphics-quality";
import CityHubScene from "../world/CityHubScene";
import {
  CITY_START_POSITION,
  type CityInput,
  type CityPosition,
} from "../world/city-hub-layout";

type Props = {
  reducedMotion: boolean;
  quality: RenderQuality;
};

export default function IntroCityWorld({ reducedMotion, quality }: Props) {
  const positionRef = useRef<CityPosition>({ ...CITY_START_POSITION });
  const inputRef = useRef<CityInput>({ x: 0, z: 0 });
  const ignoreNearbyDoor = useCallback(() => {}, []);
  const pixelRatio = quality === "high" ? 1.25 : quality === "balanced" ? 1.1 : 1;

  return (
    <CityHubScene
      className="intro-world__canvas"
      positionRef={positionRef}
      inputRef={inputRef}
      activeDoorId={null}
      onNearbyDoorChange={ignoreNearbyDoor}
      pixelRatio={pixelRatio}
      reducedMotion={reducedMotion}
    />
  );
}
