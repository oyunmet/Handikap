import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  createWarRoomAdaptiveDprState,
  getWarRoomPixelRatio,
  sampleWarRoomAdaptiveDpr,
} from "../game/war-room-quality";
import type { RenderQuality } from "./graphics-quality";

type Props = {
  quality: RenderQuality;
  touchDevice: boolean;
};

export default function WarRoomAdaptiveDpr({ quality, touchDevice }: Props) {
  const setDpr = useThree((state) => state.setDpr);
  const maxPixelRatio = getWarRoomPixelRatio(
    quality,
    typeof window === "undefined" ? 1 : window.devicePixelRatio,
    touchDevice,
  );
  const adaptiveStateRef = useRef(createWarRoomAdaptiveDprState(maxPixelRatio));
  const elapsedRef = useRef(0);
  const frameTimeTotalRef = useRef(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    adaptiveStateRef.current = createWarRoomAdaptiveDprState(maxPixelRatio);
    elapsedRef.current = 0;
    frameTimeTotalRef.current = 0;
    frameCountRef.current = 0;
    setDpr(maxPixelRatio);
  }, [maxPixelRatio, setDpr]);

  useFrame((_, delta) => {
    if (!Number.isFinite(delta) || delta <= 0 || delta > 0.2) return;
    const frameTimeMs = delta * 1_000;
    elapsedRef.current += frameTimeMs;
    frameTimeTotalRef.current += frameTimeMs;
    frameCountRef.current += 1;
    if (elapsedRef.current < 600 || frameCountRef.current === 0) return;

    const averageFrameTime = frameTimeTotalRef.current / frameCountRef.current;
    const previousPixelRatio = adaptiveStateRef.current.pixelRatio;
    const nextPixelRatio = sampleWarRoomAdaptiveDpr(
      adaptiveStateRef.current,
      maxPixelRatio,
      averageFrameTime,
    );
    if (nextPixelRatio !== previousPixelRatio) setDpr(nextPixelRatio);
    elapsedRef.current = 0;
    frameTimeTotalRef.current = 0;
    frameCountRef.current = 0;
  });

  return null;
}
