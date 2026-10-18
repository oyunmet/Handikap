import { lazy, Suspense, useMemo } from "react";
import type { World3DProps } from "./World3D";

const LegacyWorld3D = lazy(() => import("./World3D"));
const World3DV2 = lazy(() => import("./World3DV2"));

export default function World3DRouter(props: World3DProps) {
  const useV2 = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("v2") === "1";
  }, []);
  const Renderer = useV2 && !props.combatActive ? World3DV2 : LegacyWorld3D;
  return (
    <Suspense fallback={<div className="world-three-loading" role="status">3D sahne hazırlanıyor…</div>}>
      <Renderer {...props} />
    </Suspense>
  );
}
