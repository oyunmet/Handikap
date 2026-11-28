export type WarRoomPhase = "briefing" | "battle" | "victory" | "defeat";

export type WarRoomPhaseAction =
  | { type: "start" }
  | { type: "finish"; result: "victory" | "defeat" }
  | { type: "return-to-briefing" };

export function transitionWarRoomPhase(
  phase: WarRoomPhase,
  action: WarRoomPhaseAction,
): WarRoomPhase {
  switch (action.type) {
    case "start":
      return phase === "battle" ? phase : "battle";
    case "finish":
      return phase === "battle" ? action.result : phase;
    case "return-to-briefing":
      return "briefing";
  }
}
