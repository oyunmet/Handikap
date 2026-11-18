import { useCallback, useRef } from "react";
import CityHubScene from "../world/CityHubScene";
import {
  CITY_START_POSITION,
  type CityInput,
  type CityPosition,
} from "../world/city-hub-layout";

type Props = {
  reducedMotion: boolean;
};

export default function IntroCityWorld({ reducedMotion }: Props) {
  const positionRef = useRef<CityPosition>({ ...CITY_START_POSITION });
  const inputRef = useRef<CityInput>({ x: 0, z: 0 });
  const ignoreNearbyDoor = useCallback(() => {}, []);

  return (
    <CityHubScene
      className="intro-world__canvas"
      positionRef={positionRef}
      inputRef={inputRef}
      activeDoorId={null}
      onNearbyDoorChange={ignoreNearbyDoor}
      pixelRatio={1}
      reducedMotion={reducedMotion}
    />
  );
}
