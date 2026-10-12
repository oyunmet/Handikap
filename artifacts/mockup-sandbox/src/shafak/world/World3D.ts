import type { MutableRefObject } from "react";
import type { EquipmentVisual } from "../game/store-types";
import type { WorldMotion } from "./movement";
import type { WorldRival } from "./world-content";
import type { TraversalState } from "./traversal";

export type WorldQuality = "high" | "balanced" | "low";

type CombatActor = {
  x: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  action: string;
};

export type World3DProps = {
  motionRef: MutableRefObject<WorldMotion>;
  traversalRef?: MutableRefObject<TraversalState>;
  animationState: "idle" | "walk" | "run" | "hit" | "die";
  quality: WorldQuality;
  rivals: WorldRival[];
  collectedPickupIds: ReadonlySet<string>;
  brokenObstacleIds: ReadonlySet<string>;
  focusedRival: WorldRival | null;
  equipmentVisual: EquipmentVisual;
  level: number;
  relicCount: number;
  lightRadius: number;
  opponentName: string;
  combatStateRef: MutableRefObject<{
    tick?: number;
  } & Partial<Record<"player" | "bot", CombatActor>>>;
  combatRender?: Partial<Record<"player" | "bot", CombatActor>>;
  combatVisualEvents?: unknown[];
  motionReduced: boolean;
  visualEffectsEnabled: boolean;
  finisherSlowMotion: boolean;
  botTelegraphActive: boolean;
};
