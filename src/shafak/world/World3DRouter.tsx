import { lazy, Suspense } from "react";
import type { World3DProps } from "./World3D";

const LegacyWorld3D = lazy(() => import("./World3D"));
const World3DV2 = lazy(() => import("./World3DV2"));

export default function World3DRouter(props: World3DProps) {
  const Renderer = props.combatActive ? LegacyWorld3D : World3DV2;
  return (
    <Suspense fallback={<div className="world-three-loading" role="status">3D sahne hazırlanıyor…</div>}>
      <Renderer {...props} />
    </Suspense>
  );
}
